/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClapperboardIcon,
  ClipboardListIcon,
  EyeIcon,
  FilmIcon,
  ImageIcon,
  PackageIcon,
  PlaneIcon,
  PlusIcon,
  CalendarIcon,
  UploadIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { users, badgeTone, toneDot, toneAccent } from "@/components/editor-data";
import {
  jobs,
  getManagerOrders,
  items as allItems,
  jobStatusLabel,
  jobStatusTone,
  subscribeJobs,
  addCandidateItem,
  getCategoryForKind,
  itemKindLabel,
  type CandidateOrder,
  type Job,
  type Item,
  type ItemKind,
  type JobStatus,
  type ManagerOrder,
} from "@/components/jobs/jobs-data";
import { AssignJobDialog } from "@/components/jobs/assign-job-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Icon per item kind — used in the small mini-row inside the card.
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

type StatusFilter = "all" | JobStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all",          label: "All" },
  { key: "not_started",  label: "Not started" },
  { key: "in_progress",  label: "In progress" },
  { key: "review",       label: "In review" },
  { key: "approved",     label: "Approved" },
  { key: "delivered",    label: "Delivered" },
];

export function JobsPage() {
  const currentUser = useCurrentUser();
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignOrder, setAssignOrder] = React.useState<CandidateOrder | null>(null);
  const [assignItemKeys, setAssignItemKeys] = React.useState<string[] | undefined>();
  const [addItemOpen, setAddItemOpen] = React.useState(false);
  const [addItemOrderId, setAddItemOrderId] = React.useState<string>("");

  // Subscribe so views update after createJobMock() appends.
  const [rev, setRev] = React.useState(0);
  React.useEffect(() => subscribeJobs(() => setRev((n) => n + 1)), []);

  const openAssignFor = (order: CandidateOrder, itemKeys?: string[]) => {
    setAssignOrder(order);
    setAssignItemKeys(itemKeys);
    setAssignOpen(true);
  };
  const onAssignDialogOpenChange = (open: boolean) => {
    setAssignOpen(open);
    if (!open) {
      setAssignOrder(null);
      setAssignItemKeys(undefined);
    }
  };

  // Role branches:
  //   Manager + Admin → "Today, {name}" hub (admin = manager for permissions)
  //   Editor          → "My Queue" flat item-level list scoped to them
  //   VA / others     → generic list fallback
  if (currentUser.role === "manager" || currentUser.role === "admin") {
    return (
      <>
        <ManagerHubView
          firstName={currentUser.name.split(" ")[0]}
          onAssignOrder={openAssignFor}
          onOpenAddItem={(orderId) => {
            setAddItemOrderId(orderId);
            setAddItemOpen(true);
          }}
          rev={rev}
        />
        <AssignJobDialog
          open={assignOpen}
          onOpenChange={onAssignDialogOpenChange}
          initialOrder={assignOrder ?? undefined}
          initialItemKeys={assignItemKeys}
        />
        <AddOrderItemDialog
          open={addItemOpen}
          onOpenChange={setAddItemOpen}
          orderId={addItemOrderId}
        />
      </>
    );
  }

  if (currentUser.role === "editor") {
    return (
      <EditorMyQueueView
        editorId={currentUser.id}
        firstName={currentUser.name.split(" ")[0]}
        rev={rev}
      />
    );
  }

  return (
    <>
      <GenericJobsList onAssign={() => setAssignOpen(true)} rev={rev} />
      <AssignJobDialog
        open={assignOpen}
        onOpenChange={onAssignDialogOpenChange}
        initialOrder={assignOrder ?? undefined}
        initialItemKeys={assignItemKeys}
      />
    </>
  );
}

// ---- Generic JobsList (admin / editor / va / fallback) -----------------

function GenericJobsList({ onAssign, rev }: { onAssign: () => void; rev: number }) {
  const [filter, setFilter] = React.useState<StatusFilter>("all");

  const visible = React.useMemo(
    () => (filter === "all" ? [...jobs] : jobs.filter((j) => j.status === filter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, rev],
  );

  const counts = React.useMemo(() => {
    const acc: Record<StatusFilter, number> = {
      all: jobs.length,
      not_started: 0, in_progress: 0, review: 0, approved: 0, delivered: 0,
    };
    for (const j of jobs) acc[j.status]++;
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev]);

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] flex-col">
      <header className="flex flex-col gap-3 border-b px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-fluid-2xl font-semibold tracking-tight">Jobs</h1>
            <p className="text-fluid-sm text-muted-foreground">
              Assignments grouped by editor batch. Each job holds one or more deliverables.
            </p>
          </div>
          <button
            type="button"
            onClick={onAssign}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <PlusIcon className="size-3.5" />
            New Job
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                    active ? "bg-background/10 text-background" : "bg-muted text-muted-foreground/80",
                  )}
                >
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-5">
        {visible.length === 0 ? (
          <Empty className="mx-auto max-w-md py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageIcon />
              </EmptyMedia>
              <EmptyTitle>No jobs in this view</EmptyTitle>
              <EmptyDescription>
                Try a different filter or assign a new job from an order.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((job) => (
              <JobCard key={job.id} job={job} items={getItemsForJob(job.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Manager Hub view --------------------------------------------------
// "Today, {name}" with a counter strip and jobs grouped by "who's waiting
// on me" priority. Manager's first move every morning is the loud
// "Assign new raw" CTA top-right.

type ManagerGroupKey =
  | "awaiting_assign"
  | "awaiting_review"
  | "approved_not_shipped"
  | "in_flight"
  | "done";

const MANAGER_GROUPS: Array<{
  key: ManagerGroupKey;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}> = [
  {
    key: "awaiting_assign",
    label: "Awaiting my assign",
    description: "Raw is in. Pick an editor.",
    icon: ClipboardListIcon,
    accent: "border-amber-500/30 bg-amber-500/[0.04]",
  },
  {
    key: "awaiting_review",
    label: "Awaiting my review",
    description: "Editor uploaded. Open and decide.",
    icon: EyeIcon,
    accent: "border-rose-500/30 bg-rose-500/[0.04]",
  },
  {
    key: "approved_not_shipped",
    label: "Approved · ship to client",
    description: "Hit send. Done for the day.",
    icon: CheckCircle2Icon,
    accent: "border-emerald-500/30 bg-emerald-500/[0.04]",
  },
  {
    key: "in_flight",
    label: "In flight",
    description: "Editor is on it. No action needed.",
    icon: ClipboardListIcon,
    accent: "border-border bg-muted/20",
  },
  {
    key: "done",
    label: "Delivered today",
    description: "Closed loops.",
    icon: CheckCircle2Icon,
    accent: "border-border bg-muted/10",
  },
];

function groupForJob(status: JobStatus): ManagerGroupKey {
  switch (status) {
    case "not_started":
      return "awaiting_assign";
    case "review":
      return "awaiting_review";
    case "approved":
      return "approved_not_shipped";
    case "in_progress":
      return "in_flight";
    case "delivered":
      return "done";
  }
}

function ManagerHubView({
  firstName,
  onAssignOrder,
  onOpenAddItem,
  rev,
}: {
  firstName: string;
  onAssignOrder: (order: CandidateOrder, itemKeys?: string[]) => void;
  onOpenAddItem: (orderId: string) => void;
  rev: number;
}) {
  const grouped = React.useMemo(() => {
    const acc: Record<ManagerGroupKey, Job[]> = {
      awaiting_assign: [],
      awaiting_review: [],
      approved_not_shipped: [],
      in_flight: [],
      done: [],
    };
    for (const j of jobs) acc[groupForJob(j.status)].push(j);
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev]);

  const counts = {
    awaiting_assign: grouped.awaiting_assign.length,
    awaiting_review: grouped.awaiting_review.length,
    approved_not_shipped: grouped.approved_not_shipped.length,
  };

  const totalActionable =
    counts.awaiting_assign + counts.awaiting_review + counts.approved_not_shipped;

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] flex-col">
      <header className="flex flex-col gap-3 border-b px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-fluid-2xl font-semibold tracking-tight">
              Today, {firstName}
            </h1>
            <p className="text-fluid-sm text-muted-foreground">
              {totalActionable === 0
                ? "All caught up. Nothing's waiting on you."
                : `${totalActionable} ${totalActionable === 1 ? "item" : "items"} waiting on you.`}
            </p>
          </div>
          {/* No top "+ Assign new raw" CTA — each order card carries its own
              Assign action so the manager always picks WHICH order in one
              tap, not via a separate picker dialog. */}
        </div>

        {/* Counter strip — clickable as anchor jumps later */}
        <div className="flex flex-wrap items-center gap-2">
          <CounterPill
            label="Awaiting my assign"
            count={counts.awaiting_assign}
            tone="amber"
          />
          <CounterPill
            label="Awaiting my review"
            count={counts.awaiting_review}
            tone="rose"
          />
          <CounterPill
            label="Ship to client"
            count={counts.approved_not_shipped}
            tone="emerald"
          />
          <span className="ml-auto text-[11px] text-muted-foreground">
            {jobs.length} total · {grouped.in_flight.length} in flight · {grouped.done.length} delivered
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-5">
        <ManagerOrdersList onAssignOrder={onAssignOrder} onOpenAddItem={onOpenAddItem} rev={rev} />
      </div>
    </div>
  );
}

// ---- Editor My Queue view ----------------------------------------------
// Flat ITEM-level list scoped to editorId = me. Sections: Working / Needs
// revision / Upcoming. Each row = one deliverable across all my jobs.

type EditorGroupKey =
  | "needs_revision"
  | "working"
  | "awaiting_review"
  | "upcoming"
  | "done";

const EDITOR_GROUPS: Array<{
  key: EditorGroupKey;
  label: string;
  description: string;
}> = [
  {
    key: "needs_revision",
    label: "Needs revision",
    description: "Manager left feedback. Address it next.",
  },
  {
    key: "working",
    label: "Working on",
    description: "You've started. Keep going.",
  },
  {
    key: "awaiting_review",
    label: "Awaiting review",
    description: "Submitted. Manager hasn't reviewed yet.",
  },
  {
    key: "upcoming",
    label: "Upcoming",
    description: "Not started yet. Brief + raw are ready.",
  },
  {
    key: "done",
    label: "Done",
    description: "Approved or delivered.",
  },
];

function groupForItem(item: Item): EditorGroupKey {
  switch (item.status) {
    case "review":
      // Manager-side review state. From editor view: "I submitted, waiting
      // on manager" — own its own section so the badge matches the bucket.
      return "awaiting_review";
    case "in_progress":
      // Open feedback on the latest version means the editor needs to redo;
      // otherwise they're actively working.
      const current = getCurrentVersion(item);
      const openFb = current?.feedback.filter((f) => f.status === "open").length ?? 0;
      return openFb > 0 ? "needs_revision" : "working";
    case "not_started":
      return "upcoming";
    case "approved":
    case "delivered":
      return "done";
  }
}

function EditorMyQueueView({
  editorId,
  firstName,
  rev,
}: {
  editorId: string;
  firstName: string;
  rev: number;
}) {
  // Pick all items belonging to jobs assigned to this editor.
  const myItems = React.useMemo(() => {
    const myJobIds = new Set(jobs.filter((j) => j.editorId === editorId).map((j) => j.id));
    return allItems.filter((it) => myJobIds.has(it.jobId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorId, rev]);

  const grouped = React.useMemo(() => {
    const acc: Record<EditorGroupKey, Item[]> = {
      needs_revision: [],
      working: [],
      awaiting_review: [],
      upcoming: [],
      done: [],
    };
    for (const it of myItems) acc[groupForItem(it)].push(it);
    return acc;
  }, [myItems]);

  const counts = {
    needs_revision: grouped.needs_revision.length,
    working: grouped.working.length,
    awaiting_review: grouped.awaiting_review.length,
    upcoming: grouped.upcoming.length,
  };
  // "On your plate" = items the editor needs to do something about
  // (revise or work). Awaiting review is technically waiting on manager,
  // but the editor still wants to see it so they know it's submitted.
  const totalActionable =
    counts.needs_revision + counts.working + counts.upcoming;
  const totalVisible = totalActionable + counts.awaiting_review + grouped.done.length;

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] flex-col">
      <header className="flex flex-col gap-3 border-b px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-fluid-2xl font-semibold tracking-tight">My Queue</h1>
            <p className="text-fluid-sm text-muted-foreground">
              {totalVisible === 0
                ? `Quiet day, ${firstName}. Nothing assigned.`
                : totalActionable === 0
                  ? `Caught up — ${counts.awaiting_review} waiting on manager, ${grouped.done.length} done.`
                  : `${totalActionable} ${totalActionable === 1 ? "item" : "items"} on your plate.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CounterPill label="Needs revision" count={counts.needs_revision} tone="amber" />
          <CounterPill label="Working on" count={counts.working} tone="rose" />
          <CounterPill label="Awaiting review" count={counts.awaiting_review} tone="emerald" />
          <span className="ml-auto text-[11px] text-muted-foreground">
            {myItems.length} total · {grouped.upcoming.length} upcoming · {grouped.done.length} done
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-5">
        {totalVisible === 0 ? (
          <Empty className="mx-auto max-w-md py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageIcon />
              </EmptyMedia>
              <EmptyTitle>No items assigned</EmptyTitle>
              <EmptyDescription>
                Your manager hasn&apos;t sent anything yet. Enjoy the breather.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            {EDITOR_GROUPS.map((g) => {
              const groupItems = grouped[g.key];
              if (groupItems.length === 0) return null;
              return (
                <section key={g.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      {g.label}
                    </h2>
                    <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {groupItems.length}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {g.description}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {groupItems.map((it) => (
                      <EditorItemRow key={it.id} item={it} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EditorItemRow({ item }: { item: Item }) {
  const job = getJob(item.jobId);
  const Icon = kindIcon[item.kind];
  const current = getCurrentVersion(item);
  const openFb = current?.feedback.filter((f) => f.status === "open").length ?? 0;
  const statusTone = jobStatusTone[item.status];
  // Editor can upload while in_progress or not_started (first version).
  // Awaiting-review and done states hide the inline upload — gotta wait for
  // manager feedback before bumping the version.
  const canInlineUpload =
    item.status === "in_progress" || item.status === "not_started";
  const nextVersion = (current?.number ?? 0) + 1;
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onUploadPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    toast.success(`Uploaded v${nextVersion} for ${item.title} (mock)`, {
      description: `${files.length} ${files.length === 1 ? "file" : "files"} staged. Status updated to Awaiting Review. Manager notified.`,
    });
    e.target.value = "";
  };

  return (
    <li>
      <Link
        href={`/jobs/${item.jobId}/items/${item.id}`}
        className={cn(
          "group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-accent/40",
          statusTone === "neutral"
            ? "hover:border-foreground/20"
            : toneAccent[statusTone],
        )}
      >
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg border",
            statusTone === "neutral"
              ? "border-border bg-muted/40 text-muted-foreground"
              : badgeTone[statusTone],
          )}
        >
          <Icon className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-medium text-foreground">{item.title}</h3>
            {current && (
              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-1 py-0 font-mono text-[10px] font-bold text-indigo-300">
                v{current.number}
              </span>
            )}
            {openFb > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-semibold text-amber-300">
                {openFb} open
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">{job?.orderAddress ?? job?.orderTitle ?? "—"}</span>
            {item.brief?.priority && item.brief.priority !== "normal" && (
              <>
                <span>·</span>
                <span
                  className={cn(
                    "font-semibold uppercase",
                    item.brief.priority === "rush"
                      ? "text-rose-300"
                      : item.brief.priority === "high"
                        ? "text-amber-300"
                        : "text-sky-300",
                  )}
                >
                  {item.brief.priority}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canInlineUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple={item.kind === "carousel" || item.kind === "photo"}
                accept={
                  item.kind === "video" || item.kind === "carousel"
                    ? "video/*"
                    : item.kind === "photo" || item.kind === "twilight"
                      ? "image/*"
                      : "*/*"
                }
                onChange={onUploadPick}
                className="hidden"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                title={`Upload v${nextVersion}`}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-foreground/30 bg-foreground/5 px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                <UploadIcon className="size-3" />
                v{nextVersion}
              </button>
            </>
          )}
          {job && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
              <CalendarIcon className="size-3" />
              {job.dueAt}
            </span>
          )}
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
              badgeTone[statusTone],
            )}
          >
            {jobStatusLabel[item.status]}
          </Badge>
        </div>
      </Link>
    </li>
  );
}

// Order-centric list for manager — every order with its jobs nested.
// Replaces the previous status-grouped flat job list since manager needs
// to see "this order has 2 jobs, can spawn more".
function ManagerOrdersList({
  onAssignOrder,
  onOpenAddItem,
  rev,
}: {
  onAssignOrder: (order: CandidateOrder, itemKeys?: string[]) => void;
  onOpenAddItem: (orderId: string) => void;
  rev: number;
}) {
  const orders = React.useMemo(
    () => getManagerOrders(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rev],
  );

  if (orders.length === 0) {
    return (
      <Empty className="mx-auto max-w-md py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageIcon />
          </EmptyMedia>
          <EmptyTitle>No orders yet</EmptyTitle>
          <EmptyDescription>
            When shooters upload raw, those orders show up here ready to batch.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {orders.map((o) => (
        <ManagerOrderCard key={o.id} order={o} onAssignOrder={onAssignOrder} onOpenAddItem={onOpenAddItem} />
      ))}
    </div>
  );
}

function ManagerOrderCard({
  order,
  onAssignOrder,
  onOpenAddItem,
}: {
  order: ManagerOrder;
  onAssignOrder: (order: CandidateOrder, itemKeys?: string[]) => void;
  onOpenAddItem: (orderId: string) => void;
}) {
  const jobStatusCounts = React.useMemo(() => {
    const acc: Partial<Record<JobStatus, number>> = {};
    for (const j of order.jobs) acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, [order.jobs]);

  const unassignedCount = order.candidates.length;
  const totalJobs = order.jobs.length;

  const videos = React.useMemo(() => order.allOrderItems.filter((item) => getCategoryForKind(item.kind) === "video"), [order.allOrderItems]);
  const photos = React.useMemo(() => order.allOrderItems.filter((item) => getCategoryForKind(item.kind) === "photo"), [order.allOrderItems]);
  const others = React.useMemo(() => order.allOrderItems.filter((item) => getCategoryForKind(item.kind) === "other"), [order.allOrderItems]);

  return (
    <Link
      href={`/orders/${order.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-foreground/20 hover:bg-accent/10"
    >
      {/* Header — address + raw status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-indigo-400">
            {order.title}
          </h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {order.address}
          </p>
        </div>
        {order.rawReady ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold text-emerald-300">
            <CheckCircle2Icon className="size-2.5" />
            Raw ready
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-semibold text-amber-300">
            <AlertTriangleIcon className="size-2.5" />
            Raw pending
          </span>
        )}
      </div>

      {/* Item type summary */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {videos.length > 0 && (
          <span className="flex items-center gap-1">
            <FilmIcon className="size-3.5 text-muted-foreground" />
            {videos.length}
          </span>
        )}
        {photos.length > 0 && (
          <span className="flex items-center gap-1">
            <ImageIcon className="size-3.5 text-muted-foreground" />
            {photos.length}
          </span>
        )}
        {others.length > 0 && (
          <span className="flex items-center gap-1">
            <PackageIcon className="size-3.5 text-muted-foreground" />
            {others.length}
          </span>
        )}
        <span className="text-border">·</span>
        <span>{totalJobs} {totalJobs === 1 ? "job" : "jobs"}</span>
        {unassignedCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span className="font-medium text-rose-300">{unassignedCount} unassigned</span>
          </>
        )}
      </div>

      {/* Job status breakdown */}
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(jobStatusCounts).map(([status, n]) => (
          <span
            key={status}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
              badgeTone[jobStatusTone[status as JobStatus]],
            )}
          >
            {n} {jobStatusLabel[status as JobStatus].toLowerCase()}
          </span>
        ))}
      </div>

      {/* Action footer */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          {order.rawReady && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAssignOrder(order);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              <PlusIcon className="size-3" />
              Assign Job
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenAddItem(order.id);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <PlusIcon className="size-3" />
            Add Item
          </button>
        </div>
        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
          View details →
        </span>
      </div>
    </Link>
  );
}

type ServiceOption = {
  id: string;
  label: string;
  kind: ItemKind;
};

const SERVICES_BY_KIND: Record<"video" | "photo" | "other", ServiceOption[]> = {
  video: [
    { id: "listing-reel-30", label: "Listing Reel (30s)", kind: "video" },
    { id: "prop-walkthrough-60", label: "Property Walkthrough (60s)", kind: "video" },
    { id: "shorts-15", label: "TikTok/IG Shorts (15s)", kind: "video" },
    { id: "drone-video-highlight", label: "Drone Video Highlight", kind: "video" },
    { id: "ig-carousel-8", label: "IG Carousel (8 clips)", kind: "carousel" },
  ],
  photo: [
    { id: "standard-interior", label: "Standard Interior Set", kind: "photo" },
    { id: "exterior-hdr", label: "Exterior HDR Pack", kind: "photo" },
    { id: "twilight-hero", label: "Twilight Hero Shots", kind: "twilight" },
    { id: "drone-photos", label: "Drone Photos", kind: "drone" },
  ],
  other: [
    { id: "floor-plan-2d", label: "2D Floor Plan", kind: "floor_plan" },
    { id: "matterport-3d", label: "3D Matterport Tour", kind: "3d_tour" },
    { id: "virtual-staging", label: "Virtual Staging", kind: "virtual_staging" },
    { id: "custom-gift", label: "Custom Gift Pack", kind: "other" },
  ],
};

function AddOrderItemDialog({
  open,
  onOpenChange,
  orderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}) {
  const [category, setCategory] = React.useState<"video" | "photo" | "other">("video");
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [kind, setKind] = React.useState<ItemKind>("video");
  const [selectedChips, setSelectedChips] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setCategory("video");
      setSelectedServiceId(null);
      setTitle("");
      setKind("video");
      setSelectedChips([]);
    }
  }, [open]);

  const mockFileGroups = [
    { id: "raw-main", label: "raw-video-main (5 files)" },
    { id: "raw-drone", label: "raw-drone (3 files)" },
    { id: "raw-interiors", label: "raw-interior-photos (18 files)" },
    { id: "raw-extras", label: "raw-other-gifts (1 file)" },
  ];

  const handleToggleChip = (id: string) => {
    setSelectedChips((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (!title.trim()) {
      toast.error("Please select a service or enter an item title");
      return;
    }
    addCandidateItem(orderId, title, kind);
    toast.success(`Added item: ${title}`, {
      description: `Linked to raw sources: ${selectedChips.length > 0 ? selectedChips.join(", ") : "none"}`
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(95vw,500px)] p-5 gap-4">
        <div>
          <DialogTitle className="text-sm font-semibold">Add Custom Order Item</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Create a custom deliverable (like an extra gift) for this order.
          </DialogDescription>
        </div>

        <div className="flex flex-col gap-3">
          {/* Category Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["video", "photo", "other"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setCategory(k);
                    setSelectedServiceId(null);
                    setTitle("");
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-center text-xs font-medium capitalize transition-colors cursor-pointer",
                    category === k
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card hover:border-foreground/20"
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Service Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Specific Service
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {SERVICES_BY_KIND[category].map((svc) => {
                const active = selectedServiceId === svc.id;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(svc.id);
                      setTitle(svc.label);
                      setKind(svc.kind);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all duration-200 cursor-pointer flex flex-col gap-1 justify-between",
                      active
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500"
                        : "border-border bg-card hover:border-foreground/20 text-foreground"
                    )}
                  >
                    <span className="font-semibold">{svc.label}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">{itemKindLabel[svc.kind]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Title Input */}
          {selectedServiceId && (
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Item Title
              </label>
              <input
                type="text"
                placeholder="e.g. Extra Twilight Photo / Customer Gift"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-foreground/30"
              />
            </div>
          )}

          {/* Link Raw File Sources */}
          {selectedServiceId && (
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Link Raw File Sources (Select Chips)
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {mockFileGroups.map((g) => {
                  const active = selectedChips.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleToggleChip(g.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                        active
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span className={cn(
                        "size-1.5 rounded-full",
                        active ? "bg-purple-300 animate-pulse" : "bg-muted-foreground/40"
                      )} />
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={!selectedServiceId} className="h-8 text-xs">
            Add Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Card representing one CandidateOrder ready to be batched. Visual rhythm
// matches ShootCard in MyShootsView so the manager + shooter views speak
// the same shape of "work waiting on you".
function RawReadyCard({
  order,
  onAssign,
}: {
  order: CandidateOrder;
  onAssign: () => void;
}) {
  const kindCounts = React.useMemo(() => {
    const acc: Partial<Record<ItemKind, number>> = {};
    for (const c of order.candidates) acc[c.kind] = (acc[c.kind] ?? 0) + 1;
    return Object.entries(acc) as [ItemKind, number][];
  }, [order.candidates]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:border-foreground/30">
      {/* Status + count */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
          <AlertTriangleIcon className="size-3" />
          Awaiting assign
        </span>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {order.candidates.length} {order.candidates.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Address */}
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {order.title}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {order.address}
        </p>
      </div>

      {/* Item kind chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {kindCounts.map(([kind, n]) => {
          const Icon = kindIcon[kind];
          return (
            <span
              key={kind}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10.5px] text-muted-foreground"
            >
              <Icon className="size-3" />
              {n}
            </span>
          );
        })}
      </div>

      {/* Action */}
      <div className="mt-1 flex items-center justify-between border-t pt-3">
        <span className="text-[11px] text-muted-foreground">
          Raw uploaded · ready to batch
        </span>
        <button
          type="button"
          onClick={onAssign}
          className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          <PlusIcon className="size-3" />
          Assign
        </button>
      </div>
    </div>
  );
}

function CounterPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "amber" | "rose" | "emerald";
}) {
  const empty = count === 0;
  const toneCls = empty
    ? "border-border bg-muted/30 text-muted-foreground"
    : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
      : tone === "rose"
        ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
        : "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        toneCls,
      )}
    >
      <span className="rounded-full bg-background/20 px-1.5 text-[10px] font-bold tabular-nums">
        {count}
      </span>
      {label}
    </span>
  );
}

function JobCard({ job, items }: { job: Job; items: Item[] }) {
  const editor = users[job.editorId];
  const statusTone = jobStatusTone[job.status];
  const statusLabel = jobStatusLabel[job.status];

  // mini-row item type breakdown
  const kindCounts = React.useMemo(() => {
    const acc: Partial<Record<ItemKind, number>> = {};
    for (const it of items) acc[it.kind] = (acc[it.kind] ?? 0) + 1;
    return Object.entries(acc) as [ItemKind, number][];
  }, [items]);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs transition-colors",
        statusTone === "neutral"
          ? "hover:border-foreground/20 hover:bg-accent/30"
          : toneAccent[statusTone],
        job.status === "delivered" && "opacity-80 hover:opacity-100",
      )}
    >
      {/* top: status dot + title + status badge */}
      <div className="flex items-start gap-2">
        <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", toneDot[statusTone])} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
            {job.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {job.orderAddress ?? job.orderTitle ?? "—"}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
            badgeTone[statusTone],
          )}
        >
          {statusLabel}
        </Badge>
      </div>

      {/* mid: item count + kinds */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className="rounded-md border-border bg-muted/60 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"
        >
          {items.length} {items.length === 1 ? "item" : "items"}
        </Badge>
        {kindCounts.map(([kind, n]) => {
          const Icon = kindIcon[kind];
          return (
            <span
              key={kind}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10.5px] text-muted-foreground"
            >
              <Icon className="size-3" />
              {n}
            </span>
          );
        })}
      </div>

      {/* bottom: editor + due */}
      <div className="mt-1 flex items-center gap-2 border-t pt-3">
        {editor ? (
          <>
            <Avatar className="size-6">
              <AvatarImage src={editor.image} alt={editor.name} />
              <AvatarFallback className={editor.tone}>{editor.initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{editor.name}</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <UserIcon className="size-3" />
            Unassigned
          </span>
        )}

        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <CalendarIcon className="size-3" />
          {job.dueAt}
        </span>
      </div>
    </Link>
  );
}
