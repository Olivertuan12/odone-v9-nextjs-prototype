"use client";

// ============================================================================
// Odone — Order Detail · Review tab
// ----------------------------------------------------------------------------
// The core video feedback workspace. Replaces the old EditorDetailDialog
// WorkspaceTab. Layout:
//
//   ┌─────────────────────────────────────────────────────┐
//   │ Deliverables ▸ horizontal scroll of cards (top)     │
//   ├──────────────────────────────┬──────────────────────┤
//   │ VideoReviewPlayer            │ FeedbackTimeline      │
//   │ + version chips              │ (comments per ts)     │
//   │ + Approve / Request revision │                       │
//   └──────────────────────────────┴──────────────────────┘
//
// Local state only — no Supabase yet. All actions emit sonner toasts so the
// design feels alive in the mockup.
//
// DESIGN.md compliance:
//   §1 radii — rounded-2xl cards, rounded-full pills/buttons/segmented
//   §2 buttons — primary/outline rounded-full with .press
//   §3 icons — lucide names from kindIcon() + locked map
//   §5 status — deliverableStatusTone for review pill
//   §7 motion — .press, .lift, duration-fast, ease-standard
// ============================================================================

import * as React from "react";
import {
  Box,
  Check,
  CircleAlert,
  Home,
  Image as ImageIcon,
  Plane,
  Sun,
  Video,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import {
  type Comment,
  type Deliverable,
  type DeliverableKind,
  type Order,
  deliverableStatusLabel,
  deliverableStatusTone,
  kindIcon as kindIconName,
} from "./orders-data";

import { VideoReviewPlayer } from "./video-review-player";
import { FeedbackTimeline } from "./feedback-timeline";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Map kind string → actual lucide component. Mirrors DESIGN.md §3 + kindIcon(). */
const KIND_ICON: Record<DeliverableKind, LucideIcon> = {
  video: Video,
  walkthrough: Video,
  photo: ImageIcon,
  drone: Plane,
  floor_plan: Box,
  "3d_tour": Box,
  twilight: Sun,
  virtual_staging: Home,
};

function getKindIcon(kind: DeliverableKind): LucideIcon {
  return KIND_ICON[kind] ?? Video;
}

function formatTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Default deliverable selection: prefer in-review, else first overall. */
function pickDefaultDeliverable(deliverables: Deliverable[]): Deliverable | null {
  if (deliverables.length === 0) return null;
  const review = deliverables.find((d) => d.status === "review");
  return review ?? deliverables[0];
}

// ----------------------------------------------------------------------------
// Filter pills
// ----------------------------------------------------------------------------

type CommentFilter = "all" | "open" | "resolved";

const FILTERS: { id: CommentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
];

function filterComments(comments: Comment[], filter: CommentFilter): Comment[] {
  if (filter === "all") return comments;
  if (filter === "open") return comments.filter((c) => !c.resolved);
  return comments.filter((c) => c.resolved);
}

// ----------------------------------------------------------------------------
// Deliverable card (inside the top strip)
// ----------------------------------------------------------------------------

function DeliverableCard({
  deliverable,
  active,
  onClick,
}: {
  deliverable: Deliverable;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = getKindIcon(deliverable.kind);
  const versionCount = deliverable.versions.length;
  const commentCount = deliverable.comments.length;
  const currentVersion = deliverable.versions.find(
    (v) => v.id === deliverable.current_version_id,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : undefined}
      aria-pressed={active}
      className={cn(
        "press lift group/card relative flex min-w-[220px] max-w-[260px] shrink-0 flex-col gap-2 rounded-2xl border bg-card p-3 text-left transition-all duration-fast ease-standard",
        "hover:bg-accent/40",
        active
          ? "border-transparent ring-2 ring-ring shadow-soft"
          : "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-full",
            deliverableStatusTone(deliverable.status),
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="text-fluid-xs font-medium text-muted-foreground">
          {deliverable.kindLabel}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="line-clamp-1 text-fluid-sm font-semibold text-foreground">
          {deliverable.title}
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "w-fit rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
            deliverableStatusTone(deliverable.status),
          )}
        >
          {deliverableStatusLabel(deliverable.status)}
        </Badge>
      </div>

      <div className="mt-auto flex items-center gap-1 text-[0.7rem] text-muted-foreground">
        <span>{currentVersion ? `v${currentVersion.version_number}` : "—"}</span>
        <span aria-hidden>•</span>
        <span>
          {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </span>
        {versionCount > 1 ? (
          <>
            <span aria-hidden>•</span>
            <span>{versionCount} versions</span>
          </>
        ) : null}
      </div>
    </button>
  );
}

// ----------------------------------------------------------------------------
// Version segmented selector
// ----------------------------------------------------------------------------

function VersionSelector({
  deliverable,
  selectedVersionId,
  onSelect,
}: {
  deliverable: Deliverable;
  selectedVersionId: string | null;
  onSelect: (versionId: string) => void;
}) {
  if (deliverable.versions.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-fluid-xs text-muted-foreground">
        <CircleAlert className="size-3.5" />
        <span>No versions uploaded yet.</span>
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Version"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5"
    >
      {deliverable.versions.map((v) => {
        const active = v.id === selectedVersionId;
        return (
          <button
            type="button"
            key={v.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(v.id)}
            className={cn(
              "press inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[0.75rem] font-medium transition-colors duration-fast ease-standard",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>v{v.version_number}</span>
            {active && v.status === "approved" ? (
              <Check className="size-3" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main tab body
// ----------------------------------------------------------------------------

export type OrderReviewTabProps = {
  order: Order;
  /** When opened from a specific deliverable (e.g. modal trigger from
      Overview tab), focus the selector on it instead of the default pick. */
  initialDeliverableId?: string;
};

export function OrderReviewTab({
  order,
  initialDeliverableId,
}: OrderReviewTabProps) {
  const deliverables = order.deliverables;

  const initial = React.useMemo(() => {
    if (initialDeliverableId) {
      const hit = deliverables.find((d) => d.id === initialDeliverableId);
      if (hit) return hit;
    }
    return pickDefaultDeliverable(deliverables);
  }, [deliverables, initialDeliverableId]);

  const [selectedDeliverableId, setSelectedDeliverableId] = React.useState<
    string | null
  >(initial?.id ?? null);

  const selectedDeliverable = React.useMemo(
    () =>
      deliverables.find((d) => d.id === selectedDeliverableId) ??
      initial ??
      null,
    [deliverables, selectedDeliverableId, initial],
  );

  const [selectedVersionId, setSelectedVersionId] = React.useState<
    string | null
  >(selectedDeliverable?.current_version_id ?? null);

  // Re-sync version when deliverable changes.
  React.useEffect(() => {
    if (!selectedDeliverable) {
      setSelectedVersionId(null);
      return;
    }
    setSelectedVersionId(
      selectedDeliverable.current_version_id ??
        selectedDeliverable.versions[0]?.id ??
        null,
    );
    setCurrentTimeSec(0);
    setPlaying(false);
  }, [selectedDeliverable]);

  const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [filter, setFilter] = React.useState<CommentFilter>("all");

  const selectedVersion = React.useMemo(() => {
    if (!selectedDeliverable) return null;
    return (
      selectedDeliverable.versions.find((v) => v.id === selectedVersionId) ??
      selectedDeliverable.versions[0] ??
      null
    );
  }, [selectedDeliverable, selectedVersionId]);

  const allComments = selectedDeliverable?.comments ?? [];
  const visibleComments = React.useMemo(
    () => filterComments(allComments, filter),
    [allComments, filter],
  );

  // -------- handlers --------

  const handleSelectDeliverable = React.useCallback((id: string) => {
    setSelectedDeliverableId(id);
  }, []);

  const handleSeek = React.useCallback((sec: number) => {
    setCurrentTimeSec(sec);
  }, []);

  const handleTogglePlay = React.useCallback(() => {
    setPlaying((p) => {
      const next = !p;
      toast(next ? "Playback started" : "Playback paused", {
        description: "Playback simulation — wired to a real player later.",
      });
      return next;
    });
  }, []);

  const handleAddComment = React.useCallback(
    (body: string, t: number) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      toast.success("Comment added", {
        description: `Pinned at ${formatTimestamp(t)} on ${
          selectedDeliverable?.title ?? "deliverable"
        }.`,
      });
    },
    [selectedDeliverable],
  );

  const handleCommentClick = React.useCallback(
    (c: Comment) => {
      if (typeof c.timestamp_seconds === "number") {
        handleSeek(c.timestamp_seconds);
      }
    },
    [handleSeek],
  );

  const handleResolveToggle = React.useCallback((id: string) => {
    toast.info("Comment toggled", {
      description: `Resolved state flipped (id: ${id}).`,
    });
  }, []);

  const handleApprove = React.useCallback(() => {
    if (!selectedDeliverable) return;
    toast.success("Deliverable approved", {
      description: `${selectedDeliverable.title} is ready to deliver.`,
    });
  }, [selectedDeliverable]);

  const handleRequestRevision = React.useCallback(() => {
    if (!selectedDeliverable) return;
    toast.info("Revision requested", {
      description: `Editor pinged on ${selectedDeliverable.title}.`,
    });
  }, [selectedDeliverable]);

  // -------- empty state (no deliverables on the order at all) --------

  if (!selectedDeliverable) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-4 py-10 lg:px-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Video className="size-5" />
        </div>
        <div className="text-center">
          <p className="text-fluid-base font-medium text-foreground">
            Nothing to review yet
          </p>
          <p className="mt-1 text-fluid-sm text-muted-foreground">
            Deliverables show up here once an editor uploads a first cut.
          </p>
        </div>
      </div>
    );
  }

  // -------- render --------

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
      {/* ──────────── Top strip: deliverable selector ──────────── */}
      <section className="shrink-0">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-fluid-sm font-semibold text-foreground">
              Deliverables
            </h3>
            <Badge
              variant="secondary"
              className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground"
            >
              {deliverables.length}
            </Badge>
          </div>
          <span className="text-[0.7rem] text-muted-foreground">
            Order #{order.display_number}
          </span>
        </div>

        <ScrollArea className="w-full">
          <div className="flex items-stretch gap-2 pb-1 scroll-smooth-x">
            {deliverables.map((d) => (
              <DeliverableCard
                key={d.id}
                deliverable={d}
                active={d.id === selectedDeliverable.id}
                onClick={() => handleSelectDeliverable(d.id)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* ──────────── Middle: 2-column workspace ──────────── */}
      <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* LEFT — player + version chips + actions */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="min-h-0 flex-1">
            <VideoReviewPlayer
              deliverable={selectedDeliverable}
              currentTimeSec={currentTimeSec}
              playing={playing}
              comments={allComments}
              onSeek={handleSeek}
              onTogglePlay={handleTogglePlay}
              onCommentClick={handleCommentClick}
            />
          </div>

          {/* Version + actions row */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-2">
            <VersionSelector
              deliverable={selectedDeliverable}
              selectedVersionId={selectedVersionId}
              onSelect={(id) => setSelectedVersionId(id)}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleRequestRevision}
                className="press !rounded-full border border-border bg-background text-foreground hover:bg-accent"
              >
                Request revision
              </Button>
              <Button
                type="button"
                onClick={handleApprove}
                className="press !rounded-full bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              >
                <Check className="size-4" />
                Approve
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT — feedback timeline */}
        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          {/* Filter pills */}
          <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const count =
                f.id === "all"
                  ? allComments.length
                  : f.id === "open"
                    ? allComments.filter((c) => !c.resolved).length
                    : allComments.filter((c) => c.resolved).length;
              return (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  className={cn(
                    "press inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[0.75rem] font-medium transition-colors duration-fast ease-standard",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{f.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[0.65rem]",
                      active
                        ? "bg-background/20 text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Timeline body */}
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
            <FeedbackTimeline
              comments={visibleComments}
              currentTimeSec={currentTimeSec}
              onCommentClick={handleCommentClick}
              onResolveToggle={handleResolveToggle}
              onAddComment={handleAddComment}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default OrderReviewTab;
