"use client";

// ============================================================================
// FeedbackTimeline — vertical comment list paired with VideoReviewPlayer.
// ----------------------------------------------------------------------------
// Mirrors the v8 review surface (FeedbackBullet in the legacy detail dialog)
// but ported to the Next.js 16 / Tailwind v4 / base-ui shadcn stack.
//
// Responsibilities:
//   - Render timestamped comments sorted by playhead position
//   - Click a timestamp pill → seek the parent video player
//   - Toggle resolved / unresolved + post a new comment at the current frame
//   - Provide an empty state when no feedback has been left yet
//
// DESIGN.md compliance:
//   §1 radius — pills are rounded-full, cards rounded-xl/2xl, textarea rounded-2xl
//   §2 button — rounded-full + .press, primary uses bg-foreground/text-background
//   §3 icon system — MessageSquare, Check, MoreHorizontal, Send, Trash2, CornerDownRight
//   §5 status tone — open vs resolved use semantic muted-foreground / emerald
// ============================================================================

import * as React from "react";
import {
  Check,
  CornerDownRight,
  MessageSquare,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatDateTimeUS,
  formatTimeUS,
  type Comment,
} from "@/components/orders/orders-data";

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------

export type FeedbackTimelineProps = {
  comments: Comment[];
  onCommentClick: (c: Comment) => void;
  onAddComment: (body: string, timestampSec: number) => void;
  currentTimeSec: number;
  onResolveToggle: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  className?: string;
};

type Filter = "all" | "open" | "resolved";

// ----------------------------------------------------------------------------
// Time formatting (M:SS / H:MM:SS) per spec
// ----------------------------------------------------------------------------

function formatPlayhead(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(r)}`;
  return `${m}:${pad(r)}`;
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------

export function FeedbackTimeline({
  comments,
  onCommentClick,
  onAddComment,
  currentTimeSec,
  onResolveToggle,
  onDeleteComment,
  className,
}: FeedbackTimelineProps) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [draft, setDraft] = React.useState("");

  const sorted = React.useMemo(() => {
    return [...comments].sort((a, b) => {
      const ta = a.timestamp_seconds ?? Number.POSITIVE_INFINITY;
      const tb = b.timestamp_seconds ?? Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [comments]);

  const visible = React.useMemo(() => {
    if (filter === "open") return sorted.filter((c) => !c.resolved);
    if (filter === "resolved") return sorted.filter((c) => c.resolved);
    return sorted;
  }, [filter, sorted]);

  const totals = React.useMemo(() => {
    const open = sorted.filter((c) => !c.resolved).length;
    const resolved = sorted.length - open;
    return { all: sorted.length, open, resolved };
  }, [sorted]);

  const trimmedDraft = draft.trim();
  const canPost = trimmedDraft.length > 0;

  function handlePost() {
    if (!canPost) return;
    onAddComment(trimmedDraft, currentTimeSec);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handlePost();
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Header ---------------------------------------------------------- */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <span className="text-fluid-sm font-semibold tracking-tight">
              Feedback
            </span>
            <Badge
              variant="secondary"
              className="h-5 rounded-full px-2 text-[11px] font-medium"
            >
              {totals.all}
            </Badge>
          </div>
        </div>

        {/* Segmented filter pills (rounded-full per DESIGN.md §1) */}
        <div className="mt-3 inline-flex h-8 items-center rounded-full bg-muted/40 p-0.5">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            count={totals.all}
            position="start"
          >
            All
          </FilterPill>
          <FilterPill
            active={filter === "open"}
            onClick={() => setFilter("open")}
            count={totals.open}
            position="middle"
          >
            Open
          </FilterPill>
          <FilterPill
            active={filter === "resolved"}
            onClick={() => setFilter("resolved")}
            count={totals.resolved}
            position="end"
          >
            Resolved
          </FilterPill>
        </div>
      </div>

      {/* Body ------------------------------------------------------------ */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth-y px-3 py-3">
        {visible.length === 0 ? (
          <EmptyState filter={filter} totalAll={totals.all} />
        ) : (
          <ul className="space-y-2 stagger-fade">
            {visible.map((c) => (
              <li key={c.id}>
                <CommentCard
                  comment={c}
                  onSeek={() => onCommentClick(c)}
                  onResolveToggle={() => onResolveToggle(c.id)}
                  onDelete={
                    onDeleteComment ? () => onDeleteComment(c.id) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer (composer) ---------------------------------------------- */}
      <div className="shrink-0 border-t border-border bg-background/80 px-3 py-3 backdrop-blur">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note at the current frame…"
          rows={2}
          className="!min-h-16 resize-none rounded-2xl border-border bg-background px-3 py-2 text-fluid-sm leading-snug placeholder:text-muted-foreground/70"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex h-7 cursor-default items-center gap-1.5 rounded-full bg-muted/60 px-2.5 text-[11px] font-medium text-muted-foreground">
                  <span className="size-1.5 shrink-0 rounded-full bg-foreground/60" />
                  <span>At {formatPlayhead(currentTimeSec)}</span>
                </span>
              }
            />
            <TooltipContent>
              Comment will be pinned to {formatPlayhead(currentTimeSec)} on the
              current version.
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground/70">
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
            </KbdGroup>
            <Button
              type="button"
              onClick={handlePost}
              disabled={!canPost}
              className="press !h-8 !rounded-full !bg-foreground !px-3 text-[12.5px] font-medium text-background hover:!bg-foreground/85 disabled:opacity-40"
            >
              <Send className="size-3.5" />
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Filter pill — segmented toggle item (rounded ends per DESIGN.md note)
// ----------------------------------------------------------------------------

function FilterPill({
  active,
  onClick,
  count,
  position,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  position: "start" | "middle" | "end";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium",
        "transition-colors duration-fast ease-standard",
        position === "start" && "!rounded-l-full !rounded-r-full",
        position === "middle" && "!rounded-full",
        position === "end" && "!rounded-r-full !rounded-l-full",
        active
          ? "bg-foreground text-background shadow-soft"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] tabular-nums",
          active
            ? "bg-background/20 text-background"
            : "bg-muted/70 text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ----------------------------------------------------------------------------
// CommentCard — one row in the timeline
// ----------------------------------------------------------------------------

function CommentCard({
  comment,
  onSeek,
  onResolveToggle,
  onDelete,
}: {
  comment: Comment;
  onSeek: () => void;
  onResolveToggle: () => void;
  onDelete?: () => void;
}) {
  const hasTimestamp = comment.timestamp_seconds !== null;
  const ts = comment.timestamp_seconds ?? 0;
  const replies = comment.replies ?? [];

  return (
    <article
      className={cn(
        "group/card relative rounded-xl border border-border bg-card p-3",
        "transition-colors duration-fast ease-standard",
        "hover:bg-accent/30",
        comment.resolved && "bg-muted/30 hover:bg-muted/40"
      )}
    >
      {/* Top row: timestamp + author + actions */}
      <div className="flex items-start gap-2">
        {hasTimestamp ? (
          <button
            type="button"
            onClick={onSeek}
            title={`Seek to ${formatPlayhead(ts)}`}
            className={cn(
              "press inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 font-mono text-[11px] font-semibold tabular-nums",
              "transition-colors duration-fast ease-standard",
              comment.resolved
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-foreground/5 text-foreground hover:bg-foreground/10"
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                comment.resolved ? "bg-muted-foreground/40" : "bg-foreground/70"
              )}
            />
            {formatPlayhead(ts)}
          </button>
        ) : (
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">
            General
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5 shrink-0">
              <AvatarImage src={comment.author_avatar} alt={comment.author_name} />
              <AvatarFallback className="text-[9px]">
                {comment.author_initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "truncate text-[12px] font-medium",
                comment.resolved
                  ? "text-muted-foreground"
                  : "text-foreground"
              )}
            >
              {comment.author_name}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="truncate text-[10.5px] text-muted-foreground/80">
                    · {formatTimeUS(comment.created_at)}
                  </span>
                }
              />
              <TooltipContent>{formatDateTimeUS(comment.created_at)}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Resolve toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolveToggle();
                }}
                aria-pressed={comment.resolved}
                className={cn(
                  "press grid size-7 shrink-0 place-items-center rounded-full",
                  "transition-colors duration-fast ease-standard",
                  comment.resolved
                    ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Check className="size-3.5" />
              </button>
            }
          />
          <TooltipContent>
            {comment.resolved ? "Mark as open" : "Mark as resolved"}
          </TooltipContent>
        </Tooltip>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="press grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={onSeek} disabled={!hasTimestamp}>
              Seek to {hasTimestamp ? formatPlayhead(ts) : "frame"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onResolveToggle}>
              {comment.resolved ? "Mark as open" : "Mark as resolved"}
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
                >
                  <Trash2 className="size-3.5" />
                  Delete comment
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body */}
      <p
        className={cn(
          "mt-2 whitespace-pre-wrap text-fluid-sm leading-relaxed",
          comment.resolved
            ? "text-muted-foreground/80 line-through decoration-muted-foreground/30 decoration-from-font"
            : "text-foreground"
        )}
      >
        {comment.body}
      </p>

      {/* Replies — collapsed preview row */}
      {replies.length > 0 && (
        <ul className="mt-2 space-y-1.5 border-l border-border/60 pl-2.5">
          {replies.map((r) => (
            <li key={r.id} className="flex items-start gap-1.5">
              <CornerDownRight className="mt-0.5 size-3 shrink-0 text-muted-foreground/60" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Avatar className="size-4 shrink-0">
                    <AvatarImage src={r.author_avatar} alt={r.author_name} />
                    <AvatarFallback className="text-[8px]">
                      {r.author_initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[11px] font-medium text-foreground">
                    {r.author_name}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground/70">
                    · {formatTimeUS(r.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-snug text-muted-foreground">
                  {r.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Footer — tiny reply link */}
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          className="press inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <CornerDownRight className="size-3" />
          Reply
        </button>
        {comment.resolved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <Check className="size-3" />
            Resolved
          </span>
        )}
      </div>
    </article>
  );
}

// ----------------------------------------------------------------------------
// Empty state
// ----------------------------------------------------------------------------

function EmptyState({
  filter,
  totalAll,
}: {
  filter: Filter;
  totalAll: number;
}) {
  // When the list is empty because of a filter (but there are comments overall),
  // show a softer "nothing here" message rather than the cold-start prompt.
  const isFilteredEmpty = filter !== "all" && totalAll > 0;

  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted/60 text-muted-foreground">
        <MessageSquare className="size-5" />
      </div>
      <p className="mt-3 text-fluid-sm font-semibold text-foreground">
        {isFilteredEmpty
          ? filter === "open"
            ? "No open feedback"
            : "No resolved feedback"
          : "No feedback yet"}
      </p>
      <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-muted-foreground">
        {isFilteredEmpty
          ? "Try switching filters to see the rest of the timeline."
          : "Add the first comment to start the review."}
      </p>
    </div>
  );
}

export default FeedbackTimeline;
