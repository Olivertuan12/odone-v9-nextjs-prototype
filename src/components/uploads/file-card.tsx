"use client";

import * as React from "react";
import {
  Copy,
  Download,
  ExternalLink,
  File,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatBytes,
  formatRelativeTime,
  toneFor,
  type UnifiedFile,
} from "@/components/uploads/uploads-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileCardAction =
  | "download"
  | "open-external"
  | "copy-url"
  | "star"
  | "archive"
  | "delete";

export interface FileCardProps {
  file: UnifiedFile;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenPreview: (id: string) => void;
  onAction?: (action: FileCardAction, id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TONE_BADGE: Record<string, string> = {
  sky: "bg-sky-500/15 text-sky-400",
  violet: "bg-violet-500/15 text-violet-400",
  amber: "bg-amber-500/15 text-amber-400",
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// ---------------------------------------------------------------------------
// Small subcomponents
// ---------------------------------------------------------------------------

function ShooterAvatar({ name }: { name: string }) {
  return (
    <span
      title={name}
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground"
    >
      {initialsFromName(name)}
    </span>
  );
}

function OverlayButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className="press inline-grid size-6 place-items-center rounded-full border border-white/10 bg-black/40 text-white shadow-soft backdrop-blur-md transition-colors duration-fast ease-standard hover:bg-black/60"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// FileCard
// ---------------------------------------------------------------------------

export function FileCard({
  file,
  selected,
  onToggleSelect,
  onOpenPreview,
  onAction,
}: FileCardProps) {
  const tone = toneFor(file.kind);
  const badgeClass = TONE_BADGE[tone] ?? TONE_BADGE.amber;
  const hasThumbnail = file.kind !== "other" && Boolean(file.thumbnail);

  const handleOpen = React.useCallback(() => {
    onOpenPreview(file.id);
  }, [file.id, onOpenPreview]);

  const handleToggleSelect = React.useCallback(() => {
    onToggleSelect(file.id);
  }, [file.id, onToggleSelect]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  };

  const dispatch = (action: FileCardAction) => {
    onAction?.(action, file.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-pressed={selected}
      aria-label={`Open ${file.filename}`}
      className={cn(
        "group lift press relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all duration-base ease-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-transparent ring-2 ring-ring" : "border-border",
        file.archived && "opacity-60",
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
        {hasThumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.filename}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <File className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
        )}

        {/* Subtle dim on hover */}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-base ease-standard group-hover:bg-black/15" />

        {/* Top-left: checkbox only — kind chip moved to bottom-left so the
            checkbox area doesn't reserve visible space when no selection. */}
        <div className="absolute left-2 top-2 z-10">
          <span
            onClick={(event) => {
              event.stopPropagation();
              handleToggleSelect();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                handleToggleSelect();
              }
            }}
            role="checkbox"
            aria-checked={selected}
            aria-label={selected ? "Deselect file" : "Select file"}
            tabIndex={0}
            className={cn(
              "inline-flex size-5 cursor-pointer items-center justify-center rounded-md border border-white/20 bg-black/40 text-white backdrop-blur-md transition-opacity duration-fast ease-standard",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={() => handleToggleSelect()}
              className="size-3.5 border-white/40 data-checked:border-white data-checked:bg-white data-checked:text-foreground"
              aria-hidden
              tabIndex={-1}
            />
          </span>
        </div>

        {/* Top-right: star */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            dispatch("star");
          }}
          aria-pressed={file.starred}
          aria-label={file.starred ? "Unstar file" : "Star file"}
          title={file.starred ? "Unstar" : "Star"}
          className={cn(
            "press absolute right-2 top-2 z-10 inline-grid size-6 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition-opacity duration-fast ease-standard hover:bg-black/60",
            file.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Star
            className={cn(
              "size-3.5",
              file.starred
                ? "fill-amber-400 text-amber-400"
                : "text-white",
            )}
            strokeWidth={1.5}
          />
        </button>

        {/* Bottom-left: kind chip (always) + archived hint when applicable.
            Slides under hover-action cluster on right — they don't overlap
            unless the card is very narrow. */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md",
              badgeClass,
            )}
          >
            {file.kindLabel}
          </span>
          {file.archived && (
            <span className="rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
              Archived
            </span>
          )}
        </div>

        {/* Bottom-right: action cluster on hover */}
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 flex items-center gap-1.5 opacity-0 transition-opacity duration-fast ease-standard group-hover:pointer-events-auto group-hover:opacity-100">
          <OverlayButton label="Download" onClick={() => dispatch("download")}>
            <Download className="size-3.5" strokeWidth={1.75} />
          </OverlayButton>
          <OverlayButton label="Copy URL" onClick={() => dispatch("copy-url")}>
            <Copy className="size-3.5" strokeWidth={1.75} />
          </OverlayButton>
          <OverlayButton label="Open external" onClick={() => dispatch("open-external")}>
            <ExternalLink className="size-3.5" strokeWidth={1.75} />
          </OverlayButton>
        </div>
      </div>

      {/* Body — 2-row max. v10 compaction: address/order context comes from
          the folder tree on the left, so the body skips orderLabel here and
          collapses shooter + size + date into a single meta row.
          @container query lets the meta row shrink further (hide size, then
          hide date) when the card itself is narrow. */}
      <div className="@container/card flex flex-col gap-0.5 px-2 pt-1.5 pb-2">
        <div
          className="truncate text-[13px] font-medium text-foreground"
          title={`${file.filename} · ${file.orderLabel}`}
        >
          {file.filename}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
          <ShooterAvatar name={file.shooterName} />
          <span className="hidden truncate @[10rem]/card:inline">
            {formatBytes(file.byte_size)}
          </span>
          <span
            aria-hidden
            className="hidden text-muted-foreground/40 @[12rem]/card:inline"
          >
            •
          </span>
          <span
            className="truncate"
            title={new Date(file.created_at).toLocaleString()}
          >
            {formatRelativeTime(file.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FileCard;
