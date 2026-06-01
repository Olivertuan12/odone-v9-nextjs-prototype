"use client";

import * as React from "react";
import { MailIcon, SearchIcon, XIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { users } from "@/components/editor-data";

const isEmailLike = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function NewDmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(new Set());
    }
  }, [open]);

  const userList = React.useMemo(() => Object.values(users), []);
  const filtered = userList.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()),
  );
  const emailMatch = isEmailLike(query) ? query.trim() : null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const count = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>New direct message</DialogTitle>
          <DialogDescription>
            Search for a teammate or invite someone new by email.
          </DialogDescription>
        </DialogHeader>

        {count > 0 && (
          <div className="mx-4 mb-2 flex flex-wrap gap-1.5 rounded-md border border-border bg-muted/50 p-2">
            {Array.from(selected).map((id) => {
              const u = users[id];
              if (!u) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-0.5 pl-0.5 pr-1.5 text-xs"
                >
                  <Avatar className="size-5">
                    <AvatarImage src={u.image} alt={u.name} />
                    <AvatarFallback className={`text-[9px] ${u.tone}`}>
                      {u.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{u.name}</span>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={`Remove ${u.name}`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {count >= 2 && (
          <div className="mx-4 mb-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            This will create a group DM with {count} people
          </div>
        )}

        <div className="px-4 pb-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a person… or type an email"
              className="pl-8"
            />
          </div>
          {emailMatch && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
              <MailIcon className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">Invite by email:</span>
              <span className="font-medium">{emailMatch}</span>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[280px] border-t border-border">
          {filtered.length === 0 && !emailMatch && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No people match "{query}"
            </div>
          )}
          {filtered.map((u) => {
            const isSelected = selected.has(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
              >
                <Checkbox checked={isSelected} />
                <Avatar className="size-7">
                  <AvatarImage src={u.image} alt={u.name} />
                  <AvatarFallback className={`text-[10px] ${u.tone}`}>
                    {u.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.role}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="mt-0">
          <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
            {count > 0 && (
              <Badge variant="secondary" className="font-mono">
                {count} selected
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <XIcon /> Cancel
          </Button>
          <Button disabled={count === 0} onClick={() => onOpenChange(false)}>
            {count >= 2 ? "Create group" : "Start chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
