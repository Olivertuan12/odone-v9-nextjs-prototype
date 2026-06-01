"use client";

import * as React from "react";
import { GlobeIcon, HashIcon, LockIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { users } from "@/components/editor-data";

type Privacy = "public" | "private";

export function NewChannelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [privacy, setPrivacy] = React.useState<Privacy>("public");
  const [members, setMembers] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setPrivacy("public");
      setMembers(new Set());
    }
  }, [open]);

  const toggleMember = (id: string) => {
    setMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canCreate = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels organize project conversations and files.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Channel name
            </label>
            <div className="relative">
              <HashIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                autoFocus
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, ""),
                  )
                }
                placeholder="e.g. 45-yorkshire-dr"
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Privacy
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PrivacyButton
                active={privacy === "public"}
                onClick={() => setPrivacy("public")}
                icon={<GlobeIcon className="size-4" />}
                title="Public"
                desc="Anyone in workspace can join"
              />
              <PrivacyButton
                active={privacy === "private"}
                onClick={() => setPrivacy("private")}
                icon={<LockIcon className="size-4" />}
                title="Private"
                desc="Only invited members"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Members
            </div>
            <div className="rounded-md border border-border max-h-[180px] overflow-y-auto">
              {Object.values(users).map((u) => {
                const isSelected = members.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none border-b border-border last:border-b-0"
                  >
                    <Checkbox checked={isSelected} />
                    <Avatar className="size-6">
                      <AvatarImage src={u.image} alt={u.name} />
                      <AvatarFallback className={`text-[10px] ${u.tone}`}>
                        {u.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.role}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            You can mention channels in DMs with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              #channel-name
            </code>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canCreate} onClick={() => onOpenChange(false)}>
            Create channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrivacyButton({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-accent",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon} {title}
      </div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}
