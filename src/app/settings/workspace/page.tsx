"use client";

// ============================================================================
// Odone — /settings/workspace
// ----------------------------------------------------------------------------
// Workspace-level identity for STAREP MEDIA: name, slug, logo, brand color,
// business address, default time zone, language, and fiscal-year start. The
// slug previews as the future Odone subdomain. Admin-only page.
// ============================================================================

import * as React from "react";
import { CheckIcon, GlobeIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import {
  SettingsRow,
  SettingsSection,
  SettingsStickyFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const BRAND_COLORS = [
  { id: "emerald", className: "bg-emerald-500" },
  { id: "teal", className: "bg-teal-500" },
  { id: "sky", className: "bg-sky-500" },
  { id: "indigo", className: "bg-indigo-500" },
  { id: "violet", className: "bg-violet-500" },
  { id: "fuchsia", className: "bg-fuchsia-500" },
  { id: "rose", className: "bg-rose-500" },
  { id: "amber", className: "bg-amber-500" },
];

const TIME_ZONES = [
  { value: "America/Los_Angeles", label: "Pacific — Los Angeles" },
  { value: "America/Denver", label: "Mountain — Denver" },
  { value: "America/Chicago", label: "Central — Chicago" },
  { value: "America/New_York", label: "Eastern — New York" },
];

const LANGUAGES = [
  { value: "en", label: "English (US)" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "tl", label: "Filipino" },
  { value: "es", label: "Español" },
];

const FISCAL_MONTHS = [
  { value: "1", label: "January" },
  { value: "4", label: "April" },
  { value: "7", label: "July" },
  { value: "10", label: "October" },
];

export default function WorkspaceSettingsPage() {
  const [name, setName] = React.useState("STAREP MEDIA");
  const [slug, setSlug] = React.useState("starep");
  const [brand, setBrand] = React.useState("emerald");
  const [address, setAddress] = React.useState(
    "1145 Mission Street, Suite 200\nSan Francisco, CA 94103\nUnited States",
  );
  const [tz, setTz] = React.useState("America/Los_Angeles");
  const [lang, setLang] = React.useState("en");
  const [fiscal, setFiscal] = React.useState("1");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsSection
        title="Identity"
        description="How clients and your team recognize this workspace."
      >
        <div className="divide-y divide-border">
          <SettingsRow label="Workspace name" htmlFor="ws-name">
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:max-w-md"
            />
          </SettingsRow>
          <SettingsRow
            label="URL slug"
            hint="Will become starep.odone.app once we ship custom domains."
            htmlFor="ws-slug"
          >
            <div className="flex w-full max-w-md items-center overflow-hidden rounded-lg border border-input bg-transparent">
              <span className="flex items-center gap-1 border-r border-input px-2.5 py-1.5 text-fluid-xs text-muted-foreground">
                <GlobeIcon className="size-3.5" />
                odone.app/
              </span>
              <Input
                id="ws-slug"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase())
                }
                className="h-8 border-0 focus-visible:ring-0"
              />
            </div>
          </SettingsRow>
          <SettingsRow label="Logo" hint="Square SVG or PNG, transparent bg.">
            <div className="flex items-center gap-3">
              <div className="grid size-14 place-items-center rounded-lg border border-border bg-muted/40 font-bold text-foreground">
                S
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Choose a logo file (mock)")}
              >
                <UploadIcon className="size-3.5" />
                Upload logo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Logo removed")}
              >
                Remove
              </Button>
            </div>
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Brand color"
        description="Used on share links, invoice headers, and the client-facing portal."
      >
        <div className="flex flex-wrap items-center gap-3">
          {BRAND_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={brand === c.id}
              aria-label={c.id}
              onClick={() => {
                setBrand(c.id);
              }}
              className={cn(
                "grid size-9 place-items-center rounded-full ring-2 ring-transparent transition-all duration-fast ease-standard",
                brand === c.id && "ring-foreground/40",
              )}
            >
              <span className={cn("size-7 rounded-full", c.className)} />
              {brand === c.id && (
                <CheckIcon className="absolute size-4 text-background" />
              )}
            </button>
          ))}
          <Badge variant="outline" className="ml-2 text-fluid-xs">
            Preview on{" "}
            <span
              className={cn(
                "ml-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-background",
                BRAND_COLORS.find((c) => c.id === brand)?.className,
              )}
            >
              starep.odone.app
            </span>
          </Badge>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Business address"
        description="Appears on invoices and tax documents."
      >
        <Textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={4}
          className="resize-y"
        />
      </SettingsSection>

      <SettingsSection
        title="Defaults"
        description="Applied to new orders, shooter calendars, and invoice numbering."
      >
        <div className="divide-y divide-border">
          <SettingsRow label="Default time zone" htmlFor="ws-tz">
            <Select
              value={tz}
              onValueChange={(v) => setTz(v as string)}
              items={TIME_ZONES}
            >
              <SelectTrigger id="ws-tz" className="w-full sm:max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_ZONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow label="Default language" htmlFor="ws-lang">
            <Select
              value={lang}
              onValueChange={(v) => setLang(v as string)}
              items={LANGUAGES}
            >
              <SelectTrigger id="ws-lang" className="w-full sm:max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label="Fiscal year starts"
            hint="Drives invoice period grouping."
            htmlFor="ws-fiscal"
          >
            <Select
              value={fiscal}
              onValueChange={(v) => setFiscal(v as string)}
              items={FISCAL_MONTHS}
            >
              <SelectTrigger id="ws-fiscal" className="w-full sm:max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FISCAL_MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsStickyFooter>
        <Button
          variant="ghost"
          onClick={() => toast.info("Changes discarded")}
        >
          Cancel
        </Button>
        <Button onClick={() => toast.success("Workspace updated")}>
          Save changes
        </Button>
      </SettingsStickyFooter>
    </div>
  );
}
