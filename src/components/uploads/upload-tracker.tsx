"use client";

// ============================================================================
// UploadTracker — Drive/Dropbox-style floating panel pinned to the bottom
// right while uploads are in flight. Stays visible after the user closes
// the upload dialog so they don't lose visibility on progress.
//
// API:
//   const { jobs, addJob } = useUploadTracker()
//   <UploadTracker jobs={jobs} onDismiss={() => ...} />
//
// V1 scope: simulated progress via setInterval — each job ticks +5–12% every
// 250ms until it hits 100%. Real implementation would swap this for the
// actual upload XHR/fetch progress events.
// ============================================================================

import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Upload as UploadIcon,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type UploadJob = {
  id: string;
  /** Order id — lets the cards highlight only their own in-flight uploads. */
  shootId: string;
  shootAddress: string;
  deliverableLabel: string;
  fileCount: number;
  /** 0–100 */
  progress: number;
  done: boolean;
};

// ---------------------------------------------------------------------------
// useUploadTracker — central queue + simulated progress
// ---------------------------------------------------------------------------

export function useUploadTracker() {
  const [jobs, setJobs] = React.useState<UploadJob[]>([]);

  const addJob = React.useCallback(
    (job: Omit<UploadJob, "id" | "progress" | "done">) => {
      setJobs((prev) => [
        ...prev,
        {
          id: `job-${prev.length}-${job.shootAddress.slice(0, 6)}`,
          progress: 0,
          done: false,
          ...job,
        },
      ]);
    },
    [],
  );

  const dismiss = React.useCallback(() => setJobs([]), []);

  // Simulated progress — ticks every 250ms.
  React.useEffect(() => {
    if (jobs.length === 0) return;
    if (jobs.every((j) => j.done)) return;
    const t = window.setInterval(() => {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.done) return j;
          // Larger jobs (more files) progress slightly slower.
          const delta = Math.max(2, 12 - Math.floor(j.fileCount / 3));
          const next = Math.min(100, j.progress + delta);
          return { ...j, progress: next, done: next >= 100 };
        }),
      );
    }, 250);
    return () => window.clearInterval(t);
  }, [jobs]);

  return { jobs, addJob, dismiss };
}

// ---------------------------------------------------------------------------
// UploadTracker component
// ---------------------------------------------------------------------------

export function UploadTracker({
  jobs,
  onDismiss,
}: {
  jobs: UploadJob[];
  onDismiss: () => void;
}) {
  const [open, setOpen] = React.useState(true);

  // Re-open when a new job is added.
  const prevCount = React.useRef(jobs.length);
  React.useEffect(() => {
    if (jobs.length > prevCount.current) setOpen(true);
    prevCount.current = jobs.length;
  }, [jobs.length]);

  if (jobs.length === 0) return null;

  const totalFiles = jobs.reduce((acc, j) => acc + j.fileCount, 0);
  const completedFiles = jobs.reduce(
    (acc, j) => acc + Math.round((j.progress / 100) * j.fileCount),
    0,
  );
  const allDone = jobs.every((j) => j.done);

  return (
    <div
      role="region"
      aria-label="Upload status"
      className={cn(
        "pointer-events-auto fixed bottom-4 right-4 z-50",
        "w-[360px] max-w-[90vw] overflow-hidden rounded-2xl border border-border",
        "bg-popover text-popover-foreground shadow-modal",
      )}
    >
      {/* Header — title + minimize/close. Click toggles collapse. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 text-left hover:bg-muted/40"
      >
        <div className="flex min-w-0 items-center gap-2">
          {allDone ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          ) : (
            <UploadIcon className="size-4 shrink-0 text-foreground" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {allDone
                ? `Uploaded ${totalFiles} files`
                : `Uploading ${completedFiles} of ${totalFiles}…`}
            </div>
            <div className="truncate text-[10.5px] text-muted-foreground">
              {jobs.length} {jobs.length === 1 ? "batch" : "batches"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-4 text-muted-foreground" />
          )}
          <span
            role="button"
            aria-label="Close"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDismiss();
              }
            }}
            className="press grid size-7 place-items-center rounded-full hover:bg-muted"
          >
            <X className="size-3.5 text-muted-foreground" />
          </span>
        </div>
      </button>

      {/* Job list — collapsed when !open */}
      {open && (
        <ul className="max-h-[40vh] divide-y divide-border/60 overflow-y-auto">
          {jobs.map((job) => (
            <li key={job.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="truncate text-xs font-medium text-foreground"
                    title={job.shootAddress}
                  >
                    {job.deliverableLabel}
                  </div>
                  <div
                    className="mt-0.5 truncate text-[10.5px] text-muted-foreground"
                    title={job.shootAddress}
                  >
                    {job.fileCount} files · {job.shootAddress.split(",")[0]}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-semibold tabular-nums",
                    job.done ? "text-emerald-300" : "text-muted-foreground",
                  )}
                >
                  {job.done ? "Done" : `${job.progress}%`}
                </span>
              </div>
              <div
                className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted"
                aria-hidden
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-base ease-emphasized",
                    job.done ? "bg-emerald-500/70" : "bg-foreground",
                  )}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UploadTracker;
