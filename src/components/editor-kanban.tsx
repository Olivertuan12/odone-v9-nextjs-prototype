"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  AlignLeftIcon,
  BellIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  InboxIcon,
  MessageSquareTextIcon,
  PackageCheckIcon,
  PencilRulerIcon,
  PlusIcon,
  SparklesIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  columns,
  mediaIcons,
  toneAccent,
  toneDot,
  toneText,
  users,
  type Card,
  type Column,
  type Tone,
} from "@/components/editor-data";
import { EditorList } from "@/components/editor-list";
import { useEditorState, type EditorStage } from "@/components/editor-state";

// v13: per-stage hover affordances. Each stage gets up to TWO quick actions
// that fire WITHOUT opening the detail dialog (the "fast path") plus the
// universal "Open" button that always opens the dialog. The detail dialog
// then reads the card's current stage from context to pick the right view.
type QuickAction = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "emerald" | "blue" | "amber";
};

const stageQuickActions: Record<EditorStage, QuickAction[]> = {
  pending: [
    { key: "download", label: "Download", icon: DownloadIcon, tone: "neutral" },
    { key: "open", label: "Open", icon: ExternalLinkIcon, tone: "neutral" },
  ],
  working: [
    { key: "upload", label: "Upload", icon: UploadIcon, tone: "blue" },
    { key: "open", label: "Open", icon: ExternalLinkIcon, tone: "neutral" },
  ],
  revision: [
    { key: "approve", label: "Approve", icon: CheckIcon, tone: "emerald" },
    { key: "open", label: "Open", icon: ExternalLinkIcon, tone: "neutral" },
  ],
  deliver: [
    { key: "download-all", label: "Download all", icon: DownloadIcon, tone: "emerald" },
    { key: "open", label: "Open", icon: ExternalLinkIcon, tone: "neutral" },
  ],
};

const quickToneClasses: Record<QuickAction["tone"], string> = {
  neutral:
    "border-border bg-card text-foreground hover:bg-foreground hover:text-background",
  blue:
    "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/30 hover:border-blue-500",
  amber:
    "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/30 hover:border-amber-500",
  emerald:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500",
};

// Stage → display column metadata. Mirrors the seed but is now stage-driven
// (so a moved card lands in the right column without us mutating seed data).
const STAGE_DISPLAY: Record<EditorStage, Pick<Column, "key" | "title" | "tone" | "showAdd" | "emptyAdd">> = {
  pending: { key: "pending", title: "Pending", tone: "neutral", showAdd: true, emptyAdd: true },
  working: { key: "working", title: "Working On", tone: "blue" },
  revision: { key: "revision", title: "Review", tone: "amber" },
  deliver: { key: "deliver", title: "Deliver", tone: "emerald" },
};
const STAGE_ORDER: EditorStage[] = ["pending", "working", "revision", "deliver"];

// Per-stage empty messaging. Compact: kanban columns are narrow so we use
// the EmptyMedia icon variant on a smaller chip and shrink the padding.
const STAGE_EMPTY: Record<
  EditorStage,
  { icon: React.ComponentType<{ className?: string }>; title: string; description: string }
> = {
  pending: {
    icon: InboxIcon,
    title: "No cards in Pending",
    description: "New projects land here once briefs are assigned.",
  },
  working: {
    icon: PencilRulerIcon,
    title: "All caught up",
    description: "No edits in flight right now.",
  },
  revision: {
    icon: SparklesIcon,
    title: "Nothing to review",
    description: "Uploaded cuts will show up here for approval.",
  },
  deliver: {
    icon: PackageCheckIcon,
    title: "Nothing ready to ship",
    description: "Approved deliverables queue up here.",
  },
};

export function EditorKanban({
  onOpenCard,
}: {
  onOpenCard: (card: Card) => void;
}) {
  const [view, setView] = React.useState<"board" | "list">("board");
  const editor = useEditorState();
  // First-paint skeleton: the editor-state context provides a fallback even
  // when the provider hasn't initialized, but on a cold boot we still want a
  // one-beat shimmer per card so the kanban doesn't pop in. Stable 220ms.
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 220);
    return () => clearTimeout(t);
  }, []);

  const handleQuickAction = React.useCallback(
    (card: Card, stage: EditorStage, actionKey: string) => {
      if (actionKey === "open") {
        onOpenCard(card);
        return;
      }
      if (actionKey === "download" && stage === "pending") {
        toast.success("Downloading assets…", {
          description: `${card.title} · 3.5 GB · 4 files`,
        });
        return;
      }
      if (actionKey === "upload" && stage === "working") {
        // Same as Open but pre-opens at upload view. Detail dialog reads stage
        // from context and renders the upload view automatically.
        onOpenCard(card);
        return;
      }
      if (actionKey === "approve" && stage === "revision") {
        editor.setStage(card.id, "deliver");
        toast.success("Approved · sent to delivery", {
          description: card.title,
        });
        return;
      }
      if (actionKey === "download-all" && stage === "deliver") {
        toast.success("Downloading all deliverables…", {
          description: `${card.title} · final package`,
        });
        return;
      }
    },
    [editor, onOpenCard],
  );

  return (
    <div className="flex h-full flex-col px-4 lg:px-6">
      <div className="flex items-end justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editor Queue</h1>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            <span>8 active</span>
            <span className="mx-1.5 text-muted-foreground/40">•</span>
            <span className="text-rose-400">1 overdue</span>
            <span className="mx-1.5 text-muted-foreground/40">•</span>
            <span>Last activity 12m ago</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <AlignLeftIcon className="size-3.5 text-muted-foreground" /> Filter
          </Button>
          <div className="flex items-center rounded-md border bg-muted p-0.5">
            <button
              onClick={() => setView("board")}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                view === "board"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pb-6">
        <button className="h-7 rounded-full bg-foreground px-4 text-xs font-bold text-background shadow-sm">
          All time
        </button>
        <button className="h-7 rounded-full border px-4 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">7d</button>
        <button className="h-7 rounded-full border px-4 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">30d</button>
        <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-auto" />
        <button className="flex h-7 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <UsersIcon className="size-3.5" /> Mine
        </button>
        <button className="flex h-7 items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/5 px-4 text-xs font-semibold text-rose-400">
          <AlertCircleIcon className="size-3.5" /> Overdue
        </button>
      </div>

      {view === "list" && <EditorList onOpenCard={onOpenCard} />}

      {view === "board" && (
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STAGE_ORDER.map((stage) => {
            const cardsForStage = editor.cardsByStage[stage];
            const meta = STAGE_DISPLAY[stage];
            return (
              <div key={stage} className="flex h-full flex-col">
                <div className="flex shrink-0 items-center justify-between px-1 pb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "size-2 shrink-0 self-center rounded-full",
                        toneDot[meta.tone],
                      )}
                    />
                    <span
                      className={cn(
                        "text-base font-bold tabular-nums",
                        meta.tone === "neutral"
                          ? "text-foreground"
                          : toneText[meta.tone],
                      )}
                    >
                      {cardsForStage.length}
                    </span>
                    <h3 className="text-base font-bold text-foreground">
                      {meta.title}
                    </h3>
                  </div>
                  {meta.showAdd && (
                    <PlusIcon className="size-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                  )}
                </div>

                <div className="space-y-2 overflow-y-auto pb-4 pr-1">
                  {!ready
                    ? Array.from({ length: 2 }).map((_, i) => (
                        <KanbanCardSkeleton key={`sk-${stage}-${i}`} />
                      ))
                    : cardsForStage.map((card) => (
                        <KanbanCard
                          key={card.id}
                          card={card}
                          stage={stage}
                          onClick={() => onOpenCard(card)}
                          onQuickAction={(key) =>
                            handleQuickAction(card, stage, key)
                          }
                        />
                      ))}

                  {ready && cardsForStage.length === 0 && (
                    <ColumnEmpty stage={stage} />
                  )}

                  {meta.emptyAdd && (
                    <button className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                      <PlusIcon className="size-3.5" /> Add project
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CopyAddressButton({ title, address }: { title: string; address: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(`${title}, ${address}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      title="Copy address"
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded text-muted-foreground/60 transition-all hover:bg-accent hover:text-foreground",
        copied
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100 focus:opacity-100"
      )}
    >
      {copied ? (
        <CheckIcon className="size-3 text-emerald-500" />
      ) : (
        <CopyIcon className="size-3" />
      )}
      <span className="sr-only">Copy address</span>
    </button>
  );
}

function ColumnEmpty({ stage }: { stage: EditorStage }) {
  const meta = STAGE_EMPTY[stage];
  const Icon = meta.icon;
  // Compact: column width is narrow so we shrink media + padding vs. the
  // default Empty primitive (no big icon, no double padding).
  return (
    <Empty className="gap-2 p-4">
      <EmptyHeader className="gap-1.5">
        <EmptyMedia variant="icon" className="size-8">
          <Icon className="size-4" />
        </EmptyMedia>
        <EmptyTitle className="text-[12px] font-semibold">
          {meta.title}
        </EmptyTitle>
        <EmptyDescription className="text-[11px] leading-snug">
          {meta.description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function KanbanCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-2.5 shadow-xs">
      <div className="flex items-center gap-1.5">
        <Skeleton className="size-1.5 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="ml-auto h-3 w-10" />
      </div>
      <div className="ml-3 mt-1.5">
        <Skeleton className="h-2.5 w-44" />
      </div>
      <div className="ml-3 mt-2 flex items-center gap-1.5">
        <Skeleton className="h-[20px] w-24 rounded-sm" />
        <Skeleton className="ml-auto h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

function KanbanCard({
  card,
  stage,
  onClick,
  onQuickAction,
}: {
  card: Card;
  stage: EditorStage;
  onClick: () => void;
  onQuickAction: (actionKey: string) => void;
}) {
  const MediaIcon = mediaIcons[card.type];
  const quickActions = stageQuickActions[stage];
  const editor = useEditorState();
  // v13 Flow D: Working On cards that have reviewer feedback show a small
  // "new feedback" pill. We treat "has feedback" as "previously bounced from
  // Review" — when the editor uploads a new version we clear feedback, so
  // this pill only fires while there's an unaddressed batch.
  const hasUnreadFeedback =
    stage === "working" && editor.getFeedback(card.id).length > 0;
  const newFeedbackCount = hasUnreadFeedback
    ? editor.getFeedback(card.id).length
    : 0;

  const cardTone: Tone =
    stage === "deliver" && card.tone === "neutral" ? "emerald" : card.tone;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border bg-card p-2.5 text-card-foreground shadow-xs transition-colors hover:bg-accent/30",
        cardTone === "neutral"
          ? "hover:border-foreground/20"
          : toneAccent[cardTone],
        card.dimmed && "opacity-70 hover:opacity-100",
      )}
    >
      {/* Row 1: dot · title · deadline */}
      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[cardTone])} />
        <h4
          className={cn(
            "flex min-w-0 items-center gap-1 truncate text-[13px] font-medium leading-tight",
            card.dimmed ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <span className="truncate">{card.title}</span>
          {card.pulse && (
            <span className="size-1.5 shrink-0 rounded-full bg-amber-500 animate-pulse" />
          )}
        </h4>

        <span
          className={cn(
            "ml-auto shrink-0 font-mono text-[10.5px]",
            card.overdue ? "font-bold text-rose-400" : "text-muted-foreground",
          )}
        >
          {card.deadline}
        </span>
      </div>

      {/* Row 2: address tail · copy on hover */}
      <div className="ml-3 mt-0.5 flex items-center gap-1.5">
        <p className="truncate text-[10.5px] text-muted-foreground/80">
          {card.address}
        </p>
        <CopyAddressButton title={card.title} address={card.address} />
      </div>

      {/* v13 Flow D: feedback pill — only Working On cards with unread notes */}
      {hasUnreadFeedback && (
        <div className="ml-3 mt-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
            <BellIcon className="size-2.5" />
            {newFeedbackCount} new feedback
          </span>
        </div>
      )}

      {/* Row 3: type badge · notes · avatars */}
      <div className="ml-3 mt-2 flex items-center gap-1.5">
        <Badge
          variant="outline"
          className="h-[20px] gap-1 rounded-sm border-border bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
        >
          <MediaIcon className="size-2.5" />
          {card.version ? `${card.version} · ` : ""}
          {card.type}
          {card.editTime && (
            <span className="ml-0.5 text-foreground/70">· {card.editTime}</span>
          )}
        </Badge>

        {card.notes && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <MessageSquareTextIcon className="size-2.5" />
            {card.notes.current}/{card.notes.total}
          </span>
        )}

        {stage === "deliver" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
            Ready to download
          </span>
        )}

        <AvatarGroup className="ml-auto -space-x-2">
          {card.assignees.map((id) => {
            const u = users[id];
            if (!u) return null;
            return (
              <HoverCard key={id}>
                <HoverCardTrigger
                  delay={120}
                  closeDelay={80}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full focus:outline-none"
                >
                  <Avatar
                    size="sm"
                    className="transition-transform hover:z-10 hover:scale-110"
                  >
                    <AvatarImage src={u.image} alt={u.name} />
                    <AvatarFallback className={cn("text-[10px]", u.tone)}>
                      {u.initials}
                    </AvatarFallback>
                  </Avatar>
                </HoverCardTrigger>
                <HoverCardContent
                  side="top"
                  className="w-auto min-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={u.image} alt={u.name} />
                      <AvatarFallback className={cn("text-xs", u.tone)}>
                        {u.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold leading-tight">
                        {u.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {u.role}
                      </span>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </AvatarGroup>
      </div>

      {/* Row 4: stage CTAs — revealed on hover. v13: two buttons (fast path
          + Open) instead of one. */}
      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-150 group-hover:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="mt-2 flex items-center gap-1.5">
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAction(qa.key);
                  }}
                  className={cn(
                    "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors",
                    quickToneClasses[qa.tone],
                  )}
                >
                  <Icon className="size-3.5" />
                  {qa.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
