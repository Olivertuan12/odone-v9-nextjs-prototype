"use client";

import * as React from "react";
import {
  ActivityIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  FilmIcon,
  LayersIcon,
  MessageSquareTextIcon,
  UsersIcon,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { columns as kanbanColumns, users, type Card } from "@/components/editor-data";
import { StatusPill } from "@/components/editor-status-pill";

const allRows: Card[] = kanbanColumns.flatMap((c) => c.cards);

type SortKey =
  | "title"
  | "type"
  | "version"
  | "status"
  | "notes"
  | "deadline"
  | "team";
type SortDir = "asc" | "desc";

// Parse "May 19" / "Today" -> sortable epoch number. Missing -> +Infinity.
const FAR_FUTURE = Number.MAX_SAFE_INTEGER;
function parseDeadline(label: string | undefined): number {
  if (!label) return FAR_FUTURE;
  if (label.toLowerCase() === "today") return Date.now();
  // Assume current year context — purely for sort ordering.
  const yr = new Date().getFullYear();
  const t = Date.parse(`${label} ${yr}`);
  return Number.isNaN(t) ? FAR_FUTURE : t;
}

function getSortValue(row: Card, key: SortKey): string | number {
  switch (key) {
    case "title":
      return row.title.toLowerCase();
    case "type":
      return row.type.toLowerCase();
    case "version":
      return row.version ? row.version : "￿"; // missing last
    case "status":
      return row.status.label.toLowerCase();
    case "notes":
      return row.notes && row.notes.total > 0
        ? row.notes.current / row.notes.total
        : 0;
    case "deadline":
      return parseDeadline(row.deadline);
    case "team": {
      const first = row.assignees[0];
      const u = first ? users[first] : undefined;
      return u ? u.name.toLowerCase() : "￿";
    }
  }
}

function compare(a: Card, b: Card, key: SortKey, dir: SortDir): number {
  const av = getSortValue(a, key);
  const bv = getSortValue(b, key);
  let cmp = 0;
  if (typeof av === "number" && typeof bv === "number") {
    cmp = av - bv;
  } else {
    cmp = String(av).localeCompare(String(bv));
  }
  return dir === "asc" ? cmp : -cmp;
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align = "left",
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <TableHead
      onClick={() => onClick(sortKey)}
      className={cn(
        "cursor-pointer select-none transition-colors hover:bg-accent",
        align === "right" && "text-right",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1",
          align === "right" && "justify-end"
        )}
      >
        {label}
        {active &&
          (dir === "asc" ? (
            <ChevronUpIcon className="size-3" />
          ) : (
            <ChevronDownIcon className="size-3" />
          ))}
      </span>
    </TableHead>
  );
}

export function EditorList({
  onOpenCard,
}: {
  /** v13: list rows open the detail dialog at the clicked card so the
   *  dialog can read its stage from context. */
  onOpenCard: (card: Card) => void;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = React.useState<SortKey>("deadline");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const sortedRows = React.useMemo(() => {
    const copy = [...allRows];
    copy.sort((a, b) => compare(a, b, sortBy, sortDir));
    return copy;
  }, [sortBy, sortDir]);

  const allSelected = selected.size === allRows.length;

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(allRows.map((r) => r.id)) : new Set());
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // ---- Footer aggregations ----
  const totalProjects = allRows.length;

  const typeCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allRows) m.set(r.type, (m.get(r.type) ?? 0) + 1);
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${n} ${t}`)
      .join(" · ");
  }, []);

  const statusCounts = React.useMemo(() => {
    let active = 0;
    let done = 0;
    let overdue = 0;
    for (const r of allRows) {
      const kind = r.status.kind;
      if (kind === "done") done++;
      else if (kind === "overdue" || r.overdue) overdue++;
      else active++;
    }
    return { active, done, overdue };
  }, []);

  const notesTotals = React.useMemo(() => {
    let cur = 0;
    let tot = 0;
    for (const r of allRows) {
      if (r.notes) {
        cur += r.notes.current;
        tot += r.notes.total;
      }
    }
    return { cur, tot };
  }, []);

  const nearestDeadline = React.useMemo(() => {
    let best: { label: string; t: number } | null = null;
    for (const r of allRows) {
      const t = parseDeadline(r.deadline);
      if (t === FAR_FUTURE) continue;
      if (!best || t < best.t) best = { label: r.deadline, t };
    }
    return best?.label ?? "—";
  }, []);

  const uniqueMembers = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) for (const id of r.assignees) s.add(id);
    return s.size;
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table className="[&_tbody_tr]:border-b-0">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 pl-4">
              <Checkbox
                id="queue-select-all"
                name="queue-select-all"
                checked={allSelected}
                onCheckedChange={(c) => toggleAll(c === true)}
              />
            </TableHead>
            <SortHeader
              label="Project"
              sortKey="title"
              active={sortBy === "title"}
              dir={sortDir}
              onClick={handleSort}
            />
            <SortHeader
              label="Type · Version"
              sortKey="type"
              active={sortBy === "type" || sortBy === "version"}
              dir={sortDir}
              onClick={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              active={sortBy === "status"}
              dir={sortDir}
              onClick={handleSort}
            />
            <SortHeader
              label="Notes"
              sortKey="notes"
              active={sortBy === "notes"}
              dir={sortDir}
              onClick={handleSort}
              align="right"
            />
            <SortHeader
              label="Due"
              sortKey="deadline"
              active={sortBy === "deadline"}
              dir={sortDir}
              onClick={handleSort}
            />
            <SortHeader
              label="Team"
              sortKey="team"
              active={sortBy === "team"}
              dir={sortDir}
              onClick={handleSort}
              align="right"
              className="pr-4"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow
              key={row.id}
              data-state={selected.has(row.id) ? "selected" : undefined}
              onClick={() => onOpenCard(row)}
              className="group cursor-pointer"
            >
              <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  id={`queue-row-${row.id}`}
                  name={`queue-row-${row.id}`}
                  checked={selected.has(row.id)}
                  onCheckedChange={(c) => toggleRow(row.id, c === true)}
                />
              </TableCell>
              <TableCell className="max-w-[280px]">
                <div className="flex min-w-0 flex-col">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-medium">{row.title}</span>
                    {row.pulse && (
                      <span className="size-1.5 shrink-0 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                  <span className="hidden truncate text-[10.5px] text-muted-foreground group-hover:block">
                    {row.address}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {row.version ? `${row.version} · ` : ""}
                {row.type}
                {row.editTime && (
                  <span className="ml-1 text-foreground/70">· {row.editTime}</span>
                )}
              </TableCell>
              <TableCell>
                <StatusPill status={row.status} />
              </TableCell>
              <TableCell className="text-right">
                {row.notes ? (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    <MessageSquareTextIcon className="size-3" />
                    {row.notes.current}/{row.notes.total}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-mono text-xs",
                    row.overdue ? "font-bold text-rose-400" : "text-muted-foreground"
                  )}
                >
                  <ClockIcon className="size-3" />
                  {row.deadline}
                </span>
              </TableCell>
              <TableCell className="pr-4">
                <div className="flex justify-end">
                  <AvatarGroup className="-space-x-2">
                    {row.assignees.map((id) => {
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-muted/30 border-t-2 border-foreground/20">
          <TableRow className="hover:bg-transparent">
            <TableCell className="pl-4 py-3" />
            <TableCell className="py-3">
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <LayersIcon className="size-3" />
                  Projects
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {totalProjects}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-3">
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <FilmIcon className="size-3" />
                  Type
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  {typeCounts}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-3">
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <ActivityIcon className="size-3" />
                  Status
                </span>
                <span className="inline-flex flex-wrap items-center gap-1">
                  {statusCounts.active > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                      {statusCounts.active} active
                    </span>
                  )}
                  {statusCounts.done > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      {statusCounts.done} done
                    </span>
                  )}
                  {statusCounts.overdue > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                      {statusCounts.overdue} overdue
                    </span>
                  )}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-3 text-right">
              <div className="flex flex-col items-end gap-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <MessageSquareTextIcon className="size-3" />
                  Notes
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  {notesTotals.cur}/{notesTotals.tot}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-3">
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <ClockIcon className="size-3" />
                  Due
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  {nearestDeadline}
                </span>
              </div>
            </TableCell>
            <TableCell className="pr-4 py-3 text-right">
              <div className="flex flex-col items-end gap-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <UsersIcon className="size-3" />
                  Team
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {uniqueMembers}
                </span>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
