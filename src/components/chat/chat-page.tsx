"use client";

// ============================================================================
// Odone — /chat page body
// ----------------------------------------------------------------------------
// Slack-style two-column chat surface. Lifted out of the editor sidebar's
// Direct Messages + Project Channels collapsibles (v12.4 redesign).
//
// LAYOUT
//   Left rail  (~280px) : "Chat" title + dropdown for New DM / New Channel,
//                         search field, DM group, Channel group.
//   Right pane (flex-1) : conversation header (h-14), message list, composer.
//
// URL CONTRACT
//   ?to=<dmId>   → DM mode, the DM with that id is selected
//   ?ch=<chId>   → Channel mode, the channel with that id is selected
//   Both unset   → defaults to first DM with a mention; falls back to first
//                  DM; falls back to first channel.
//   Only ONE param is set at any time. Clicking a DM nukes ?ch= and vice
//   versa via router.replace().
//
// CONVENTIONS (HANDOFF.md §8 + HANDOFF-v12.2 §0/§3.d)
//   - "use client" — uses useState / useEffect / useSearchParams / useRouter.
//   - Semantic tokens only. Sidebar tokens (bg-sidebar, etc.) are not used
//     here on purpose; the chat rail uses bg-card + bg-muted to feel like a
//     dedicated working surface, while the app's actual <Sidebar> still owns
//     the outer rail. Pick-one-and-stay-consistent (per spec §5).
//   - NO Date.now / Math.random. Outgoing messages get the literal "now"
//     timestamp string and a stable id derived from the existing thread
//     length (`${conversationId}-out-${n}`).
//   - 220ms skeleton flash when the selected conversation changes — mimics
//     a real chat-load roundtrip. Tracked via useEffect on the URL param.
//
// HOSTED MODALS
//   <NewDmDialog> + <NewChannelDialog> are mounted here (they were previously
//   mounted by the sidebar). <ChatDialog> is intentionally NOT mounted; it's
//   still an importable component for legacy contexts but the chat page is
//   the primary DM/Channel surface now.
// ============================================================================

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AtSignIcon,
  HashIcon,
  MessagesSquareIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  SearchIcon,
  SendIcon,
  SmilePlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// v12.3: NewDmDialog / NewChannelDialog imports dropped — conversations
// are seeded one-per-person and one-per-active-project. Nothing to "add".
import {
  CHANNEL_LIST,
  DM_LIST,
  ME,
  getThread,
  type ChatMessage,
  type Channel,
  type DM,
} from "@/components/chat/chat-data";

// ============================================================================
// Conversation selection — derived from URL params.
// ============================================================================
type Selection =
  | { kind: "dm"; dm: DM }
  | { kind: "channel"; channel: Channel };

function pickDefault(): Selection {
  // Spec §2: default to first DM with a mention, then first DM, then first
  // channel. DM_LIST always has at least one mention so the channel fallback
  // is mostly defensive.
  const mention = DM_LIST.find((d) => d.hasMention);
  if (mention) return { kind: "dm", dm: mention };
  if (DM_LIST[0]) return { kind: "dm", dm: DM_LIST[0] };
  return { kind: "channel", channel: CHANNEL_LIST[0] };
}

function resolveSelection(
  toParam: string | null,
  chParam: string | null,
): Selection {
  if (toParam) {
    const dm = DM_LIST.find((d) => d.id === toParam);
    if (dm) return { kind: "dm", dm };
  }
  if (chParam) {
    const channel = CHANNEL_LIST.find((c) => c.id === chParam);
    if (channel) return { kind: "channel", channel };
  }
  return pickDefault();
}

// ============================================================================
// Main page component
// ============================================================================
export function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to");
  const chParam = searchParams.get("ch");

  const selection = React.useMemo(
    () => resolveSelection(toParam, chParam),
    [toParam, chParam],
  );
  const selectionKey =
    selection.kind === "dm" ? `dm:${selection.dm.id}` : `ch:${selection.channel.id}`;

  // ----- Search filter -------------------------------------------------
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const filteredDms = React.useMemo(
    () =>
      q
        ? DM_LIST.filter((d) => d.name.toLowerCase().includes(q))
        : DM_LIST,
    [q],
  );
  const filteredChannels = React.useMemo(
    () =>
      q
        ? CHANNEL_LIST.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.topic ?? "").toLowerCase().includes(q),
          )
        : CHANNEL_LIST,
    [q],
  );

  // ----- Loading flash on selection change ----------------------------
  // 220ms skeleton — mimics a chat-load roundtrip. Cleared on unmount and on
  // any subsequent change so rapid clicks don't stack timers.
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(t);
  }, [selectionKey]);

  // v12.3: dropped New DM / New Channel — conversations are pre-seeded (one
  // per real person + one per active project), so there's nothing to "add".

  // v12.3: vertical splitter between the DM list and the Channel list.
  // Stores DM-region height in pixels; null means "use 50/50 default".
  // Captures pointer events on a 4px-tall drag handle and clamps to keep
  // both regions usable (min 96px each).
  const railListRef = React.useRef<HTMLDivElement | null>(null);
  const [topPaneHeightPx, setTopPaneHeightPx] = React.useState<number | null>(null);
  const splitterStateRef = React.useRef<{
    startY: number;
    startHeight: number;
    railHeight: number;
  } | null>(null);
  const handleSplitterDown = React.useCallback((e: React.PointerEvent) => {
    const list = railListRef.current;
    if (!list) return;
    const railHeight = list.getBoundingClientRect().height;
    const startHeight =
      topPaneHeightPx ?? Math.floor(railHeight / 2);
    splitterStateRef.current = {
      startY: e.clientY,
      startHeight,
      railHeight,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, [topPaneHeightPx]);
  const handleSplitterMove = React.useCallback((e: React.PointerEvent) => {
    const s = splitterStateRef.current;
    if (!s) return;
    const dy = e.clientY - s.startY;
    const next = Math.min(
      Math.max(s.startHeight + dy, 96),
      s.railHeight - 96,
    );
    setTopPaneHeightPx(next);
  }, []);
  const handleSplitterUp = React.useCallback((e: React.PointerEvent) => {
    splitterStateRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  // ----- Local outgoing messages (mock, no persistence) ---------------
  // Keyed by the same conversation id used inside getThread() so the appended
  // messages slot in correctly per-conversation.
  const [outgoing, setOutgoing] = React.useState<Record<string, ChatMessage[]>>(
    {},
  );

  const conversationId =
    selection.kind === "dm"
      ? `dm-${selection.dm.id}`
      : `ch-${selection.channel.id}`;

  // ----- Thread (base + local outgoing) -------------------------------
  const thread = React.useMemo<ChatMessage[]>(() => {
    const base = getThread(
      selection.kind,
      selection.kind === "dm" ? selection.dm.id : selection.channel.id,
    );
    const local = outgoing[conversationId] ?? [];
    return [...base, ...local];
  }, [selection, conversationId, outgoing]);

  // ----- Composer -----------------------------------------------------
  const [draft, setDraft] = React.useState("");

  // Reset draft when switching conversations so a half-typed message in DM A
  // doesn't bleed into DM B.
  React.useEffect(() => {
    setDraft("");
  }, [selectionKey]);

  const handleSend = React.useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    setOutgoing((prev) => {
      const existing = prev[conversationId] ?? [];
      const next: ChatMessage = {
        // Stable id — the index within local outgoing list is enough since
        // we never delete and re-add. Using `out-${n}` keeps it from
        // colliding with the base thread's `${id}-${n}` keys.
        id: `${conversationId}-out-${existing.length}`,
        authorId: ME.id,
        authorName: ME.name,
        authorInitials: ME.initials,
        authorTone: ME.tone,
        body,
        sentAt: "now",
        compact: false,
      };
      return { ...prev, [conversationId]: [...existing, next] };
    });
    setDraft("");
  }, [draft, conversationId]);

  // ----- Auto-scroll the message list to the bottom on thread growth --
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [thread.length, selectionKey, loading]);

  // ----- Row click handlers ------------------------------------------
  const selectDm = (id: string) => {
    router.replace(`/chat?to=${encodeURIComponent(id)}`);
  };
  const selectChannel = (id: string) => {
    router.replace(`/chat?ch=${encodeURIComponent(id)}`);
  };

  // ============================================================================
  // Render
  // ============================================================================
  // Build the inline-style for the DM pane: pixel height if user dragged,
  // otherwise 1fr-ish (we use flex-1 fallback when null).
  const topPaneStyle =
    topPaneHeightPx !== null
      ? ({ height: `${topPaneHeightPx}px`, flex: "0 0 auto" } as React.CSSProperties)
      : undefined;

  return (
    // v12.3: round the bottom corners + clip so the rail / message pane
    // children align cleanly with the SidebarInset's rounded outer chrome
    // (the previous square cut at the bottom-left/right read as a "notch").
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-b-xl border-y border-border">
      {/* ---------------- Left rail ---------------- */}
      {/* v12.3: rail uses the same dark `bg-background` as the workspace
          sidebar (user feedback: prefer the dark tone over the muted lift).
          The boundary against the sidebar is drawn with `border-x` instead
          of a color shift. Bottom corner gets `rounded-bl-xl` to match
          the SidebarInset's rounded outer chrome. */}
      <aside className="flex w-[280px] shrink-0 flex-col border-x border-border bg-background">
        {/* Title row — h-14 to match the conversation header so the top
            edge of the two panes lines up. */}
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <span className="text-fluid-lg font-semibold text-foreground">
            Chat
          </span>
        </div>

        {/* Search */}
        <div className="shrink-0 border-b border-border px-3 py-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="h-8 pl-8 pr-7 text-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Split list — v12.3: Channels render ABOVE the splitter, DMs
            BELOW. Each region scrolls independently; the splitter drags
            the boundary between them. The top pane gets the explicit
            pixel height from the splitter drag; the bottom pane fills
            the remaining space. */}
        <div
          ref={railListRef}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Channels — TOP pane */}
          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pt-3"
            style={topPaneStyle}
          >
            <RailGroupLabel
              label="Project Channels"
              count={filteredChannels.length}
            />
            <ul className="mt-1 flex flex-col">
              {filteredChannels.length === 0 && (
                <EmptyRow message="No channels match" />
              )}
              {filteredChannels.map((ch) => {
                const isActive =
                  selection.kind === "channel" &&
                  selection.channel.id === ch.id;
                return (
                  <li key={ch.id}>
                    <ChannelRow
                      channel={ch}
                      active={isActive}
                      onClick={() => selectChannel(ch.id)}
                    />
                  </li>
                );
              })}
            </ul>
            <div className="h-2" />
          </div>

          {/* Splitter — drag to resize Channels / DMs split */}
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize Channels / DMs"
            className="relative h-1 shrink-0 cursor-row-resize bg-border transition-colors hover:bg-foreground/30 active:bg-foreground/40"
            onPointerDown={handleSplitterDown}
            onPointerMove={handleSplitterMove}
            onPointerUp={handleSplitterUp}
            onPointerCancel={handleSplitterUp}
          >
            {/* Wider hit zone above + below for easier grabbing */}
            <span aria-hidden className="absolute inset-x-0 -top-1.5 -bottom-1.5" />
          </div>

          {/* DMs — BOTTOM pane */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3 pt-3">
            <RailGroupLabel
              label="Direct Messages"
              count={filteredDms.length}
            />
            <ul className="mt-1 flex flex-col">
              {filteredDms.length === 0 && (
                <EmptyRow message="No DMs match" />
              )}
              {filteredDms.map((dm) => {
                const isActive =
                  selection.kind === "dm" && selection.dm.id === dm.id;
                return (
                  <li key={dm.id}>
                    <DmRow
                      dm={dm}
                      active={isActive}
                      onClick={() => selectDm(dm.id)}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>

      {/* ---------------- Right pane ---------------- */}
      <section className="flex min-w-0 flex-1 flex-col">
        {!selection ? (
          <EmptyConversation />
        ) : (
          <>
            <ConversationHeader selection={selection} />
            {loading ? (
              <ThreadSkeleton />
            ) : (
              <div
                ref={scrollRef}
                className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-background px-6 py-4"
              >
                <DayDivider label="Yesterday" />
                {/* Render messages with a Today divider injected at the first
                    non-"Yesterday" sentAt prefix. Simple split — good enough
                    for mock content; real version will use a real day map. */}
                <RenderedThread thread={thread} />
                {thread.length === 0 && (
                  <div className="grid flex-1 place-items-center text-xs text-muted-foreground">
                    No messages yet. Say hi.
                  </div>
                )}
              </div>
            )}
            <Composer
              selection={selection}
              draft={draft}
              onDraftChange={setDraft}
              onSend={handleSend}
            />
          </>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// Left-rail sub-components
// ============================================================================
function RailGroupLabel({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between px-1.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground/70">
        {count}
      </span>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <li className="px-1.5 py-2 text-[11px] italic text-muted-foreground">
      {message}
    </li>
  );
}

function DmRow({
  dm,
  active,
  onClick,
}: {
  dm: DM;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/row flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors",
        active
          ? "border-l-2 border-foreground bg-accent text-foreground"
          : "border-l-2 border-transparent text-foreground/90 hover:bg-muted",
      )}
    >
      <div className="relative">
        <Avatar className="size-6">
          <AvatarImage src={dm.avatar} alt={dm.name} />
          <AvatarFallback className={cn("text-[10px]", dm.initialsTone)}>
            {dm.initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-[1.5px] border-card",
            dm.status === "online" ? "bg-emerald-500" : "bg-muted-foreground",
          )}
        />
      </div>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {dm.name}
      </span>
      <RowIndicator unread={dm.unread} mention={dm.hasMention} />
    </button>
  );
}

function ChannelRow({
  channel,
  active,
  onClick,
}: {
  channel: Channel;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors",
        active
          ? "border-l-2 border-foreground bg-accent text-foreground"
          : "border-l-2 border-transparent text-foreground/90 hover:bg-muted",
      )}
    >
      <HashIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {channel.name}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
        {channel.memberCount}
      </span>
      <RowIndicator unread={channel.unread} mention={channel.hasMention} />
    </button>
  );
}

function RowIndicator({
  unread,
  mention,
}: {
  unread?: number;
  mention?: boolean;
}) {
  if (mention) {
    return (
      <span
        className="size-1.5 shrink-0 rounded-full bg-blue-500"
        aria-label="Mention"
      />
    );
  }
  if (unread) {
    return (
      <span className="shrink-0 rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold text-background">
        {unread}
      </span>
    );
  }
  return null;
}

// ============================================================================
// Right-pane sub-components
// ============================================================================
function ConversationHeader({ selection }: { selection: Selection }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-5">
      {selection.kind === "dm" ? (
        <>
          <Avatar className="size-8">
            <AvatarImage src={selection.dm.avatar} alt={selection.dm.name} />
            <AvatarFallback
              className={cn("text-[11px]", selection.dm.initialsTone)}
            >
              {selection.dm.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">
              {selection.dm.name}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  selection.dm.status === "online"
                    ? "bg-emerald-500"
                    : "bg-muted-foreground",
                )}
              />
              {selection.dm.status === "online" ? "Online" : "Idle — 2h"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More options"
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <HashIcon className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {selection.channel.name}
              </span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {selection.channel.memberCount} members
              </Badge>
            </div>
            {selection.channel.topic && (
              <span className="truncate text-[11px] text-muted-foreground">
                {selection.channel.topic}
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Members"
            >
              <UsersIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More options"
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </div>
        </>
      )}
    </header>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function RenderedThread({ thread }: { thread: ChatMessage[] }) {
  // Insert a "Today" divider before the first message whose sentAt doesn't
  // start with "Yesterday". Simple heuristic — good enough for the mock.
  const todayStart = thread.findIndex(
    (m) => !m.sentAt.startsWith("Yesterday"),
  );

  // A small set of messages get reaction pills — index-based, deterministic.
  // We tag 2 by position so the thread looks lived-in without exploding the
  // data type with reactions everywhere.
  const reactionIdxs = new Set<number>([
    Math.max(0, thread.length - 5),
    Math.max(0, thread.length - 2),
  ]);

  return (
    <>
      {thread.map((m, idx) => (
        <React.Fragment key={m.id}>
          {idx === todayStart && todayStart > 0 && <DayDivider label="Today" />}
          <MessageRow
            message={m}
            withReactions={reactionIdxs.has(idx) && idx > 1}
          />
        </React.Fragment>
      ))}
    </>
  );
}

function MessageRow({
  message,
  withReactions,
}: {
  message: ChatMessage;
  withReactions: boolean;
}) {
  if (message.compact) {
    return (
      <div className="group/msg flex gap-3 pl-[40px] pr-2">
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">
          {message.body}
        </p>
      </div>
    );
  }
  return (
    <div className="group/msg flex gap-3 pt-2">
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className={cn("text-[10px]", message.authorTone)}>
          {message.authorInitials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-foreground">
            {message.authorName}
          </span>
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {message.sentAt}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">
          {message.body}
        </p>
        {withReactions && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge
              variant="outline"
              className="h-5 gap-1 border-border bg-muted/40 px-1.5 text-[11px] font-normal"
            >
              <span>👍</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                3
              </span>
            </Badge>
            <Badge
              variant="outline"
              className="h-5 gap-1 border-border bg-muted/40 px-1.5 text-[11px] font-normal"
            >
              <span>🎉</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                1
              </span>
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-background px-6 py-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton
              className={cn(
                "h-3.5",
                i % 2 === 0 ? "w-3/4" : "w-2/3",
              )}
            />
            {i % 3 === 0 && <Skeleton className="h-3.5 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  );
}

function Composer({
  selection,
  draft,
  onDraftChange,
  onSend,
}: {
  selection: Selection;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
}) {
  const placeholder =
    selection.kind === "dm"
      ? `Message ${selection.dm.name}`
      : `Message #${selection.channel.name}`;

  const attachRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ⌘↵ / Ctrl+↵ posts
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = draft.trim().length > 0;

  return (
    // v12.3: outer wrapper drops its lifted bg so it matches the dark
    // rail / message pane; the inner textbox container uses `bg-muted/40`
    // for clear contrast — the field "lifts" off the dark surround
    // instead of blending into it.
    <div className="shrink-0 border-t border-border p-3">
      <div className="rounded-lg border border-border bg-muted/40 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/40">
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          className="min-h-[60px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between border-t border-border/60 px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            {/* v12.3: attach uses a real paperclip (clearer affordance than
                the prior generic "+" icon), wired to a hidden multi-file
                input that accepts images/video/PDF/zip/audio + any other
                MIME. Picking a file fires the same draft pipeline. */}
            <input
              ref={attachRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/*,*/*"
              className="hidden"
              onChange={(e) => {
                const n = e.target.files?.length ?? 0;
                if (n > 0) {
                  const names = Array.from(e.target.files ?? [])
                    .map((f) => f.name)
                    .join(", ");
                  // Append filenames to the draft as a quick "attachment"
                  // affordance for the mock; real backend would upload them.
                  onDraftChange(
                    draft ? `${draft}\n📎 ${names}` : `📎 ${names}`,
                  );
                }
                e.target.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Attach files"
              onClick={() => attachRef.current?.click()}
            >
              <PaperclipIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Emoji"
            >
              <SmilePlusIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Mention"
            >
              <AtSignIcon className="size-4" />
            </Button>
          </div>
          <Button
            size="sm"
            disabled={!canSend}
            onClick={onSend}
            className="h-7 gap-1.5 text-xs"
          >
            <SendIcon className="size-3.5" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyConversation() {
  return (
    <div className="grid flex-1 place-items-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessagesSquareIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle>Pick a conversation</EmptyTitle>
          <EmptyDescription>
            Direct Messages and Project Channels live here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
