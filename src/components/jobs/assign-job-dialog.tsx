/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronDownIcon,
  CalendarIcon,
  ClapperboardIcon,
  FilmIcon,
  ImageIcon,
  PackageIcon,
  PlaneIcon,
  XIcon,
  ZapIcon,
  UserIcon,
  ScrollTextIcon,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { users, VIDEO_KINDS, PHOTO_KINDS, type User } from "@/components/editor-data";
import {
  candidateOrders,
  createJobMock,
  itemKindLabel,
  type CandidateItem,
  type CandidateOrder,
  type ItemBrief,
  type ItemKind,
  type JobRequirement,
} from "@/components/jobs/jobs-data";

// ---- shared bits -------------------------------------------------------

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

const PRIORITIES: { value: NonNullable<ItemBrief["priority"]>; label: string; cls: string }[] = [
  { value: "low",    label: "Low",    cls: "border-sky-500/20 bg-sky-500/10 text-sky-300" },
  { value: "normal", label: "Normal", cls: "border-border bg-muted/60 text-muted-foreground" },
  { value: "high",   label: "High",   cls: "border-amber-500/20 bg-amber-500/10 text-amber-300" },
  { value: "rush",   label: "Rush",   cls: "border-rose-500/20 bg-rose-500/10 text-rose-300" },
];

// Editor pool: exclude managers/admins. Reused MA/RZ/MJ/VE from editor-data users.
const EDITOR_IDS = ["MA", "RZ", "MJ", "VE"] as const;

const WIZARD_STEPS = [
  { id: 1, label: "Pick Items" },
  { id: 2, label: "Assign Editor" },
  { id: 3, label: "General & Schedule" },
  { id: 4, label: "Detailed Briefs" },
  { id: 5, label: "Review & Confirm" },
] as const;

type StepId = (typeof WIZARD_STEPS)[number]["id"];

// ---- main component ----------------------------------------------------

export function AssignJobDialog({
  open,
  onOpenChange,
  initialOrder,
  initialItemKeys,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialOrder?: CandidateOrder;
  initialItemKeys?: string[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<StepId>(1);

  // Step 1 state
  const [orderId, setOrderId] = React.useState<string | undefined>(initialOrder?.id);
  const [pickedKeys, setPickedKeys] = React.useState<Set<string>>(new Set());

  // Step 2 state (Editor selection)
  const [editorId, setEditorId] = React.useState<string | undefined>();

  // Step 3 state (General details)
  const [dueAt, setDueAt] = React.useState("May 27");
  const [requirement, setRequirement] = React.useState<JobRequirement>({
    tone: "",
    musicLicenseConfirmed: false,
    captionsRequested: false,
    brandReference: "",
    notes: "",
  });
  const [briefingMode, setBriefingMode] = React.useState<"general" | "individual">("general");

  // Step 4 state (Briefings)
  const [generalBrief, setGeneralBrief] = React.useState<ItemBrief>({
    assignee: { type: "in_house", name: "" },
    note: "",
    brief: "",
    length: "",
    script: "",
    musicReference: "",
    priority: "normal",
  });
  const [briefByKey, setBriefByKey] = React.useState<Record<string, ItemBrief>>({});

  // Derived — prefer initialOrder when provided so the dialog works even
  // for orders not in the candidateOrders mock list (e.g. orders that
  // already have jobs spawned but need another version).
  const order = React.useMemo(() => {
    if (initialOrder) return initialOrder;
    return candidateOrders.find((o) => o.id === orderId);
  }, [orderId, initialOrder]);
  const picks = React.useMemo<CandidateItem[]>(
    () => (order ? ((order as CandidateOrder & { allOrderItems?: CandidateItem[] }).allOrderItems ?? order.candidates).filter((c) => pickedKeys.has(c.key)) : []),
    [order, pickedKeys],
  );
  const editor = editorId ? users[editorId] : undefined;

  // Reset when dialog closes OR opens so the form starts clean each time.
  React.useEffect(() => {
    setStep(initialItemKeys && initialItemKeys.length > 0 ? 2 : 1);
    setOrderId(initialOrder?.id);
    if (initialItemKeys && initialItemKeys.length > 0) {
      setPickedKeys(new Set(initialItemKeys));
    } else {
      setPickedKeys(
        new Set(
          (initialOrder ? ((initialOrder as CandidateOrder & { allOrderItems?: CandidateItem[] }).allOrderItems ?? initialOrder.candidates) : []).map((c) => c.key) ?? []
        )
      );
    }
    setEditorId(undefined);
    setBriefByKey({});
    setBriefingMode("general");
    setGeneralBrief({
      assignee: { type: "in_house", name: "" },
      note: "",
      brief: "",
      length: "",
      script: "",
      musicReference: "",
      priority: "normal",
    });
    setDueAt("May 27");
    setRequirement({
      tone: "",
      musicLicenseConfirmed: false,
      captionsRequested: false,
      brandReference: "",
      notes: "",
    });
  }, [open, initialOrder, initialItemKeys]);

  // Pre-fill briefs
  React.useEffect(() => {
    if (!editor || !order) return;
    setGeneralBrief((prev) => ({
      ...prev,
      assignee: { type: "in_house", name: editor.name },
      deadline: dueAt,
    }));
    setBriefByKey((prev) => {
      const next = { ...prev };
      for (const p of picks) {
        if (!next[p.key]) {
          next[p.key] = {
            assignee: { type: "in_house", name: editor.name },
            note: "",
            priority: p.defaultPriority ?? "normal",
            kind: p.kind,
            deadline: dueAt,
          };
        }
      }
      return next;
    });
  }, [editor, order, picks, dueAt]);

  // Step gating
  const canNext1 = !!order && pickedKeys.size > 0;
  const canNext2 = !!editor;
  const canNext3 = true;
  const canNext4 = briefingMode === "general" ? true : Object.keys(briefByKey).length === picks.length;

  const submit = () => {
    if (!order || !editor) return;
    // Strip empties so the saved requirement is clean
    const cleanReq: JobRequirement = {
      tone: requirement.tone?.trim() || undefined,
      musicLicenseConfirmed: requirement.musicLicenseConfirmed || undefined,
      captionsRequested: requirement.captionsRequested || undefined,
      brandReference: requirement.brandReference?.trim() || undefined,
      notes: requirement.notes?.trim() || undefined,
    };
    const hasReq = Object.values(cleanReq).some((v) => v !== undefined);

    const compiledPicks = picks.map((p) => {
      let finalBrief: ItemBrief;
      if (briefingMode === "general") {
        finalBrief = {
          ...generalBrief,
          assignee: { type: "in_house", name: editor.name },
          deadline: dueAt,
          kind: p.kind,
        };
      } else {
        finalBrief = briefByKey[p.key];
      }
      return { candidate: p, brief: finalBrief };
    });

    const job = createJobMock({
      order,
      editorId: editor.id,
      managerId: "KY",
      dueAt,
      requirement: hasReq ? cleanReq : undefined,
      picks: compiledPicks,
    });
    onOpenChange(false);
    toast.success(`Job created · ${picks.length} ${picks.length === 1 ? "item" : "items"}`, {
      description: `Sent to ${editor.name} · due ${dueAt}`,
    });
    router.push(`/jobs/${job.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(96vw,760px)] max-w-none gap-0 overflow-hidden p-0 sm:max-w-none"
        showCloseButton={false}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-sm font-semibold">
              New Job — assign a batch
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[11.5px] text-muted-foreground">
              Group deliverables from an order and send them to one editor.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="size-7 shrink-0 rounded-full"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {/* step indicator */}
        <StepIndicator current={step} />

        {/* body */}
        <div className="max-h-[60vh] overflow-auto px-5 py-5">
          {step === 1 && (
            <Step1Pick
              orderId={orderId}
              onSelectOrder={(id) => {
                setOrderId(id);
                setPickedKeys(new Set());
              }}
              pickedKeys={pickedKeys}
              onTogglePick={(key) => {
                setPickedKeys((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) {
                    next.delete(key);
                  } else {
                    next.add(key);
                  }
                  return next;
                });
              }}
              lockedOrder={initialOrder}
            />
          )}

          {step === 2 && order && (
            <Step2Editor
              picks={picks}
              editorId={editorId}
              onSelectEditor={setEditorId}
            />
          )}

          {step === 3 && order && (
            <Step3GeneralSchedule
              dueAt={dueAt}
              setDueAt={setDueAt}
              requirement={requirement}
              onUpdateRequirement={(patch: Partial<JobRequirement>) =>
                setRequirement((prev) => ({ ...prev, ...patch }))
              }
              briefingMode={briefingMode}
              setBriefingMode={setBriefingMode}
            />
          )}

          {step === 4 && order && (
            <Step4DetailedBriefs
              picks={picks}
              briefingMode={briefingMode}
              generalBrief={generalBrief}
              onUpdateGeneralBrief={(patch: Partial<ItemBrief>) =>
                setGeneralBrief((prev) => ({ ...prev, ...patch }))
              }
              briefByKey={briefByKey}
              onUpdateBrief={(key: string, patch: Partial<ItemBrief>) =>
                setBriefByKey((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
              }
            />
          )}

          {step === 5 && order && editor && (
            <Step5Review
              order={order}
              picks={picks}
              editor={editor}
              dueAt={dueAt}
              requirement={requirement}
              briefingMode={briefingMode}
              generalBrief={generalBrief}
              briefByKey={briefByKey}
            />
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/15 px-5 py-3">
          <div className="text-[11px] text-muted-foreground">
            {step === 1 && (order ? `${pickedKeys.size} picked` : "Pick an order first")}
            {step === 2 && (editor ? `Editor: ${editor.name}` : "Pick an editor")}
            {step === 3 && `Due: ${dueAt}`}
            {step === 4 && (briefingMode === "general" ? "General brief set" : "Individual briefs")}
            {step === 5 && "Ready — review the summary and create"}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && !(step === 2 && initialItemKeys && initialItemKeys.length > 0) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as StepId) : s))}
                className="h-8 text-xs"
              >
                Back
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            )}
            {step < 5 ? (
              <Button
                size="sm"
                disabled={
                  (step === 1 && !canNext1) ||
                  (step === 2 && !canNext2) ||
                  (step === 3 && !canNext3) ||
                  (step === 4 && !canNext4)
                }
                onClick={() => setStep((s) => ((s + 1) as StepId))}
                className="h-8 text-xs"
              >
                Next
              </Button>
            ) : (
              <Button size="sm" onClick={submit} className="h-8 text-xs">
                Create Job
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- step indicator ----------------------------------------------------

function StepIndicator({ current }: { current: StepId }) {
  return (
    <ol className="flex items-center gap-1 border-b border-border bg-muted/10 px-5 py-2.5">
      {WIZARD_STEPS.map((s, i) => {
        const active = s.id === current;
        const done = s.id < current;
        return (
          <li key={s.id} className="flex items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                active
                  ? "bg-foreground text-background"
                  : done
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-background/15 text-background"
                    : done
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-muted-foreground/20 text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-2.5" /> : s.id}
              </span>
              {s.label}
            </span>
            {i < WIZARD_STEPS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---- Step 1 ------------------------------------------------------------

function Step1Pick({
  orderId,
  onSelectOrder,
  pickedKeys,
  onTogglePick,
  lockedOrder,
}: {
  orderId?: string;
  onSelectOrder: (id: string) => void;
  pickedKeys: Set<string>;
  onTogglePick: (key: string) => void;
  lockedOrder?: CandidateOrder;
}) {
  // When lockedOrder is provided, the caller already knows which order
  // they're batching — skip the order grid entirely and lean on the
  // locked order's candidates as the items list.
  const order = lockedOrder ?? candidateOrders.find((o) => o.id === orderId);
  const items = React.useMemo<CandidateItem[]>(() => {
    if (!order) return [];
    return ((order as CandidateOrder & { allOrderItems?: CandidateItem[] }).allOrderItems ?? order.candidates);
  }, [order]);

  return (
    <div className="flex flex-col gap-4">
      <Step1OrderHeader
        lockedOrder={lockedOrder}
        orderId={orderId}
        onSelectOrder={onSelectOrder}
      />

      {order && (
        <>
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">
                Items
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                  {pickedKeys.size}/{items.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const all = pickedKeys.size === items.length;
                  if (all) {
                    items.forEach((c) => onTogglePick(c.key));
                  } else {
                    items
                      .filter((c) => !pickedKeys.has(c.key))
                      .forEach((c) => onTogglePick(c.key));
                  }
                }}
                className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {pickedKeys.size === items.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Pick what goes into this batch. Unpicked items stay on the order.
            </p>
          </div>

          <ul className="flex flex-col gap-1.5">
            {items.map((c) => {
              const Icon = kindIcon[c.kind];
              const picked = pickedKeys.has(c.key);
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => onTogglePick(c.key)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                      picked
                        ? "border-foreground/30 bg-foreground/5"
                        : "border-border bg-card hover:border-foreground/20",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border text-[9px]",
                        picked
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-muted",
                      )}
                    >
                      {picked ? <CheckIcon className="size-3" /> : null}
                    </span>
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-xs text-foreground">{c.title}</span>
                    <span className="text-[10.5px] text-muted-foreground">
                      {itemKindLabel[c.kind]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Step1OrderHeader({
  lockedOrder,
  orderId,
  onSelectOrder,
}: {
  lockedOrder?: CandidateOrder;
  orderId?: string;
  onSelectOrder: (id: string) => void;
}) {
  if (lockedOrder) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          From order
        </div>
        <div className="mt-0.5 text-sm font-semibold text-foreground">
          {lockedOrder.title}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {lockedOrder.address}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-xs font-semibold text-foreground">Order</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Only orders with raw uploaded are pickable. One job = one order.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {candidateOrders.map((o) => {
          const active = o.id === orderId;
          const disabled = !o.rawReady;
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectOrder(o.id)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-foreground/40 ring-2 ring-foreground/20"
                  : disabled
                    ? "cursor-not-allowed border-border opacity-50"
                    : "border-border hover:border-foreground/30",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{o.title}</span>
                {!o.rawReady && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-border bg-muted/40 px-1.5 py-0 text-[9.5px] font-medium text-muted-foreground"
                  >
                    raw pending
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{o.address}</span>
              <span className="mt-1 text-[10.5px] text-muted-foreground">
                {o.candidates.length} candidate items
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Step 2 ------------------------------------------------------------

function Step2Editor({
  picks,
  editorId,
  onSelectEditor,
}: {
  picks: CandidateItem[];
  editorId?: string;
  onSelectEditor: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Editor selection section */}
      <section className="rounded-xl border border-border bg-card/60 p-4">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <UserIcon className="size-3.5 text-indigo-400" />
          Assign Editor
        </h3>
        <p className="mt-0.5 text-[10.5px] text-muted-foreground">
          {(() => {
            const hasVideo = picks.some((p) => VIDEO_KINDS.has(p.kind));
            const hasPhoto = picks.some((p) => PHOTO_KINDS.has(p.kind));
            if (hasVideo && hasPhoto) return "Assign a generalist or split into two jobs.";
            if (hasVideo) return "Picks are video — suggest a video editor.";
            if (hasPhoto) return "Picks are photo — suggest a photo editor.";
            return "Select an editor for this batch.";
          })()}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {EDITOR_IDS.map((id) => {
            const u = users[id];
            const active = editorId === id;
            const hasVideo = picks.some((p) => VIDEO_KINDS.has(p.kind));
            const hasPhoto = picks.some((p) => PHOTO_KINDS.has(p.kind));
            const spec = u.specialty as string | undefined;
            const matches =
              spec === "both" ||
              (hasVideo && hasPhoto && spec === "both") ||
              (hasVideo && !hasPhoto && spec === "video") ||
              (!hasVideo && hasPhoto && spec === "photo");
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectEditor(id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left transition-colors cursor-pointer",
                  active
                    ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                    : matches
                      ? "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/[0.01]"
                      : "border-border hover:border-foreground/20",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border text-[9px]",
                    active ? "border-indigo-500 bg-indigo-500 text-white" : "border-border bg-muted"
                  )}>
                    {active && <CheckIcon className="size-2.5" />}
                  </span>
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={u.image} alt={u.name} />
                    <AvatarFallback className={u.tone}>{u.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{u.role}</div>
                  </div>
                </div>
                {u.specialty && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-1.5 py-0 text-[8.5px] font-bold uppercase tracking-wider",
                      u.specialty === "video"
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                        : u.specialty === "photo"
                          ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                    )}
                  >
                    {u.specialty}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {editorId && users[editorId]?.role === "Vendor" && (
          <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 flex items-center justify-between gap-3 animate-fade-in">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-purple-300">Vendor Anonymous Link</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
                http://localhost:3000/vendor/job/job-mock-link-ve-access
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText("http://localhost:3000/vendor/job/job-mock-link-ve-access");
                toast.success("Copied Vendor Access Link!", {
                  description: "Send this privately to the vendor for anonymous access."
                });
              }}
              className="press shrink-0 bg-purple-600 hover:bg-purple-500 text-white rounded-lg h-7 px-3 text-[10px] font-semibold"
            >
              Copy Link
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function Step3GeneralSchedule({
  dueAt,
  setDueAt,
  requirement,
  onUpdateRequirement,
  briefingMode,
  setBriefingMode,
}: {
  dueAt: string;
  setDueAt: (v: string) => void;
  requirement: JobRequirement;
  onUpdateRequirement: (patch: Partial<JobRequirement>) => void;
  briefingMode: "general" | "individual";
  setBriefingMode: (mode: "general" | "individual") => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Due & Requirements section */}
      <section className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2.5">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 text-indigo-400" />
            General Info
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Due Date</span>
            <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
              <input
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-16 bg-transparent text-xs text-foreground outline-none text-center font-semibold"
              />
            </div>
          </div>
        </div>

        <RequirementBlock
          requirement={requirement}
          onChange={onUpdateRequirement}
        />
      </section>

      {/* Briefing Mode selector */}
      <section className="rounded-xl border border-border bg-card/60 p-4">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
          <ScrollTextIcon className="size-3.5 text-indigo-400" />
          Briefing Mode
        </h3>
        <p className="text-[10.5px] text-muted-foreground mb-3">
          Choose whether to write one set of instructions for all deliverables or write separate instructions per item.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-1">
          <button
            type="button"
            onClick={() => setBriefingMode("general")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 text-center transition-colors cursor-pointer",
              briefingMode === "general"
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <span className="text-xs font-semibold">General Brief</span>
            <span className="text-[9.5px] opacity-75 font-normal">Apply one brief to all deliverables</span>
          </button>
          <button
            type="button"
            onClick={() => setBriefingMode("individual")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 text-center transition-colors cursor-pointer",
              briefingMode === "individual"
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <span className="text-xs font-semibold">Individual Briefs</span>
            <span className="text-[9.5px] opacity-75 font-normal">Configure details per deliverable</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function Step4DetailedBriefs({
  picks,
  briefingMode,
  generalBrief,
  onUpdateGeneralBrief,
  briefByKey,
  onUpdateBrief,
}: {
  picks: CandidateItem[];
  briefingMode: "general" | "individual";
  generalBrief: ItemBrief;
  onUpdateGeneralBrief: (patch: Partial<ItemBrief>) => void;
  briefByKey: Record<string, ItemBrief>;
  onUpdateBrief: (key: string, patch: Partial<ItemBrief>) => void;
}) {
  const hasVideos = picks.some((p) => p.kind === "video" || p.kind === "carousel");
  const hasPhotos = picks.some((p) => p.kind !== "video" && p.kind !== "carousel");

  if (briefingMode === "general") {
    const priority = generalBrief.priority ?? "normal";

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3.5">
          <div className="border-b border-border/40 pb-2.5">
            <h3 className="text-xs font-semibold text-foreground">General Briefing Note</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              These briefing instructions will be automatically applied to all {picks.length} items in this job.
            </p>
          </div>

          {/* Priority chips */}
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Priority
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onUpdateGeneralBrief({ priority: p.value })}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium transition-colors cursor-pointer",
                    priority === p.value ? p.cls : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {hasVideos && (
            <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Video Instructions</h4>
              <div>
                <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Direction / Script
                </label>
                <textarea
                  value={generalBrief.script ?? generalBrief.note ?? ""}
                  onChange={(e) => onUpdateGeneralBrief({ script: e.target.value, note: e.target.value })}
                  placeholder="Door → kitchen → living → pool → drone reveal"
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Length
                  </label>
                  <input
                    value={generalBrief.length ?? ""}
                    onChange={(e) => onUpdateGeneralBrief({ length: e.target.value })}
                    placeholder="30s, 6 × 7s, 45s…"
                    className="mt-1 w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Music ref
                  </label>
                  <input
                    value={generalBrief.musicReference ?? ""}
                    onChange={(e) => onUpdateGeneralBrief({ musicReference: e.target.value })}
                    placeholder="Lo-fi calm ~95 BPM"
                    className="mt-1 w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {hasPhotos && (
            <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Photo / Retouching Instructions</h4>
              <div>
                <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Retouching Notes
                </label>
                <textarea
                  value={generalBrief.note ?? ""}
                  onChange={(e) => onUpdateGeneralBrief({ note: e.target.value })}
                  placeholder="Sky replacement, remove trash cans, fire in fireplace..."
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // individual mode: render the list of BriefCards grouped or scrollable
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <ScrollTextIcon className="size-3.5 text-indigo-400" />
            Deliverables Briefing
          </h3>
          <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
            {picks.length} items
          </span>
        </div>
        
        <div className="max-h-[50vh] overflow-y-auto flex flex-col gap-2.5 pr-1">
          {hasVideos && (
            <div>
              <h4 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Video & Carousel</h4>
              <ul className="flex flex-col gap-2">
                {picks
                  .filter((p) => p.kind === "video" || p.kind === "carousel")
                  .map((p, idx) => (
                    <BriefCard
                      key={p.key}
                      candidate={p}
                      brief={briefByKey[p.key]}
                      onUpdate={(patch) => onUpdateBrief(p.key, patch)}
                      defaultOpen={picks.length === 1 || idx === 0}
                    />
                  ))}
              </ul>
            </div>
          )}

          {hasPhotos && (
            <div className="mt-2.5">
              <h4 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Photo & Other</h4>
              <ul className="flex flex-col gap-2">
                {picks
                  .filter((p) => p.kind !== "video" && p.kind !== "carousel")
                  .map((p, idx) => (
                    <BriefCard
                      key={p.key}
                      candidate={p}
                      brief={briefByKey[p.key]}
                      onUpdate={(patch) => onUpdateBrief(p.key, patch)}
                      defaultOpen={picks.length === 1 || idx === 0}
                    />
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BriefCard({
  candidate,
  brief,
  onUpdate,
  defaultOpen = false,
}: {
  candidate: CandidateItem;
  brief?: ItemBrief;
  onUpdate: (patch: Partial<ItemBrief>) => void;
  defaultOpen?: boolean;
}) {
  const Icon = kindIcon[candidate.kind];
  const [open, setOpen] = React.useState(defaultOpen);
  const isVideo = candidate.kind === "video" || candidate.kind === "carousel";
  const priority = brief?.priority ?? "normal";

  React.useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent/30"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-foreground">{candidate.title}</div>
          <div className="text-[10.5px] text-muted-foreground">
            {itemKindLabel[candidate.kind]}
            {brief?.note ? ` · ${brief.note.slice(0, 40)}${brief.note.length > 40 ? "…" : ""}` : ""}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "rounded-full border px-1.5 py-0 text-[10px] font-semibold uppercase",
            PRIORITIES.find((p) => p.value === priority)?.cls ?? "",
          )}
        >
          {priority === "rush" && <ZapIcon className="mr-0.5 size-2.5" />}
          {priority}
        </Badge>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
          {/* Priority chips */}
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Priority
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onUpdate({ priority: p.value })}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors",
                    priority === p.value ? p.cls : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {isVideo ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Direction / Script
                </label>
                <textarea
                  value={brief?.script ?? brief?.note ?? ""}
                  onChange={(e) => onUpdate({ script: e.target.value, note: e.target.value })}
                  placeholder="Door → kitchen → living → pool → drone reveal"
                  rows={2}
                  className="mt-1 w-full resize-none rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Length
                  </label>
                  <input
                    value={brief?.length ?? ""}
                    onChange={(e) => onUpdate({ length: e.target.value })}
                    placeholder="30s, 6 × 7s, 45s…"
                    className="mt-1 w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Music ref
                  </label>
                  <input
                    value={brief?.musicReference ?? ""}
                    onChange={(e) => onUpdate({ musicReference: e.target.value })}
                    placeholder="Lo-fi calm ~95 BPM"
                    className="mt-1 w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Retouching Notes
                </label>
                <textarea
                  value={brief?.note ?? ""}
                  onChange={(e) => onUpdate({ note: e.target.value })}
                  placeholder="Sky replacement, remove trash cans, fire in fireplace..."
                  rows={2}
                  className="mt-1 w-full resize-none rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ---- Step 3 ------------------------------------------------------------

// ---- Requirement (job-level brief, shared between Step 2 + JobDetail) -

function RequirementBlock({
  requirement,
  onChange,
}: {
  requirement: JobRequirement;
  onChange: (patch: Partial<JobRequirement>) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Requirement
        </h3>
        <span className="text-[10px] text-muted-foreground/70">
          Shown to editor in the job
        </span>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tone / mood
          </label>
          <input
            value={requirement.tone ?? ""}
            onChange={(e) => onChange({ tone: e.target.value })}
            placeholder="bright + airy"
            className="mt-1 w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Brand reference
          </label>
          <input
            value={requirement.brandReference ?? ""}
            onChange={(e) => onChange({ brandReference: e.target.value })}
            placeholder="drive link or short note"
            className="mt-1 w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RequirementToggle
          label="Music license cleared"
          active={!!requirement.musicLicenseConfirmed}
          onClick={() =>
            onChange({ musicLicenseConfirmed: !requirement.musicLicenseConfirmed })
          }
        />
        <RequirementToggle
          label="Captions requested"
          active={!!requirement.captionsRequested}
          onClick={() => onChange({ captionsRequested: !requirement.captionsRequested })}
        />
      </div>

      <div className="mt-2">
        <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Notes
        </label>
        <textarea
          value={requirement.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Anything else the editor needs to know for this batch."
          rows={2}
          className="mt-1 w-full resize-none rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
        />
      </div>
    </div>
  );
}

function RequirementToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "grid size-3 place-items-center rounded-full border",
          active
            ? "border-emerald-500 bg-emerald-500/80"
            : "border-muted-foreground/40",
        )}
      >
        {active && <CheckIcon className="size-2 text-black" />}
      </span>
      {label}
    </button>
  );
}

export function hasRequirementContent(req?: JobRequirement): boolean {
  if (!req) return false;
  return !!(
    req.tone?.trim() ||
    req.brandReference?.trim() ||
    req.notes?.trim() ||
    req.musicLicenseConfirmed ||
    req.captionsRequested
  );
}

function RequirementReviewList({ requirement }: { requirement: JobRequirement }) {
  return (
    <ul className="mt-1.5 flex flex-col gap-1 text-[11.5px] text-foreground/90">
      {requirement.tone && (
        <li>
          <span className="text-muted-foreground">Tone · </span>
          {requirement.tone}
        </li>
      )}
      {requirement.brandReference && (
        <li>
          <span className="text-muted-foreground">Brand · </span>
          {requirement.brandReference}
        </li>
      )}
      <li className="flex flex-wrap gap-2 text-[10.5px] text-muted-foreground">
        <span>
          Music license:{" "}
          <span className={requirement.musicLicenseConfirmed ? "text-emerald-300" : "text-muted-foreground"}>
            {requirement.musicLicenseConfirmed ? "cleared" : "not set"}
          </span>
        </span>
        <span>
          Captions:{" "}
          <span className={requirement.captionsRequested ? "text-emerald-300" : "text-muted-foreground"}>
            {requirement.captionsRequested ? "requested" : "not requested"}
          </span>
        </span>
      </li>
      {requirement.notes && (
        <li className="mt-1 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-foreground/90">
          {requirement.notes}
        </li>
      )}
    </ul>
  );
}

function Step5Review({
  order,
  picks,
  editor,
  dueAt,
  requirement,
  briefingMode,
  generalBrief,
  briefByKey,
}: {
  order: CandidateOrder;
  picks: CandidateItem[];
  editor: User;
  dueAt: string;
  requirement: JobRequirement;
  briefingMode: "general" | "individual";
  generalBrief: ItemBrief;
  briefByKey: Record<string, ItemBrief>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Job Summary
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {order.title} · {picks.length} {picks.length === 1 ? "item" : "items"}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{order.address}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Avatar className="size-5">
              <AvatarImage src={editor.image} alt={editor.name} />
              <AvatarFallback className={editor.tone}>{editor.initials}</AvatarFallback>
            </Avatar>
            <span className="text-foreground">{editor.name}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarIcon className="size-3.5" />
            Due {dueAt}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground capitalize">
            <Badge variant="outline" className="text-[10px]">
              Mode: {briefingMode}
            </Badge>
          </span>
        </div>
      </section>

      {hasRequirementContent(requirement) && (
        <section className="rounded-xl border border-border bg-card/70 p-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Job-Level Requirement
          </h3>
          <RequirementReviewList requirement={requirement} />
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Items Briefs
        </h3>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {picks.map((p) => {
            const Icon = kindIcon[p.kind];
            const brief =
              briefingMode === "general"
                ? generalBrief
                : briefByKey[p.key];
            const priority = brief?.priority ?? "normal";
            return (
              <li
                key={p.key}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-card/60 px-3 py-2"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">{p.title}</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    {itemKindLabel[p.kind]}
                    {brief?.length ? ` · ${brief.length}` : ""}
                    {brief?.musicReference ? ` · music: ${brief.musicReference}` : ""}
                  </div>
                  {brief?.note && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-foreground/80">
                      {brief.note}
                    </p>
                  )}
                  {brief?.script && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-indigo-300">
                      Script: {brief.script}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 rounded-full border px-1.5 py-0 text-[10px] font-semibold uppercase",
                    PRIORITIES.find((pp) => pp.value === priority)?.cls ?? "",
                  )}
                >
                  {priority}
                </Badge>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
// forced recompile
