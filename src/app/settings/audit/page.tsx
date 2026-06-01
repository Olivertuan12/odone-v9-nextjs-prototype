"use client";

// ============================================================================
// Odone — /settings/audit
// ----------------------------------------------------------------------------
// Workspace audit log. Filter rail (date range, actor select, action select)
// plus a table of recent admin/operations actions tied to the Odone domain
// (order moves, deliverable approvals, member invites, integration connects).
// Admin-only.
// ============================================================================

import * as React from "react";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDotIcon,
  DownloadIcon,
  FilterIcon,
  PackageIcon,
  SettingsIcon,
  ShareIcon,
  UploadIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { SettingsSection } from "@/components/settings/settings-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AuditAction = "approved" | "uploaded" | "assigned" | "invited" | "connected" | "delivered" | "revoked";

type AuditRow = {
  id: string;
  actor: { name: string; avatar: string; initials: string; tone: string };
  action: AuditAction;
  detail: React.ReactNode;
  target: string;
  when: string;
};

const ROWS: AuditRow[] = [
  {
    id: "a-1",
    actor: { name: "Sara Chen", avatar: "https://i.pravatar.cc/120?u=sara", initials: "SC", tone: "bg-fuchsia-500/20 text-fuchsia-200" },
    action: "approved",
    detail: <>approved deliverable <code className="font-mono text-foreground">ob-deliv-photo</code></>,
    target: "Order #1042",
    when: "2h ago",
  },
  {
    id: "a-2",
    actor: { name: "Oliver Tuan", avatar: "https://i.pravatar.cc/120?u=oliver", initials: "OT", tone: "bg-emerald-500/20 text-emerald-200" },
    action: "invited",
    detail: <>invited <span className="text-foreground">mary@starep.media</span> as Editor</>,
    target: "Workspace",
    when: "3h ago",
  },
  {
    id: "a-3",
    actor: { name: "MJ Rivera", avatar: "https://i.pravatar.cc/120?u=mj", initials: "MJ", tone: "bg-amber-500/20 text-amber-200" },
    action: "uploaded",
    detail: <>confirmed RAW upload (54 files)</>,
    target: "Order #1041",
    when: "4h ago",
  },
  {
    id: "a-4",
    actor: { name: "Oliver Tuan", avatar: "https://i.pravatar.cc/120?u=oliver", initials: "OT", tone: "bg-emerald-500/20 text-emerald-200" },
    action: "assigned",
    detail: <>assigned Photos to <span className="text-foreground">Kyle Anderson</span></>,
    target: "Order #1042",
    when: "6h ago",
  },
  {
    id: "a-5",
    actor: { name: "Kyle Anderson", avatar: "https://i.pravatar.cc/120?u=kyle", initials: "KY", tone: "bg-indigo-500/20 text-indigo-200" },
    action: "uploaded",
    detail: <>uploaded Photos v2 (48 stills)</>,
    target: "Order #1039",
    when: "Today 11:42",
  },
  {
    id: "a-6",
    actor: { name: "Oliver Tuan", avatar: "https://i.pravatar.cc/120?u=oliver", initials: "OT", tone: "bg-emerald-500/20 text-emerald-200" },
    action: "connected",
    detail: <>connected the <span className="text-foreground">Google Calendar</span> integration</>,
    target: "Integrations",
    when: "Yesterday 16:08",
  },
  {
    id: "a-7",
    actor: { name: "Priya Sun", avatar: "https://i.pravatar.cc/120?u=priya", initials: "PR", tone: "bg-teal-500/20 text-teal-200" },
    action: "delivered",
    detail: <>sent client a share link (expires 06/14/2026)</>,
    target: "Order #1037",
    when: "Yesterday 14:50",
  },
  {
    id: "a-8",
    actor: { name: "Sara Chen", avatar: "https://i.pravatar.cc/120?u=sara", initials: "SC", tone: "bg-fuchsia-500/20 text-fuchsia-200" },
    action: "uploaded",
    detail: <>uploaded Walkthrough v3 (1.7 GB)</>,
    target: "Order #1036",
    when: "05/30/2026",
  },
  {
    id: "a-9",
    actor: { name: "Oliver Tuan", avatar: "https://i.pravatar.cc/120?u=oliver", initials: "OT", tone: "bg-emerald-500/20 text-emerald-200" },
    action: "revoked",
    detail: <>revoked a sign-in session on <span className="text-foreground">Chrome — Windows 11</span></>,
    target: "Security",
    when: "05/30/2026",
  },
  {
    id: "a-10",
    actor: { name: "Maya Jones", avatar: "https://i.pravatar.cc/120?u=maya", initials: "MJ", tone: "bg-orange-500/20 text-orange-200" },
    action: "uploaded",
    detail: <>confirmed RAW for Photos + Drone (124 files)</>,
    target: "Order #1035",
    when: "05/29/2026",
  },
  {
    id: "a-11",
    actor: { name: "Noah Lin", avatar: "https://i.pravatar.cc/120?u=noah", initials: "NO", tone: "bg-orange-500/20 text-orange-200" },
    action: "delivered",
    detail: <>handed off final assets to <span className="text-foreground">HD Photo Hub</span></>,
    target: "Order #1031",
    when: "05/28/2026",
  },
  {
    id: "a-12",
    actor: { name: "Oliver Tuan", avatar: "https://i.pravatar.cc/120?u=oliver", initials: "OT", tone: "bg-emerald-500/20 text-emerald-200" },
    action: "connected",
    detail: <>updated workspace Stripe account</>,
    target: "Billing",
    when: "05/27/2026",
  },
];

const ACTORS = [
  { value: "all", label: "Anyone" },
  { value: "oliver", label: "Oliver Tuan" },
  { value: "sara", label: "Sara Chen" },
  { value: "kyle", label: "Kyle Anderson" },
  { value: "mj", label: "MJ Rivera" },
];

const ACTIONS = [
  { value: "all", label: "All actions" },
  { value: "approved", label: "Approvals" },
  { value: "uploaded", label: "Uploads" },
  { value: "assigned", label: "Assignments" },
  { value: "invited", label: "Member invites" },
  { value: "connected", label: "Integration changes" },
  { value: "delivered", label: "Deliveries" },
  { value: "revoked", label: "Security events" },
];

function ActionGlyph({ action }: { action: AuditAction }) {
  const map: Record<AuditAction, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
    approved: { icon: CheckCircle2Icon, tone: "bg-emerald-500/10 text-emerald-300" },
    uploaded: { icon: UploadIcon, tone: "bg-sky-500/10 text-sky-300" },
    assigned: { icon: PackageIcon, tone: "bg-amber-500/10 text-amber-300" },
    invited: { icon: UserIcon, tone: "bg-violet-500/10 text-violet-300" },
    connected: { icon: SettingsIcon, tone: "bg-fuchsia-500/10 text-fuchsia-300" },
    delivered: { icon: ShareIcon, tone: "bg-teal-500/10 text-teal-300" },
    revoked: { icon: CircleAlertIcon, tone: "bg-rose-500/10 text-rose-300" },
  };
  const { icon: Icon, tone } = map[action];
  return (
    <span className={"grid size-7 shrink-0 place-items-center rounded-full " + tone}>
      <Icon className="size-3.5" />
    </span>
  );
}

export default function AuditSettingsPage() {
  const [actor, setActor] = React.useState("all");
  const [action, setAction] = React.useState<string>("all");
  const [from, setFrom] = React.useState("2026-05-15");
  const [to, setTo] = React.useState("2026-05-31");

  const filtered = ROWS.filter((r) => {
    if (action !== "all" && r.action !== action) return false;
    if (actor !== "all") {
      const map: Record<string, string> = {
        oliver: "Oliver Tuan",
        sara: "Sara Chen",
        kyle: "Kyle Anderson",
        mj: "MJ Rivera",
      };
      if (r.actor.name !== map[actor]) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <SettingsSection
        title="Filter"
        description="Narrow the log by date range, actor, or action type."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Exporting audit log as CSV")}
          >
            <DownloadIcon className="size-3.5" />
            Export CSV
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <Field className="gap-1">
            <FieldLabel
              htmlFor="aud-from"
              className="text-fluid-xs font-medium text-muted-foreground"
            >
              From
            </FieldLabel>
            <Input
              id="aud-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field className="gap-1">
            <FieldLabel
              htmlFor="aud-to"
              className="text-fluid-xs font-medium text-muted-foreground"
            >
              To
            </FieldLabel>
            <Input
              id="aud-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field className="gap-1">
            <FieldLabel
              htmlFor="aud-actor"
              className="text-fluid-xs font-medium text-muted-foreground"
            >
              Actor
            </FieldLabel>
            <Select
              value={actor}
              onValueChange={(v) => setActor(v as string)}
              items={ACTORS}
            >
              <SelectTrigger id="aud-actor" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTORS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="gap-1">
            <FieldLabel
              htmlFor="aud-action"
              className="text-fluid-xs font-medium text-muted-foreground"
            >
              Action
            </FieldLabel>
            <Select
              value={action}
              onValueChange={(v) => setAction(v as string)}
              items={ACTIONS}
            >
              <SelectTrigger id="aud-action" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex items-center justify-between text-fluid-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FilterIcon className="size-3.5" />
            Showing {filtered.length} of {ROWS.length} events
          </div>
          <button
            type="button"
            onClick={() => {
              setActor("all");
              setAction("all");
            }}
            className="hover:text-foreground"
          >
            Reset filters
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Recent activity">
        {filtered.length === 0 ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleDotIcon className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No activity</EmptyTitle>
              <EmptyDescription>
                No events match the current filters. Widen the date range or
                clear the actor / action filter.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setActor("all");
                  setAction("all");
                }}
              >
                Reset filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        <ul className="divide-y divide-border">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <ActionGlyph action={row.action} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2 text-fluid-sm text-foreground">
                  <Avatar className="size-5">
                    <AvatarImage src={row.actor.avatar} alt={row.actor.name} />
                    <AvatarFallback className={"text-[9px] " + row.actor.tone}>
                      {row.actor.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{row.actor.name}</span>
                  <span className="text-muted-foreground">{row.detail}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-fluid-xs text-muted-foreground">
                  <Badge variant="outline" className="text-fluid-xs">
                    {row.target}
                  </Badge>
                  <span>{row.when}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
}
