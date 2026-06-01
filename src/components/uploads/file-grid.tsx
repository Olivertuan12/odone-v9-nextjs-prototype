"use client";

import * as React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { UnifiedFile } from "@/components/uploads/uploads-data";
import { FileCard } from "./file-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileGridProps {
  files: UnifiedFile[];
  selectedIds: Set<string>;
  /** 1-5 — 1 is most dense, 5 is largest. */
  zoomLevel: number;
  onToggleSelect: (id: string) => void;
  onOpenPreview: (id: string) => void;
  onAction: (action: string, id: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Layout maps
// ---------------------------------------------------------------------------

/**
 * Viewport-based grid column map. Falls back to zoom 3 if input is out of range.
 * Keeps the smallest sizes dense on wide screens and gradually relaxes to 1-2
 * columns at the largest zoom.
 */
const ZOOM_COLS: Record<number, string> = {
  1: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8",
  2: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7",
  3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6",
  4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-5",
  5: "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4",
};

/** Gap scale — denser zooms get tighter gaps, larger zooms breathe more. */
const ZOOM_GAP: Record<number, string> = {
  1: "gap-3",
  2: "gap-3",
  3: "gap-4",
  4: "gap-4",
  5: "gap-5",
};

/** Cap on the staggered entrance — every 16th card resets so a 200-file grid
 * doesn't make the last cards take 3+ seconds to appear. */
const STAGGER_CAP = 16;

function clampZoom(zoom: number): 1 | 2 | 3 | 4 | 5 {
  if (zoom <= 1) return 1;
  if (zoom >= 5) return 5;
  return Math.round(zoom) as 1 | 2 | 3 | 4 | 5;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <Empty className="rounded-3xl border border-dashed border-border/60 bg-card/40 px-6 py-20">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-16 rounded-2xl">
          <FolderOpen className="size-7" strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle>No files here</EmptyTitle>
        <EmptyDescription>
          Drag files or click Upload to get started.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FileGrid({
  files,
  selectedIds,
  zoomLevel,
  onToggleSelect,
  onOpenPreview,
  onAction,
  className,
}: FileGridProps) {
  const zoom = clampZoom(zoomLevel);
  const gridCols = ZOOM_COLS[zoom];
  const gap = ZOOM_GAP[zoom];

  if (files.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "grid stagger-fade",
          gridCols,
          gap,
          "transition-[gap] duration-base ease-standard",
        )}
        role="grid"
        aria-label="Files"
      >
        {files.map((file, i) => {
          const staggerIndex = i % STAGGER_CAP;
          return (
            <div
              key={file.id}
              role="gridcell"
              style={
                {
                  // Consumed by the .stagger-fade utility for entrance timing.
                  "--stagger-index": staggerIndex,
                } as React.CSSProperties
              }
            >
              <FileCard
                file={file}
                selected={selectedIds.has(file.id)}
                onToggleSelect={onToggleSelect}
                onOpenPreview={onOpenPreview}
                onAction={onAction}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FileGrid;
