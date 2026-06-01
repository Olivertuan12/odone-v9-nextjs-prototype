"use client";

import * as React from "react";
import {
  EditIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  Trash2Icon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { users as baseUsers } from "@/components/editor-data";

type Role = "Admin" | "Manager" | "Editor" | "Shooter" | "VA";
type StatusKind = "online" | "offline";

type Member = {
  id: string;
  name: string;
  email: string;
  image: string;
  initials: string;
  tone: string;
  role: Role;
  status: StatusKind;
  lastActive: string;
};

const ROLES: Role[] = ["Admin", "Manager", "Editor", "Shooter", "VA"];

const roleFor = (incoming: string): Role => {
  if (incoming === "Manager") return "Manager";
  if (incoming === "Lead Editor" || incoming === "Senior Editor") return "Editor";
  if (incoming === "Support") return "VA";
  return "Editor";
};

const seedMembers: Member[] = [
  ...Object.values(baseUsers).map<Member>((u, i) => ({
    id: u.id,
    name: u.name,
    email: `${u.name.split(" ")[0]!.toLowerCase()}@starep.media`,
    image: u.image,
    initials: u.initials,
    tone: u.tone,
    role: roleFor(u.role),
    status: i % 3 === 1 ? "offline" : "online",
    lastActive: i % 3 === 1 ? "2h ago" : "Active now",
  })),
  {
    id: "SR",
    name: "Sara Lopez",
    email: "sara@starep.media",
    image: "https://i.pravatar.cc/150?u=sara",
    initials: "SR",
    tone: "bg-fuchsia-500/20 text-fuchsia-200",
    role: "Editor",
    status: "online",
    lastActive: "Active now",
  },
  {
    id: "AX",
    name: "Alex Reyes",
    email: "alex@starep.media",
    image: "https://i.pravatar.cc/150?u=alex",
    initials: "AX",
    tone: "bg-sky-500/20 text-sky-200",
    role: "Shooter",
    status: "offline",
    lastActive: "Yesterday",
  },
  {
    id: "DV",
    name: "Devon Patel",
    email: "devon@starep.media",
    image: "https://i.pravatar.cc/150?u=devon",
    initials: "DV",
    tone: "bg-violet-500/20 text-violet-200",
    role: "VA",
    status: "offline",
    lastActive: "3d ago",
  },
];

export function MembersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [members, setMembers] = React.useState<Member[]>(seedMembers);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()),
  );

  const updateRole = (id: string, role: Role) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role } : m)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle className="flex items-center gap-2">
            Members
            <Badge variant="secondary" className="font-mono">
              {members.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="pl-8"
            />
          </div>
          <Button>
            <PlusIcon /> Invite people
          </Button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto border-t border-border px-4 py-3">
          {members.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No members yet</EmptyTitle>
                <EmptyDescription>
                  Invite teammates, vendors, and clients to start collaborating
                  in this workspace.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm">
                  <PlusIcon /> Invite people
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table className="[&_tbody_tr]:border-b-0">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[140px]">Role</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[110px] text-xs">Last active</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="max-w-[260px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={m.image} alt={m.name} />
                          <AvatarFallback className={`text-[10px] ${m.tone}`}>
                            {m.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {m.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        onValueChange={(v) => updateRole(m.id, v as Role)}
                        items={ROLES.map((r) => ({ label: r, value: r }))}
                      >
                        <SelectTrigger size="sm" className="w-[140px] max-w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className={
                            "size-1.5 rounded-full " +
                            (m.status === "online"
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/60")
                          }
                        />
                        <span className="text-muted-foreground capitalize">
                          {m.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {m.lastActive}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontalIcon />
                              <span className="sr-only">Actions</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <EditIcon /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserCogIcon /> Change role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">
                            <Trash2Icon /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <Empty className="py-8">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <SearchXIcon className="size-5" />
                          </EmptyMedia>
                          <EmptyTitle>No members match</EmptyTitle>
                          <EmptyDescription>
                            {`Nothing matches "${query}". Try a shorter search term.`}
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setQuery("")}
                          >
                            Clear search
                          </Button>
                        </EmptyContent>
                      </Empty>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
