"use client";

// ============================================================================
// ShootUploadDialog — opens when a shoot card is clicked OR when the Order
// Overview Upload step's "Open upload" button is clicked. Shows the order's
// deliverables as a list of drop zones (one per deliverable kind), so the
// shooter drags files INTO each item rather than into one big bucket.
//
// v12.3: this dialog is now the SINGLE upload surface — it absorbed the old
// `ShooterConfirmUploadDialog` (an isolated checklist that lived in
// order-overview-tab.tsx). Pass `onConfirmed` to enable the footer Confirm
// CTA; omit it for the Today-tab "upload then close, confirm later" flow.
// See HANDOFF §3.l.
//
// Per user spec:
//   - Each order item (deliverable) has its own drop area
//   - Some catalog items don't need upload (pre-made 3D, virtual staging
//     applied to existing photos) — these still show in the dialog but
//     render as "Pre-made · no upload required" instead of a drop zone
//   - Reference material (custom extras, `requiresEditing: false`) gets a
//     drop zone too — manager attaches the reference file the editor needs
//   - Closing the dialog returns to MyShootsView; the card surfaces a
//     progress bar reflecting the in-flight upload
// ============================================================================

import * as React from "react";
import {
  Box,
  Camera,
  CircleCheck,
  Clock,
  Home,
  Image as ImageIcon,
  Plane,
  Plus,
  Sparkles,
  Sun,
  Upload as UploadIcon,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  type Deliverable,
  type DeliverableKind,
  type Order,
  formatTimeRange,
} from "@/components/orders/orders-data";
import { kindToService, serviceById } from "@/components/catalog/catalog-data";
import { formatDateDMY } from "@/components/uploads/uploads-data";

/** Display label for a deliverable. Resolution order mirrors
 *  `deliverableDisplayName` in order-overview-tab.tsx — catalog-backed
 *  extras (serviceId) > catalog name for legacy kinds > custom extras
 *  (kindLabel) > raw kind. See HANDOFF §3.h. */
function displayLabel(d: Deliverable): string {
  if (d.serviceId) {
    const svc = serviceById(d.serviceId);
    if (svc) return svc.name;
  }
  // Legacy seed deliverable without serviceId — resolve via kind so labels
  // match what the catalog says ("Standard Listing Video", not the older
  // generic "Video walkthrough").
  const fromKind = kindToService(d.kind);
  if (fromKind) return fromKind.name;
  return d.kindLabel;
}

export type ShootUploadDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shoot: Order | null;
  /** Mock state: per-deliverable file counts the shooter has dropped this
   *  session. Maps deliverable.id → number of files. */
  uploadCounts: Record<string, number>;
  /** Bump the count for a deliverable (called when files are dropped). */
  onUpload: (deliverableId: string, fileCount: number) => void;
  /** v12.3: when supplied, the footer shows a primary "Confirm upload" CTA
   *  that fires this callback once every shoot-required deliverable has at
   *  least one file. Omit (Today-tab flow) to show only a Close button. */
  onConfirmed?: () => void;
  /** v12.3: when true, the Confirm CTA is already locked in (the parent
   *  considers this batch confirmed). Used to render a "Confirmed" badge
   *  instead of the Confirm button. */
  confirmed?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// v12.2: not every order item needs a fresh capture. Pre-made / studio
// services (virtual staging applied to existing photos, pre-built 3D tour
// templates) are tracked in the order but never get a drop zone — they
// flow through a different production path. Treat as "system-provided".
function deliverableRequiresCapture(kind: DeliverableKind): boolean {
  switch (kind) {
    case "virtual_staging":
    case "3d_tour":
      return false;
    default:
      return true;
  }
}

function deliverableIcon(kind: DeliverableKind): React.ComponentType<{
  className?: string;
}> {
  switch (kind) {
    case "video":
    case "walkthrough":
      return Video;
    case "drone":
      return Plane;
    case "twilight":
      return Sun;
    case "floor_plan":
      return Home;
    case "3d_tour":
      return Box;
    case "virtual_staging":
      return Sparkles;
    default:
      return ImageIcon;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShootUploadDialog({
  open,
  onOpenChange,
  shoot,
  uploadCounts,
  onUpload,
  onConfirmed,
  confirmed,
}: ShootUploadDialogProps) {
  if (!shoot) return null;

  const totalUploaded = shoot.deliverables.reduce(
    (acc, d) => acc + (uploadCounts[d.id] ?? 0),
    0,
  );
  const requiresCount = shoot.deliverables.filter((d) =>
    deliverableRequiresCapture(d.kind),
  ).length;

  // v12.3: confirm gate — every shoot-required deliverable needs ≥1 file
  // in this session before the manager can confirm the batch. Pre-made and
  // reference items don't count toward the gate.
  const shootRequired = shoot.deliverables.filter((d) =>
    deliverableRequiresCapture(d.kind),
  );
  const everyRequiredHasFiles =
    shootRequired.length > 0 &&
    shootRequired.every((d) => (uploadCounts[d.id] ?? 0) > 0);
  const canConfirm = Boolean(onConfirmed) && everyRequiredHasFiles && !confirmed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(95vw,820px)] max-w-none gap-0 p-0 sm:max-w-none"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="truncate text-sm font-semibold">
              {shoot.property_address}
            </DialogTitle>
            <DialogDescription className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {formatDateDMY(shoot.scheduled_at)} ·{" "}
                {formatTimeRange(shoot.scheduled_at, shoot.scheduled_end)}
              </span>
              <span className="text-muted-foreground/40" aria-hidden>
                •
              </span>
              <span>
                {totalUploaded > 0
                  ? `${totalUploaded} files in this session`
                  : "Drop files into each item"}
              </span>
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="size-7 shrink-0 rounded-full"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Body — one section per deliverable */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-2.5">
            {shoot.deliverables.map((d) => (
              <DeliverableRow
                key={d.id}
                deliverable={d}
                droppedCount={uploadCounts[d.id] ?? 0}
                onFilesDropped={(n) => onUpload(d.id, n)}
              />
            ))}
          </div>
          {requiresCount === 0 && (
            <p className="mt-3 rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              All items on this order are system-provided. No shoot upload
              needed.
            </p>
          )}
        </div>

        {/* v12.3: footer — uploads continue in background regardless. When
            `onConfirmed` is supplied (Order Overview Upload step), show
            the Confirm CTA; otherwise just a Close button (Today tab
            flow — confirm still happens later on the shoot card). */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <p className="text-[11px] text-muted-foreground">
            {confirmed
              ? "Batch confirmed — uploads continue in the background."
              : "You can close and come back — uploads continue in the background."}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="press h-8 gap-1.5 rounded-full px-3 text-xs"
            >
              <X className="size-3.5" />
              Close
            </Button>
            {onConfirmed && !confirmed && (
              <Button
                type="button"
                size="sm"
                disabled={!canConfirm}
                onClick={() => {
                  onConfirmed();
                  onOpenChange(false);
                }}
                className="press h-8 gap-1.5 rounded-full px-3 text-xs"
                title={
                  canConfirm
                    ? "Confirm batch — project moves to Assign"
                    : "Add at least one file to every item before confirming"
                }
              >
                <CircleCheck className="size-3.5" />
                Confirm upload
              </Button>
            )}
            {onConfirmed && confirmed && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-300">
                <CircleCheck className="size-3.5" />
                Confirmed
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// DeliverableRow — one drop zone per item
// ---------------------------------------------------------------------------

function DeliverableRow({
  deliverable,
  droppedCount,
  onFilesDropped,
}: {
  deliverable: Deliverable;
  droppedCount: number;
  onFilesDropped: (n: number) => void;
}) {
  const Icon = deliverableIcon(deliverable.kind);
  const requiresCapture = deliverableRequiresCapture(deliverable.kind);
  const [drag, setDrag] = React.useState(false);
  const counter = React.useRef(0);

  const [uploadStatus, setUploadStatus] = React.useState<"idle" | "uploading" | "success" | "failed">("idle");
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [pendingCount, setPendingCount] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync state if already has files dropped previously
  React.useEffect(() => {
    if (droppedCount > 0 && uploadStatus === "idle") {
      setUploadStatus("success");
    }
  }, [droppedCount, uploadStatus]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startSimulatedUpload = React.useCallback((n: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPendingCount(n);
    setUploadStatus("uploading");
    setUploadProgress(0);
    
    let currentProgress = 0;
    timerRef.current = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 20) + 10;
      if (currentProgress >= 100) {
        currentProgress = 100;
        if (timerRef.current) clearInterval(timerRef.current);
        
        // Simulating success (85% chance) / failure (15% chance)
        const isSuccess = Math.random() < 0.85;
        if (isSuccess) {
          setUploadStatus("success");
          onFilesDropped(n);
          toast.success(`Uploaded ${n} files for ${deliverable.kindLabel}`);
        } else {
          setUploadStatus("failed");
          toast.error(`Failed to upload files for ${deliverable.kindLabel}`);
        }
      }
      setUploadProgress(currentProgress);
    }, 150);
  }, [onFilesDropped, deliverable.kindLabel]);

  const onDragOver = React.useCallback(
    (e: React.DragEvent) => {
      if (!requiresCapture) return;
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      if (counter.current === 0) setDrag(true);
      counter.current += 1;
    },
    [requiresCapture],
  );

  const onDragLeave = React.useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    counter.current = Math.max(0, counter.current - 1);
    if (counter.current === 0) setDrag(false);
  }, []);

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      if (!requiresCapture) return;
      e.preventDefault();
      e.stopPropagation();
      counter.current = 0;
      setDrag(false);
      const n = e.dataTransfer?.files.length ?? 0;
      if (n > 0) startSimulatedUpload(n);
    },
    [requiresCapture, startSimulatedUpload],
  );

  // Demo helper: clicking "Add files" simulates a file pick.
  const simulatePick = React.useCallback(() => {
    if (!requiresCapture) return;
    const fake = Math.max(1, Math.floor(Math.random() * 8));
    startSimulatedUpload(fake);
  }, [requiresCapture, startSimulatedUpload]);

  if (!requiresCapture) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-300">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-foreground">
              {displayLabel(deliverable)}
            </div>
            <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              System-provided · no shoot needed
            </div>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
          Pre-made
        </span>
      </div>
    );
  }

  if (uploadStatus === "uploading") {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-background/30 px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground animate-pulse">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-semibold text-foreground">
                {displayLabel(deliverable)}
              </span>
              <span className="text-[11px] font-medium text-amber-400 animate-pulse">
                Uploading... {uploadProgress}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (uploadStatus === "failed") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-400">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-foreground">
              {displayLabel(deliverable)}
            </div>
            <div className="mt-0.5 truncate text-[10.5px] text-rose-400 font-medium">
              Upload failed. Connection lost.
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => startSimulatedUpload(pendingCount)}
          className="press h-7 shrink-0 gap-1 rounded-full border-rose-500/30 text-rose-300 hover:bg-rose-500/10 px-2.5 text-[11px]"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (uploadStatus === "success" || droppedCount > 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-foreground">
                {displayLabel(deliverable)}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                NEW · {droppedCount || pendingCount}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[10.5px] text-emerald-400 font-medium">
              Upload Success!
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={simulatePick}
          className="press h-7 shrink-0 gap-1 rounded-full px-2.5 text-[11px] border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
        >
          <Plus className="size-3" />
          Upload More
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-background/30 px-3.5 py-3 transition-colors duration-fast ease-standard",
        drag &&
          "border-foreground/40 bg-accent/40 ring-2 ring-foreground/30 ring-offset-2 ring-offset-background",
        droppedCount > 0 && "border-emerald-500/30 bg-emerald-500/[0.06]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            droppedCount > 0
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground">
              {displayLabel(deliverable)}
            </span>
            {droppedCount > 0 && (
              <span
                className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300"
                aria-label="newly added files"
              >
                NEW · {droppedCount}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
            {droppedCount > 0
              ? "Drop more to add — uploads in background"
              : "Drag files here to upload"}
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={simulatePick}
        className="press h-7 shrink-0 gap-1 rounded-full px-2.5 text-[11px]"
      >
        <Plus className="size-3" />
        Add
      </Button>
    </div>
  );
}

export default ShootUploadDialog;
