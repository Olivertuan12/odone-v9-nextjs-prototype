"use client";

import * as React from "react";
import {
  MessageSquare,
  Paperclip,
  Send,
  Smile,
  Users,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  chatForOrder,
  formatTimeUS,
  type ChatMessage,
  type Order,
} from "@/components/orders/orders-data";

// ----------------------------------------------------------------------------
// "You" identity — mock-only. When wiring to Supabase, swap for the
// authenticated session user id. All messages with sender_id === OLIVER.id
// render as the right-aligned "you" bubble (bg-foreground text-background).
// ----------------------------------------------------------------------------
const OLIVER = {
  id: "user-oliver",
  name: "Oliver Tuan",
  initials: "OT",
  avatar: "https://i.pravatar.cc/150?u=oliver",
};

// ----------------------------------------------------------------------------
// Group consecutive messages by sender so we don't re-render the avatar and
// name on every bubble of the same author. Mirrors iMessage / Slack threading.
// ----------------------------------------------------------------------------
type Grouped = {
  /** True when this row is the first bubble of a new sender group. */
  isFirst: boolean;
  /** True when this row is the last bubble of the sender group. */
  isLast: boolean;
  message: ChatMessage;
};

function groupMessages(messages: ChatMessage[]): Grouped[] {
  return messages.map((m, idx) => {
    const prev = messages[idx - 1];
    const next = messages[idx + 1];
    return {
      message: m,
      isFirst: !prev || prev.sender_id !== m.sender_id,
      isLast: !next || next.sender_id !== m.sender_id,
    };
  });
}

// ----------------------------------------------------------------------------
// Bubble — left for others, right for "you". DESIGN.md §1: rounded-2xl.
// ----------------------------------------------------------------------------
function MessageRow({ grouped }: { grouped: Grouped }) {
  const { message: m, isFirst, isLast } = grouped;
  const isMe = m.sender_id === OLIVER.id;

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isMe ? "flex-row-reverse" : "flex-row",
        isLast ? "mb-1.5" : "mb-0.5",
      )}
    >
      {/* Avatar slot — only on last of group (visually anchors the bubble stack) */}
      <div className="size-7 shrink-0">
        {isLast ? (
          <Avatar className="size-7">
            <AvatarImage src={m.sender_avatar} alt={m.sender_name} />
            <AvatarFallback className="text-[10px]">
              {m.sender_initials}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-col",
          isMe ? "items-end" : "items-start",
          "max-w-[75%]",
        )}
      >
        {/* Header (first of group only): name + time */}
        {isFirst ? (
          <div
            className={cn(
              "mb-1 flex items-baseline gap-2 px-1",
              isMe && "flex-row-reverse",
            )}
          >
            <span className="text-fluid-xs font-semibold text-foreground">
              {isMe ? "You" : m.sender_name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatTimeUS(m.created_at)}
            </span>
          </div>
        ) : null}

        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-fluid-sm leading-relaxed",
            isMe
              ? "bg-foreground text-background"
              : "bg-muted text-foreground",
          )}
        >
          {m.body}
        </div>

        {/* Reactions */}
        {m.reactions && m.reactions.length > 0 ? (
          <div
            className={cn(
              "mt-1 flex flex-wrap gap-1 px-1",
              isMe && "justify-end",
            )}
          >
            {m.reactions.map((r, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-[11px]"
              >
                <span>{r.emoji}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {r.count}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Empty state — DESIGN.md §3 MessageSquare icon, size-5 emphasis.
// ----------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="size-5 text-muted-foreground" />
      </div>
      <p className="text-fluid-sm font-medium text-foreground">
        Start a conversation about this order
      </p>
      <p className="text-fluid-xs text-muted-foreground">
        Notes, file links, and decisions all live here.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// OrderChatTab — main export
// ----------------------------------------------------------------------------
export function OrderChatTab({ order }: { order: Order }) {
  const initial = React.useMemo(() => chatForOrder(order.id), [order.id]);
  const [messages, setMessages] = React.useState<ChatMessage[]>(initial);
  const [draft, setDraft] = React.useState("");

  // Refs for autoresize textarea + autoscroll on new message.
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Sync internal state when order changes.
  React.useEffect(() => {
    setMessages(initial);
    setDraft("");
  }, [initial]);

  // Autoscroll to bottom on mount + when new messages arrive.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Autoresize textarea (1–4 lines).
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 4 * 22 + 16); // ~4 lines max
    el.style.height = `${next}px`;
  }, [draft]);

  const grouped = React.useMemo(() => groupMessages(messages), [messages]);

  // Distinct member count for the header badge.
  const memberCount = React.useMemo(() => {
    const ids = new Set<string>();
    for (const m of messages) ids.add(m.sender_id);
    ids.add(OLIVER.id);
    return ids.size;
  }, [messages]);

  // Up-to-4 unique avatars for the stacked header cluster.
  const memberAvatars = React.useMemo(() => {
    const seen = new Map<
      string,
      { id: string; name: string; initials: string; avatar: string }
    >();
    for (const m of messages) {
      if (!seen.has(m.sender_id)) {
        seen.set(m.sender_id, {
          id: m.sender_id,
          name: m.sender_name,
          initials: m.sender_initials,
          avatar: m.sender_avatar,
        });
      }
    }
    seen.set(OLIVER.id, OLIVER);
    return Array.from(seen.values()).slice(0, 4);
  }, [messages]);

  const handleSend = React.useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    const next: ChatMessage = {
      id: `local-${Date.now()}`,
      order_id: order.id,
      sender_id: OLIVER.id,
      sender_name: OLIVER.name,
      sender_initials: OLIVER.initials,
      sender_avatar: OLIVER.avatar,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, next]);
    setDraft("");
    toast.success("Message sent");
    // Return focus to the composer for fast follow-ups.
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [draft, order.id]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const canSend = draft.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4 lg:px-6 lg:py-5">
      {/* ---- Header ---- */}
      <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-fluid-lg font-semibold text-foreground">
            Project chat
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Users className="size-3" />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
        </div>
        <div className="flex shrink-0 items-center pl-1">
          {memberAvatars.map((m, idx) => (
            <Avatar
              key={m.id}
              className={cn(
                "size-6 ring-2 ring-background",
                idx > 0 && "-ml-1.5",
              )}
            >
              <AvatarImage src={m.avatar} alt={m.name} />
              <AvatarFallback className="text-[9px]">
                {m.initials}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      {/* ---- Messages ---- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-smooth-y min-h-0 -mx-1 px-1"
      >
        {grouped.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0.5 py-2">
            {grouped.map((g) => (
              <MessageRow key={g.message.id} grouped={g} />
            ))}
          </div>
        )}
      </div>

      {/* ---- Composer ---- */}
      <div className="shrink-0 pt-3">
        <div className="rounded-2xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring/40 transition-all duration-fast ease-standard">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Message about #${order.display_number} ${order.property_address.split(",")[0]}…`}
            className="block w-full resize-none border-0 bg-transparent px-3 pt-2.5 pb-1 text-fluid-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                className="press rounded-full text-muted-foreground hover:text-foreground"
                title="Add emoji"
                aria-label="Add emoji"
                onClick={() => toast.info("Emoji picker — coming soon")}
              >
                <Smile className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="press rounded-full text-muted-foreground hover:text-foreground"
                title="Attach file"
                aria-label="Attach file"
                onClick={() => toast.info("Attachments — coming soon")}
              >
                <Paperclip className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                {"Enter to send · Shift+Enter newline"}
              </span>
              <Button
                onClick={handleSend}
                disabled={!canSend}
                size="sm"
                className="press h-7 gap-1.5 rounded-full bg-foreground px-3 text-background hover:bg-foreground/90 disabled:opacity-40"
              >
                <Send className="size-3.5" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
