"use client";

import * as React from "react";
import {
  AtSignIcon,
  CircleCheckBigIcon,
  MessageCircleIcon,
  SendIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { users } from "@/components/editor-data";

type NotifKind = "comment" | "mention" | "approval" | "delivery";

type Notif = {
  id: string;
  kind: NotifKind;
  userId: keyof typeof users;
  title: string;
  snippet: string;
  time: string;
  unread: boolean;
};

const ICONS: Record<NotifKind, React.ComponentType<{ className?: string }>> = {
  comment: MessageCircleIcon,
  mention: AtSignIcon,
  approval: CircleCheckBigIcon,
  delivery: SendIcon,
};

const ICON_TONE: Record<NotifKind, string> = {
  comment: "bg-muted text-muted-foreground",
  mention: "bg-blue-500 text-white",
  approval: "bg-emerald-500 text-white",
  delivery: "bg-indigo-500 text-white",
};

const NOTIFS: Notif[] = [
  { id: "n1", kind: "comment",  userId: "KY", title: "Kyle commented on 45 Yorkshire Dr v2", snippet: "Please brighten the kitchen shots — exposure feels a bit flat overall.", time: "2m",        unread: true  },
  { id: "n2", kind: "mention",  userId: "MA", title: "Marry mentioned you in 13364 Beach Blvd", snippet: "@you can you take a look at the drone clip before delivery?",          time: "12m",       unread: true  },
  { id: "n3", kind: "approval", userId: "KY", title: "Kyle approved 100 Sunset Pl v2",         snippet: "Cleared for delivery — final cut signed off by the client.",         time: "1h",        unread: true  },
  { id: "n4", kind: "delivery", userId: "MJ", title: "MJ delivered 800 Park Ave to client",    snippet: "Sent final assets to Sarah at Coastline Realty.",                   time: "3h",        unread: false },
  { id: "n5", kind: "mention",  userId: "RZ", title: "RienzZzy left 3 notes on 245 Ocean Blvd", snippet: "Color pass + cut tightening notes attached to v1.",                  time: "Yesterday", unread: false },
  { id: "n6", kind: "comment",  userId: "MA", title: "Marry replied in 12 Pine St thread",     snippet: "Looks great — pushing this to QA now.",                             time: "Yesterday", unread: false },
];

export function NotificationPopover({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const [tab, setTab] = React.useState<"all" | "unread">("all");
  const unreadCount = NOTIFS.filter((n) => n.unread).length;
  const filtered = tab === "unread" ? NOTIFS.filter((n) => n.unread) : NOTIFS;

  return (
    <Popover>
      <PopoverTrigger render={trigger as React.ReactElement} />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[400px] gap-0 overflow-hidden p-0"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-[15px] font-semibold leading-none">Notifications</h3>
          <button className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Mark all read
          </button>
        </div>

        {/* TAB STRIP */}
        <div className="flex shrink-0 border-b">
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>
            All
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground">
              {NOTIFS.length}
            </span>
          </TabButton>
          <TabButton active={tab === "unread"} onClick={() => setTab("unread")}>
            Unread
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </TabButton>
        </div>

        {/* LIST */}
        <div className="max-h-[420px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5 p-1">
              {filtered.map((n) => (
                <NotifRow key={n.id} n={n} />
              ))}
            </ul>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t px-4 py-2 text-center">
          <button className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-0 px-3 py-2 text-[12px] font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
      )}
    </button>
  );
}

function NotifRow({ n }: { n: Notif }) {
  const u = users[n.userId];
  const Icon = ICONS[n.kind];

  return (
    <li
      className={cn(
        "group relative flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-3 transition-colors hover:bg-accent",
        n.unread && "bg-accent/30"
      )}
    >
      {/* Avatar with kind icon badge */}
      <div className="relative shrink-0">
        <Avatar className="size-9">
          <AvatarImage src={u.image} alt={u.name} />
          <AvatarFallback className={cn("text-[10px]", u.tone)}>
            {u.initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full ring-2 ring-popover",
            ICON_TONE[n.kind]
          )}
        >
          <Icon className="size-2.5" />
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Title + time */}
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 line-clamp-2 text-[12.5px] leading-tight",
              n.unread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
            )}
          >
            {n.title}
          </p>
          <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground">
            {n.time}
          </span>
        </div>

        {/* Snippet */}
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
          {n.snippet}
        </p>
      </div>

      {/* Unread indicator on far right (vertical dot) */}
      {n.unread && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-blue-500" aria-label="Unread" />
      )}
    </li>
  );
}
