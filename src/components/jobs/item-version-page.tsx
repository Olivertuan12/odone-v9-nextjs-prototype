"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CaptionsIcon,
  CheckIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  CopyIcon,
  FlagIcon,
  GalleryHorizontalEndIcon,
  MegaphoneIcon,
  MusicIcon,
  PlayIcon,
  RotateCcwIcon,
  ScrollTextIcon,
  UploadIcon,
  ZapIcon,
  FilmIcon,
  ClapperboardIcon,
  ImageIcon,
  SparklesIcon,
  AlertTriangleIcon,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { badgeTone, toneDot, users } from "@/components/editor-data";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  getCurrentVersion,
  getItem,
  getItemsForJob,
  getJob,
  getNewFileIds,
  itemKindLabel,
  jobStatusLabel,
  jobStatusTone,
  transitionItem,
  uploadItemVersion,
  subscribeJobs,
  type Item,
  type ItemFile,
  type ItemVersion,
} from "@/components/jobs/jobs-data";
import { FeedbackPanel } from "@/components/jobs/feedback-panel";
import { CarouselView } from "@/components/jobs/carousel-view";
import { PhotoGridView } from "@/components/jobs/photo-grid-view";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ItemVersionPage({ jobId, itemId }: { jobId: string; itemId: string }) {
  const [, setRev] = React.useState(0);
  React.useEffect(() => subscribeJobs(() => setRev((n) => n + 1)), []);

  const job = getJob(jobId);
  const item = getItem(itemId);
  const items = getItemsForJob(jobId);
  if (!job || !item) notFound();

  const viewer = useCurrentUser();
  const isManager = viewer.role === "manager" || viewer.role === "admin";
  const isEditor = viewer.role === "editor";

  const isAccepted = job.accepted ?? false;
  const isRead = job.requirementsRead ?? false;

  const versions = item.versions;
  const initial = getCurrentVersion(item);
  const [activeVersionId, setActiveVersionId] = React.useState<string | undefined>(initial?.id);
  const [uploadingNewVersion, setUploadingNewVersion] = React.useState(false);

  const [prevItemId, setPrevItemId] = React.useState(itemId);
  if (itemId !== prevItemId) {
    setPrevItemId(itemId);
    setActiveVersionId(initial?.id);
    setUploadingNewVersion(false);
  }

  const onUploadSuccess = React.useCallback((newV: ItemVersion) => {
    setActiveVersionId(newV.id);
  }, []);

  const activeVersion = React.useMemo(
    () => versions.find((v) => v.id === activeVersionId) ?? versions[versions.length - 1],
    [versions, activeVersionId],
  );

  // Video has no gallery layer (single file by definition). Carousel + photo
  // start in gallery — manager scans the grid, can Approve straight away, or
  // click into a single file to read/leave feedback.
  const supportsGallery = item.kind !== "video";
  const [mode, setMode] = React.useState<"gallery" | "single">(
    supportsGallery ? "gallery" : "single",
  );
  const [selectedFileId, setSelectedFileId] = React.useState<string | undefined>(undefined);
  const selectedFile = activeVersion?.files.find((f) => f.id === selectedFileId);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // New files since previous version — used for badge indicators.
  const newFileIds = React.useMemo(
    () => (activeVersion ? getNewFileIds(item, activeVersion) : new Set<string>()),
    [item, activeVersion],
  );

  const openSingle = React.useCallback((fileId: string) => {
    setSelectedFileId(fileId);
    setMode("single");
  }, []);

  const backToGallery = React.useCallback(() => {
    setSelectedFileId(undefined);
    setMode("gallery");
  }, []);

  const feedbackOpen = activeVersion?.feedback.filter((f) => f.status === "open").length ?? 0;

  const seekTo = React.useCallback((sec: number) => {
    const el = videoRef.current;
    if (el) {
      el.currentTime = sec;
      el.play().catch(() => {});
    }
  }, []);

  if (isEditor && !isAccepted) {
    return (
      <div className="flex h-[calc(100svh-var(--header-height))] flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-xl text-center flex flex-col gap-4">
          <div className="mx-auto size-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <ClockIcon className="size-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Accept Job Assignment</h2>
            <p className="text-xs text-muted-foreground mt-1">
              You have been assigned to edit <strong>{item.title}</strong> for <strong>{job.orderTitle ?? job.title}</strong>. Please accept the job to access the requirements brief and download raw files.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const { acceptJob } = require("@/components/jobs/jobs-data");
              acceptJob(job.id);
              toast.success("Job accepted! Read the brief to begin.");
            }}
            className="press w-full rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-2.5 text-xs transition-colors"
          >
            Accept Job (Nhận việc)
          </button>
          <Link
            href={`/jobs/${jobId}`}
            className="text-[11px] text-muted-foreground hover:underline"
          >
            Back to Job Details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] flex-col">
      {/* page header */}
      <header className="flex flex-col gap-3 border-b px-6 py-4">
        <div className="flex items-start gap-3">
          <Link
            href={`/jobs/${jobId}`}
            className="mt-0.5 inline-flex size-7 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to job"
          >
            <ArrowLeftIcon className="size-3.5" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  toneDot[jobStatusTone[item.status]],
                )}
              />
              <h1 className="text-fluid-xl font-semibold tracking-tight">{item.title}</h1>
              <Badge
                variant="outline"
                className="rounded-full border-border bg-muted/60 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
              >
                {itemKindLabel[item.kind]}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
                  badgeTone[jobStatusTone[item.status]],
                )}
              >
                {jobStatusLabel[item.status]}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-fluid-sm text-muted-foreground">
              {job.title} · {job.orderAddress}
            </p>
            {activeVersion && (
              <ReviewingVersionLine
                versions={versions}
                activeVersion={activeVersion}
              />
            )}
          </div>

          {/* action group — Approve + Send Revision on top per user spec.
              Upload now lives in the Feedback panel header. */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {(item.brief || job?.requirement) && <BriefPopover item={item} />}
            <VersionSelector
              versions={versions}
              activeId={activeVersion?.id}
              onPick={setActiveVersionId}
            />
            {isManager && activeVersion && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    transitionItem(item.id, "in_progress");
                    toast.info("Sent revision + buzzed editor (mock)", {
                      description: `${feedbackOpen} open ${feedbackOpen === 1 ? "note" : "notes"} bundled to ${job.editorId}.`,
                    });
                  }}
                  disabled={feedbackOpen === 0 || item.status === "approved" || item.status === "delivered"}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    feedbackOpen > 0 && item.status !== "approved" && item.status !== "delivered"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                      : "cursor-not-allowed border-border bg-muted/30 text-muted-foreground",
                  )}
                >
                  <RotateCcwIcon className="size-3.5" />
                  Send revision
                </button>
                <button
                  type="button"
                  disabled={item.status === "approved" || item.status === "delivered"}
                  onClick={() => {
                    transitionItem(item.id, "approved");
                    toast.success(`Approved v${activeVersion.number}`, {
                      description: "Promoted to current version + client share link.",
                    });
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    item.status === "approved" || item.status === "delivered"
                      ? "cursor-not-allowed bg-muted/30 text-muted-foreground border border-border"
                      : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  )}
                >
                  <CheckCircle2Icon className="size-3.5" />
                  {item.status === "approved" || item.status === "delivered" ? "Approved" : "Approve"}
                </button>
              </>
            )}
            {isEditor && (
              <>
                {item.status !== "approved" && item.status !== "delivered" && (
                  <UploadVersionButton item={item} versions={versions} onUploadSuccess={onUploadSuccess} />
                )}
                {versions.length > 0 && item.status !== "review" && item.status !== "approved" && item.status !== "delivered" && (
                  <button
                    type="button"
                    onClick={() => {
                      transitionItem(item.id, "review");
                      toast.success("Ready for review", {
                        description: "Item status updated to Awaiting Review. Manager notified.",
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-400"
                  >
                    <CheckIcon className="size-3.5" />
                    Mark ready for review
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mode strip — shown for carousel/photo */}
        {supportsGallery && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {mode === "gallery" ? (
              <>
                <GalleryHorizontalEndIcon className="size-3" />
                Gallery —
                <span className="text-foreground">
                  {activeVersion?.files.length ?? 0}{" "}
                  {activeVersion?.files.length === 1 ? "item" : "items"}
                </span>
                {newFileIds.size > 0 && (
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                    {newFileIds.size} new in v{activeVersion?.number}
                  </span>
                )}
                <span className="ml-2">
                  Click a {item.kind === "carousel" ? "clip" : "photo"} to view
                  + feedback.
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={backToGallery}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeftIcon className="size-3" />
                Back to gallery
              </button>
            )}
          </div>
        )}
      </header>

      {/* body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar: Job Items for quick switching */}
        <div className="hidden w-[280px] shrink-0 flex-col border-r border-border bg-card/30 md:flex">
          <div className="border-b px-4 py-3">
            <h2 className="text-xs font-semibold text-foreground">Job Items</h2>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} in this job
            </p>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <ul className="flex flex-col gap-1.5">
              {items.map((it) => (
                <ItemNavRow key={it.id} jobId={jobId} item={it} active={it.id === itemId} />
              ))}
            </ul>
          </div>
        </div>

        {/* media area */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {isEditor && item.status === "not_started" ? (
            <EditorAwaitingStart
              item={item}
              job={job}
              onStartEditing={() => {
                transitionItem(item.id, "in_progress");
                toast.success("Status updated to In Progress! Start editing offline.");
              }}
            />
          ) : isEditor && item.status === "in_progress" && (versions.length === 0 || uploadingNewVersion) ? (
            <EditorDropzoneWorkspace
              item={item}
              nextVersion={(versions[versions.length - 1]?.number ?? 0) + 1}
              onUploadSuccess={(newV) => {
                onUploadSuccess(newV);
                setUploadingNewVersion(false);
              }}
              onCancel={versions.length > 0 ? () => setUploadingNewVersion(false) : undefined}
            />
          ) : (
            <>
              {isEditor && item.status === "in_progress" && versions.length > 0 && !uploadingNewVersion && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-between gap-3 text-xs shrink-0">
                  <div className="text-amber-200">
                    You have staged <strong>v{versions[versions.length - 1].number}</strong>. Send it to the manager for review?
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadingNewVersion(true)}
                      className="press rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent"
                    >
                      Upload New Version
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        transitionItem(item.id, "review");
                        toast.success("Ready for review", {
                          description: "Item status updated to Awaiting Review. Manager notified.",
                        });
                      }}
                      className="press rounded-md bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-2.5 py-1 text-[11px] transition-colors"
                    >
                      Request Review (Gửi duyệt)
                    </button>
                  </div>
                </div>
              )}
              {activeVersion ? (
                <MediaArea
                  item={item}
                  version={activeVersion}
                  mode={mode}
                  selectedFileId={selectedFileId}
                  onOpenSingle={openSingle}
                  onSelectFile={setSelectedFileId}
                  newFileIds={newFileIds}
                  videoRef={videoRef}
                />
              ) : (
                <NoVersion item={item} />
              )}
            </>
          )}
        </div>

        {/* Feedback panel — hidden in gallery mode per user spec: scan grid
            without distraction; only show feedback once a file is opened. */}
        {activeVersion && mode === "single" && (
          <FeedbackPanel
            version={activeVersion}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFileId}
            onSeekTimestamp={seekTo}
            uploadAccept={uploadAcceptFor(item.kind)}
            uploadMultiple={item.kind === "carousel" || item.kind === "photo"}
            nextVersionNumber={(versions[versions.length - 1]?.number ?? 0) + 1}
            itemId={item.id}
            onUploadSuccess={onUploadSuccess}
          />
        )}
      </div>

      {/* Mandatory brief popup for Editor */}
      {isEditor && isAccepted && !isRead && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="w-[min(92vw,540px)] p-5 gap-4" showCloseButton={false}>
            <div>
              <DialogTitle className="text-sm font-semibold text-amber-300">
                Requirement & Brief - Hãy đọc kỹ yêu cầu trước khi bắt đầu
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Read all details carefully. You must accept these specifications before starting.
              </DialogDescription>
            </div>

            <div className="max-h-[50vh] overflow-auto flex flex-col gap-3.5 pr-1 border-t border-b border-border/40 py-3 text-xs">
              {job.requirement && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col gap-2">
                  <span className="font-bold text-foreground text-[11px]">Job Level Requirements</span>
                  {job.requirement.tone && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Tone</span>
                      <span className="text-foreground/90">{job.requirement.tone}</span>
                    </div>
                  )}
                  {job.requirement.notes && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Notes</span>
                      <span className="text-foreground/90">{job.requirement.notes}</span>
                    </div>
                  )}
                  {job.requirement.brandReference && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Brand Reference</span>
                      <span className="text-foreground/90">{job.requirement.brandReference}</span>
                    </div>
                  )}
                </div>
              )}

              {item.brief && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col gap-2">
                  <span className="font-bold text-foreground text-[11px]">Item Specific Brief</span>
                  {item.brief.brief && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Direction</span>
                      <span className="text-foreground/90">{item.brief.brief}</span>
                    </div>
                  )}
                  {item.brief.script && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Script</span>
                      <span className="text-foreground/90">{item.brief.script}</span>
                    </div>
                  )}
                  {item.brief.musicReference && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Music Reference</span>
                      <span className="text-foreground/90">{item.brief.musicReference}</span>
                    </div>
                  )}
                  {item.brief.length && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Target Length</span>
                      <span className="font-mono text-foreground/90">{item.brief.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const { readRequirements } = require("@/components/jobs/jobs-data");
                readRequirements(job.id);
                toast.success("Brief understood! You can now start editing.");
              }}
              className="press w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 text-xs transition-colors"
            >
              I have read and understood the requirements (Tôi đã đọc và hiểu yêu cầu)
            </button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ItemNavRow({ jobId, item, active }: { jobId: string; item: Item; active: boolean }) {
  const Icon = item.kind === "video" ? FilmIcon : item.kind === "carousel" ? ClapperboardIcon : ImageIcon;
  const statusTone = jobStatusTone[item.status];

  return (
    <li>
      <Link
        href={`/jobs/${jobId}/items/${item.id}`}
        className={cn(
          "flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors",
          active
            ? "border-foreground/30 bg-muted/60"
            : "border-transparent hover:border-border hover:bg-card"
        )}
      >
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-md border",
            statusTone === "neutral"
              ? "border-border bg-muted text-muted-foreground"
              : badgeTone[statusTone]
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11.5px] font-medium text-foreground">{item.title}</div>
          <div className="text-[10px] text-muted-foreground">
            {itemKindLabel[item.kind]}
          </div>
        </div>
        <div className={cn("size-1.5 shrink-0 rounded-full", toneDot[statusTone])} />
      </Link>
    </li>
  );
}

// Small line under the title that tells the manager EXACTLY which version
// they're looking at — kills the "did I just review v1 again?" smell.
function ReviewingVersionLine({
  versions,
  activeVersion,
}: {
  versions: ItemVersion[];
  activeVersion: ItemVersion;
}) {
  const latest = versions[versions.length - 1];
  const isLatest = latest?.id === activeVersion.id;
  const uploaderName =
    activeVersion.uploadedBy && users[activeVersion.uploadedBy]
      ? users[activeVersion.uploadedBy].name
      : activeVersion.uploadedBy ?? "editor";

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono font-semibold",
          isLatest
            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300",
        )}
      >
        v{activeVersion.number}
        {isLatest ? (
          <span className="text-[9.5px] font-bold uppercase tracking-wider opacity-80">
            latest
          </span>
        ) : (
          <span className="text-[9.5px] font-bold uppercase tracking-wider opacity-80">
            older
          </span>
        )}
      </span>
      <span className="text-muted-foreground">
        uploaded {activeVersion.uploadedAt} by{" "}
        <span className="text-foreground">{uploaderName}</span>
      </span>
      {!isLatest && latest && (
        <span className="text-amber-300">
          · latest is v{latest.number}
        </span>
      )}
    </div>
  );
}

// ---- Brief popover (replaces former persistent left pane) -------------
// Compact button in the header action group → click opens Popover with
// the same Direction / Length / Script / Music / Note fields. Center
// pane gets full width back.

function BriefPopover({ item }: { item: Item }) {
  const brief = item.brief;
  const job = getJob(item.jobId);
  if (!brief && !job?.requirement) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            title="View brief and requirements"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          />
        }
      >
        <MegaphoneIcon className="size-3.5" />
        Brief
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-[340px] p-0">
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <MegaphoneIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Brief & Requirements</h3>
        </div>
        <div className="max-h-[60vh] overflow-auto px-4 py-3 flex flex-col gap-4">
          {/* Job Requirement */}
          {job?.requirement && (
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <SparklesIcon className="size-3 text-indigo-400" />
                Job Requirement
              </div>
              <dl className="flex flex-col gap-2">
                {job.requirement.tone && (
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tone</span>
                    <span className="text-foreground/90">{job.requirement.tone}</span>
                  </div>
                )}
                {job.requirement.brandReference && (
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Brand Reference</span>
                    <span className="text-foreground/90 break-all">{job.requirement.brandReference}</span>
                  </div>
                )}
                {(job.requirement.musicLicenseConfirmed || job.requirement.captionsRequested) && (
                  <div className="flex flex-col gap-1 mt-1">
                    {job.requirement.musicLicenseConfirmed && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
                        <CheckCircle2Icon className="size-3.5" />
                        Music license cleared
                      </span>
                    )}
                    {job.requirement.captionsRequested && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
                        <CaptionsIcon className="size-3.5" />
                        Captions requested
                      </span>
                    )}
                  </div>
                )}
                {job.requirement.notes && (
                  <div className="mt-1 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] leading-relaxed text-foreground/90">
                    {job.requirement.notes}
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Item Brief */}
          {brief && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <MegaphoneIcon className="size-3 text-sky-400" />
                Item Direction
              </div>
              {renderBriefSections(brief)}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function renderBriefSections(brief: NonNullable<Item["brief"]>) {
  return (
    <>
      {brief.brief && (
        <BriefSection icon={MegaphoneIcon} label="Direction">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-[12px] leading-relaxed text-foreground/90">
            {brief.brief}
          </div>
        </BriefSection>
      )}

      {brief.length && (
        <BriefSection icon={ClockIcon} label="Length">
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
            {brief.length}
          </span>
        </BriefSection>
      )}

      {brief.priority && brief.priority !== "normal" && (
        <BriefSection icon={FlagIcon} label="Priority">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase",
              brief.priority === "rush"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : brief.priority === "high"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-300",
            )}
          >
            {brief.priority === "rush" && <ZapIcon className="size-2.5" />}
            {brief.priority}
          </span>
        </BriefSection>
      )}

      {brief.script && (
        <BriefSection icon={ScrollTextIcon} label="Script">
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-[12px] leading-relaxed text-foreground/90">
            {brief.script}
          </p>
        </BriefSection>
      )}

      {brief.musicReference && (
        <BriefSection icon={MusicIcon} label="Music reference">
          <p className="text-[12px] text-foreground/90">{brief.musicReference}</p>
        </BriefSection>
      )}

      {(brief.musicLicenseConfirmed || brief.captionsRequested) && (
        <div className="flex flex-col gap-1.5">
          {brief.musicLicenseConfirmed && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
              <CheckCircle2Icon className="size-3.5" />
              Music license cleared
            </span>
          )}
          {brief.captionsRequested && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
              <CaptionsIcon className="size-3.5" />
              Captions requested
            </span>
          )}
        </div>
      )}

      {brief.note && brief.note !== brief.brief && (
        <BriefSection icon={CopyIcon} label="Note">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {brief.note}
          </p>
        </BriefSection>
      )}
    </>
  );
}

function BriefSection({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      {children}
    </div>
  );
}

function uploadAcceptFor(kind: Item["kind"]): string {
  if (kind === "video" || kind === "carousel") return "video/*";
  if (kind === "photo" || kind === "twilight" || kind === "drone") return "image/*";
  return "*/*";
}

function UploadVersionButton({
  item,
  versions,
  onUploadSuccess,
}: {
  item: Item;
  versions: ItemVersion[];
  onUploadSuccess?: (newV: ItemVersion) => void;
}) {
  const nextNumber = (versions[versions.length - 1]?.number ?? 0) + 1;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const viewer = useCurrentUser();

  const accept = React.useMemo(() => {
    if (item.kind === "video" || item.kind === "carousel") return "video/*";
    if (item.kind === "photo" || item.kind === "twilight") return "image/*";
    return "*/*";
  }, [item.kind]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const newV = uploadItemVersion(item.id, files.length, viewer.id);
    if (newV && onUploadSuccess) {
      onUploadSuccess(newV);
    }

    toast.success(`Uploaded v${nextNumber} (mock)`, {
      description: `${files.length} ${files.length === 1 ? "file" : "files"} staged. Status updated to Awaiting Review. Manager notified.`,
    });
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple={item.kind === "carousel" || item.kind === "photo"}
        accept={accept}
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
      >
        <UploadIcon className="size-3.5" />
        Upload v{nextNumber}
      </button>
    </>
  );
}

function VersionSelector({
  versions,
  activeId,
  onPick,
}: {
  versions: ItemVersion[];
  activeId?: string;
  onPick: (id: string) => void;
}) {
  const active = versions.find((v) => v.id === activeId) ?? versions[versions.length - 1];
  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          />
        }
      >
        <span className="font-mono">v{active.number}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{active.uploadedAt}</span>
        <ChevronDownIcon className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {versions
          .slice()
          .reverse()
          .map((v) => (
            <DropdownMenuItem
              key={v.id}
              onSelect={() => onPick(v.id)}
              className="flex items-center gap-2"
            >
              <span className="font-mono text-xs">v{v.number}</span>
              <span className="text-xs text-muted-foreground">{v.uploadedAt}</span>
              {v.status === "approved" && (
                <CheckIcon className="ml-auto size-3.5 text-emerald-400" />
              )}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NoVersion({ item }: { item: Item }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UploadIcon />
          </EmptyMedia>
          <EmptyTitle>No version yet</EmptyTitle>
          <EmptyDescription>
            Editor hasn&apos;t uploaded any files for {itemKindLabel[item.kind].toLowerCase()} yet.
            They&apos;ll appear here once they hit Upload.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

function MediaArea({
  item,
  version,
  mode,
  selectedFileId,
  onOpenSingle,
  onSelectFile,
  newFileIds,
  videoRef,
}: {
  item: Item;
  version: ItemVersion;
  mode: "gallery" | "single";
  selectedFileId?: string;
  onOpenSingle: (id: string) => void;
  onSelectFile: (id: string | undefined) => void;
  newFileIds: Set<string>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  // Reuse views by kind
  if (item.kind === "carousel") {
    return (
      <CarouselView
        version={version}
        mode={mode}
        selectedFileId={selectedFileId}
        onOpenSingle={onOpenSingle}
        onSelectFile={onSelectFile}
        newFileIds={newFileIds}
      />
    );
  }
  if (item.kind === "photo" || item.kind === "twilight" || item.kind === "drone" || item.kind === "floor_plan" || item.kind === "virtual_staging" || item.kind === "3d_tour") {
    return (
      <PhotoGridView
        version={version}
        mode={mode}
        selectedFileId={selectedFileId}
        onOpenSingle={onOpenSingle}
        onSelectFile={onSelectFile}
        newFileIds={newFileIds}
      />
    );
  }
  // video (default — always single)
  return <VideoView version={version} videoRef={videoRef} />;
}

function VideoView({
  version,
  videoRef,
}: {
  version: ItemVersion;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const file = version.files[0];
  if (!file) return null;

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto bg-black/60 px-6 py-6">
      <div className="relative flex h-full max-h-full aspect-[9/16] flex-col overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
        {/* Mock — poster image stands in for the video */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.posterUrl ?? file.thumbnailUrl}
          alt={file.filename}
          className="h-full w-full object-cover"
        />
        {/* Hidden video element kept for future real source wiring + seek API. */}
        {/* hover play scrim */}
        <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3">
          <div className="text-xs text-white/80">
            <p className="font-mono">{file.filename}</p>
            <p className="text-white/60">
              v{version.number} · {file.durationSec ?? 0}s · uploaded {version.uploadedAt}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <PlayIcon className="size-3.5" />
            Play
          </button>
        </div>
      </div>
    </div>
  );
}

export type MediaAreaCommon = {
  selectedFile?: ItemFile;
};

function EditorAwaitingStart({
  item,
  job,
  onStartEditing,
}: {
  item: Item;
  job: any;
  onStartEditing: () => void;
}) {
  const [downloading, setDownloading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [downloaded, setDownloaded] = React.useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloading(false);
          setDownloaded(true);
          toast.success("Download complete!", {
            description: "Shooter raw files saved to your local downloads folder.",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 bg-background">
      <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <ScrollTextIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Prepare Workspace & Raw Files</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Read the brief, download the assets, and start editing offline.
            </p>
          </div>
        </div>

        {/* Brief Quickview */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs flex flex-col gap-2">
          <div className="font-semibold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">Art Direction Summary</div>
          {item.brief?.brief ? (
            <p className="text-foreground/90 italic leading-relaxed">&ldquo;{item.brief.brief}&rdquo;</p>
          ) : (
            <p className="text-muted-foreground">No specific direction provided. Refer to Job requirements.</p>
          )}
          {item.brief?.length && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Duration:</span>
              <span className="font-mono text-purple-300 font-bold bg-purple-500/10 border border-purple-500/20 px-1 py-0.5 rounded">{item.brief.length}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 mt-1">
          {/* Step 1: Download Raw */}
          <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground">1. Download Raw Assets</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Get raw video/photos uploaded by shooter.</div>
            </div>
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className={cn(
                "press shrink-0 rounded-lg text-xs font-semibold py-2 px-4 transition-colors",
                downloaded
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : downloading
                    ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                    : "bg-foreground text-background hover:bg-foreground/90"
              )}
            >
              {downloading ? `Downloading... ${downloadProgress}%` : downloaded ? "Downloaded" : "Download Raw"}
            </button>
          </div>

          {/* Step 2: Start Editing */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground">2. Start Editing</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Change job status to In Progress and work local.</div>
            </div>
            <button
              type="button"
              disabled={!downloaded}
              onClick={onStartEditing}
              className={cn(
                "press shrink-0 rounded-lg text-xs font-semibold py-2 px-4 transition-colors",
                downloaded
                  ? "bg-indigo-500 hover:bg-indigo-400 text-white"
                  : "bg-muted text-muted-foreground border border-border cursor-not-allowed"
              )}
            >
              Start Editing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorDropzoneWorkspace({
  item,
  nextVersion,
  onUploadSuccess,
  onCancel,
}: {
  item: Item;
  nextVersion: number;
  onUploadSuccess: (newV: ItemVersion) => void;
  onCancel?: () => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState<"idle" | "success" | "failed">("idle");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const viewer = useCurrentUser();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    startSimulatedUpload(files.length);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    startSimulatedUpload(files.length);
  };

  const startSimulatedUpload = (fileCount: number) => {
    setUploading(true);
    setProgress(0);
    setStatus("idle");

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          // 85% success chance
          const success = Math.random() < 0.85;
          if (success) {
            setStatus("success");
            const newV = uploadItemVersion(item.id, fileCount, viewer.id);
            if (newV) {
              onUploadSuccess(newV);
              toast.success(`Uploaded v${nextVersion} successfully!`, {
                description: `${fileCount} files uploaded. Click "Request Review" to submit.`,
              });
            }
          } else {
            setStatus("failed");
            toast.error("Upload failed", {
              description: "Simulated connection error. Please try again.",
            });
          }
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 bg-background">
      <div className="max-w-2xl w-full flex flex-col gap-4">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed border-border bg-card/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:border-indigo-500/40 hover:bg-card/95",
            uploading && "pointer-events-none border-indigo-500 bg-card/95",
            status === "success" && "border-emerald-500 bg-emerald-500/[0.02]"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={item.kind === "carousel" || item.kind === "photo"}
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="size-10 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-400 animate-spin">
                <UploadIcon className="size-5" />
              </div>
              <div className="text-xs font-semibold text-foreground">Uploading version v{nextVersion}...</div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground">{progress}% complete</div>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center gap-2">
              <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckIcon className="size-5" />
              </div>
              <div className="text-xs font-semibold text-emerald-300">Upload Success!</div>
              <p className="text-[11px] text-muted-foreground">Version v{nextVersion} is ready. Submit it below for review.</p>
            </div>
          ) : status === "failed" ? (
            <div className="flex flex-col items-center gap-2">
              <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                <AlertTriangleIcon className="size-5" />
              </div>
              <div className="text-xs font-semibold text-rose-300">Upload Failed</div>
              <p className="text-[11px] text-muted-foreground">A network timeout occurred. Click here to retry.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <UploadIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">Upload Version v{nextVersion}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Drag and drop your edited files here, or click to browse.
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Supports {item.kind === "video" ? "MP4 video" : item.kind === "photo" ? "JPG images" : "project files"}
                </p>
              </div>
            </div>
          )}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] text-muted-foreground hover:underline text-center"
          >
            Cancel and view current files
          </button>
        )}
      </div>
    </div>
  );
}
