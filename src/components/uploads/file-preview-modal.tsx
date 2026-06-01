"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  MoreHorizontal,
  Play,
  Share2,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  type UnifiedFile,
  formatBytes,
  formatRelativeTime,
  toneFor,
} from "@/components/uploads/uploads-data";

// ============================================================================
// Types
// ============================================================================

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  file: UnifiedFile | null;
  /** Full list, used for prev/next navigation and the filmstrip */
  files: UnifiedFile[];
  onChangeFile: (id: string) => void;
};

// ============================================================================
// Helpers
// ============================================================================

const toneClass: Record<string, string> = {
  sky: "bg-sky-500/10 text-sky-400",
  violet: "bg-violet-500/10 text-violet-400",
  amber: "bg-amber-500/10 text-amber-400",
};

function toneStyleFor(file: UnifiedFile): string {
  return toneClass[toneFor(file.kind)] ?? toneClass.amber;
}

// ============================================================================
// Component
// ============================================================================

export function FilePreviewModal({
  open,
  onOpenChange,
  file,
  files,
  onChangeFile,
}: Props) {
  const filmstripRef = React.useRef<HTMLDivElement | null>(null);

  const currentIndex = React.useMemo(() => {
    if (!file) return -1;
    return files.findIndex((f) => f.id === file.id);
  }, [file, files]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

  const goPrev = React.useCallback(() => {
    if (!hasPrev) return;
    const next = files[currentIndex - 1];
    if (next) onChangeFile(next.id);
  }, [currentIndex, files, hasPrev, onChangeFile]);

  const goNext = React.useCallback(() => {
    if (!hasNext) return;
    const next = files[currentIndex + 1];
    if (next) onChangeFile(next.id);
  }, [currentIndex, files, hasNext, onChangeFile]);

  // Keyboard nav (Esc handled by Dialog itself).
  // v12.2: attach on document with capture phase so the Dialog's internal
  // focus-trap can't swallow arrow keys before we see them. Also skip if
  // the target is a text input so typing in search doesn't jump files.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (
        tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          tgt.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        goNext();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, goPrev, goNext]);

  // When the active file changes, scroll its filmstrip thumb into view.
  React.useEffect(() => {
    if (!open || !file) return;
    const node = filmstripRef.current?.querySelector<HTMLElement>(
      `[data-strip-id="${file.id}"]`,
    );
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [file, open]);

  if (!file) return null;

  const isVideo = file.kind === "video";
  const meta = `${file.kindLabel} · ${formatBytes(file.byte_size)} · ${formatRelativeTime(file.created_at)}`;

  const handleDownload = () => toast.success(`Downloading ${file.filename}`);
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(`https://odone.app/file/${file.id}`)
        .catch(() => undefined);
    }
    toast.success("Link copied");
  };
  const handleStar = () =>
    toast.success(file.starred ? "Removed from starred" : "Added to starred");
  const handleShare = () => toast.info("Opening share sheet…");
  const handleMore = () => toast.info("More options coming soon");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "sm:max-w-none w-screen h-screen rounded-none border-none p-0",
          "bg-background/95 backdrop-blur-xl",
          "left-0 top-0 translate-x-0 translate-y-0",
          "max-w-none ring-0",
          "flex flex-col gap-0 overflow-hidden",
          "duration-base ease-emphasized",
        )}
      >
        {/* Top bar */}
        <header
          className={cn(
            "glass relative z-10 flex h-14 items-center gap-3 px-3 sm:px-4",
            "border-b border-border/40",
          )}
        >
          {/* Close */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="press shrink-0 rounded-full"
            aria-label="Close preview"
            onClick={() => onOpenChange(false)}
          >
            <X />
          </Button>

          {/* Filename + kind */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
            <div className="min-w-0 max-w-full truncate text-fluid-sm font-medium text-foreground">
              {file.filename}
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "hidden shrink-0 text-fluid-2xs font-medium sm:inline-flex",
                toneStyleFor(file),
              )}
            >
              {file.kindLabel}
            </Badge>
          </div>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="press rounded-full"
              aria-label="Download"
              onClick={handleDownload}
            >
              <Download />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="press rounded-full"
              aria-label="Copy link"
              onClick={handleCopy}
            >
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                "press rounded-full",
                file.starred && "text-amber-400",
              )}
              aria-label={file.starred ? "Remove star" : "Add star"}
              onClick={handleStar}
            >
              <Star className={cn(file.starred && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="press rounded-full"
              aria-label="Share"
              onClick={handleShare}
            >
              <Share2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="press rounded-full"
              aria-label="More"
              onClick={handleMore}
            >
              <MoreHorizontal />
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {/* Prev — bigger hit target + stopPropagation so the click can't
              bubble to anything that might close the dialog. */}
          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "press absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full",
                "glass h-12 w-12 sm:left-6",
              )}
              aria-label="Previous file"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
            >
              <ChevronLeft className="size-5" />
            </Button>
          )}

          {/* Next */}
          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "press absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full",
                "glass h-12 w-12 sm:right-6",
              )}
              aria-label="Next file"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
            >
              <ChevronRight className="size-5" />
            </Button>
          )}

          {/* Media */}
          <div className="relative flex h-[80%] w-[90%] items-center justify-center">
            {file.thumbnail ? (
              <div className="relative max-h-full max-w-full">
                <img
                  src={file.thumbnail}
                  alt={file.filename}
                  loading="lazy"
                  className={cn(
                    "max-h-[80vh] max-w-[90vw] rounded-2xl object-contain",
                    "shadow-modal",
                    "transition-opacity duration-base ease-standard",
                  )}
                />
                {isVideo && (
                  <button
                    type="button"
                    onClick={() => toast.info("Video playback coming soon")}
                    className={cn(
                      "press absolute inset-0 flex items-center justify-center",
                      "rounded-2xl bg-black/0 hover:bg-black/10",
                      "transition-colors duration-fast ease-standard",
                    )}
                    aria-label="Play video"
                  >
                    <span
                      className={cn(
                        "flex h-20 w-20 items-center justify-center rounded-full",
                        "glass-strong shadow-elevated",
                      )}
                    >
                      <Play className="ml-1 h-8 w-8 fill-current text-foreground" />
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "flex h-64 w-96 max-w-[90vw] items-center justify-center rounded-2xl",
                  "bg-muted text-muted-foreground shadow-modal",
                )}
              >
                Preview not available
              </div>
            )}
          </div>
        </div>

        {/* Meta strip */}
        <div className="glass relative z-10 hidden items-center justify-between border-t border-border/40 px-4 py-2 text-fluid-2xs text-muted-foreground sm:flex">
          <span className="truncate">
            {file.shooterName} · {file.orderLabel}
          </span>
          <span className="shrink-0">{meta}</span>
        </div>

        {/* Filmstrip */}
        <div className="glass relative z-10 border-t border-border/40">
          <div
            ref={filmstripRef}
            className={cn(
              "scroll-smooth-x flex items-center gap-2 px-3 py-2",
              "overflow-x-auto",
            )}
            style={{ scrollSnapType: "x mandatory" }}
          >
            {files.map((f) => {
              const active = f.id === file.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  data-strip-id={f.id}
                  onClick={() => onChangeFile(f.id)}
                  aria-label={`Preview ${f.filename}`}
                  aria-current={active}
                  className={cn(
                    "press group relative h-14 w-20 shrink-0 overflow-hidden rounded-md",
                    "ring-1 transition-all duration-fast ease-standard",
                    active
                      ? "ring-2 ring-ring shadow-elevated"
                      : "ring-border/40 opacity-60 hover:opacity-100",
                  )}
                  style={{ scrollSnapAlign: "center" }}
                >
                  {f.thumbnail ? (
                    <img
                      src={f.thumbnail}
                      alt={f.filename}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-fluid-2xs text-muted-foreground">
                      {f.kindLabel}
                    </div>
                  )}
                  {f.kind === "video" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-4 w-4 fill-current text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilePreviewModal;
