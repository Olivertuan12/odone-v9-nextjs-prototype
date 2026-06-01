"use client";

import * as React from "react";
import {
  Image as ImageIcon,
  Video,
  File as FileIcon,
  FolderOpen,
  MoreHorizontal,
  Download,
  Copy,
  ExternalLink,
  Star,
  Archive,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  type SortDir,
  type SortKey,
  type UnifiedFile,
  formatBytes,
  formatRelativeTime,
} from "@/components/uploads/uploads-data";

// ============================================================================
// Types
// ============================================================================

export type FileListAction =
  | "download"
  | "copy-url"
  | "open-external"
  | "star"
  | "archive"
  | "delete";

type FileListProps = {
  files: UnifiedFile[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenPreview: (file: UnifiedFile) => void;
  onAction?: (action: FileListAction, file: UnifiedFile) => void;
  // v12.2: list view exposes per-column sort. Columns reuse the same sort
  // state the toolbar dropdown writes to, so clicking a header keeps the
  // grid view + dropdown label in sync.
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey, dir?: SortDir) => void;
};

// ============================================================================
// Helpers
// ============================================================================

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const KIND_ICON: Record<UnifiedFile["kind"], React.ComponentType<{ className?: string }>> = {
  photo: ImageIcon,
  video: Video,
  other: FileIcon,
};

const TONE_CLASSES: Record<UnifiedFile["kind"], string> = {
  photo: "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20",
  video: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
  other: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
};

function KindBadge({ file }: { file: UnifiedFile }) {
  const Icon = KIND_ICON[file.kind];
  return (
    <span
      className={cn(
        // rounded-full per DESIGN.md §1 (badge / chip)
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-fluid-2xs font-medium",
        TONE_CLASSES[file.kind],
      )}
    >
      <Icon className="size-3" />
      {file.kindLabel}
    </span>
  );
}

function Thumbnail({ file }: { file: UnifiedFile }) {
  if (file.kind === "other" || !file.thumbnail) {
    const Icon = KIND_ICON[file.kind];
    return (
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
    );
  }
  return (
    <div className="relative size-10 overflow-hidden rounded-xl bg-muted">
      <img
        src={file.thumbnail}
        alt={file.filename}
        loading="lazy"
        className="size-full object-cover"
      />
      {file.kind === "video" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
          <Video className="size-3 text-white drop-shadow" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function FileList({
  files,
  selectedIds,
  onToggleSelect,
  onOpenPreview,
  onAction,
  sortKey,
  sortDir,
  onSortChange,
}: FileListProps) {
  // Toggle behaviour: clicking the active column flips the direction;
  // clicking a different column jumps to that column with its "natural"
  // default direction (text → asc, numeric/date → desc).
  const handleSort = React.useCallback(
    (key: SortKey, naturalDir: SortDir) => {
      if (!onSortChange) return;
      if (sortKey === key) {
        onSortChange(key, sortDir === "asc" ? "desc" : "asc");
      } else {
        onSortChange(key, naturalDir);
      }
    },
    [onSortChange, sortKey, sortDir],
  );
  const allSelected = files.length > 0 && files.every((f) => selectedIds.has(f.id));
  const partiallySelected =
    !allSelected && files.some((f) => selectedIds.has(f.id));

  const handleToggleAll = React.useCallback(() => {
    if (allSelected) {
      files.forEach((f) => {
        if (selectedIds.has(f.id)) onToggleSelect(f.id);
      });
    } else {
      files.forEach((f) => {
        if (!selectedIds.has(f.id)) onToggleSelect(f.id);
      });
    }
  }, [allSelected, files, onToggleSelect, selectedIds]);

  const handleAction = React.useCallback(
    (action: FileListAction, file: UnifiedFile) => {
      onAction?.(action, file);
      const verb =
        action === "download"
          ? "Downloading"
          : action === "copy-url"
            ? "URL copied for"
            : action === "open-external"
              ? "Opening"
              : action === "star"
                ? file.starred
                  ? "Unstarred"
                  : "Starred"
                : action === "archive"
                  ? file.archived
                    ? "Unarchived"
                    : "Archived"
                  : "Deleted";
      if (action === "delete") {
        toast.error(`${verb} ${file.filename}`);
      } else {
        toast.success(`${verb} ${file.filename}`);
      }
    },
    [onAction],
  );

  if (files.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed border-border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen className="size-5" />
          </EmptyMedia>
          <EmptyTitle>No files to show</EmptyTitle>
          <EmptyDescription>
            Drop files anywhere in this pane or pick a different filter to
            see other uploads.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // v12.2: CSS grid layout — both the header bar and each body row share
  // the SAME grid-template-columns so columns are guaranteed to line up,
  // unlike two independent tables which size their cols based on content.
  // The header lives outside the rounded card; the card only contains the
  // body. With no thead inside the card, there is no bg-rect that could
  // bulge past the card's rounded corners.
  const gridCols =
    "grid-cols-[5rem_minmax(120px,1fr)_9rem_10rem_3rem] md:grid-cols-[5rem_minmax(140px,1fr)_6rem_9rem_10rem_5rem_3rem] lg:grid-cols-[5rem_minmax(160px,1fr)_6rem_9rem_10rem_7rem_5rem_3rem]";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      {/* HEADER BAR — outside the rounded card, no border. */}
      <div
        className={cn(
          "grid items-center gap-2 px-4 text-fluid-xs text-muted-foreground",
          gridCols,
        )}
      >
        <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors duration-fast ease-standard">
          <Checkbox
            checked={
              (allSelected
                ? true
                : partiallySelected
                  ? "indeterminate"
                  : false) as unknown as boolean
            }
            onCheckedChange={handleToggleAll}
            aria-label="Select all files"
          />
          <span className="select-none">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : "Preview"}
          </span>
        </label>
        <SortHeader
          label="File"
          columnKey="filename"
          naturalDir="asc"
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <div className="hidden md:block">
          <SortHeader
            label="Type"
            columnKey="kind"
            naturalDir="asc"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </div>
        <SortHeader
          label="Shooter"
          columnKey="shooter"
          naturalDir="asc"
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <SortHeader
          label="Order"
          columnKey="order"
          naturalDir="asc"
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <div className="hidden lg:block">
          <SortHeader
            label="Date"
            columnKey="date"
            naturalDir="desc"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </div>
        <div className="hidden md:block">
          <SortHeader
            label="Size"
            columnKey="size"
            naturalDir="desc"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            align="right"
          />
        </div>
        <div />
      </div>

      {/* BODY CARD — rounded, scrollable, contains only the body rows.
          Each row is a grid div using the same gridCols template, so
          columns align perfectly with the header. The first row's cells
          have no background, so the card's rounded corners stay clean. */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex-1 overflow-auto scroll-smooth-y">
          {files.map((file) => {
            const isSelected = selectedIds.has(file.id);
            const KindIcon = KIND_ICON[file.kind];
            return (
              <div
                key={file.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenPreview(file)}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                  "press grid items-center gap-2 px-4 py-2 text-fluid-xs border-b border-border/60 last:border-b-0 cursor-pointer transition-colors duration-fast ease-standard hover:bg-accent/40",
                  gridCols,
                  isSelected && "bg-accent",
                )}
              >
                <div
                  className="flex items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(file.id)}
                    aria-label={`Select ${file.filename}`}
                  />
                  <Thumbnail file={file} />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <KindIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span
                    className="truncate font-medium text-foreground"
                    title={file.filename}
                  >
                    {file.filename}
                  </span>
                  {file.starred && (
                    <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                  )}
                </div>
                <div className="hidden md:block">
                  <KindBadge file={file} />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar size="sm" className="shrink-0">
                    <AvatarFallback>
                      {initialsFor(file.shooterName)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="truncate text-muted-foreground"
                    title={file.shooterName}
                  >
                    {file.shooterName}
                  </span>
                </div>
                <div className="min-w-0">
                  <span
                    className="block truncate text-muted-foreground"
                    title={file.orderLabel}
                  >
                    {file.orderLabel}
                  </span>
                </div>
                <div className="hidden lg:block text-muted-foreground">
                  {formatRelativeTime(file.created_at)}
                </div>
                <div className="hidden md:block text-right tabular-nums text-muted-foreground">
                  {formatBytes(file.byte_size)}
                </div>
                <div
                  className="flex justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="press size-8 text-muted-foreground hover:text-foreground"
                          aria-label={`Actions for ${file.filename}`}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => handleAction("download", file)}
                      >
                        <Download className="size-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction("copy-url", file)}
                      >
                        <Copy className="size-4" />
                        Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction("open-external", file)}
                      >
                        <ExternalLink className="size-4" />
                        Open external
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAction("star", file)}
                      >
                        <Star
                          className={cn(
                            "size-4",
                            file.starred && "fill-amber-400 text-amber-400",
                          )}
                        />
                        {file.starred ? "Unstar" : "Star"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction("archive", file)}
                      >
                        <Archive className="size-4" />
                        {file.archived ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleAction("delete", file)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  columnKey,
  naturalDir,
  sortKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  columnKey: SortKey;
  naturalDir: SortDir;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort: (key: SortKey, naturalDir: SortDir) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === columnKey;
  const Arrow = active && sortDir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSort(columnKey, naturalDir)}
      className={cn(
        "press inline-flex items-center gap-1 -mx-1 rounded px-1 py-0.5 transition-colors duration-fast ease-standard hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        align === "right" && "justify-end",
      )}
    >
      <span>{label}</span>
      <Arrow
        aria-hidden
        className={cn(
          "size-3 transition-opacity duration-fast ease-standard",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-60",
        )}
      />
    </button>
  );
}
