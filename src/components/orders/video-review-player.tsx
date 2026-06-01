"use client";

// ============================================================================
// VideoReviewPlayer — mock-only video player for the Order Detail workspace.
// ----------------------------------------------------------------------------
// Renders a poster image with a play overlay, scrub bar, and comment markers
// pinned to their timestamps. No actual <video> element is mounted — playback
// is simulated entirely via local state and the parent's `currentTimeSec` /
// `playing` props.
//
// DESIGN.md compliance:
//   §1 — rounded-2xl on outer wrapper, rounded-full on every clickable
//   §3 — lucide icons (Play, Pause, Volume2, VolumeX, Maximize)
//   §5 — emerald for resolved markers, white for open markers (no zinc)
//   §7 — .press on every button, transition-colors duration-fast ease-standard
// ============================================================================

import { useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  MessageSquare,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Comment, Deliverable } from "./orders-data";

// Mock video duration — 4 minutes, 56 seconds. The Yorkshire walkthrough has
// real comments at 12.5s, 47s, 90s and 135s, all comfortably inside this
// window so the dots distribute across the bar.
const FAKE_DURATION_SEC = 296;

type Props = {
  deliverable: Deliverable;
  /** Already filtered to the version the parent wants to show. */
  comments: Comment[];
  currentTimeSec: number;
  onSeek: (sec: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  onCommentClick?: (c: Comment) => void;
};

function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoReviewPlayer({
  deliverable,
  comments,
  currentTimeSec,
  onSeek,
  playing,
  onTogglePlay,
  onCommentClick,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);

  // Pick poster + label. Fall back to picsum when the deliverable has no
  // versions yet (e.g. Beach Blvd / Ocean Blvd) so the surface still has a
  // sensible mock backdrop.
  const currentVersion = deliverable.versions.find(
    (v) => v.id === deliverable.current_version_id,
  );
  const poster =
    currentVersion
      ? deliverable.primary_thumbnail
      : `https://picsum.photos/seed/${deliverable.id}-poster/1280/720`;
  const versionLabel = currentVersion ? `v${currentVersion.version_number}` : "v—";
  const fileName = currentVersion?.file_name ?? `${deliverable.id}.mp4`;

  const markers = comments.filter((c) => c.timestamp_seconds != null);
  const progressPct = Math.min(
    100,
    (currentTimeSec / FAKE_DURATION_SEC) * 100,
  );

  function ratioFromClientX(clientX: number): number {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const ratio = ratioFromClientX(e.clientX);
    onSeek(ratio * FAKE_DURATION_SEC);
  }

  return (
    <div className="group relative aspect-video rounded-2xl bg-black overflow-hidden select-none">
      {/* Poster */}
      <img
        src={poster}
        alt={`${deliverable.title} preview`}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />

      {/* Subtle vignette so overlays stay legible against bright posters */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />

      {/* Top-right filename + version pill */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-fluid-xs text-white/90 ring-1 ring-white/10">
          <span className="font-medium">{versionLabel}</span>
          <span className="opacity-50">·</span>
          <span className="font-mono tabular-nums opacity-80 max-w-[180px] truncate">
            {fileName}
          </span>
        </span>
      </div>

      {/* Center play / pause */}
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="press absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center size-14 rounded-full bg-black/40 text-white backdrop-blur-md ring-1 ring-white/15 transition-colors duration-fast ease-standard hover:bg-black/60"
      >
        {playing ? (
          <Pause className="size-5" />
        ) : (
          <Play className="size-5 translate-x-[1px]" />
        )}
      </button>

      {/* Bottom overlay — revealed on hover */}
      <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-base ease-standard">
        <div className="bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-10 pb-3 px-4 space-y-2.5">
          {/* Scrub bar */}
          <div
            ref={barRef}
            onClick={handleBarClick}
            onMouseMove={(e) => setHoverRatio(ratioFromClientX(e.clientX))}
            onMouseLeave={() => setHoverRatio(null)}
            className="relative h-1.5 rounded-full bg-white/20 cursor-pointer"
            title="Click to seek"
          >
            {/* Hover preview fill */}
            {hoverRatio != null && (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/15 pointer-events-none"
                style={{ width: `${hoverRatio * 100}%` }}
              />
            )}
            {/* Played fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white pointer-events-none"
              style={{ width: `${progressPct}%` }}
            />

            {/* Comment markers — each rendered as a Popover so authors + body
                snippet appear on hover. Click bubbles up to onCommentClick
                rather than seeking the bar. */}
            {markers.map((c) => {
              const ts = c.timestamp_seconds ?? 0;
              const leftPct = Math.min(100, (ts / FAKE_DURATION_SEC) * 100);
              return (
                <Popover key={c.id}>
                  {/* base-ui PopoverTrigger uses `render` (not asChild). */}
                  <PopoverTrigger
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(ts);
                      onCommentClick?.(c);
                    }}
                    aria-label={`Comment at ${formatTimecode(ts)} by ${c.author_name}`}
                    style={{ left: `${leftPct}%` }}
                    className={cn(
                      "press absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full ring-2 ring-black/40 transition-transform duration-fast ease-standard hover:scale-150",
                      c.resolved ? "bg-emerald-400" : "bg-white",
                    )}
                  />
                  <PopoverContent
                    side="top"
                    sideOffset={10}
                    className="w-64 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <img
                        src={c.author_avatar}
                        alt={c.author_name}
                        loading="lazy"
                        className="size-7 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-fluid-xs font-medium truncate">
                            {c.author_name}
                          </span>
                          <span className="font-mono tabular-nums text-[10px] text-muted-foreground">
                            {formatTimecode(ts)}
                          </span>
                          {c.resolved && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-fluid-xs text-muted-foreground leading-snug">
                          {c.body.length > 40
                            ? `${c.body.slice(0, 40)}…`
                            : c.body}
                        </p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}

            {/* Playhead thumb */}
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full bg-white shadow-soft pointer-events-none"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          {/* Time + controls row */}
          <div className="flex items-center gap-3 text-white">
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="press grid place-items-center size-7 rounded-full hover:bg-white/15 transition-colors duration-fast ease-standard"
            >
              {playing ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
            </button>
            <span className="font-mono tabular-nums text-fluid-xs text-white/85">
              {formatTimecode(currentTimeSec)}{" "}
              <span className="opacity-50">/</span>{" "}
              {formatTimecode(FAKE_DURATION_SEC)}
            </span>

            {markers.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-white/60">
                <MessageSquare className="size-3" />
                {markers.length} pinned
              </span>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="press grid place-items-center size-7 rounded-full hover:bg-white/15 transition-colors duration-fast ease-standard"
              >
                {muted ? (
                  <VolumeX className="size-3.5" />
                ) : (
                  <Volume2 className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                aria-label="Fullscreen"
                className="press grid place-items-center size-7 rounded-full hover:bg-white/15 transition-colors duration-fast ease-standard"
              >
                <Maximize className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
