"use client";

// ============================================================================
// Odone — /settings/integrations
// ----------------------------------------------------------------------------
// Grid of 5 connector cards (Google Calendar, Slack, Stripe, Dropbox, Fotello
// import) + a Webhooks section below with 2 mock outbound endpoints. Each
// connector has a logo char, status pill, and a primary CTA (Connect /
// Configure / Disconnect).
// ============================================================================

import * as React from "react";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CopyIcon,
  CreditCardIcon,
  HashIcon,
  HardDriveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  WaypointsIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Connector = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTone: string;
  blurb: string;
  status: "connected" | "disconnected";
  detail?: string;
};

const CONNECTORS: Connector[] = [
  {
    id: "gcal",
    name: "Google Calendar",
    icon: CalendarDaysIcon,
    iconTone: "bg-sky-500/10 text-sky-300",
    blurb: "Syncs shoots from Odone Calendar to the assigned shooter's Google account.",
    status: "connected",
    detail: "Connected as oliver@starep.media · 2-way sync",
  },
  {
    id: "slack",
    name: "Slack",
    icon: HashIcon,
    iconTone: "bg-violet-500/10 text-violet-300",
    blurb: "Pings #odone-production on confirmations, approvals, and revisions.",
    status: "disconnected",
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: CreditCardIcon,
    iconTone: "bg-indigo-500/10 text-indigo-300",
    blurb: "Bills clients on order completion. Card data never touches Odone.",
    status: "connected",
    detail: "Connected to acct_1NeyKsTPS · USD",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    icon: HardDriveIcon,
    iconTone: "bg-sky-500/10 text-sky-300",
    blurb: "Mirrors final deliverables to your Dropbox Business team folder.",
    status: "disconnected",
  },
  {
    id: "fotello",
    name: "Fotello import",
    icon: ZapIcon,
    iconTone: "bg-amber-500/10 text-amber-300",
    blurb: "Pulls completed orders from Fotello Studio into Odone's Final folder.",
    status: "connected",
    detail: "Polling every 10 min · last sync 4 min ago",
  },
];

type Webhook = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastFired: string;
};

const WEBHOOKS: Webhook[] = [
  {
    id: "wh-1",
    url: "https://hooks.zapier.com/hooks/catch/2391847/odone-orders",
    events: ["order.created", "order.delivered"],
    enabled: true,
    lastFired: "Today 10:42",
  },
  {
    id: "wh-2",
    url: "https://api.starep.media/internal/odone/relay",
    events: ["deliverable.approved", "deliverable.revised"],
    enabled: false,
    lastFired: "05/29/2026",
  },
];

export default function IntegrationsSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <SettingsSection
        title="Connectors"
        description="Connect Odone to the rest of your stack — calendar, chat, payments, and external editors."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {CONNECTORS.map((c) => (
            <article
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    "grid size-10 shrink-0 place-items-center rounded-lg " +
                    c.iconTone
                  }
                >
                  <c.icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-fluid-sm font-medium text-foreground">
                      {c.name}
                    </span>
                    {c.status === "connected" ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      >
                        <CheckCircle2Icon className="size-3" /> Connected
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-border bg-muted/40 text-muted-foreground"
                      >
                        <CircleDashedIcon className="size-3" /> Not connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-fluid-xs text-muted-foreground">
                    {c.blurb}
                  </p>
                </div>
              </div>

              {c.detail && (
                <div className="rounded-md bg-muted/30 px-2.5 py-1.5 text-fluid-xs text-muted-foreground">
                  {c.detail}
                </div>
              )}

              <div className="mt-auto flex items-center justify-end gap-2">
                {c.status === "connected" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info(`Opening ${c.name} settings`)}
                    >
                      Configure
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontalIcon />
                            <span className="sr-only">More</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toast.info(`Reconnecting ${c.name}…`)}
                        >
                          Reconnect
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.info("Forcing sync…")}
                        >
                          Force sync now
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            toast.error(`${c.name} disconnected`)
                          }
                        >
                          Disconnect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => toast.success(`Connecting ${c.name}…`)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Webhooks"
        description="Outbound HTTP calls fired on Odone events. Pair with Zapier, n8n, or your own service."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Add a webhook (mock)")}
          >
            <PlusIcon className="size-3.5" />
            Add webhook
          </Button>
        }
      >
        <ul className="divide-y divide-border">
          {WEBHOOKS.map((w) => (
            <li
              key={w.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <WaypointsIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <code className="truncate font-mono text-fluid-xs text-foreground">
                    {w.url}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy webhook URL"
                    onClick={() => {
                      toast.success("Webhook URL copied");
                    }}
                  >
                    <CopyIcon className="size-3" />
                  </Button>
                </div>
                <Badge
                  variant="outline"
                  className={
                    w.enabled
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-border bg-muted/40 text-muted-foreground"
                  }
                >
                  {w.enabled ? "Active" : "Paused"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-5 text-fluid-xs text-muted-foreground">
                {w.events.map((e) => (
                  <span
                    key={e}
                    className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {e}
                  </span>
                ))}
                <span className="ml-auto">Last fired: {w.lastFired}</span>
              </div>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
}
