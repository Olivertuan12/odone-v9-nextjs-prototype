"use client";

import * as React from "react";
import {
  ArchiveIcon,
  AtSignIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleCheckBigIcon,
  ClockIcon,
  CopyIcon,
  CornerUpLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FilmIcon,
  FolderIcon,
  HomeIcon,
  LinkIcon,
  LockIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  MicIcon,
  MoreHorizontalIcon,
  MusicIcon,
  PaperclipIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SendIcon,
  Share2Icon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { users } from "@/components/editor-data";
import {
  MobileHeader,
  MobileHeaderIconButton,
} from "@/components/mobile/mobile-shell";

// ──────────────────────────────────────────────────────────────────────────
// Mock data — kept inline so the screen is self-contained.
// ──────────────────────────────────────────────────────────────────────────
type Comment = {
  id: string;
  authorId: string;
  time: number; // seconds — used both for label "0:21" and scrub marker position
  age: string; // "2h"
  text: string;
  resolved?: boolean;
  pinned?: boolean;
  replies?: { authorId: string; age: string; text: string }[];
  reactions?: { emoji: string; count: number; mine?: boolean }[];
};

const COMMENTS: Comment[] = [
  {
    id: "c1",
    authorId: "KY",
    time: 21,
    age: "2h",
    text: "Shot lacks movement. Can we speed-ramp this slightly to match the beat drop?",
    pinned: true,
    reactions: [{ emoji: "🔥", count: 2 }, { emoji: "👍", count: 1, mine: true }],
    replies: [
      { authorId: "MA", age: "1h", text: "Working on it now. Trying 1.4× ramp over 8 frames." },
    ],
  },
  {
    id: "c2",
    authorId: "KY",
    time: 15,
    age: "4h",
    text: "Red WB cast on the kitchen counter — pulled back in v2.",
    resolved: true,
  },
  {
    id: "c3",
    authorId: "MJ",
    time: 45,
    age: "3h",
    text: "Client requested to replace this sky, it looks a bit blown out.",
    reactions: [{ emoji: "✅", count: 1 }],
  },
  {
    id: "c4",
    authorId: "MA",
    time: 52,
    age: "32m",
    text: "Address graphic outro feels a touch slow. Bring it up to 1s hold?",
  },
];

const VIDEO_LEN = 58;

const FILTER_KEYS = ["all", "open", "resolved"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

// Three resting states + one focused "comment mode" triggered by input focus.
type SnapKey = "peek" | "half" | "full";

// snap height (sheet) as fraction of available content area (below header).
// Peek = just enough for handle + scrub + input (no comment list visible),
// so the user sees as much video as possible.
const SNAP_FRAC: Record<SnapKey, number> = {
  peek: 0.16,
  half: 0.5,
  full: 0.86,
};
// Minimum pixel height for the peek snap — guarantees scrub + input fit
// even on shorter viewports.
const PEEK_MIN_PX = 130;

// ──────────────────────────────────────────────────────────────────────────
export function MobileFeedback() {
  const [time, setTime] = React.useState(21);
  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [controlsShown, setControlsShown] = React.useState(true);

  // Initial snap can be overridden via ?snap=peek|half|full for testing.
  const initialSnap = React.useMemo<SnapKey>(() => {
    if (typeof window === "undefined") return "half";
    const v = new URLSearchParams(window.location.search).get("snap");
    return v === "peek" || v === "full" ? v : "half";
  }, []);
  const [snap, setSnap] = React.useState<SnapKey>(initialSnap);
  // Manual height while dragging (in px of sheet, measured from bottom).
  const [dragH, setDragH] = React.useState<number | null>(null);

  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [draft, setDraft] = React.useState("");
  const [pinToTime, setPinToTime] = React.useState(true);
  const [commentMode, setCommentMode] = React.useState(false);
  const [locked, setLocked] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [versionMenu, setVersionMenu] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  // Simulated playback tick so the active comment + scrubber move.
  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTime((t) => {
        const next = t + 0.5;
        if (next >= VIDEO_LEN) {
          setPlaying(false);
          return VIDEO_LEN;
        }
        return next;
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [playing]);

  // Auto-hide controls 2s after they show, when playing.
  React.useEffect(() => {
    if (!controlsShown || !playing) return;
    const id = window.setTimeout(() => setControlsShown(false), 2000);
    return () => window.clearTimeout(id);
  }, [controlsShown, playing]);

  // ── Measure available area to translate sheet snap → px height
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [stageH, setStageH] = React.useState(700);
  React.useEffect(() => {
    if (!stageRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setStageH(entry.contentRect.height);
    });
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  const sheetH = React.useMemo(() => {
    if (commentMode) {
      // Reserve ~30% for video so it stays watchable, sheet takes the rest.
      const videoMin = Math.max(160, Math.round(stageH * 0.3));
      return stageH - videoMin;
    }
    if (dragH != null) return dragH;
    // Full snap = sheet covers everything below the header. Video disappears.
    if (snap === "full") return stageH;
    // At peek, clamp to PEEK_MIN_PX so the sheet is tight to its content.
    if (snap === "peek") {
      return Math.max(PEEK_MIN_PX, Math.round(stageH * SNAP_FRAC.peek));
    }
    return Math.round(stageH * SNAP_FRAC[snap]);
  }, [commentMode, dragH, snap, stageH]);

  // ── Drag handle (pointer events — works for touch + mouse)
  const dragStart = React.useRef<{ y: number; startH: number } | null>(null);
  const onHandlePointerDown = (e: React.PointerEvent) => {
    if (commentMode) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragStart.current = { y: e.clientY, startH: sheetH };
    setDragH(sheetH);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const delta = dragStart.current.y - e.clientY;
    const next = Math.max(80, Math.min(stageH - 60, dragStart.current.startH + delta));
    setDragH(next);
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    const finalH = dragH ?? sheetH;
    // snap to nearest
    const candidates: { k: SnapKey; v: number }[] = [
      { k: "peek", v: stageH * SNAP_FRAC.peek },
      { k: "half", v: stageH * SNAP_FRAC.half },
      { k: "full", v: stageH * SNAP_FRAC.full },
    ];
    const nearest = candidates.reduce((a, b) =>
      Math.abs(b.v - finalH) < Math.abs(a.v - finalH) ? b : a,
    );
    setSnap(nearest.k);
    setDragH(null);
    dragStart.current = null;
  };

  // ── Filtered comments
  const visible = React.useMemo(() => {
    if (filter === "open") return COMMENTS.filter((c) => !c.resolved);
    if (filter === "resolved") return COMMENTS.filter((c) => c.resolved);
    return COMMENTS;
  }, [filter]);

  // Active comment = one with time closest to playhead, within 2s window.
  const activeId = React.useMemo(() => {
    const open = visible.filter((c) => !c.resolved);
    if (!open.length) return null;
    const c = open.reduce((a, b) =>
      Math.abs(b.time - time) < Math.abs(a.time - time) ? b : a,
    );
    return Math.abs(c.time - time) <= 2 ? c.id : null;
  }, [time, visible]);

  // Auto-scroll list when active changes
  const listRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!activeId) return;
    const el = listRef.current?.querySelector(`[data-cid="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  // ── Seek
  const seekTo = (t: number) => {
    setTime(Math.max(0, Math.min(VIDEO_LEN, t)));
    setControlsShown(true);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* HEADER — back, title (with inline version chip in subtitle),
          primary Approve, Share, More (contains Download/Export/Reassign/Archive) */}
      <MobileHeader
        title="45 Yorkshire Dr"
        subtitle={
          <button
            onClick={() => setVersionMenu((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground active:text-foreground"
          >
            Walkthrough ·{" "}
            <span className="inline-flex items-center gap-0.5 rounded border border-indigo-500/30 bg-indigo-500/15 px-1 font-bold text-indigo-300">
              v2 <ChevronDownIcon className="size-2.5 opacity-70" />
            </span>
          </button>
        }
        back
        right={
          <>
            {/* Share comes BEFORE Approve — sharing is the more common action
                during review; Approve is the final commit and sits next to ⋯ */}
            <MobileHeaderIconButton
              aria-label="Share"
              onClick={() => setShareOpen(true)}
            >
              <Share2Icon className="size-[18px]" />
            </MobileHeaderIconButton>

            {locked ? (
              <button
                onClick={() => setLocked(false)}
                className="flex h-7 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 text-[11px] font-bold text-emerald-400 active:bg-emerald-500/15"
              >
                <LockIcon className="size-3" /> Unlock
              </button>
            ) : (
              <button
                onClick={() => {
                  setLocked(true);
                  toast.success("v2 approved", {
                    description: "Comments locked. Ready for delivery.",
                  });
                }}
                className="flex h-7 items-center gap-1 rounded-full bg-emerald-500 px-2 text-[11px] font-bold text-black active:bg-emerald-600"
              >
                <CheckIcon className="size-3" /> Approve
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    aria-label="More"
                    className="relative grid size-8 place-items-center rounded-full text-foreground active:bg-accent"
                  />
                }
              >
                <MoreHorizontalIcon className="size-[18px]" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Files
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => toast.info("Download v2 video", { description: "1080×1920 · 0:58 · 142 MB" })}>
                  <DownloadIcon /> Download video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Export comments", { description: "Plain text (.txt)" })}>
                  <FileTextIcon /> Export comments — .txt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Export comments", { description: "Final Cut Pro XML (.fcpxml)" })}>
                  <FilmIcon /> Export comments — .fcpxml
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Copied", { description: "Comments copied to clipboard." })}>
                  <CopyIcon /> Copy comments to clipboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Project
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                  <FolderIcon /> Project details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserPlusIcon /> Reassign editor
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLinkIcon /> Open in new tab
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <ArchiveIcon /> Archive order
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <XIcon /> Cancel order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {versionMenu && (
        <VersionMenu onClose={() => setVersionMenu(false)} />
      )}

      {/* STAGE (header is above; everything below shares this space) */}
      <div ref={stageRef} className="relative flex flex-1 flex-col overflow-hidden">
        {/* VIDEO REGION — at FULL snap we skip the video AND the mini-player
            entirely: the sheet (header + comments + input) becomes the whole
            screen. Below 140px we show a tiny compact bar; otherwise the
            normal portrait frame. */}
        {snap === "full" && !commentMode ? null : (() => {
          const remainingH = Math.max(0, stageH - sheetH);
          const useCompact = remainingH < 140;
          return useCompact ? (
            <CompactVideoBar
              time={time}
              total={VIDEO_LEN}
              playing={playing}
              muted={muted}
              onTogglePlay={() => {
                setPlaying((p) => !p);
                setControlsShown(true);
              }}
              onToggleMute={() => setMuted((m) => !m)}
            />
          ) : (
            <div
              className="relative w-full overflow-hidden bg-black"
              style={{ height: `${remainingH}px` }}
              onClick={() => {
                setPlaying((p) => !p);
                setControlsShown(true);
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="relative h-full max-w-full"
                  style={{ aspectRatio: "9 / 16" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950" />

                  {/* Center play/pause — the only chrome on the video itself.
                      Mute, time, filter, and options all live in the sheet. */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={cn(
                        "grid size-14 place-items-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md transition-opacity",
                        controlsShown || !playing ? "opacity-100" : "opacity-0",
                      )}
                    >
                      {playing ? (
                        <PauseIcon className="size-5 text-white" />
                      ) : (
                        <PlayIcon className="ml-0.5 size-5 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SHEET — absolute pinned to bottom, height controlled */}
        <FeedbackSheet
          height={sheetH}
          snap={snap}
          dragging={dragH != null}
          commentMode={commentMode}
          onHandlePointerDown={onHandlePointerDown}
          onHandlePointerMove={onHandlePointerMove}
          onHandlePointerUp={onHandlePointerUp}
        >
          {/* Scrub + options. At FULL snap the user is reading comments — we
              hide the scrub entirely and keep just a slim options icon row.
              At half/peek the scrub is the main control. */}
          {!commentMode && snap !== "full" && (
            <div className="shrink-0 px-3 pb-1">
              <div className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-[10.5px] font-semibold tabular-nums text-muted-foreground">
                  {fmt(time)}
                </span>
                <div className="min-w-0 flex-1">
                  <ScrubBar
                    time={time}
                    total={VIDEO_LEN}
                    comments={COMMENTS}
                    activeId={activeId}
                    onSeek={seekTo}
                  />
                </div>
                <span className="shrink-0 font-mono text-[10.5px] font-semibold tabular-nums text-muted-foreground/70">
                  {fmt(VIDEO_LEN)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        aria-label="Comment options"
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-accent active:text-foreground"
                      />
                    }
                  >
                    <MoreHorizontalIcon className="size-[18px]" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[200px]">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Show
                    </DropdownMenuLabel>
                    {FILTER_KEYS.map((k) => {
                      const count =
                        k === "all"
                          ? COMMENTS.length
                          : k === "open"
                          ? COMMENTS.filter((c) => !c.resolved).length
                          : COMMENTS.filter((c) => c.resolved).length;
                      return (
                        <DropdownMenuItem
                          key={k}
                          onClick={() => setFilter(k)}
                          className={cn(filter === k && "bg-accent/40")}
                        >
                          <span className="flex-1">
                            {k === "all" ? "All notes" : k === "open" ? "Open" : "Resolved"}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {count}
                          </span>
                          {filter === k && <CheckIcon className="size-3.5 text-foreground" />}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Timestamp
                    </DropdownMenuLabel>
                    <DropdownMenuItem className="cursor-default focus:bg-transparent">
                      <span className="flex-1">Position</span>
                      <span className="font-mono text-[11px] font-semibold text-foreground">
                        {fmt(time)} <span className="text-muted-foreground/40">/</span>{" "}
                        {fmt(VIDEO_LEN)}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Slim header at FULL snap — just title row + options icon. Lets
              comments breathe; no playback chrome since the user came here
              to read, not to play. */}
          {!commentMode && snap === "full" && !locked && (
            <div className="flex shrink-0 items-center justify-between px-4 pb-1.5 pt-0.5">
              <span className="text-[12px] font-semibold text-foreground">
                Notes{" "}
                <span className="font-mono text-[10.5px] font-normal text-muted-foreground">
                  · {visible.length}
                </span>
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      aria-label="Comment options"
                      className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-accent"
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-[18px]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Show
                  </DropdownMenuLabel>
                  {FILTER_KEYS.map((k) => {
                    const count =
                      k === "all"
                        ? COMMENTS.length
                        : k === "open"
                        ? COMMENTS.filter((c) => !c.resolved).length
                        : COMMENTS.filter((c) => c.resolved).length;
                    return (
                      <DropdownMenuItem
                        key={k}
                        onClick={() => setFilter(k)}
                        className={cn(filter === k && "bg-accent/40")}
                      >
                        <span className="flex-1">
                          {k === "all" ? "All notes" : k === "open" ? "Open" : "Resolved"}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {count}
                        </span>
                        {filter === k && <CheckIcon className="size-3.5 text-foreground" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* In comment mode: tiny status strip above list — shows scope + time */}
          {commentMode && (
            <div className="flex shrink-0 items-center justify-between px-4 pb-1.5 pt-0.5 text-[11px]">
              <span className="text-muted-foreground">
                Replying at{" "}
                <span className="font-mono font-bold text-foreground">{fmt(time)}</span>
              </span>
              <button
                onClick={() => setCommentMode(false)}
                className="text-[11px] font-bold text-muted-foreground active:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Comment list — collapsed at peek so the sheet hugs scrub + input
              (no empty gap). Visible at half/full and in comment mode.
              The mask-image gives a soft fade at top and bottom so content
              dissolves into the chrome instead of cutting off harshly. */}
          {(snap !== "peek" || commentMode) && (
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto px-2 pt-3 pb-4 [scrollbar-width:thin] [mask-image:linear-gradient(to_bottom,transparent_0,black_18px,black_calc(100%-18px),transparent_100%)]"
            >
              {visible.length === 0 ? (
                <EmptyState filter={filter} />
              ) : (
                <div className="flex flex-col gap-1">
                  {visible.map((c) => (
                    <CommentRow
                      key={c.id}
                      comment={c}
                      active={c.id === activeId}
                      locked={locked}
                      onSeek={() => seekTo(c.time)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Spacer when peek hides the list — keeps input pinned to the bottom
              edge of the sheet without comments above. */}
          {snap === "peek" && !commentMode && <div className="flex-1" />}

          {/* Reaction quick row — only in comment mode */}
          {commentMode && !locked && (
            <div className="border-t border-border bg-background">
              <div className="flex items-center justify-between overflow-x-auto scrollbar-none px-3 py-2.5">
                {["❤️", "🙌", "🔥", "👏", "✅", "❓", "😍", "🥲"].map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setDraft((d) => (d.length === 0 ? e : d + " " + e));
                    }}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-[22px] active:scale-90 active:bg-accent"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          {locked ? (
            <div className="shrink-0 border-t border-border bg-emerald-500/[0.06] px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] text-emerald-400">
                <LockIcon className="size-3.5 shrink-0" />
                <p>
                  Approved — comments locked.{" "}
                  <button
                    onClick={() => setLocked(false)}
                    className="font-bold underline-offset-2 hover:underline"
                  >
                    Unlock
                  </button>{" "}
                  to reopen.
                </p>
              </div>
            </div>
          ) : (
            <CommentInput
              draft={draft}
              setDraft={setDraft}
              pinToTime={pinToTime}
              setPinToTime={setPinToTime}
              time={time}
              focused={commentMode}
              onFocus={() => setCommentMode(true)}
              onBlur={() => setCommentMode(false)}
              onSend={() => {
                setDraft("");
                setCommentMode(false);
              }}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          )}

          {/* Mock keyboard — only in comment mode, only when focused (desktop preview).
              On real mobile, OS keyboard takes over so we hide this. */}
          {commentMode && <MockKeyboard onTypingDismiss={() => setCommentMode(false)} />}
        </FeedbackSheet>
      </div>

      {/* Details sheet — Brief/Assets/People */}
      <DetailsSheet open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function ScrubBar({
  time,
  total,
  comments,
  activeId,
  onSeek,
}: {
  time: number;
  total: number;
  comments: Comment[];
  activeId: string | null;
  onSeek: (t: number) => void;
}) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const seekFromPointer = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * total);
  };

  return (
    <div className="px-4 pb-2 pt-3">
      <div
        ref={trackRef}
        className="relative h-8 cursor-pointer touch-none"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture(e.pointerId);
          seekFromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          seekFromPointer(e.clientX);
        }}
      >
        {/* Marker dots above track */}
        {comments.map((c) => {
          const left = `${(c.time / total) * 100}%`;
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(c.time);
              }}
              className={cn(
                "absolute -top-0.5 -translate-x-1/2 transition-transform",
                isActive && "scale-125",
              )}
              style={{ left }}
              aria-label={`Seek to ${fmt(c.time)}`}
            >
              <span
                className={cn(
                  "block size-2 rounded-full border-2 border-background",
                  c.resolved
                    ? "bg-emerald-500"
                    : isActive
                    ? "animate-pulse bg-amber-400"
                    : "bg-foreground",
                )}
              />
            </button>
          );
        })}

        {/* Track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2">
          <div className="relative h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-75"
              style={{ width: `${(time / total) * 100}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 size-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background bg-foreground shadow-lg"
              style={{ left: `${(time / total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Compact horizontal mini-player — used when the portrait video region is too
// short to render the 9:16 frame without clipping/wrapping. Shows a small
// thumbnail + play/pause + inline progress + time + mute, all in one bar.
function CompactVideoBar({
  time,
  total,
  playing,
  muted,
  onTogglePlay,
  onToggleMute,
}: {
  time: number;
  total: number;
  playing: boolean;
  muted: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
}) {
  const progress = Math.max(0, Math.min(1, time / total));
  return (
    <div className="relative flex w-full shrink-0 items-center gap-3 bg-black px-3 py-2">
      {/* Mini thumbnail — portrait sliver */}
      <div className="relative h-12 w-7 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950">
        <PlayIcon className="absolute inset-0 m-auto size-3 text-white/70" />
      </div>

      {/* Play / pause */}
      <button
        onClick={onTogglePlay}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur active:bg-white/20"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="ml-0.5 size-4" />
        )}
      </button>

      {/* Inline progress */}
      <div className="relative h-1 flex-1 rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white/85 transition-[width] duration-75"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Time */}
      <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-white/90">
        {fmt(time)} / {fmt(total)}
      </span>

      {/* Mute */}
      <button
        onClick={onToggleMute}
        className="grid size-8 shrink-0 place-items-center rounded-full text-white/90 active:bg-white/10"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeXIcon className="size-4" /> : <Volume2Icon className="size-4" />}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Player control bar — sits between the video frame and the sheet.
// Holds: play/pause · scrub with comment markers · time · mute.
// The sheet above no longer needs its own scrub.
function PlayerControlBar({
  time,
  total,
  playing,
  muted,
  comments,
  activeId,
  onTogglePlay,
  onToggleMute,
  onSeek,
  commentCount,
}: {
  time: number;
  total: number;
  playing: boolean;
  muted: boolean;
  comments: Comment[];
  activeId: string | null;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSeek: (t: number) => void;
  commentCount: number;
}) {
  return (
    <div className="relative flex h-14 shrink-0 items-center gap-2 bg-background px-3">
      {/* Play / pause */}
      <button
        onClick={onTogglePlay}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background active:opacity-80"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <PauseIcon className="size-[18px]" />
        ) : (
          <PlayIcon className="ml-0.5 size-[18px]" />
        )}
      </button>

      {/* Scrub bar with comment markers — takes the rest of the row */}
      <div className="min-w-0 flex-1">
        <ScrubBarInline
          time={time}
          total={total}
          comments={comments}
          activeId={activeId}
          onSeek={onSeek}
        />
      </div>

      {/* Time */}
      <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
        {fmt(time)}
        <span className="text-muted-foreground/40"> / </span>
        {fmt(total)}
      </span>

      {/* Mute — now lives here, not on the video */}
      <button
        onClick={onToggleMute}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-accent"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeXIcon className="size-[18px]" /> : <Volume2Icon className="size-[18px]" />}
      </button>

      {/* Comment count chip — overlaid as a hint */}
      {commentCount > 0 && (
        <span
          className="pointer-events-none absolute -top-1 right-3 inline-flex h-4 items-center gap-1 rounded-full bg-amber-500/15 px-1.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-300"
          title="Open comments"
        >
          <MessageCircleIcon className="size-2.5" /> {commentCount}
        </span>
      )}
    </div>
  );
}

// Inline variant of the scrub bar — same markers logic, smaller padding,
// designed to live inside the PlayerControlBar.
function ScrubBarInline({
  time,
  total,
  comments,
  activeId,
  onSeek,
}: {
  time: number;
  total: number;
  comments: Comment[];
  activeId: string | null;
  onSeek: (t: number) => void;
}) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const seekFromPointer = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onSeek(ratio * total);
  };

  return (
    <div
      ref={trackRef}
      className="relative h-7 cursor-pointer touch-none"
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        seekFromPointer(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 0) return;
        seekFromPointer(e.clientX);
      }}
    >
      {/* Markers */}
      {comments.map((c) => {
        const left = `${(c.time / total) * 100}%`;
        const isActive = c.id === activeId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(c.time);
            }}
            className={cn(
              "absolute -top-0 -translate-x-1/2 transition-transform",
              isActive && "scale-125",
            )}
            style={{ left }}
            aria-label={`Seek to ${fmt(c.time)}`}
          >
            <span
              className={cn(
                "block size-2 rounded-full border-2 border-background",
                c.resolved
                  ? "bg-emerald-500"
                  : isActive
                  ? "animate-pulse bg-amber-400"
                  : "bg-foreground",
              )}
            />
          </button>
        );
      })}

      {/* Track */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2">
        <div className="relative h-[5px] rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-75"
            style={{ width: `${(time / total) * 100}%` }}
          />
          <div
            className="absolute top-1/2 size-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background bg-foreground shadow-md"
            style={{ left: `${(time / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function FeedbackSheet({
  height,
  snap,
  dragging,
  commentMode,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  children,
}: {
  height: number;
  snap: SnapKey;
  dragging: boolean;
  commentMode: boolean;
  onHandlePointerDown: (e: React.PointerEvent) => void;
  onHandlePointerMove: (e: React.PointerEvent) => void;
  onHandlePointerUp: (e: React.PointerEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[20px] border-t border-border bg-popover shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.6)]",
        !dragging && "transition-[height] duration-200 ease-out",
      )}
      style={{ height }}
    >
      {/* Drag handle — collapses to a thin strip in comment mode (no dragging) */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center",
          commentMode ? "h-2" : "h-6",
        )}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        style={{ touchAction: commentMode ? "auto" : "none" }}
      >
        {!commentMode && <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />}
      </div>

      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function CommentRow({
  comment,
  active,
  locked,
  onSeek,
}: {
  comment: Comment;
  active: boolean;
  locked: boolean;
  onSeek: () => void;
}) {
  const u = users[comment.authorId];
  const [swipeX, setSwipeX] = React.useState(0);
  const startX = React.useRef<number | null>(null);
  const [showActions, setShowActions] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const ACTION_W = 156; // px of revealed actions

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    startX.current = e.clientX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -ACTION_W));
  };
  const onPointerUp = () => {
    if (startX.current == null) return;
    if (swipeX < -ACTION_W * 0.4) {
      setSwipeX(-ACTION_W);
      setShowActions(true);
    } else {
      setSwipeX(0);
      setShowActions(false);
    }
    startX.current = null;
  };
  const close = () => {
    setSwipeX(0);
    setShowActions(false);
  };

  if (!u) return null;

  const swiping = swipeX < -2 || showActions;

  return (
    <div
      data-cid={comment.id}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Action backplate — only mounted while actively swiping, so it never
          leaks through a translucent active/resolved card on initial render. */}
      {swiping && (
        <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-2">
          <ActionBtn
            tone="emerald"
            label={comment.resolved ? "Reopen" : "Resolve"}
            icon={CircleCheckBigIcon}
            onClick={close}
          />
          <ActionBtn tone="indigo" label="Reply" icon={CornerUpLeftIcon} onClick={close} />
        </div>
      )}

      {/* Foreground row */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (showActions) return close();
          setExpanded((v) => !v);
        }}
        className={cn(
          "relative flex w-full gap-2.5 rounded-xl bg-popover px-3 py-2.5 transition-transform",
        )}
        style={{ transform: `translateX(${swipeX}px)`, touchAction: "pan-y" }}
      >
        {/* Active tint — overlays card bg without making card translucent */}
        {active && !comment.resolved && (
          <span className="pointer-events-none absolute inset-0 rounded-xl bg-amber-500/[0.07]" />
        )}
        {/* Active accent */}
        {active && !comment.resolved && (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-amber-400" />
        )}

        <Avatar
          className={cn(
            "relative mt-0.5 size-7 shrink-0",
            comment.resolved && "opacity-50",
          )}
        >
          <AvatarImage src={u.image} alt={u.name} />
          <AvatarFallback className={cn("text-[10px]", u.tone)}>{u.initials}</AvatarFallback>
        </Avatar>

        <div className={cn("relative min-w-0 flex-1", comment.resolved && "opacity-70")}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSeek();
              }}
              className={cn(
                "rounded px-1 font-mono text-[10.5px] font-bold leading-[1.4] transition-colors",
                comment.resolved
                  ? "bg-muted text-muted-foreground"
                  : active
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
                  : "border border-border bg-muted text-foreground",
              )}
            >
              {fmt(comment.time)}
            </button>
            <span className="truncate text-[11.5px] font-semibold">{u.name}</span>
            <span className="text-[10.5px] text-muted-foreground">· {comment.age}</span>
            {comment.resolved && (
              <CircleCheckBigIcon className="size-3 fill-emerald-500/80 stroke-[2.5] text-background" />
            )}
          </div>

          <p
            className={cn(
              "mt-0.5 text-[13px] leading-snug",
              comment.resolved && "text-muted-foreground line-through",
            )}
          >
            {comment.text}
          </p>

          {/* Reactions */}
          {comment.reactions && comment.reactions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {comment.reactions.map((r, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[11px]",
                    r.mine
                      ? "border border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                      : "border border-border bg-muted/60 text-foreground",
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.count}</span>
                </span>
              ))}
            </div>
          )}

          {/* Reply count chip */}
          {comment.replies && comment.replies.length > 0 && !expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              className="mt-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-muted/60 px-1.5 text-[10.5px] text-muted-foreground active:bg-muted"
            >
              <CornerUpLeftIcon className="size-2.5" />
              {comment.replies.length}{" "}
              {comment.replies.length === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Expanded replies */}
          {expanded && comment.replies && (
            <div className="mt-2 space-y-2 border-l border-border pl-2.5">
              {comment.replies.map((r, i) => {
                const ru = users[r.authorId];
                if (!ru) return null;
                return (
                  <div key={i} className="flex gap-2">
                    <Avatar className="size-5 shrink-0">
                      <AvatarImage src={ru.image} alt={ru.name} />
                      <AvatarFallback className={cn("text-[8px]", ru.tone)}>
                        {ru.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-semibold">{ru.name}</span>
                        <span className="text-[9.5px] text-muted-foreground">{r.age}</span>
                      </div>
                      <p className="text-[12px] leading-snug">{r.text}</p>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-semibold text-indigo-400 active:text-indigo-300"
              >
                + Add reply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  tone,
  label,
  icon: Icon,
  onClick,
}: {
  tone: "emerald" | "indigo" | "rose";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  const toneClass = {
    emerald: "bg-emerald-500 text-black",
    indigo: "bg-indigo-500 text-white",
    rose: "bg-rose-500 text-white",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-12 w-[72px] flex-col items-center justify-center gap-0.5 rounded-xl font-bold active:opacity-80",
        toneClass,
      )}
    >
      <Icon className="size-4" />
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function CommentInput({
  draft,
  setDraft,
  pinToTime,
  setPinToTime,
  time,
  focused,
  onFocus,
  onBlur,
  onSend,
  muted,
  onToggleMute,
}: {
  draft: string;
  setDraft: (v: string) => void;
  pinToTime: boolean;
  setPinToTime: (v: boolean) => void;
  time: number;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onSend: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div
      className={cn(
        // Tight bottom padding so the input row "sticks" to the sheet/screen
        // edge without an empty band below it. Top padding stays a bit larger
        // for visual separation from the comment list above.
        "shrink-0 border-t border-border bg-background px-3 pt-2 pb-1.5",
        focused && "pt-2",
      )}
    >
      {/* Pin-to-time chip + attachments — collapse when not focused */}
      {focused && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <button
            onClick={() => setPinToTime(!pinToTime)}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[10.5px] font-bold transition-colors",
              pinToTime
                ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30"
                : "bg-muted/60 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                pinToTime ? "bg-amber-400" : "bg-muted-foreground",
              )}
            />
            {pinToTime ? `Pinned · ${fmt(time)}` : "Free note"}
            {pinToTime && (
              <XIcon
                className="size-3"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinToTime(false);
                }}
              />
            )}
          </button>
        </div>
      )}

      {/* Input row — mute on the far left (moved off the video), input pill,
          always-visible send button on the right. */}
      <div className="flex items-center gap-2">
        {/* Mute toggle — relocated from the top of the video to the bottom edge */}
        <button
          onClick={onToggleMute}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full border border-border transition-colors",
            muted
              ? "bg-rose-500/10 text-rose-300"
              : "bg-muted/50 text-muted-foreground active:bg-muted",
          )}
          aria-label={muted ? "Unmute" : "Mute"}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeXIcon className="size-4" /> : <Volume2Icon className="size-4" />}
        </button>

        <div className="flex h-10 flex-1 items-center gap-1 rounded-full border border-border bg-muted/50 pl-4 pr-1 focus-within:border-foreground/40 focus-within:bg-background">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={onFocus}
            onBlur={(e) => {
              setTimeout(() => {
                if (document.activeElement !== e.target) onBlur();
              }, 50);
            }}
            placeholder={pinToTime ? `Add note at ${fmt(time)}…` : "Add a note…"}
            className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
          {!focused ? (
            <>
              <button
                className="grid size-8 place-items-center rounded-full text-muted-foreground active:bg-accent"
                aria-label="Attach"
              >
                <PaperclipIcon className="size-4" />
              </button>
              <button
                className="grid size-8 place-items-center rounded-full text-muted-foreground active:bg-accent"
                aria-label="Voice"
              >
                <MicIcon className="size-4" />
              </button>
            </>
          ) : (
            <button
              className="grid size-8 place-items-center rounded-full text-muted-foreground active:bg-accent"
              aria-label="Mention"
            >
              <AtSignIcon className="size-4" />
            </button>
          )}
        </div>

        {/* Send button — always anchored on the right. Active when draft has
            content, dimmed when empty so the user always knows where to send. */}
        <button
          onClick={() => {
            if (draft.trim().length > 0) onSend();
          }}
          disabled={draft.trim().length === 0}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
            draft.trim().length > 0
              ? "bg-foreground text-background active:opacity-80"
              : "bg-muted text-muted-foreground/70",
          )}
          aria-label="Send"
        >
          <SendIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Mock keyboard for desktop preview only.
// On real touch device the OS keyboard handles this; we hide via media query.
// iPhone-style keyboard (dark). Letter keys are lighter, special keys (shift,
// delete, 123, emoji, return) are darker — matching native iOS appearance.
function MockKeyboard({ onTypingDismiss }: { onTypingDismiss: () => void }) {
  const row1 = "QWERTYUIOP".split("");
  const row2 = "ASDFGHJKL".split("");
  const row3 = "ZXCVBNM".split("");

  const letterKey =
    "h-[34px] flex-1 rounded-[5px] bg-[#6B6C6F] text-[15px] font-normal text-white shadow-[0_1px_0_0_rgba(0,0,0,0.55)] active:bg-[#5B5C5F]";
  const specialKey =
    "h-[34px] flex items-center justify-center rounded-[5px] bg-[#454547] text-[14px] font-medium text-white shadow-[0_1px_0_0_rgba(0,0,0,0.55)] active:bg-[#353537]";

  return (
    <div className="hidden shrink-0 select-none bg-[#212023] pt-1 pb-[env(safe-area-inset-bottom)] md:block">
      <div className="space-y-[6px] px-[3px] pb-1">
        {/* Row 1 — 10 letter keys */}
        <div className="flex items-center justify-center gap-[5px]">
          {row1.map((k) => (
            <button key={k} className={cn(letterKey, "min-w-0")}>
              {k}
            </button>
          ))}
        </div>

        {/* Row 2 — 9 letter keys, indented (centered) */}
        <div className="flex items-center justify-center gap-[5px] px-[19px]">
          {row2.map((k) => (
            <button key={k} className={cn(letterKey, "min-w-0")}>
              {k}
            </button>
          ))}
        </div>

        {/* Row 3 — shift + 7 letters + delete */}
        <div className="flex items-center justify-center gap-[5px]">
          <button className={cn(specialKey, "w-[34px]")} aria-label="Shift">
            <svg viewBox="0 0 16 16" className="size-[15px]" fill="currentColor">
              <path d="M8 2.5 14 9h-3v4H5V9H2L8 2.5Z" />
            </svg>
          </button>
          {row3.map((k) => (
            <button key={k} className={cn(letterKey, "min-w-0")}>
              {k}
            </button>
          ))}
          <button
            onClick={onTypingDismiss}
            className={cn(specialKey, "w-[34px]")}
            aria-label="Delete"
          >
            <svg viewBox="0 0 20 14" className="size-[18px]" fill="currentColor">
              <path d="M6 0h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6L0 7l6-7Zm5.3 3.5L9.5 5.3 11.3 7.1 9.5 8.9l1.4 1.4 1.8-1.8 1.8 1.8 1.4-1.4-1.8-1.8 1.8-1.8-1.4-1.4-1.8 1.8-1.8-1.8Z" />
            </svg>
          </button>
        </div>

        {/* Row 4 — 123 | emoji | space | return */}
        <div className="flex items-center justify-center gap-[5px] pt-[1px]">
          <button className={cn(specialKey, "w-[42px] text-[13px]")}>123</button>
          <button className={cn(specialKey, "w-[34px] text-[18px]")} aria-label="Emoji">
            <svg viewBox="0 0 16 16" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="8" cy="8" r="6.5" />
              <circle cx="5.7" cy="6.6" r="0.7" fill="currentColor" />
              <circle cx="10.3" cy="6.6" r="0.7" fill="currentColor" />
              <path d="M5.4 10c.7.8 1.6 1.2 2.6 1.2s1.9-.4 2.6-1.2" strokeLinecap="round" />
            </svg>
          </button>
          <button className={cn(letterKey, "flex-[3] !text-[13px] !font-medium")}>
            space
          </button>
          <button
            onClick={onTypingDismiss}
            className={cn(specialKey, "w-[58px] text-[13px]")}
          >
            return
          </button>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pt-1.5">
          <span className="h-[3px] w-[110px] rounded-full bg-white/85" />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function EmptyState({ filter }: { filter: FilterKey }) {
  return (
    <div className="grid place-items-center px-6 py-8 text-center">
      <div className="mb-2 grid size-10 place-items-center rounded-full bg-muted">
        <MessageCircleIcon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-semibold">
        {filter === "open"
          ? "All clear"
          : filter === "resolved"
          ? "Nothing resolved yet"
          : "Be the first to comment"}
      </p>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        Tap the timeline or type below — your note pins to the current frame.
      </p>
    </div>
  );
}

function VersionMenu({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="absolute right-3 top-14 z-50 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
        <div className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Versions
        </div>
        <button className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-medium active:bg-accent">
          <span>v2</span>
          <Badge className="h-4 rounded-full bg-indigo-500/15 px-1.5 text-[9px] font-bold text-indigo-300">
            current
          </Badge>
        </button>
        <button className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] text-muted-foreground active:bg-accent">
          <span>v1</span>
          <span className="text-[10px]">May 17</span>
        </button>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function DetailsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <button
        className="absolute inset-0 z-40 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-label="Close details"
      />
      <div
        className="absolute inset-x-0 bottom-0 z-50 max-h-[86%] overflow-hidden rounded-t-[20px] border-t border-border bg-popover shadow-2xl animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex h-6 items-center justify-center">
          <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />
        </div>
        <div className="flex h-12 items-center justify-between px-4">
          <h3 className="text-[15px] font-semibold">Project details</h3>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full active:bg-accent"
            aria-label="Close"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="max-h-[calc(86vh-72px)] overflow-y-auto px-4 pb-8">
          <DetailSection icon={MegaphoneIcon} label="Brief">
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-[13px] leading-relaxed">
              Use <span className="font-semibold">trendy music</span> (not cinematic).
              Auto caption OK — no manual. Highlight kitchen + exterior. Length ≤ 60s.
            </div>
          </DetailSection>

          <DetailSection icon={FolderIcon} label="Assets · 4" rightLabel="3.5 GB">
            <div className="space-y-1.5">
              <AssetRow icon={FilmIcon} title="Raw walkthrough" meta="Dropbox · 2.4 GB" />
              <AssetRow icon={FolderIcon} title="B-roll · town + beach" meta="Drive · 1.1 GB" />
              <AssetRow icon={MegaphoneIcon} title="Script.pdf" meta="24 KB" />
              <AssetRow icon={MusicIcon} title="Music reference" meta="YouTube link" />
            </div>
            <button className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground text-[12px] font-bold text-background active:opacity-80">
              <DownloadIcon className="size-3.5" /> Download all assets
            </button>
          </DetailSection>

          <DetailSection icon={UsersIcon} label="People">
            <div className="space-y-2">
              <PersonRow id="MA" role="Lead editor" />
              <PersonRow id="MJ" role="Support" />
              <PersonRow id="KY" role="Manager" />
            </div>
          </DetailSection>

          <DetailSection icon={HomeIcon} label="Property">
            <p className="text-[13px] font-semibold leading-tight">St. Augustine, FL 32092</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              3 bd · 2 ba · 1,820 sqft ·{" "}
              <span className="font-semibold text-indigo-400">Listing ↗</span>
            </p>
          </DetailSection>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// ShareSheet — bottom sheet to create/manage shareable links for clients.
type ShareLink = {
  id: string;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  password?: boolean;
  canDownload?: boolean;
  watermark?: boolean;
  views: number;
};

const EXISTING_LINKS: ShareLink[] = [
  {
    id: "sl1",
    token: "g7k9-x42",
    createdBy: "Marry",
    createdAt: "May 18",
    expiresAt: "Jun 17",
    password: true,
    canDownload: true,
    views: 4,
  },
];

function ShareSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [expires, setExpires] = React.useState<"7d" | "30d" | "never">("30d");
  const [password, setPassword] = React.useState(true);
  const [canDownload, setCanDownload] = React.useState(false);
  const [watermark, setWatermark] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [emails, setEmails] = React.useState("");

  // Hooks must run unconditionally — keep useMemo BEFORE the early return.
  const newToken = React.useMemo(
    () =>
      `${Math.random().toString(36).slice(2, 6)}-${Math.random()
        .toString(36)
        .slice(2, 5)}`,
    [open],
  );

  if (!open) return null;
  const newUrl = `review.odone.com/s/${newToken}`;

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {}
  };

  return (
    <>
      <button
        className="absolute inset-0 z-40 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-label="Close share"
      />
      <div className="absolute inset-x-0 bottom-0 z-50 max-h-[92%] overflow-hidden rounded-t-[20px] border-t border-border bg-popover shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex h-6 items-center justify-center">
          <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />
        </div>

        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Share2Icon className="size-[18px]" />
            <h3 className="text-[15px] font-semibold">Share with client</h3>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full active:bg-accent"
            aria-label="Close"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-4 pb-8 [mask-image:linear-gradient(to_bottom,transparent_0,black_16px,black_calc(100%-20px),transparent_100%)]">
          {/* New link card */}
          <section className="rounded-2xl border border-border bg-card p-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 items-center rounded-full bg-emerald-500/15 px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                New link
              </span>
              <span className="ml-auto text-[10.5px] text-muted-foreground">v2 · 45 Yorkshire Dr</span>
            </div>

            {/* Preview URL */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <LinkIcon className="size-[14px] shrink-0 text-muted-foreground" />
              <code className="flex-1 truncate font-mono text-[11.5px]">{newUrl}</code>
              <button
                onClick={() => copy("new", `https://${newUrl}`)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-accent active:text-foreground"
                aria-label="Copy link"
              >
                {copiedId === "new" ? (
                  <CheckIcon className="size-3.5 text-emerald-400" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
              </button>
            </div>

            {/* Settings rows */}
            <div className="mt-3 space-y-1">
              {/* Expires */}
              <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                <ClockIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium leading-tight">Expires</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    Link stops working after this
                  </p>
                </div>
                <div className="inline-flex shrink-0 items-center rounded-full bg-muted/60 p-0.5">
                  {(["7d", "30d", "never"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setExpires(k)}
                      className={cn(
                        "h-6 rounded-full px-2.5 text-[10.5px] font-semibold transition-colors",
                        expires === k
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      {k === "7d" ? "7d" : k === "30d" ? "30d" : "Never"}
                    </button>
                  ))}
                </div>
              </div>

              <ShareToggle
                icon={LockIcon}
                title="Password protect"
                desc={password ? "Required to view" : "Anyone with the link"}
                checked={password}
                onChange={setPassword}
              />
              <ShareToggle
                icon={DownloadIcon}
                title="Allow download"
                desc={canDownload ? "Client can save the file" : "Stream only"}
                checked={canDownload}
                onChange={setCanDownload}
              />
              <ShareToggle
                icon={SparklesIcon}
                title="Watermark"
                desc={watermark ? "Discreet ODONE mark" : "Off"}
                checked={watermark}
                onChange={setWatermark}
              />
            </div>

            {/* Email field */}
            <div className="mt-3">
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Send to
              </p>
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 focus-within:border-foreground/40 focus-within:bg-background">
                <AtSignIcon className="size-3.5 text-muted-foreground" />
                <input
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="client@homes.com"
                  className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  copy("new", `https://${newUrl}`);
                  toast.success("Link copied", {
                    description: "Paste it wherever you need.",
                  });
                }}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card text-[12.5px] font-bold active:bg-accent"
              >
                <CopyIcon className="size-3.5" /> Copy
              </button>
              <button
                onClick={() => {
                  toast.success("Sent", {
                    description: emails ? `Link emailed to ${emails}` : "Link emailed to saved contacts",
                  });
                  onClose();
                }}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground text-[12.5px] font-bold text-background active:opacity-85"
              >
                <SendIcon className="size-3.5" /> Send
              </button>
            </div>
          </section>

          {/* Existing links */}
          <section className="mt-4">
            <h4 className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              Active links · {EXISTING_LINKS.length}
            </h4>
            <div className="space-y-2">
              {EXISTING_LINKS.map((sl) => (
                <div
                  key={sl.id}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-2">
                    <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <code className="flex-1 truncate font-mono text-[11.5px]">
                      review.odone.com/s/{sl.token}
                    </code>
                    <button
                      onClick={() => copy(sl.id, `https://review.odone.com/s/${sl.token}`)}
                      className="grid size-7 place-items-center rounded-full text-muted-foreground active:bg-accent"
                      aria-label="Copy"
                    >
                      {copiedId === sl.id ? (
                        <CheckIcon className="size-3 text-emerald-400" />
                      ) : (
                        <CopyIcon className="size-3" />
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                    <span>By {sl.createdBy} · {sl.createdAt}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span>Expires {sl.expiresAt}</span>
                    {sl.password && (
                      <span className="inline-flex items-center gap-0.5">
                        <span className="text-muted-foreground/40">•</span>
                        <LockIcon className="size-2.5" />
                        <span>Password</span>
                      </span>
                    )}
                    {sl.canDownload && (
                      <span className="inline-flex items-center gap-0.5">
                        <span className="text-muted-foreground/40">•</span>
                        <DownloadIcon className="size-2.5" />
                        <span>Download</span>
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 font-semibold text-foreground">
                      {sl.views} views
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function ShareToggle({
  icon: Icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left active:bg-accent/40"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium leading-tight">{title}</p>
        <p className="text-[10.5px] text-muted-foreground">{desc}</p>
      </div>
      <span
        className={cn(
          "relative grid h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-muted/70",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function DetailSection({
  icon: Icon,
  label,
  rightLabel,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  rightLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-2">
      <div className="mb-2 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </span>
        {rightLabel && <span className="font-mono normal-case tracking-normal">{rightLabel}</span>}
      </div>
      {children}
    </section>
  );
}

function AssetRow({
  icon: Icon,
  title,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 active:bg-muted/50">
      <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium">{title}</p>
        <p className="truncate font-mono text-[10.5px] text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
}

function PersonRow({ id, role }: { id: string; role: string }) {
  const u = users[id];
  if (!u) return null;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="size-8">
        <AvatarImage src={u.image} alt={u.name} />
        <AvatarFallback className={cn("text-xs", u.tone)}>{u.initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold leading-tight">{u.name}</p>
        <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{role}</p>
      </div>
      <button
        aria-label="Message"
        className="grid size-8 place-items-center rounded-full active:bg-accent"
      >
        <MessageCircleIcon className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function fmt(s: number) {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
