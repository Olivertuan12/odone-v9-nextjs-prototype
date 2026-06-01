"use client";

import * as React from "react";
import {
  Upload,
  Loader2,
  Check,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  ScanLine,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/components/uploads/uploads-data";

// ============================================================================
// Types
// ============================================================================

type UploadState = "idle" | "scanning" | "ready" | "uploading";

type ScannedFile = {
  name: string;
  size: number;
  kind: "photo" | "video" | "other";
};

export interface UploadDropZoneProps {
  accept?: "photo" | "video" | "all";
  onUploadComplete?: () => void;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function kindFromMime(mime: string, name: string): ScannedFile["kind"] {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  const lower = name.toLowerCase();
  if (/\.(jpe?g|png|heic|webp|gif|tiff?)$/.test(lower)) return "photo";
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(lower)) return "video";
  return "other";
}

function scanFileList(list: FileList): ScannedFile[] {
  const out: ScannedFile[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const f = list.item(i);
    if (!f) continue;
    out.push({ name: f.name, size: f.size, kind: kindFromMime(f.type, f.name) });
  }
  return out;
}

function acceptAttr(accept: UploadDropZoneProps["accept"]): string | undefined {
  if (accept === "photo") return "image/*";
  if (accept === "video") return "video/*";
  return undefined;
}

function KindIcon({ kind }: { kind: ScannedFile["kind"] }) {
  if (kind === "photo")
    return <ImageIcon className="size-3.5 text-sky-400" aria-hidden />;
  if (kind === "video")
    return <Video className="size-3.5 text-violet-400" aria-hidden />;
  return <FileText className="size-3.5 text-amber-400" aria-hidden />;
}

// ============================================================================
// Component
// ============================================================================

export function UploadDropZone({
  accept = "all",
  onUploadComplete,
  className,
}: UploadDropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [state, setState] = React.useState<UploadState>("idle");
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [scanned, setScanned] = React.useState<ScannedFile[]>([]);
  const [progress, setProgress] = React.useState(0);
  const dragDepthRef = React.useRef(0);

  // Drag-over detection at the page level — feels like a real drop target.
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (state === "idle" || state === "ready") setIsDragOver(true);
  }, [state]);

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    if (state === "idle" || state === "ready") setIsDragOver(true);
  }, [state]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  }, []);

  const beginScan = React.useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    const items = scanFileList(list);
    if (items.length === 0) return;
    setScanned(items);
    setState("scanning");
    setIsDragOver(false);
    window.setTimeout(() => {
      setState("ready");
    }, 1200);
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    if (state === "uploading" || state === "scanning") return;
    beginScan(e.dataTransfer.files);
  }, [beginScan, state]);

  const handleBrowse = React.useCallback(() => {
    if (state === "uploading" || state === "scanning") return;
    inputRef.current?.click();
  }, [state]);

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      beginScan(e.target.files);
      e.target.value = "";
    },
    [beginScan],
  );

  const handleCancel = React.useCallback(() => {
    setScanned([]);
    setProgress(0);
    setState("idle");
  }, []);

  const handleConfirm = React.useCallback(() => {
    setState("uploading");
    setProgress(0);
    const start = performance.now();
    const total = 3000;
    let raf = 0;
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - start) / total) * 100);
      setProgress(pct);
      if (pct < 100) {
        raf = window.requestAnimationFrame(tick);
      } else {
        const count = scanned.length;
        toast.success(`Upload complete · ${count} file${count === 1 ? "" : "s"}`);
        onUploadComplete?.();
        window.setTimeout(() => {
          setState("idle");
          setScanned([]);
          setProgress(0);
        }, 400);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [onUploadComplete, scanned.length]);

  // Derived counts
  const counts = React.useMemo(() => {
    let photos = 0;
    let videos = 0;
    let others = 0;
    let bytes = 0;
    for (const f of scanned) {
      bytes += f.size;
      if (f.kind === "photo") photos += 1;
      else if (f.kind === "video") videos += 1;
      else others += 1;
    }
    return { photos, videos, others, bytes };
  }, [scanned]);

  const summaryLine = React.useMemo(() => {
    const parts: string[] = [];
    if (counts.photos > 0)
      parts.push(`${counts.photos} photo${counts.photos === 1 ? "" : "s"}`);
    if (counts.videos > 0)
      parts.push(`${counts.videos} video${counts.videos === 1 ? "" : "s"}`);
    if (counts.others > 0)
      parts.push(`${counts.others} other${counts.others === 1 ? "" : "s"}`);
    const summary = parts.join(" + ") || `${scanned.length} files`;
    return `Found ${summary} (${formatBytes(counts.bytes)})`;
  }, [counts, scanned.length]);

  const isInteractive = state === "idle" || state === "ready";

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "rounded-2xl border-2 border-dashed p-6 transition-colors duration-base ease-standard",
        state === "idle" &&
          (isDragOver
            ? "border-foreground/40 bg-accent/30"
            : "border-border bg-card/40 hover:bg-accent/20"),
        state === "scanning" && "border-sky-500/40 bg-sky-500/5",
        state === "ready" && "border-emerald-500/40 bg-emerald-500/5",
        state === "uploading" && "border-violet-500/40 bg-violet-500/5",
        className,
      )}
      aria-busy={state === "uploading" || state === "scanning"}
      data-state={state}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptAttr(accept)}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />

      {state === "idle" && (
        <IdleView onBrowse={handleBrowse} isDragOver={isDragOver} />
      )}

      {state === "scanning" && <ScanningView />}

      {state === "ready" && (
        <ReadyView
          files={scanned}
          summary={summaryLine}
          bytes={counts.bytes}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {state === "uploading" && (
        <UploadingView
          progress={progress}
          fileCount={scanned.length}
          bytes={counts.bytes}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-views
// ============================================================================

function IdleView({
  onBrowse,
  isDragOver,
}: {
  onBrowse: () => void;
  isDragOver: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onBrowse}
      className={cn(
        "press flex w-full flex-col items-center justify-center gap-3 rounded-xl py-6 text-center transition-colors duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      )}
      aria-label="Drag files here or click to browse"
    >
      <span
        className={cn(
          "grid size-12 place-items-center rounded-2xl transition-transform duration-base ease-emphasized",
          isDragOver
            ? "bg-foreground/15 scale-110"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Upload className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-fluid-sm font-medium text-foreground">
          Drag files here or click to browse
        </p>
        <p className="text-fluid-xs text-muted-foreground">
          Photos, videos, floor plans up to 5 GB
        </p>
      </div>
    </button>
  );
}

function ScanningView() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center stagger-fade">
      <span className="grid size-12 place-items-center rounded-2xl bg-sky-500/10">
        <Loader2 className="size-6 animate-spin text-sky-400" aria-hidden />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-fluid-sm font-medium text-foreground inline-flex items-center justify-center gap-1.5">
          <ScanLine className="size-3.5 text-sky-400" aria-hidden />
          Scanning…
        </p>
        <p className="text-fluid-xs text-muted-foreground">
          Reading metadata and detecting duplicates
        </p>
      </div>
    </div>
  );
}

function ReadyView({
  files,
  summary,
  bytes,
  onConfirm,
  onCancel,
}: {
  files: ScannedFile[];
  summary: string;
  bytes: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const visible = files.slice(0, 6);
  const remaining = files.length - visible.length;
  return (
    <div className="flex flex-col gap-4 stagger-fade">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10">
          <Check className="size-5 text-emerald-400" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-fluid-sm font-medium text-foreground">
            Ready to upload
          </p>
          <p className="text-fluid-xs text-muted-foreground">{summary}</p>
        </div>
        <div className="hidden sm:flex flex-col items-end text-right">
          <span className="text-fluid-xs text-muted-foreground">Total</span>
          <span className="text-fluid-sm font-medium text-foreground tabular-nums">
            {formatBytes(bytes)}
          </span>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {visible.map((f, i) => (
          <li
            key={`${f.name}-${i}`}
            className="flex items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5 hairline"
          >
            <KindIcon kind={f.kind} />
            <span className="flex-1 min-w-0 truncate text-fluid-xs text-foreground">
              {f.name}
            </span>
            <span className="shrink-0 text-fluid-xs text-muted-foreground tabular-nums">
              {formatBytes(f.size)}
            </span>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <p className="text-fluid-xs text-muted-foreground inline-flex items-center gap-1.5">
          <CircleAlert className="size-3" aria-hidden />
          and {remaining} more file{remaining === 1 ? "" : "s"} not shown
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="press"
        >
          <X className="size-3.5" aria-hidden />
          Cancel
        </Button>
        <Button size="sm" onClick={onConfirm} className="press">
          <Check className="size-3.5" aria-hidden />
          Confirm upload
        </Button>
      </div>
    </div>
  );
}

function UploadingView({
  progress,
  fileCount,
  bytes,
}: {
  progress: number;
  fileCount: number;
  bytes: number;
}) {
  const pct = Math.round(progress);
  const doneBytes = Math.min(bytes, Math.round((progress / 100) * bytes));
  return (
    <div className="flex flex-col gap-3 stagger-fade">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10">
          <Loader2 className="size-5 animate-spin text-violet-400" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-fluid-sm font-medium text-foreground">
            Uploading… {pct}%
          </p>
          <p className="text-fluid-xs text-muted-foreground tabular-nums">
            {fileCount} file{fileCount === 1 ? "" : "s"} ·{" "}
            {formatBytes(doneBytes)} / {formatBytes(bytes)}
          </p>
        </div>
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-violet-400 transition-[width] duration-fast ease-standard"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
