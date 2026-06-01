"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  AtSignIcon,
  BellIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  FilmIcon,
  MessageCircleIcon,
  MessageSquareTextIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  columns,
  mediaIcons,
  toneDot,
  toneText,
  users,
  type Card as CardData,
  type Tone,
} from "@/components/editor-data";

// Treat Kyle as the signed-in user for now. When real auth lands, swap for
// `useCurrentUser()` from the auth provider.
const CURRENT_USER_ID = "KY";

type StageKey = "all" | "pending" | "working" | "revision" | "deliver";

const STAGES: { key: StageKey; label: string; tone: Tone }[] = [
  { key: "all", label: "All", tone: "neutral" },
  { key: "pending", label: "Awaiting", tone: "neutral" },
  { key: "working", label: "Working", tone: "blue" },
  { key: "revision", label: "Revision", tone: "amber" },
  { key: "deliver", label: "Deliver", tone: "emerald" },
];

const chipActive: Record<Tone, string> = {
  neutral: "bg-foreground text-background",
  blue: "bg-blue-500 text-white",
  amber: "bg-amber-500 text-black",
  emerald: "bg-emerald-500 text-black",
  rose: "bg-rose-500 text-white",
};
const chipIdle: Record<Tone, string> = {
  neutral: "bg-muted/60 text-muted-foreground",
  blue: "bg-blue-500/12 text-blue-300",
  amber: "bg-amber-500/12 text-amber-300",
  emerald: "bg-emerald-500/12 text-emerald-300",
  rose: "bg-rose-500/12 text-rose-300",
};

const stageSectionTone: Record<string, { label: string; bar: string; text: string }> = {
  pending: { label: "Awaiting upload", bar: "bg-muted-foreground/40", text: "text-muted-foreground" },
  working: { label: "Working on", bar: "bg-blue-500", text: "text-blue-300" },
  revision: { label: "Revision", bar: "bg-amber-500", text: "text-amber-300" },
  deliver: { label: "Deliver", bar: "bg-emerald-500", text: "text-emerald-300" },
};

// Order cards within a stage by urgency: overdue first, then by deadline ASC.
// "Today" beats explicit future dates. Sent/dimmed cards drop to the bottom.
function priorityScore(card: CardData): number {
  if (card.overdue) return -1000;
  if (card.dimmed) return 1000;
  if (card.deadline === "Today") return -100;
  // crude date parse for "May 19" etc.
  const m = /^([A-Za-z]+)\s+(\d+)$/.exec(card.deadline);
  if (m) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const mi = months.indexOf(m[1].slice(0, 3).toLowerCase());
    const day = parseInt(m[2], 10);
    if (mi >= 0) return mi * 31 + day;
  }
  return 500;
}

function sortCards(cards: CardData[]): CardData[] {
  return [...cards].sort((a, b) => priorityScore(a) - priorityScore(b));
}

export function MobileQueue() {
  const [active, setActive] = React.useState<StageKey>("all");
  const [notifOpen, setNotifOpen] = React.useState(false);
  const me = users[CURRENT_USER_ID];

  const allCards = React.useMemo(
    () => columns.flatMap((c) => c.cards.map((card) => ({ ...card, stage: c.key }))),
    [],
  );
  const totalActive = allCards.length;
  const overdueCount = allCards.filter((c) => c.overdue).length;

  // Most urgent card for the TodayFocus hero (when filter=all).
  const mostUrgent = React.useMemo(() => {
    const sorted = allCards
      .filter((c) => !c.dimmed)
      .sort((a, b) => priorityScore(a) - priorityScore(b));
    return sorted[0] ?? null;
  }, [allCards]);

  const sections = React.useMemo(() => {
    if (active === "all") {
      return columns
        .filter((c) => c.cards.length > 0)
        .map((c) => ({ key: c.key, stage: c.key, cards: sortCards(c.cards) }));
    }
    const col = columns.find((c) => c.key === active);
    return col ? [{ key: col.key, stage: col.key, cards: sortCards(col.cards) }] : [];
  }, [active]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Compact top bar — avatar | (greeting block) | search | bell */}
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 shrink-0 ring-2 ring-border">
            <AvatarImage src={me?.image} alt={me?.name} />
            <AvatarFallback className={cn("text-[11px] font-bold", me?.tone)}>
              {me?.initials}
            </AvatarFallback>
          </Avatar>

          {/* Greeting takes the center, becomes the page hero */}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[11px] text-muted-foreground">Welcome back,</p>
            <h1 className="truncate text-[20px] font-bold tracking-tight">
              {me?.name.split(" ")[0] ?? "there"} 👋
            </h1>
          </div>

          <button
            onClick={() => {
              /* future: search palette */
            }}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted/40 active:bg-muted"
            aria-label="Search"
          >
            <SearchIcon className="size-[18px]" />
          </button>

          <button
            onClick={() => setNotifOpen(true)}
            className="relative grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted/40 active:bg-muted"
            aria-label="Notifications"
          >
            <BellIcon className="size-[18px]" />
            <span className="absolute right-1 top-1 size-2 rounded-full bg-rose-500 ring-2 ring-background" />
          </button>
        </div>
      </div>

      {/* Small meta — page name + count, demoted from a giant title */}
      <div className="shrink-0 px-4 pb-3 pt-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Editor Queue
          <span className="mx-1.5 text-muted-foreground/40">·</span>
          <span className="text-foreground">{totalActive} active</span>
          {overdueCount > 0 && (
            <>
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span className="font-bold text-rose-400">{overdueCount} overdue</span>
            </>
          )}
        </p>
      </div>

      {/* Dashboard moment: TodayFocus card on All, StageDashboard otherwise */}
      <div className="shrink-0 px-4">
        {active === "all" && mostUrgent ? (
          <TodayFocusCard card={mostUrgent} />
        ) : active !== "all" ? (
          <StageDashboardCard
            stage={active}
            cards={columns.find((c) => c.key === active)?.cards ?? []}
          />
        ) : null}
      </div>

      {/* Stage chips — horizontally scrollable. Tailwind v4 native hide-scrollbar. */}
      <div className="shrink-0 overflow-x-auto pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max items-center gap-2 px-4 pb-3">
          {STAGES.map((s) => {
            const isActive = active === s.key;
            const count =
              s.key === "all"
                ? totalActive
                : columns.find((c) => c.key === s.key)?.cards.length ?? 0;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold transition-all",
                  isActive ? chipActive[s.tone] : chipIdle[s.tone],
                  isActive ? "shadow-md" : "active:scale-95",
                )}
              >
                {s.label}
                <span
                  className={cn(
                    "min-w-[18px] rounded-full px-1 text-center font-mono text-[11px] leading-[16px]",
                    isActive ? "bg-black/20" : "bg-background/40",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List — sectioned (when All) or flat for a single stage */}
      <div className="flex-1 overflow-y-auto px-3 pb-5 [mask-image:linear-gradient(to_bottom,transparent_0,black_18px,black_calc(100%-26px),transparent_100%)]">
        <div className="flex flex-col gap-3">
          {sections.map((section, idx) => {
            const showHeader = active === "all";
            const tone = stageSectionTone[section.stage];
            return (
              <section key={section.key} className={cn(idx > 0 && "mt-2")}>
                {showHeader && tone && (
                  <div className="mb-2 flex items-center gap-2 pl-1">
                    <span className={cn("h-2 w-2 rounded-full", tone.bar)} />
                    <h3
                      className={cn(
                        "text-[10.5px] font-bold uppercase tracking-[0.08em]",
                        tone.text,
                      )}
                    >
                      {tone.label}
                    </h3>
                    <span className="text-[10.5px] font-mono text-muted-foreground/70">
                      · {section.cards.length}
                    </span>
                    <span className="ml-auto h-px flex-1 bg-border/40" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {section.cards.map((card) => (
                    <QueueCard key={card.id} card={card} hideStageBadge={showHeader} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Notification panel — slides down from the top of the phone area */}
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TodayFocus — single hero card highlighting the most urgent action.
function TodayFocusCard({ card }: { card: CardData }) {
  const tone = card.tone as Tone;
  const isOverdue = card.overdue;
  return (
    <Link
      href={`/mobile/feedback?id=${card.id}`}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-2xl border p-3 transition-transform active:scale-[0.99]",
        isOverdue
          ? "border-rose-500/40 bg-rose-500/[0.07]"
          : "border-amber-500/30 bg-amber-500/[0.06]",
      )}
    >
      {/* Glow halo for urgency */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-32 rounded-full blur-3xl",
          isOverdue ? "bg-rose-500/15" : "bg-amber-500/15",
        )}
      />

      <div className="relative flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            isOverdue
              ? "bg-rose-500/15 text-rose-300"
              : "bg-amber-500/15 text-amber-300",
          )}
        >
          {isOverdue ? (
            <>
              <AlertCircleIcon className="size-3" /> Needs your action now
            </>
          ) : (
            <>
              <SparklesIcon className="size-3" /> Today&apos;s focus
            </>
          )}
        </span>
        <span className="ml-auto text-[10.5px] text-muted-foreground">
          {stageSectionTone[card.tone === "rose" ? "revision" : (card as CardData & { stage?: string }).stage ?? "revision"]?.label ?? ""}
        </span>
      </div>

      <div className="relative flex items-center gap-3">
        {/* Thumb */}
        <div className="relative grid h-[64px] w-[36px] shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950">
          <FilmIcon className="size-4 text-white/85" />
          {card.version && (
            <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 font-mono text-[8.5px] font-bold text-white">
              {card.version}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold leading-tight">{card.title}</p>
          <p className="truncate text-[11.5px] text-muted-foreground">{card.address}</p>
          <p
            className={cn(
              "mt-1 text-[11.5px] font-semibold",
              isOverdue ? "text-rose-300" : toneText[tone],
            )}
          >
            {isOverdue ? card.status.label : `Due ${card.deadline}`}
            {card.notes && (
              <span className="ml-2 font-mono text-muted-foreground">
                · {card.notes.current}/{card.notes.total} notes
              </span>
            )}
          </p>
        </div>

        {/* Open action */}
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full font-bold",
            isOverdue ? "bg-rose-500 text-white" : "bg-foreground text-background",
          )}
        >
          <ArrowRightIcon className="size-4" />
        </div>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// StageDashboard — summary stats card for the selected stage.
function StageDashboardCard({
  stage,
  cards,
}: {
  stage: StageKey;
  cards: CardData[];
}) {
  const tone = stageSectionTone[stage];
  const overdueN = cards.filter((c) => c.overdue).length;
  const todayN = cards.filter((c) => c.deadline === "Today").length;
  const notes = cards.reduce(
    (acc, c) => acc + (c.notes ? c.notes.total - c.notes.current : 0),
    0,
  );

  const blurb = {
    pending: "Files ready, waiting for editor pickup",
    working: "Edits in progress — don't lose momentum",
    revision: "Reviewer feedback to resolve",
    deliver: "Ready to send to client",
  }[stage as Exclude<StageKey, "all">];

  const ctaLabel = {
    pending: "Download next",
    working: "Open editor",
    revision: "Review notes",
    deliver: "Send to client",
  }[stage as Exclude<StageKey, "all">];

  const ctaIcon = {
    pending: UploadIcon,
    working: FilmIcon,
    revision: MessageSquareTextIcon,
    deliver: SendIcon,
  }[stage as Exclude<StageKey, "all">];
  const CtaIcon = ctaIcon;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-3",
        stage === "working" && "border-blue-500/30 bg-blue-500/[0.06]",
        stage === "revision" && "border-amber-500/30 bg-amber-500/[0.06]",
        stage === "deliver" && "border-emerald-500/30 bg-emerald-500/[0.06]",
        stage === "pending" && "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", tone?.bar)} />
        <h3
          className={cn(
            "text-[10.5px] font-bold uppercase tracking-[0.1em]",
            tone?.text,
          )}
        >
          {tone?.label}
        </h3>
        <span className="ml-auto text-[10.5px] text-muted-foreground">
          {cards.length} {cards.length === 1 ? "item" : "items"}
        </span>
      </div>

      <p className="mt-1.5 text-[13px] font-medium leading-snug">{blurb}</p>

      {/* Stats row */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <Stat
          label="Total"
          value={cards.length.toString()}
          tone={(tone?.text ?? "text-foreground") as string}
        />
        {overdueN > 0 ? (
          <Stat label="Overdue" value={overdueN.toString()} tone="text-rose-400" />
        ) : (
          <Stat label="Due today" value={todayN.toString()} tone="text-foreground" />
        )}
        <Stat
          label={stage === "revision" ? "Open notes" : "Open"}
          value={notes > 0 ? notes.toString() : cards.length.toString()}
          tone={(tone?.text ?? "text-foreground") as string}
        />
      </div>

      <button
        className={cn(
          "mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[12px] font-bold",
          stage === "revision" && "bg-amber-500 text-black",
          stage === "working" && "bg-blue-500 text-white",
          stage === "deliver" && "bg-emerald-500 text-black",
          stage === "pending" && "bg-foreground text-background",
        )}
      >
        {CtaIcon && <CtaIcon className="size-3.5" />}
        {ctaLabel}
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-2 py-1.5">
      <p className={cn("font-mono text-[18px] font-bold leading-none", tone)}>
        {value}
      </p>
      <p className="mt-0.5 text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function QueueCard({
  card,
  hideStageBadge,
}: {
  card: CardData;
  hideStageBadge: boolean;
}) {
  const TypeIcon = mediaIcons[card.type];
  const tone = card.tone as Tone;
  const primary = card.assignees[0];
  const primaryUser = primary ? users[primary] : null;
  const extra = Math.max(0, card.assignees.length - 1);

  return (
    <Link
      href={`/mobile/feedback?id=${card.id}`}
      className={cn(
        "group relative flex items-stretch gap-3 overflow-hidden rounded-2xl border border-border/80 bg-card p-3 transition-transform active:scale-[0.99]",
        card.overdue && "border-rose-500/30 bg-rose-950/20",
        card.dimmed && "opacity-60",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
          toneDot[tone],
        )}
      />

      <div className="relative grid h-[60px] w-[36px] shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950">
        <TypeIcon className="size-3.5 text-white/80" />
        {card.version && (
          <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 font-mono text-[8px] font-bold text-white">
            {card.version}
          </span>
        )}
        {card.pulse && (
          <span className="absolute right-1 top-1 size-1.5 animate-pulse rounded-full bg-amber-400" />
        )}
      </div>

      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate text-[14.5px] font-semibold leading-tight">
          {card.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {card.address}
        </p>

        <div className="mt-1.5 flex items-center gap-2 text-[10.5px]">
          {card.overdue ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-1.5 py-0.5 font-bold text-rose-400">
              <AlertCircleIcon className="size-2.5" />
              {card.status.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
              {card.deadline}
            </span>
          )}
          {card.notes && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                card.notes.current < card.notes.total ? toneText[tone] : "text-muted-foreground",
              )}
            >
              <MessageSquareTextIcon className="size-2.5" />
              <span className="font-mono">
                {card.notes.current}/{card.notes.total}
              </span>
            </span>
          )}
          {!hideStageBadge && (
            <span
              className={cn(
                "ml-auto inline-flex h-4 items-center rounded px-1.5 text-[9px] font-bold uppercase tracking-wider",
                chipIdle[tone],
              )}
            >
              {card.status.label}
            </span>
          )}
        </div>
      </div>

      {primaryUser && (
        <div className="flex shrink-0 items-end pb-0.5">
          <div className="relative">
            <Avatar className="size-6 ring-2 ring-card">
              <AvatarImage src={primaryUser.image} alt={primaryUser.name} />
              <AvatarFallback className={cn("text-[8.5px]", primaryUser.tone)}>
                {primaryUser.initials}
              </AvatarFallback>
            </Avatar>
            {extra > 0 && (
              <span className="absolute -right-1 -bottom-1 grid h-3.5 min-w-3.5 place-items-center rounded-full border border-card bg-muted px-1 font-mono text-[8px] font-bold text-foreground">
                +{extra}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// NotificationPanel — slides down from top with a backdrop.
type Notif = {
  id: string;
  userId: string;
  body: React.ReactNode;
  time: string;
  unread?: boolean;
  kind: "comment" | "mention" | "approval" | "upload" | "system";
};

const NOTIFS: Notif[] = [
  {
    id: "n1",
    userId: "MA",
    kind: "mention",
    unread: true,
    body: (
      <>
        mentioned you on <b>13364 Beach Blvd</b>
        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
          “@you can you take a look at the drone clip before delivery?”
        </span>
      </>
    ),
    time: "now",
  },
  {
    id: "n2",
    userId: "MJ",
    kind: "upload",
    unread: true,
    body: (
      <>
        uploaded <b>v2</b> on <b>245 Ocean Blvd</b>
      </>
    ),
    time: "12m",
  },
  {
    id: "n3",
    userId: "RZ",
    kind: "comment",
    unread: true,
    body: (
      <>
        left <b>3 notes</b> on <b>245 Ocean Blvd</b>
        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
          Color pass + cut tightening — attached to v1.
        </span>
      </>
    ),
    time: "2h",
  },
  {
    id: "n4",
    userId: "MA",
    kind: "approval",
    body: (
      <>
        approved <b>v2</b> on <b>100 Sunset Pl</b> — ready to send
      </>
    ),
    time: "Yesterday",
  },
  {
    id: "n5",
    userId: "KY",
    kind: "system",
    body: (
      <>
        <b>5577 Magnolia Ln</b> is <span className="text-rose-400">2h overdue</span>
      </>
    ),
    time: "Yesterday",
  },
];

function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState<"all" | "unread">("all");
  if (!open) return null;
  const list = tab === "unread" ? NOTIFS.filter((n) => n.unread) : NOTIFS;
  const unreadCount = NOTIFS.filter((n) => n.unread).length;
  return (
    <>
      <button
        className="absolute inset-0 z-40 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-label="Close notifications"
      />
      <div className="absolute inset-x-0 top-0 z-50 max-h-[88%] overflow-hidden rounded-b-[20px] border-b border-border bg-popover shadow-2xl animate-in slide-in-from-top duration-200">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BellIcon className="size-[18px]" />
            <h3 className="text-[16px] font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="ml-1 inline-flex h-5 items-center rounded-full bg-rose-500 px-2 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full active:bg-accent"
            aria-label="Close"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
          <div className="inline-flex items-center rounded-full bg-muted/60 p-0.5">
            <button
              onClick={() => setTab("all")}
              className={cn(
                "h-7 rounded-full px-3 text-[12px] font-semibold transition-colors",
                tab === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              All <span className="ml-0.5 font-mono text-[10px] text-muted-foreground">{NOTIFS.length}</span>
            </button>
            <button
              onClick={() => setTab("unread")}
              className={cn(
                "h-7 rounded-full px-3 text-[12px] font-semibold transition-colors",
                tab === "unread"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              Unread <span className="ml-0.5 font-mono text-[10px] text-rose-400">{unreadCount}</span>
            </button>
          </div>
          <button className="ml-auto text-[11.5px] font-semibold text-muted-foreground active:text-foreground">
            Mark all read
          </button>
        </div>

        {/* List */}
        <div className="max-h-[calc(88vh-120px)] overflow-y-auto px-2 pb-4">
          {list.length === 0 ? (
            <div className="grid place-items-center px-6 py-10 text-center">
              <CheckCircle2Icon className="size-6 text-emerald-500" />
              <p className="mt-2 text-[13px] font-semibold">All caught up</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                You&apos;re square. Go ship something.
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {list.map((n) => {
                const u = users[n.userId];
                if (!u) return null;
                const KindIcon = {
                  comment: MessageCircleIcon,
                  mention: AtSignIcon,
                  approval: CheckCircle2Icon,
                  upload: UploadIcon,
                  system: AlertCircleIcon,
                }[n.kind];
                const kindTone = {
                  comment: "bg-amber-500/15 text-amber-400",
                  mention: "bg-indigo-500/15 text-indigo-400",
                  approval: "bg-emerald-500/15 text-emerald-400",
                  upload: "bg-blue-500/15 text-blue-400",
                  system: "bg-rose-500/15 text-rose-400",
                }[n.kind];
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-accent",
                      n.unread && "bg-muted/30",
                    )}
                  >
                    <div className="relative">
                      <Avatar className="size-9">
                        <AvatarImage src={u.image} alt={u.name} />
                        <AvatarFallback className={cn("text-[11px]", u.tone)}>
                          {u.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full ring-2 ring-popover",
                          kindTone,
                        )}
                      >
                        <KindIcon className="size-[10px]" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug">
                        <span className="font-semibold">{u.name} </span>
                        {n.body}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                        {n.time}
                      </p>
                    </div>
                    {n.unread && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-400" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
