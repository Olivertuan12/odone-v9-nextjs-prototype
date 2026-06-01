"use client";

// ============================================================================
// Odone — /settings/notifications
// ----------------------------------------------------------------------------
// Notification matrix: rows = event types tied to the Odone production flow,
// columns = delivery channels (Email / In-app / Mobile push). Each cell is a
// Switch. Quiet hours sits below the matrix as its own card.
// ============================================================================

import * as React from "react";
import {
  BellIcon,
  CheckCircle2Icon,
  MailIcon,
  SmartphoneIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Channel = "email" | "inapp" | "push";

type EventRow = {
  key: string;
  label: string;
  hint: string;
  defaults: Record<Channel, boolean>;
};

const EVENTS: EventRow[] = [
  {
    key: "order_assigned",
    label: "New order assigned to you",
    hint: "Fires when a manager moves an order into your queue.",
    defaults: { email: true, inapp: true, push: true },
  },
  {
    key: "upload_confirmed",
    label: "Upload confirmed",
    hint: "A shooter confirmed raw files for an order you own.",
    defaults: { email: false, inapp: true, push: true },
  },
  {
    key: "comment_on_deliverable",
    label: "Comment on your deliverable",
    hint: "Client or teammate left a note on a cut you delivered.",
    defaults: { email: true, inapp: true, push: false },
  },
  {
    key: "editor_finished_cut",
    label: "Editor finished a cut",
    hint: "A new version landed in Review.",
    defaults: { email: false, inapp: true, push: true },
  },
  {
    key: "client_approved",
    label: "Client approved a deliverable",
    hint: "Auto-advances the order to Deliver.",
    defaults: { email: true, inapp: true, push: false },
  },
  {
    key: "client_revision",
    label: "Client requested a revision",
    hint: "Bounces the deliverable back to your editor pool.",
    defaults: { email: true, inapp: true, push: true },
  },
  {
    key: "vendor_delivered",
    label: "Vendor delivered files",
    hint: "Tonomo / HD Photo Hub / Fotello dropped a new package.",
    defaults: { email: true, inapp: true, push: false },
  },
  {
    key: "daily_digest",
    label: "Daily digest",
    hint: "Morning summary of your day's shoots and review queue.",
    defaults: { email: true, inapp: false, push: false },
  },
];

const CHANNELS: { key: Channel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "email", label: "Email", icon: MailIcon },
  { key: "inapp", label: "In-app", icon: BellIcon },
  { key: "push", label: "Mobile push", icon: SmartphoneIcon },
];

export default function NotificationsSettingsPage() {
  const [matrix, setMatrix] = React.useState<
    Record<string, Record<Channel, boolean>>
  >(() =>
    EVENTS.reduce(
      (acc, e) => {
        acc[e.key] = { ...e.defaults };
        return acc;
      },
      {} as Record<string, Record<Channel, boolean>>,
    ),
  );

  const [quietOn, setQuietOn] = React.useState(true);
  const [quietStart, setQuietStart] = React.useState("21:00");
  const [quietEnd, setQuietEnd] = React.useState("07:30");

  const toggle = (event: string, channel: Channel) => {
    setMatrix((prev) => ({
      ...prev,
      [event]: { ...prev[event]!, [channel]: !prev[event]![channel] },
    }));
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <SettingsSection
        title="Notification matrix"
        description="Pick which channels fire for each event. Email goes to your account address; in-app shows in the bell menu; push needs the iOS app installed."
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMatrix(
                EVENTS.reduce(
                  (acc, e) => {
                    acc[e.key] = { ...e.defaults };
                    return acc;
                  },
                  {} as Record<string, Record<Channel, boolean>>,
                ),
              );
              toast.info("Notifications reset to defaults");
            }}
          >
            Reset to defaults
          </Button>
        }
      >
        <div
          className="grid items-center gap-x-2 gap-y-0"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) repeat(3, 88px)",
          }}
        >
          {/* Header row */}
          <div className="text-fluid-xs font-medium uppercase tracking-wide text-muted-foreground">
            Event
          </div>
          {CHANNELS.map((c) => (
            <div
              key={c.key}
              className="flex flex-col items-center gap-1 pb-2 text-center"
            >
              <c.icon className="size-3.5 text-muted-foreground" />
              <span className="text-fluid-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
            </div>
          ))}

          {EVENTS.map((e, i) => (
            <React.Fragment key={e.key}>
              <div
                className={
                  "col-span-4 grid grid-cols-subgrid items-center gap-x-2 py-3 " +
                  (i > 0 ? "border-t border-border" : "")
                }
              >
                <div className="flex flex-col gap-0.5 pr-3">
                  <span className="text-fluid-sm font-medium text-foreground">
                    {e.label}
                  </span>
                  <span className="text-fluid-xs text-muted-foreground">
                    {e.hint}
                  </span>
                </div>
                {CHANNELS.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center justify-center"
                  >
                    <Switch
                      checked={matrix[e.key]![c.key]}
                      onCheckedChange={() => toggle(e.key, c.key)}
                      aria-label={`${c.label} for ${e.label}`}
                    />
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Quiet hours"
        description="We'll skip mobile push and digest emails during this window. In-app bell still collects everything."
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <span
              className={
                "grid size-9 shrink-0 place-items-center rounded-full " +
                (quietOn
                  ? "bg-violet-500/10 text-violet-300"
                  : "bg-muted text-muted-foreground")
              }
            >
              <CheckCircle2Icon className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-fluid-sm font-medium text-foreground">
                Enable quiet hours
              </span>
              <span className="text-fluid-xs text-muted-foreground">
                Pacific time. Applies to push + digest. Critical client
                escalations still come through.
              </span>
            </div>
          </div>
          <Switch
            checked={quietOn}
            onCheckedChange={setQuietOn}
            aria-label="Toggle quiet hours"
          />
        </div>

        <div className="divide-y divide-border">
          <SettingsRow label="Starts at" htmlFor="quiet-start">
            <Input
              id="quiet-start"
              type="time"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
              disabled={!quietOn}
              className="sm:max-w-[200px]"
            />
          </SettingsRow>
          <SettingsRow label="Ends at" htmlFor="quiet-end">
            <Input
              id="quiet-end"
              type="time"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
              disabled={!quietOn}
              className="sm:max-w-[200px]"
            />
          </SettingsRow>
        </div>
      </SettingsSection>
    </div>
  );
}
