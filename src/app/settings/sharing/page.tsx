"use client";

// ============================================================================
// Odone — /settings/sharing
// ----------------------------------------------------------------------------
// Defaults for client-facing share links and the brand they see on the
// portal. Three sections:
//   - Default share link (expiry, password, watermark)
//   - Branding (logo, accent, footer)
//   - Email delivery (from address + verified-domain status)
// ============================================================================

import * as React from "react";
import {
  CheckCircle2Icon,
  CheckIcon,
  CircleAlertIcon,
  GlobeIcon,
  KeyIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EXPIRIES = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "never", label: "Never expire" },
];

const ACCENTS = [
  { id: "emerald", className: "bg-emerald-500" },
  { id: "teal", className: "bg-teal-500" },
  { id: "sky", className: "bg-sky-500" },
  { id: "violet", className: "bg-violet-500" },
  { id: "amber", className: "bg-amber-500" },
];

export default function SharingSettingsPage() {
  const [expiry, setExpiry] = React.useState("30");
  const [pwOn, setPwOn] = React.useState(true);
  const [watermarkOn, setWatermarkOn] = React.useState(true);
  const [accent, setAccent] = React.useState("emerald");
  const [footer, setFooter] = React.useState(
    "Produced by STAREP MEDIA · starep.media · hello@starep.media",
  );
  const [fromAddress, setFromAddress] = React.useState("delivery@starep.media");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsSection
        title="Default share link"
        description="Applied to any new client share link unless overridden when sending."
      >
        <div className="divide-y divide-border">
          <SettingsRow
            label="Default expiry"
            hint="Clients can still re-request after expiry."
            htmlFor="share-expiry"
          >
            <Select
              value={expiry}
              onValueChange={(v) => setExpiry(v as string)}
              items={EXPIRIES}
            >
              <SelectTrigger id="share-expiry" className="w-full sm:max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRIES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow
            label="Password required"
            hint="Generates a 6-character code we deliver in a separate email."
          >
            <div className="flex items-center gap-3">
              <Switch
                checked={pwOn}
                onCheckedChange={setPwOn}
                aria-label="Password required"
              />
              {pwOn && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                >
                  <KeyIcon className="size-3" /> 6-char code
                </Badge>
              )}
            </div>
          </SettingsRow>

          <SettingsRow
            label="Watermark previews"
            hint="Stills get a corner watermark until the order is paid."
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Switch
                checked={watermarkOn}
                onCheckedChange={setWatermarkOn}
                aria-label="Watermark previews"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!watermarkOn}
                onClick={() => toast.info("Choose watermark PNG (mock)")}
              >
                <UploadIcon className="size-3.5" />
                Upload watermark PNG
              </Button>
              <span className="text-fluid-xs text-muted-foreground">
                PNG, transparent · 30% opacity bottom-right
              </span>
            </div>
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Client-facing branding"
        description="What clients see on the share portal and in delivery emails."
      >
        <div className="divide-y divide-border">
          <SettingsRow label="Portal logo">
            <div className="flex items-center gap-3">
              <div className="grid size-14 place-items-center rounded-lg border border-border bg-muted/40 font-bold text-foreground">
                S
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Choose logo for client portal")}
              >
                <UploadIcon className="size-3.5" />
                Upload logo
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow label="Accent color">
            <div className="flex flex-wrap items-center gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={accent === a.id}
                  aria-label={a.id}
                  onClick={() => setAccent(a.id)}
                  className={cn(
                    "grid size-9 place-items-center rounded-full ring-2 ring-transparent transition-all",
                    accent === a.id && "ring-foreground/40",
                  )}
                >
                  <span className={cn("size-7 rounded-full", a.className)} />
                  {accent === a.id && (
                    <CheckIcon className="absolute size-4 text-background" />
                  )}
                </button>
              ))}
            </div>
          </SettingsRow>

          <SettingsRow
            label="Footer text"
            hint="Shown below the gallery on every share link."
          >
            <Textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              rows={2}
              className="resize-y"
            />
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Email delivery"
        description="The from-address clients see on share-link emails."
      >
        <div className="divide-y divide-border">
          <SettingsRow label="From address" htmlFor="share-from">
            <div className="flex items-center gap-2">
              <Input
                id="share-from"
                type="email"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className="sm:max-w-sm"
              />
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              >
                <CheckCircle2Icon className="size-3" /> Domain verified
              </Badge>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Reply-to behavior"
            hint="Where client replies land."
          >
            <div className="flex flex-col gap-1.5 text-fluid-sm text-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reply"
                  defaultChecked
                  className="accent-foreground"
                />
                <span>Reply goes to the order owner</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reply"
                  className="accent-foreground"
                />
                <span>
                  Always reply to{" "}
                  <code className="rounded bg-muted px-1 font-mono text-[12px] text-foreground">
                    delivery@starep.media
                  </code>
                </span>
              </label>
            </div>
          </SettingsRow>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-fluid-xs">
            <GlobeIcon className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              SPF + DKIM + DMARC all green for{" "}
              <span className="text-foreground">starep.media</span>. Verified
              05/12/2026.
            </span>
            <CircleAlertIcon
              className="ml-auto size-3.5 text-amber-400"
              aria-hidden
            />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
