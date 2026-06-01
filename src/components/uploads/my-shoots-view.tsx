"use client";

// ============================================================================
// MyShootsView — "Shoots" tab inside /uploads. Shooter's day-of-work board:
// one card per assigned shoot, with drop-zone + per-card Confirm flow. Higher
// roles (admin/manager) see all shoots with a "view as" shooter filter.
//
// Designed in response to user spec: "Yes, shooters need a single view to
// dump card files; after upload they need to see + confirm per order."
// SplitFilesDialog (multi-order distribution from one drop) is a separate
// component wired here.
// ============================================================================

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  MapPin,
  Upload as UploadIcon,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  orders as allOrders,
  formatTimeRange,
  type Order,
} from "@/components/orders/orders-data";
import { formatDateDMY } from "@/components/uploads/uploads-data";
import { SplitFilesDialog } from "@/components/uploads/split-files-dialog";
import { ShootUploadDialog } from "@/components/uploads/shoot-upload-dialog";
import {
  UploadTracker,
  useUploadTracker,
} from "@/components/uploads/upload-tracker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// useCurrentUser ids are "kyle", "mj", ... but orders.assigned_shooter is
// "shooter-kyle", "shooter-mj", ... — bridge the two.
function shooterIdForUser(userId: string): string {
  if (userId.startsWith("shooter-")) return userId;
  return `shooter-${userId}`;
}

type ShootStatus = "scheduled" | "to_upload" | "uploaded" | "confirmed";

function statusFor(order: Order): ShootStatus {
  if (order.raw_complete_at) return "confirmed";
  if (order.raw_summary.count > 0) return "uploaded";
  const scheduledMs = new Date(order.scheduled_at).getTime();
  // Anything within the last 24h that has no files → "to upload".
  if (scheduledMs <= Date.now()) return "to_upload";
  return "scheduled";
}

const STATUS_LABEL: Record<ShootStatus, string> = {
  scheduled: "Scheduled",
  to_upload: "Awaiting upload",
  uploaded: "Awaiting confirm",
  confirmed: "Confirmed",
};

const STATUS_TONE: Record<ShootStatus, string> = {
  scheduled: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20",
  to_upload: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
  uploaded: "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
};

function STATUS_ICON({
  status,
  className,
}: {
  status: ShootStatus;
  className?: string;
}) {
  switch (status) {
    case "scheduled":
      return <Clock className={className} />;
    case "to_upload":
      return <UploadIcon className={className} />;
    case "uploaded":
      return <CalendarDays className={className} />;
    case "confirmed":
      return <CheckCircle2 className={className} />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MyShootsView() {
  // v12.3: previously took an `onOpenConfirm` prop that opened a separate
  // ShooterConfirmUploadDialog in the parent. Confirm now lives in the
  // unified ShootUploadDialog footer — see HANDOFF §3.l.
  const currentUser = useCurrentUser();
  const isShooter = currentUser.role === "shooter";

  // Admin/manager picks "view as" — defaults to the first shooter we have
  // shoots for so the page is never empty by accident.
  const allShooters = React.useMemo(() => {
    const seen = new Map<string, { id: string; name: string; initials: string }>();
    for (const o of allOrders) {
      if (!seen.has(o.assigned_shooter)) {
        seen.set(o.assigned_shooter, {
          id: o.assigned_shooter,
          name: o.shooter_name,
          initials: o.shooter_initials,
        });
      }
    }
    return Array.from(seen.values());
  }, []);

  const [viewAs, setViewAs] = React.useState<string | null>(null);
  const effectiveShooterId = isShooter
    ? shooterIdForUser(currentUser.id)
    : (viewAs ?? allShooters[0]?.id ?? null);

  const shoots = React.useMemo(() => {
    if (!effectiveShooterId) return [];
    return allOrders
      .filter((o) => o.assigned_shooter === effectiveShooterId)
      .sort(
        (a, b) =>
          new Date(b.scheduled_at).getTime() -
          new Date(a.scheduled_at).getTime(),
      );
  }, [effectiveShooterId]);

  // v12.2: click a shoot card → open the per-deliverable upload dialog.
  // Per-shoot upload counts are keyed `${shootId}:${deliverableId}` so the
  // map persists across dialog open/close cycles.
  const [activeShoot, setActiveShoot] = React.useState<Order | null>(null);
  const [uploadCounts, setUploadCounts] = React.useState<
    Record<string, Record<string, number>>
  >({});

  // v12.2: tracker queue — every per-deliverable drop pushes a job here,
  // so the bottom-right panel stays in sync even after the dialog closes.
  const { jobs, addJob, dismiss } = useUploadTracker();

  const handleUploadDeliverable = React.useCallback(
    (shoot: Order, deliverableId: string, n: number) => {
      setUploadCounts((prev) => {
        const next = { ...prev };
        next[shoot.id] = { ...(next[shoot.id] ?? {}) };
        next[shoot.id][deliverableId] =
          (next[shoot.id][deliverableId] ?? 0) + n;
        return next;
      });
      const deliverable = shoot.deliverables.find((d) => d.id === deliverableId);
      addJob({
        shootId: shoot.id,
        shootAddress: shoot.property_address,
        deliverableLabel: deliverable?.kindLabel ?? "Files",
        fileCount: n,
      });
    },
    [addJob],
  );

  // Multi-order drop → SplitFilesDialog
  const [splitFiles, setSplitFiles] = React.useState<File[] | null>(null);
  const handleBackgroundDrop = React.useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      // 1 card visible → just toast (the card-level drop already handled it)
      // ≥ 2 cards → open the split dialog
      if (shoots.length < 2) {
        toast.success(`Uploading ${files.length} files to ${shoots[0]?.property_address ?? "shoot"}`);
        return;
      }
      setSplitFiles(Array.from(files));
    },
    [shoots],
  );

  const [dragActive, setDragActive] = React.useState(false);
  const dragCounter = React.useRef(0);

  const onDragOver = React.useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dragCounter.current === 0) setDragActive(true);
    dragCounter.current += 1;
  }, []);

  const onDragLeave = React.useCallback(() => {
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragActive(false);
  }, []);

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragActive(false);
      handleBackgroundDrop(e.dataTransfer?.files ?? null);
    },
    [handleBackgroundDrop],
  );

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 pt-4 lg:px-6 lg:pb-5 lg:pt-5"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header row — view-as selector for admin/manager only */}
      {!isShooter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Viewing as
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="press h-8 gap-1.5 rounded-full px-3 text-xs"
                />
              }
            >
              <Users className="size-3.5" />
              {allShooters.find((s) => s.id === effectiveShooterId)?.name ??
                "Pick a shooter"}
              <ChevronDown className="size-3 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="min-w-48">
              <DropdownMenuLabel>Shooters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allShooters.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => setViewAs(s.id)}
                  className={cn(
                    effectiveShooterId === s.id &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  <Avatar size="sm" className="size-5">
                    <AvatarFallback>{s.initials}</AvatarFallback>
                  </Avatar>
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Card grid */}
      {shoots.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 text-sm text-muted-foreground">
          No shoots assigned.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shoots.map((shoot) => {
            const sessionCount = Object.values(
              uploadCounts[shoot.id] ?? {},
            ).reduce((a, b) => a + b, 0);
            // Active = at least one tracker job for this shoot still running.
            // Drives whether the Confirm CTA appears (we only want it when
            // every queued batch has flushed).
            const hasActiveUploads = jobs.some(
              (j) => j.shootId === shoot.id && !j.done,
            );
            const hasAnySessionJobs = jobs.some(
              (j) => j.shootId === shoot.id,
            );
            return (
              <ShootCard
                key={shoot.id}
                shoot={shoot}
                sessionCount={sessionCount}
                hasActiveUploads={hasActiveUploads}
                hasAnySessionJobs={hasAnySessionJobs}
                onOpen={() => setActiveShoot(shoot)}
                // v12.3: confirm now happens inside the upload dialog
                // footer — opening the dialog gives the shooter both
                // drop zones AND the Confirm CTA in one place.
                onConfirm={() => setActiveShoot(shoot)}
              />
            );
          })}
        </div>
      )}

      {/* Whole-area drag overlay — shows when shooter drags onto the page
          background (i.e. not over a single card). Triggers SplitFilesDialog
          on drop. */}
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-foreground/40 bg-card/80 px-8 py-6 text-foreground">
            <UploadIcon className="size-7" />
            <div className="text-sm font-semibold">Drop files anywhere</div>
            <div className="text-xs text-muted-foreground">
              We'll let you split them across {shoots.length} shoots
            </div>
          </div>
        </div>
      )}

      <ShootUploadDialog
        open={activeShoot !== null}
        onOpenChange={(v) => {
          if (!v) setActiveShoot(null);
        }}
        shoot={activeShoot}
        uploadCounts={activeShoot ? (uploadCounts[activeShoot.id] ?? {}) : {}}
        onUpload={(deliverableId, n) => {
          if (!activeShoot) return;
          handleUploadDeliverable(activeShoot, deliverableId, n);
        }}
        // v12.3: confirm button in dialog footer. Mock only — real backend
        // would POST /orders/{id}/confirm-raw and update shoot status.
        onConfirmed={() => {
          if (!activeShoot) return;
          toast.success("Upload confirmed", {
            description: `${activeShoot.property_address} · editor will be notified.`,
          });
        }}
      />

      <UploadTracker jobs={jobs} onDismiss={dismiss} />

      <SplitFilesDialog
        open={splitFiles !== null}
        onOpenChange={(v) => {
          if (!v) setSplitFiles(null);
        }}
        files={splitFiles ?? []}
        shoots={shoots}
        onConfirm={(assignments) => {
          const total = Object.values(assignments).reduce(
            (acc, list) => acc + list.length,
            0,
          );
          toast.success(
            `Distributed ${total} file${total === 1 ? "" : "s"} across ${
              Object.keys(assignments).length
            } shoot${Object.keys(assignments).length === 1 ? "" : "s"}`,
          );
          setSplitFiles(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShootCard
// ---------------------------------------------------------------------------

function ShootCard({
  shoot,
  sessionCount,
  hasActiveUploads,
  hasAnySessionJobs,
  onOpen,
  onConfirm,
}: {
  shoot: Order;
  sessionCount: number;
  hasActiveUploads: boolean;
  hasAnySessionJobs: boolean;
  onOpen: () => void;
  onConfirm: () => void;
}) {
  const status = statusFor(shoot);
  const Icon = ({ className }: { className?: string }) => (
    <STATUS_ICON status={status} className={className} />
  );
  const [cardDrag, setCardDrag] = React.useState(false);
  const counter = React.useRef(0);

  const onDragOver = React.useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (counter.current === 0) setCardDrag(true);
    counter.current += 1;
  }, []);

  const onDragLeave = React.useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    counter.current = Math.max(0, counter.current - 1);
    if (counter.current === 0) setCardDrag(false);
  }, []);

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      counter.current = 0;
      setCardDrag(false);
      const n = e.dataTransfer?.files.length ?? 0;
      if (n > 0) {
        toast.success(
          `Uploading ${n} file${n === 1 ? "" : "s"} to ${shoot.property_address}`,
        );
      }
    },
    [shoot.property_address],
  );

  const deliverableLabels = shoot.deliverables.map((d) => d.kind).slice(0, 4);

  // Mocked progress: total expected per shoot = 5 files per deliverable
  // that requires capture (rough heuristic for the prototype only).
  const expectedTotal = shoot.deliverables.length * 5;
  const liveTotal = shoot.raw_summary.count + sessionCount;
  const progressPct = Math.min(
    100,
    Math.round((liveTotal / Math.max(1, expectedTotal)) * 100),
  );
  const uploading = sessionCount > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // ignore clicks on inner action buttons / links
        const tgt = e.target as HTMLElement;
        if (tgt.closest("a, button")) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "press relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors duration-fast ease-standard hover:border-foreground/30",
        cardDrag &&
          "border-foreground/40 ring-2 ring-foreground/30 ring-offset-2 ring-offset-background",
      )}
    >
      {/* Status + #order */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            STATUS_TONE[status],
          )}
        >
          <Icon className="size-3" />
          {STATUS_LABEL[status]}
        </span>
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
          #{shoot.display_number}
        </span>
      </div>

      {/* Address — one-tap Google Maps directions for shooters */}
      <div className="flex items-start gap-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shoot.property_address)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex min-w-0 items-start gap-2 text-foreground hover:underline"
          title="Open in Google Maps"
        >
          <MapPin className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground" />
          <div className="min-w-0">
            <div
              className="truncate text-sm font-semibold"
              title={shoot.property_address}
            >
              {shoot.property_address}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {shoot.client_company ?? shoot.client_name}
            </div>
          </div>
        </a>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarDays className="size-3 shrink-0" />
          <span className="truncate">{formatDateDMY(shoot.scheduled_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3 shrink-0" />
          <span className="truncate">
            {formatTimeRange(shoot.scheduled_at, shoot.scheduled_end)}
          </span>
        </div>
      </div>

      {/* Deliverables chips */}
      {deliverableLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {deliverableLabels.map((kind) => (
            <span
              key={kind}
              className="inline-flex items-center rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              <Camera className="mr-1 size-2.5" />
              {kind.replace("_", " ")}
            </span>
          ))}
          {shoot.deliverables.length > deliverableLabels.length && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{shoot.deliverables.length - deliverableLabels.length}
            </span>
          )}
        </div>
      )}

      {/* v12.2: footer redesigned per feedback —
            • counts + percent on one row above the bar
            • progress bar always full-width (visually centered)
            • action row sits on its own line: Open is always left-aligned
              (clicks open the scoped Files view), Confirm appears on the
              right ONLY when every queued session upload has finished
              (status === "uploaded" AND no live tracker jobs). */}
      <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground tabular-nums">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
            {liveTotal > 0
              ? `${liveTotal} / ${expectedTotal} files`
              : "No files yet"}
            {sessionCount > 0 && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                +{sessionCount} new
              </span>
            )}
          </span>
          <span className="shrink-0 tabular-nums">
            {hasActiveUploads
              ? "Uploading…"
              : liveTotal > 0
                ? `${progressPct}%`
                : ""}
          </span>
        </div>
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          aria-hidden
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-base ease-emphasized",
              status === "confirmed"
                ? "bg-emerald-500/70"
                : hasActiveUploads
                  ? "bg-foreground"
                  : uploading
                    ? "bg-foreground"
                    : "bg-muted-foreground/40",
            )}
            style={{ width: `${liveTotal > 0 ? progressPct : 0}%` }}
          />
        </div>
        {/* v12.2: both actions are pill/chip-shape so they sit side by
            side without size mismatch — same h-7, px-3, gap-1.5,
            text-[11px]. Only the colors signal hierarchy: Open is
            outlined (secondary), Confirm is solid emerald (commit), the
            Confirmed badge is the muted tonal pill. */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/uploads?orderId=${shoot.id}&from=order`}
            className="press inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[11px] font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="size-3" />
            Open
          </Link>
          {status !== "confirmed" &&
            !hasActiveUploads &&
            (status === "uploaded" ||
              sessionCount > 0 ||
              hasAnySessionJobs) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                className="press inline-flex h-7 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 text-[11px] font-semibold text-emerald-300 transition-colors duration-fast ease-standard hover:bg-emerald-500/25"
              >
                <CheckCircle2 className="size-3" />
                Confirm
              </button>
            )}
          {status === "confirmed" && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-300">
              <CheckCircle2 className="size-3" />
              Confirmed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyShootsView;
