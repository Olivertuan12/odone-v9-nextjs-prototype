"use client";

import * as React from "react";
import {
  AtSignIcon,
  HashIcon,
  PaperclipIcon,
  SendIcon,
  SmilePlusIcon,
  XIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { users } from "@/components/editor-data";

export type ChatTarget = {
  kind: "dm" | "channel";
  id: string;
  label: string;
  image?: string;
  initials?: string;
  tone?: string;
};

type Message = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  authorInitials?: string;
  authorTone?: string;
  time: string;
  text: string;
  reactions?: { emoji: string; count: number }[];
};

const OLIVER = {
  id: "OT",
  name: "Oliver Tuan",
  image: "https://i.pravatar.cc/150?u=oliver",
  initials: "OT",
  tone: "bg-emerald-500/20 text-emerald-200",
};

function buildDmMessages(target: ChatTarget): Message[] {
  return [
    {
      id: "m1",
      authorId: target.id,
      authorName: target.label,
      authorImage: target.image,
      authorInitials: target.initials,
      authorTone: target.tone,
      time: "9:14 AM",
      text: "Hey, did you get a chance to look at the 45 Yorkshire Dr v2 cut?",
    },
    {
      id: "m2",
      authorId: OLIVER.id,
      authorName: OLIVER.name,
      authorImage: OLIVER.image,
      authorInitials: OLIVER.initials,
      authorTone: OLIVER.tone,
      time: "9:18 AM",
      text: "Yeah, just opened it. The drone intro is great — feels much tighter than v1.",
    },
    {
      id: "m3",
      authorId: target.id,
      authorName: target.label,
      authorImage: target.image,
      authorInitials: target.initials,
      authorTone: target.tone,
      time: "9:20 AM",
      text: "Nice. The kitchen WB is the one thing I'd still push back on — feels a touch cool.",
      reactions: [{ emoji: "👀", count: 1 }],
    },
    {
      id: "m4",
      authorId: OLIVER.id,
      authorName: OLIVER.name,
      authorImage: OLIVER.image,
      authorInitials: OLIVER.initials,
      authorTone: OLIVER.tone,
      time: "9:22 AM",
      text: "Agreed. I'll warm up the kitchen pass and bump the exposure ~0.3 stops. Should be quick.",
    },
    {
      id: "m5",
      authorId: target.id,
      authorName: target.label,
      authorImage: target.image,
      authorInitials: target.initials,
      authorTone: target.tone,
      time: "9:25 AM",
      text: "Perfect. Once that's in I think we're good to push to client review.",
      reactions: [
        { emoji: "🔥", count: 2 },
        { emoji: "✅", count: 1 },
      ],
    },
    {
      id: "m6",
      authorId: target.id,
      authorName: target.label,
      authorImage: target.image,
      authorInitials: target.initials,
      authorTone: target.tone,
      time: "9:31 AM",
      text: "Also — heads up, Kyle wants v2 by EOD so we can keep the delivery window. Let me know if that's a problem.",
    },
  ];
}

function buildChannelMessages(target: ChatTarget): Message[] {
  const MA = users.MA;
  const RZ = users.RZ;
  const MJ = users.MJ;
  const KY = users.KY;
  return [
    {
      id: "c1",
      authorId: MA.id,
      authorName: MA.name,
      authorImage: MA.image,
      authorInitials: MA.initials,
      authorTone: MA.tone,
      time: "8:42 AM",
      text: `Morning team — pulling everyone into #${target.label}. Brief is in Assets, deadline is Friday 5 PM.`,
    },
    {
      id: "c2",
      authorId: RZ.id,
      authorName: RZ.name,
      authorImage: RZ.image,
      authorInitials: RZ.initials,
      authorTone: RZ.tone,
      time: "8:55 AM",
      text: "Started the rough cut. Walkthrough is solid, drone needs a pass — some shots feel shaky around the pool.",
      reactions: [{ emoji: "👍", count: 2 }],
    },
    {
      id: "c3",
      authorId: MJ.id,
      authorName: MJ.name,
      authorImage: MJ.image,
      authorInitials: MJ.initials,
      authorTone: MJ.tone,
      time: "9:03 AM",
      text: "I can stabilize the drone clips this morning. Should I send them back via the channel or DM?",
    },
    {
      id: "c4",
      authorId: OLIVER.id,
      authorName: OLIVER.name,
      authorImage: OLIVER.image,
      authorInitials: OLIVER.initials,
      authorTone: OLIVER.tone,
      time: "9:08 AM",
      text: "Channel is fine — keeps everything together. Just tag me when it's ready.",
    },
    {
      id: "c5",
      authorId: KY.id,
      authorName: KY.name,
      authorImage: KY.image,
      authorInitials: KY.initials,
      authorTone: KY.tone,
      time: "9:14 AM",
      text: "Heads up: client moved the review call to 3 PM today, so v1 needs to be in by 2:30 latest.",
      reactions: [
        { emoji: "🚨", count: 3 },
        { emoji: "👀", count: 1 },
      ],
    },
    {
      id: "c6",
      authorId: MA.id,
      authorName: MA.name,
      authorImage: MA.image,
      authorInitials: MA.initials,
      authorTone: MA.tone,
      time: "9:21 AM",
      text: "Got it — I'll lock the walkthrough cut at 2:00 PM so we have buffer for the export. Everyone good?",
    },
  ];
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

function ChatMessageRow({ m }: { m: Message }) {
  return (
    <div className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={m.authorImage} alt={m.authorName} />
        <AvatarFallback className={cn("text-xs", m.authorTone)}>
          {m.authorInitials ?? m.authorName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">
            {m.authorName}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {m.time}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">
          {m.text}
        </p>
        {m.reactions && m.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.reactions.map((r, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[11px]"
              >
                <span>{r.emoji}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {r.count}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ChatTarget | null;
}) {
  if (!target) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] gap-0 p-0" />
      </Dialog>
    );
  }

  const messages =
    target.kind === "dm" ? buildDmMessages(target) : buildChannelMessages(target);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[640px] h-[80vh] max-h-[700px] gap-0 p-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-3">
          {target.kind === "dm" ? (
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={target.image} alt={target.label} />
              <AvatarFallback className={cn("text-xs", target.tone)}>
                {target.initials ?? target.label.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <HashIcon className="size-5 text-muted-foreground" />
          )}
          <div className="min-w-0 flex flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">
              {target.label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {target.kind === "dm" ? "DM" : "Channel"}
            </span>
          </div>
          <div className="ml-auto">
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close chat"
                />
              }
            >
              <XIcon className="size-4" />
            </DialogClose>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-popover px-4 py-4">
          <div className="flex flex-col gap-4">
            <DayDivider label="Today" />
            {messages.map((m) => (
              <ChatMessageRow key={m.id} m={m} />
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border bg-background p-3">
          <div className="rounded-lg border border-border bg-card focus-within:ring-2 focus-within:ring-ring/40">
            <textarea
              placeholder={
                target.kind === "dm"
                  ? `Message ${target.label}`
                  : `Message #${target.label}`
              }
              rows={1}
              className="block w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Separator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  title="Attach"
                >
                  <PaperclipIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  title="Mention"
                >
                  <AtSignIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  title="Emoji"
                >
                  <SmilePlusIcon className="size-4" />
                </Button>
              </div>
              <Button size="sm" className="h-7 gap-1.5 text-xs">
                <SendIcon className="size-3.5" /> Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
