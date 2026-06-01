"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CaptionsIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronRightIcon,
  ClapperboardIcon,
  CircleIcon,
  DownloadIcon,
  FilmIcon,
  FlagIcon,
  ImageIcon,
  MusicIcon,
  PackageIcon,
  PaletteIcon,
  PlaneIcon,
  RotateCcwIcon,
  SparklesIcon,
  StickyNoteIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { badgeTone, toneAccent, toneDot, users } from "@/components/editor-data";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  getCurrentVersion,
  getItemsForJob,
  getJob,
  itemKindLabel,
  jobStatusLabel,
  jobStatusTone,
  transitionItem,
  transitionJob,
  subscribeJobs,
  type Item,
  type ItemKind,
  type JobRequirement,
} from "@/components/jobs/jobs-data";

const kindIcon: Record<ItemKind, LucideIcon> = {
  video: FilmIcon,
  carousel: ClapperboardIcon,
  photo: ImageIcon,
  drone: PlaneIcon,
  floor_plan: PackageIcon,
  twilight: ImageIcon,
  "3d_tour": PackageIcon,
  virtual_staging: ImageIcon,
  other: PackageIcon,
};

export function JobDetailPage({ jobId }: { jobId: string }) {
  const [, setRev] = React.useState(0);
  React.useEffect(() => subscribeJobs(() => setRev((n) => n + 1)), []);

  const job = getJob(jobId);
  if (!job) notFound();
  const items = getItemsForJob(jobId);
  const editor = users[job.editorId];
  const manager = users[job.managerId];
  const statusTone = jobStatusTone[job.status];

  const viewer = useCurrentUser();
  const isManager = viewer.role === "manager" || viewer.role === "admin";

  // Batch actions derivation
  const reviewItems = items.filter((it) => it.status === "review");
  const itemsWithOpenFeedback = items.filter((it) => {
    const v = getCurrentVersion(it);
    return v ? v.feedback.some((f) => f.status === "open") : false;
  });
  const allApproved =
    items.length > 0 &&
    items.every((it) => it.status === "approved" || it.status === "delivered");

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] flex-col">
      {/* page header */}
      <header className="flex flex-col gap-3 border-b px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Link
              href="/jobs"
              className="mt-0.5 inline-flex size-7 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to Jobs"
            >
              <ArrowLeftIcon className="size-3.5" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("size-1.5 rounded-full", toneDot[statusTone])} />
                <h1 className="truncate text-fluid-2xl font-semibold tracking-tight">
                  {job.title}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
                    badgeTone[statusTone],
                  )}
                >
                  {jobStatusLabel[job.status]}
                </Badge>
              </div>
              <p className="mt-1 text-fluid-sm text-muted-foreground">
                {job.orderTitle} · {job.orderAddress}
              </p>
            </div>
          </div>

          {/* Manager Batch Actions */}
          {isManager && (
            <div className="flex shrink-0 items-center gap-2 mt-0.5">
              {itemsWithOpenFeedback.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    itemsWithOpenFeedback.forEach((it) => {
                      if (it.status !== "in_progress") {
                        transitionItem(it.id, "in_progress");
                      }
                    });
                    toast.info("Sent revisions + buzzed editor", {
                      description: `Revisions sent for ${itemsWithOpenFeedback.length} items to ${editor?.name ?? "editor"}.`,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/15"
                >
                  <RotateCcwIcon className="size-3.5" />
                  Send revision
                </button>
              )}

              {reviewItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    reviewItems.forEach((it) => transitionItem(it.id, "approved"));
                    toast.success("Approved all items", {
                      description: `Approved ${reviewItems.length} items currently in review.`,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                >
                  <CheckIcon className="size-3.5" />
                  Approve all
                </button>
              )}

              {allApproved && job.status !== "delivered" && (
                <button
                  type="button"
                  onClick={() => {
                    transitionJob(job.id, "delivered");
                    toast.success("Job marked delivered", {
                      description: "Deliverables are finalized and client access is configured.",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-sky-950 transition-colors hover:bg-sky-400"
                >
                  <CheckCircle2Icon className="size-3.5" />
                  Mark delivered
                </button>
              )}
            </div>
          )}
        </div>

        {/* meta strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {editor && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="size-5">
                <AvatarImage src={editor.image} alt={editor.name} />
                <AvatarFallback className={editor.tone}>{editor.initials}</AvatarFallback>
              </Avatar>
              <span className="text-foreground">{editor.name}</span>
              <span className="text-muted-foreground">· editor</span>
            </span>
          )}
          {manager && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="size-5">
                <AvatarImage src={manager.image} alt={manager.name} />
                <AvatarFallback className={manager.tone}>{manager.initials}</AvatarFallback>
              </Avatar>
              <span className="text-foreground">{manager.name}</span>
              <span className="text-muted-foreground">· manager</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon className="size-3.5" />
            Due {job.dueAt}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <PackageIcon className="size-3.5" />
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
      </header>

      {/* body: items list + requirement side panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* items list */}
        <div className="flex-1 overflow-auto px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Items</h2>
            <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
              {items.length}
            </span>
          </div>

          {items.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageIcon />
                </EmptyMedia>
                <EmptyTitle>No items yet</EmptyTitle>
                <EmptyDescription>
                  Add deliverables to this job from the order detail page.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((it) => (
                <ItemRow key={it.id} jobId={job.id} item={it} />
              ))}
            </ul>
          )}
        </div>

        <Separator orientation="vertical" />

        {/* requirement side panel */}
        <aside className="hidden w-[300px] shrink-0 flex-col overflow-auto bg-muted/20 md:flex xl:w-[340px]">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Requirement</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              From {job.orderTitle}
            </p>
          </div>

          <div className="flex flex-col gap-4 px-5 py-4">
            {job.requirement ? (
              <RequirementCard requirement={job.requirement} />
            ) : job.notes ? (
              <SidePanelBlock icon={StickyNoteIcon} title="Manager note">
                <p className="text-xs leading-relaxed text-foreground/90">{job.notes}</p>
              </SidePanelBlock>
            ) : null}

            <SidePanelBlock icon={PackageIcon} title="Order">
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="text-foreground">{job.orderTitle}</span>
                <span className="text-muted-foreground">{job.orderAddress}</span>
              </div>
              {job.orderId && (
                <Link
                  href={`/orders/${job.orderId}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground"
                >
                  Open order
                  <ChevronRightIcon className="size-3" />
                </Link>
              )}
            </SidePanelBlock>

            <SidePanelBlock icon={DownloadIcon} title="Raw files">
              <p className="text-xs text-muted-foreground">
                Original shooter uploads attached to this order.
              </p>
              <button
                type="button"
                onClick={() => {
                  // mock — wire to raw bundle download when backend lands
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <DownloadIcon className="size-3.5" />
                Download raw bundle
              </button>
            </SidePanelBlock>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RequirementCard({ requirement }: { requirement: JobRequirement }) {
  const checklist: { label: string; icon: LucideIcon; ok: boolean }[] = [
    { label: "Music license cleared", icon: MusicIcon, ok: !!requirement.musicLicenseConfirmed },
    { label: "Captions requested",    icon: CaptionsIcon, ok: !!requirement.captionsRequested },
  ];

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <SparklesIcon className="size-3" />
        Requirement
      </div>

      <dl className="flex flex-col gap-1.5">
        {requirement.tone && (
          <RequirementRow icon={PaletteIcon} label="Tone">
            {requirement.tone}
          </RequirementRow>
        )}
        {requirement.brandReference && (
          <RequirementRow icon={SparklesIcon} label="Brand">
            <span className="break-all">{requirement.brandReference}</span>
          </RequirementRow>
        )}
      </dl>

      <ul className="mt-2 flex flex-col gap-1">
        {checklist.map(({ label, icon: Icon, ok }) => (
          <li
            key={label}
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px]",
              ok ? "text-emerald-300" : "text-muted-foreground",
            )}
          >
            {ok ? (
              <CheckCircle2Icon className="size-3.5" />
            ) : (
              <CircleIcon className="size-3.5" />
            )}
            <Icon className="size-3" />
            {label}
          </li>
        ))}
      </ul>

      {requirement.notes && (
        <p className="mt-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] leading-relaxed text-foreground/90">
          {requirement.notes}
        </p>
      )}
    </div>
  );
}

function RequirementRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-[11.5px]">
      <Icon className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="text-foreground/90">{children}</dd>
      </div>
    </div>
  );
}

function SidePanelBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {title}
      </div>
      {children}
    </div>
  );
}

function ItemRow({ jobId, item }: { jobId: string; item: Item }) {
  const Icon = kindIcon[item.kind];
  const statusTone = jobStatusTone[item.status];
  const currentVersion = getCurrentVersion(item);
  const fileCount = currentVersion?.files.length ?? 0;
  const feedbackOpen =
    currentVersion?.feedback.filter((f) => f.status === "open").length ?? 0;
  const priority = item.brief?.priority;

  return (
    <li>
      <Link
        href={`/jobs/${jobId}/items/${item.id}`}
        className={cn(
          "group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/40",
          statusTone === "neutral"
            ? "hover:border-foreground/20"
            : toneAccent[statusTone],
        )}
      >
        {/* kind icon */}
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg border",
            statusTone === "neutral"
              ? "border-border bg-muted/40 text-muted-foreground"
              : cn(badgeTone[statusTone]),
          )}
        >
          <Icon className="size-4" />
        </div>

        {/* title + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-medium text-foreground">{item.title}</h3>
            {priority === "high" || priority === "rush" ? (
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 rounded-full border px-1.5 py-0 text-[10px] font-semibold uppercase",
                  priority === "rush"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300",
                )}
              >
                {priority === "rush" ? (
                  <ZapIcon className="mr-0.5 size-2.5" />
                ) : (
                  <FlagIcon className="mr-0.5 size-2.5" />
                )}
                {priority}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{itemKindLabel[item.kind]}</span>
            {currentVersion ? (
              <>
                <span>·</span>
                <span className="font-mono">v{currentVersion.number}</span>
                <span>·</span>
                <span>
                  {fileCount} {fileCount === 1 ? "file" : "files"}
                </span>
              </>
            ) : (
              <>
                <span>·</span>
                <span>No version yet</span>
              </>
            )}
            {item.brief?.musicReference && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MusicIcon className="size-3" />
                  Music ref
                </span>
              </>
            )}
            {feedbackOpen > 0 && (
              <>
                <span>·</span>
                <span className="font-medium text-amber-400">
                  {feedbackOpen} open feedback
                </span>
              </>
            )}
          </div>
        </div>

        {/* status badge + chevron */}
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
              badgeTone[statusTone],
            )}
          >
            {jobStatusLabel[item.status]}
          </Badge>
          <ChevronRightIcon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
      </Link>
    </li>
  );
}
