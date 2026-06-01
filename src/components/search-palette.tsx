"use client";

import * as React from "react";
import {
  CornerDownLeftIcon,
  FilmIcon,
  HashIcon,
  HomeIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";

type ResultGroup = {
  label: string;
  items: {
    id: string;
    name: string;
    type: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
};

const GROUPS: ResultGroup[] = [
  {
    label: "Recent",
    items: [
      { id: "r1", name: "45 Yorkshire Dr", type: "Project", icon: HomeIcon },
      { id: "r2", name: "13364 Beach Blvd", type: "Project", icon: HomeIcon },
      { id: "r3", name: "245 Ocean Blvd", type: "Project", icon: HomeIcon },
    ],
  },
  {
    label: "Clients",
    items: [
      { id: "c1", name: "Homes Realty", type: "Client", icon: UserIcon },
      { id: "c2", name: "Coastal Realty", type: "Client", icon: UserIcon },
    ],
  },
  {
    label: "Channels",
    items: [
      { id: "ch1", name: "#45-yorkshire-dr", type: "Channel", icon: HashIcon },
      { id: "ch2", name: "#13364-beach-blvd", type: "Channel", icon: HashIcon },
    ],
  },
  {
    label: "Files",
    items: [
      { id: "f1", name: "drone-clip.mp4", type: "File", icon: FilmIcon },
    ],
  },
];

export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filteredGroups = React.useMemo(() => {
    if (!query.trim()) return GROUPS;
    const q = query.toLowerCase();
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.name.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        <div className="flex items-center gap-2 px-3 py-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, clients, channels, files…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"
          />
        </div>

        <Separator />

        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {filteredGroups.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No results.
            </div>
          ) : (
            filteredGroups.map((group, idx) => (
              <div key={group.label}>
                {idx > 0 && <Separator className="my-1.5" />}
                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                        onClick={() => onOpenChange(false)}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                          {item.type}
                        </span>
                        <span className="hidden h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground group-hover:flex group-focus:flex">
                          <CornerDownLeftIcon className="size-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              to open
            </span>
            <span className="flex items-center gap-1">
              <Kbd>⏎</Kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <Kbd>Esc</Kbd>
              to close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
