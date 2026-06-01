"use client";

import * as React from "react";
import { MaximizeIcon, MessageCircleIcon, SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemFile, ItemVersion } from "@/components/jobs/jobs-data";
import { Filmstrip } from "@/components/jobs/carousel-view";

export function PhotoGridView({
  version,
  mode,
  selectedFileId,
  onOpenSingle,
  onSelectFile,
  newFileIds,
}: {
  version: ItemVersion;
  mode: "gallery" | "single";
  selectedFileId?: string;
  onOpenSingle: (id: string) => void;
  onSelectFile: (id: string | undefined) => void;
  newFileIds: Set<string>;
}) {
  const files = version.files;
  const focused = files.find((f) => f.id === selectedFileId);

  const feedbackByFile = React.useMemo(() => {
    const acc = new Map<string, { open: number; total: number }>();
    for (const f of version.feedback) {
      if (!f.fileId) continue;
      const cur = acc.get(f.fileId) ?? { open: 0, total: 0 };
      cur.total++;
      if (f.status === "open") cur.open++;
      acc.set(f.fileId, cur);
    }
    return acc;
  }, [version.feedback]);

  if (mode === "gallery") {
    return (
      <div className="flex-1 overflow-auto px-6 py-5">
        <PhotoGrid
          files={files}
          activeId={undefined}
          feedbackByFile={feedbackByFile}
          newFileIds={newFileIds}
          variant="large"
          onPick={(id) => onOpenSingle(id)}
        />
      </div>
    );
  }

  // single mode — focused content owns most of the screen, single-row strip below.
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 items-center justify-center overflow-auto bg-black/60 px-6 py-4">
        {focused && (
          <div className="relative max-h-full max-w-full overflow-hidden rounded-xl border border-border bg-black shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={focused.thumbnailUrl}
              alt={focused.filename}
              className="max-h-[78vh] w-auto object-contain"
            />
            {newFileIds.has(focused.id) && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10.5px] font-semibold text-white">
                <SparklesIcon className="size-3" />
                new in v{version.number}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
              <div className="text-xs text-white/80">
                <p className="font-mono">{focused.filename}</p>
                {focused.width && focused.height && (
                  <p className="text-white/60">
                    {focused.width} × {focused.height}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Filmstrip
        files={files}
        activeId={focused?.id}
        feedbackByFile={feedbackByFile}
        newFileIds={newFileIds}
        aspect="4/3"
        onPick={(id) => onSelectFile(id)}
      />
    </div>
  );
}

function PhotoGrid({
  files,
  activeId,
  feedbackByFile,
  newFileIds,
  variant,
  onPick,
}: {
  files: ItemFile[];
  activeId?: string;
  feedbackByFile: Map<string, { open: number; total: number }>;
  newFileIds: Set<string>;
  variant: "large";
  onPick: (id: string) => void;
}) {
  const gridCls = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  return (
    <div className={gridCls}>
      {files.map((f, i) => {
        const fb = feedbackByFile.get(f.id);
        const active = f.id === activeId;
        const isNew = newFileIds.has(f.id);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onPick(f.id)}
            className={cn(
              "group relative overflow-hidden rounded-lg border bg-card transition-colors",
              active
                ? "border-foreground/40 ring-2 ring-foreground/20"
                : isNew
                  ? "border-sky-500/40 ring-2 ring-sky-500/20"
                  : "border-border hover:border-foreground/30",
            )}
          >
            <div className="aspect-[4/3] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.thumbnailUrl}
                alt={f.filename}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <MaximizeIcon
                className={cn(
                  "text-white opacity-0 transition-opacity group-hover:opacity-100",
                  variant === "large" ? "size-7" : "size-5",
                )}
              />
            </span>
            <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {String(i + 1).padStart(2, "0")}
            </span>
            {isNew && (
              <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-sky-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <SparklesIcon className="size-2.5" />
                new
              </span>
            )}
            {fb && fb.total > 0 && (
              <span
                className={cn(
                  "absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  fb.open > 0
                    ? "bg-amber-500/90 text-black"
                    : "bg-emerald-500/90 text-black",
                )}
              >
                <MessageCircleIcon className="size-2.5" />
                {fb.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
