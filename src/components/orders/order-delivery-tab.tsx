"use client";

// ============================================================================
// Order Delivery & Activity tab — simplified v11.
// LEFT (8/12): Deliverables grouped by kind (Photos / Video / Aerial / Floor
// plans / Staging). Each group shows a count + items with status + meta.
// RIGHT (4/12): Share links · Activity log.
// Top: Send-to-client CTA.
//
// Sections from the previous version that moved out:
//   - Property / Client / Order Item — already on Overview tab
//   - Final-package checklist + Quick downloads — moved into Options menu
//   - Recipients — derived from Client + share links, not its own section
// ============================================================================

import * as React from "react";
import Link from "next/link";
import {
  Box,
  CalendarDays,
  Check,
  CircleAlert,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Film,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquare,
  Package,
  Pencil,
  Plane,
  Send,
  Share2,
  Sun,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  activityForOrder,
  deliverableStatusLabel,
  deliverableStatusTone,
  formatBytes,
  formatDateUS,
  type ActivityEntry,
  type Deliverable,
  type DeliverableKind,
  type DeliverableStatus,
  type Order,
} from "./orders-data";
import { useEditorState } from "@/components/editor-state";

// ============================================================================
// Grouping
// ============================================================================

type DeliverableGroup = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  kinds: ReadonlyArray<DeliverableKind>;
};

const GROUPS: ReadonlyArray<DeliverableGroup> = [
  { key: "photos", label: "Photos", Icon: ImageIcon, kinds: ["photo", "twilight"] },
  { key: "video", label: "Video", Icon: Film, kinds: ["video", "walkthrough"] },
  { key: "aerial", label: "Aerial", Icon: Plane, kinds: ["drone"] },
  {
    key: "floor-plans",
    label: "Floor plans",
    Icon: LayoutGrid,
    kinds: ["floor_plan", "3d_tour"],
  },
  { key: "staging", label: "Virtual staging", Icon: Box, kinds: ["virtual_staging"] },
];

function groupedDeliverables(order: Order): Array<{
  group: DeliverableGroup;
  items: Deliverable[];
}> {
  return GROUPS.map((group) => ({
    group,
    items: order.deliverables.filter((d) => group.kinds.includes(d.kind)),
  })).filter(({ items }) => items.length > 0);
}

// ============================================================================
// Activity tone helpers
// ============================================================================

type TimelineTone = "info" | "violet" | "amber" | "emerald" | "muted";

function classifyActivity(entry: ActivityEntry): TimelineTone {
  const a = entry.action.toLowerCase();
  if (a.includes("approv")) return "emerald";
  if (a.includes("deliver") || a.includes("sent") || a.includes("paid"))
    return "emerald";
  if (a.includes("share") || a.includes("preview") || a.includes("viewed"))
    return "info";
  if (a.includes("upload") || a.includes("started editing")) return "violet";
  if (a.includes("comment") || a.includes("requested") || a.includes("revision"))
    return "amber";
  return "muted";
}

function dotClass(tone: TimelineTone): string {
  switch (tone) {
    case "emerald":
      return "bg-emerald-500/15 text-emerald-300";
    case "info":
      return "bg-sky-500/15 text-sky-300";
    case "violet":
      return "bg-violet-500/15 text-violet-300";
    case "amber":
      return "bg-amber-500/15 text-amber-300";
    case "muted":
      return "bg-muted text-muted-foreground";
  }
}

function ActivityIcon({
  entry,
  className,
}: {
  entry: ActivityEntry;
  className?: string;
}) {
  const a = entry.action.toLowerCase();
  if (a.includes("approv")) return <Check className={className} />;
  if (a.includes("deliver") || a.includes("sent"))
    return <Send className={className} />;
  if (a.includes("share") || a.includes("viewed"))
    return <Share2 className={className} />;
  if (a.includes("upload") || a.includes("attached"))
    return <Download className={className} />;
  if (a.includes("comment") || a.includes("note"))
    return <MessageSquare className={className} />;
  if (a.includes("editing") || a.includes("resolved"))
    return <Pencil className={className} />;
  if (a.includes("created") || a.includes("scheduled"))
    return <CalendarDays className={className} />;
  return <CircleAlert className={className} />;
}

// ============================================================================
// Component
// ============================================================================

export function OrderDeliveryTab({ order }: { order: Order }) {
  const editor = useEditorState();
  const groups = React.useMemo(() => groupedDeliverables(order), [order]);
  const activity = React.useMemo(() => {
    // Filter out editor noise (comments, edits, uploads) - only keep approvals and deliveries/shares.
    return activityForOrder(order.id)
      .filter((ev) => {
        const tone = classifyActivity(ev);
        return tone === "emerald" || tone === "info";
      })
      .slice(0, 12);
  }, [order.id]);

  // v13: effective status — overlay editor sub-state when present so a
  // deliverable that was Approved on the kanban shows up as "ready" here.
  const effectiveStatusOf = React.useCallback(
    (d: Deliverable): DeliverableStatus => {
      const hasOverride =
        editor.getVersion(d.id) > 0 || editor.getBrief(d.id) !== undefined;
      if (!hasOverride) return d.status;
      const stage = editor.getStage({ id: d.id });
      return stage === "deliver"
        ? "approved"
        : stage === "revision"
          ? "review"
          : stage === "working"
            ? "in_progress"
            : d.status;
    },
    [editor],
  );

  const totalDeliverables = order.deliverables.length;
  const readyCount = order.deliverables.filter((d) => {
    const s = effectiveStatusOf(d);
    return s === "approved" || s === "delivered";
  }).length;

  const shareToken = React.useMemo(() => {
    // Stable mock token derived from order id — keeps every reload consistent.
    return `${order.id.slice(0, 4)}-${order.display_number.toString(16)}`;
  }, [order.id, order.display_number]);

  const handleSend = React.useCallback(() => {
    toast.success(`Sending to ${order.client_name}`, {
      description: `${readyCount} of ${totalDeliverables} deliverables ready`,
    });
  }, [order.client_name, readyCount, totalDeliverables]);

  const handleDownloadAll = React.useCallback(() => {
    toast.success("Downloading final package...", {
      description: `Zipping ${readyCount} approved deliverables.`
    });
  }, [readyCount]);

  const handleCopyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        `https://review.odone.com/s/${shareToken}`,
      );
      toast.success("Share link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  }, [shareToken]);

  return (
    <div className="flex flex-col gap-3 px-4 py-4 lg:px-6 lg:py-5">
      {/* Top action row — counts + Send to client */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="size-3.5" />
          <span>
            <span className="font-semibold text-foreground">{readyCount}</span>{" "}
            of <span className="font-semibold text-foreground">{totalDeliverables}</span>{" "}
            deliverables ready
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadAll}
            disabled={readyCount === 0}
            className="press h-8 gap-1.5 rounded-full text-xs font-semibold"
          >
            <Download className="size-3.5" />
            Download All
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={readyCount === 0}
            className="press h-8 gap-1.5 rounded-full bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600"
          >
            <Send className="size-3.5" />
            Send to client
          </Button>
        </div>
      </div>

      {/* 2-column grid: deliverables (8/12) · share + activity (4/12) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:gap-5">
        {/* ───────────────── LEFT: deliverables grouped ───────────────── */}
        <div className="flex min-w-0 flex-col gap-3">
          {groups.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No deliverables on this order yet.
            </section>
          ) : (
            groups.map(({ group, items }) => (
              <section
                key={group.key}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <header className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <group.Icon className="size-3.5 text-muted-foreground" />
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </h3>
                    <span className="text-[10px] text-muted-foreground/70">
                      · {items.length}
                    </span>
                  </div>
                </header>
                <ul className="flex flex-col">
                  {items.map((d) => (
                    <DeliverableRow
                      key={d.id}
                      deliverable={d}
                      orderId={order.id}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* ───────────────── RIGHT: share links + activity ───────────────── */}
        <aside className="flex min-w-0 flex-col gap-3">
          {/* Share links */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <header className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Share link
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  toast.info("Opening share dialog")
                }
                className="press h-6 gap-1 rounded-full px-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                + New
              </Button>
            </header>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5">
              <Share2 className="size-3 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate font-mono text-[10.5px] text-foreground/80">
                review.odone.com/s/{shareToken}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy share link"
                className="press grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Copy className="size-3" />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Expires Jun 17 · Password protected
            </p>
          </section>

          {/* Activity log */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <header className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Activity log
                </h3>
                {activity.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/70">
                    · {activity.length}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Exporting activity log")}
                className="press h-6 gap-1 rounded-full px-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <Download className="size-3" /> Export
              </Button>
            </header>
            {activity.length === 0 ? (
              <p className="rounded-md bg-muted/30 p-3 text-center text-[10.5px] text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <ol className="relative">
                <span
                  aria-hidden
                  className="absolute left-[11px] top-2 bottom-2 w-px bg-border"
                />
                {activity.map((ev) => {
                  const tone = classifyActivity(ev);
                  return (
                    <li
                      key={ev.id}
                      className="relative mb-2.5 flex gap-2.5 last:mb-0"
                    >
                      <div
                        className={cn(
                          "relative z-10 grid size-6 shrink-0 place-items-center rounded-full ring-2 ring-card",
                          dotClass(tone),
                        )}
                      >
                        <ActivityIcon entry={ev} className="size-3" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[11px] leading-snug">
                          <span className="font-semibold">{ev.actor_name}</span>{" "}
                          <span className="text-muted-foreground">
                            {ev.action}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                          {formatDateUS(ev.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function DeliverableRow({
  deliverable,
  orderId,
}: {
  deliverable: Deliverable;
  orderId: string;
}) {
  const current = deliverable.versions.find(
    (v) => v.id === deliverable.current_version_id,
  );
  const versionLabel = current ? `v${current.version_number}` : "—";
  const meta = formatDeliverableMeta(deliverable);
  const tone = deliverableStatusTone(deliverable.status);

  return (
    <li className="group/row -mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-fast ease-standard hover:bg-accent/40">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          deliverable.status === "approved" || deliverable.status === "delivered"
            ? "bg-emerald-400"
            : deliverable.status === "review"
              ? "bg-violet-400"
              : "bg-muted-foreground/40",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-medium text-foreground">
            {deliverable.title}
          </span>
          <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground/70">
            {versionLabel}
          </span>
          <Badge
            className={cn(
              "ml-0.5 h-4 shrink-0 rounded-full border-0 px-1.5 text-[9px] font-medium uppercase tracking-wide",
              tone,
            )}
          >
            {deliverableStatusLabel(deliverable.status)}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
          {meta}
          {deliverable.delivered_at && (
            <>
              <span aria-hidden className="mx-1.5 text-muted-foreground/40">
                ·
              </span>
              <span className="text-emerald-400/80">
                <Send
                  aria-hidden
                  className="-mt-0.5 inline size-2.5"
                />{" "}
                Delivered {formatDateUS(deliverable.delivered_at)}
              </span>
            </>
          )}
        </p>
      </div>
      <Link
        href={`/uploads?orderId=${orderId}&from=order`}
        className="press grid size-6 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover/row:opacity-100"
        aria-label={`Open ${deliverable.title} in Files`}
      >
        <ExternalLink className="size-3" />
      </Link>
    </li>
  );
}

function formatDeliverableMeta(d: Deliverable): string {
  const cur = d.versions.find((v) => v.id === d.current_version_id);
  if (!cur) return d.kindLabel;
  const parts: string[] = [d.kindLabel];
  if (cur.file_size_bytes) parts.push(formatBytes(cur.file_size_bytes));
  return parts.join(" · ");
}

export default OrderDeliveryTab;
