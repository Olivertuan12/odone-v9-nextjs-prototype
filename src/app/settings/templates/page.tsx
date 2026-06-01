"use client";

// ============================================================================
// Odone — /settings/templates
// ----------------------------------------------------------------------------
// Brief templates the team injects into new assignments. Tabs: Photos /
// Video / Vendor handoff. Each tab has a markdown-style editable Textarea
// plus preset chips that splice their snippet into the active brief. A side
// rail toggles "default for new assignments". Saves toast-mocked.
// ============================================================================

import * as React from "react";
import {
  BookTemplateIcon,
  ImageIcon,
  ListChecksIcon,
  PlayIcon,
  SaveIcon,
  Wand2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type TemplateKey = "photos" | "video" | "vendor";

const TEMPLATES: Record<
  TemplateKey,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    body: string;
    presets: { label: string; snippet: string }[];
  }
> = {
  photos: {
    label: "Photos",
    icon: ImageIcon,
    body: `# Photo brief — STAREP MEDIA

**Style:** Bright, airy, warm whites. Light HDR — keep windows readable.

**Shot list**
- Wide of every room (1 hero + 1 alt)
- Kitchen detail — countertops + appliances
- Primary bath + secondary bath — wide + detail
- Outdoor: front elevation (golden hour), backyard
- Twilight: 4-6 frames once interior lights are warm

**Delivery**
- 25-35 stills, 3000×2000 minimum, sRGB JPEG
- Vertical orientations welcome for IG carousel
- Drop into the order's Final folder; tag "photo" on each file`,
    presets: [
      { label: "Add twilight bonus row", snippet: "- Twilight: 2 wide exteriors + 1 hero of front elevation" },
      { label: "Add detail-shot block", snippet: "- Detail: door handles, sconces, faucet hardware, art" },
      { label: "Set delivery deadline 48h", snippet: "Delivery target: within 48h of shoot." },
    ],
  },
  video: {
    label: "Video",
    icon: PlayIcon,
    body: `# Video brief — Standard listing reel

**Length:** 60-90s vertical (9:16) + 30s horizontal (16:9) cut.

**Pacing**
- Soft open: exterior pullback
- Walkthrough: kitchen → living → primary → outdoor
- Hero detail: 1 product-style shot per major room
- Close on agent-on-camera CTA (when included)

**Audio**
- Licensed track from STAREP shared library
- Duck under any agent VO by -8 dB

**Delivery**
- H.264 MP4, 1080p reference + 4K master
- Captions on as separate .srt + burned-in for IG`,
    presets: [
      { label: "Add drone B-roll callout", snippet: "- Insert 2 drone reveals between exterior and living" },
      { label: "Add agent-on-camera intro", snippet: "- Open with 5s agent-on-camera intro at front door" },
      { label: "Add IG carousel cut", snippet: "Deliver 3 still frames at 0:00, 0:15, 0:40 for carousel." },
    ],
  },
  vendor: {
    label: "Vendor handoff",
    icon: BookTemplateIcon,
    body: `# Vendor brief — external edit

**Order:** {{order.display_number}} · {{order.property_address}}
**Due back to Odone:** {{order.editor_due_at}}

**Files**
- RAW package: {{order.raw_link}}
- Reference deck: {{order.reference_link}}

**Edit notes**
- Match STAREP color profile (LUT in shared folder)
- 25-35 stills + 1 listing reel
- Watermark "STAREP" lower-right at 30% opacity on previews only

**Communication**
- Reply in this thread, not email
- Acknowledge receipt within 4h`,
    presets: [
      { label: "Add color match note", snippet: "- Color-match the lobby tone in reference image 03" },
      { label: "Add NDA acknowledgement", snippet: "Acknowledge our standard NDA (link) before downloading." },
      { label: "Add invoice handle", snippet: "Invoice STAREP via Stripe with PO matching order #." },
    ],
  },
};

export default function TemplatesSettingsPage() {
  const [active, setActive] = React.useState<TemplateKey>("photos");
  const [drafts, setDrafts] = React.useState<Record<TemplateKey, string>>({
    photos: TEMPLATES.photos.body,
    video: TEMPLATES.video.body,
    vendor: TEMPLATES.vendor.body,
  });
  const [defaultMap, setDefaultMap] = React.useState<Record<TemplateKey, boolean>>({
    photos: true,
    video: true,
    vendor: false,
  });

  const current = TEMPLATES[active];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <SettingsSection
        title="Brief templates"
        description="Reusable briefs your team can attach to any assignment. Tokens like {{order.display_number}} resolve when the brief is used."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("New blank template created")}
          >
            <BookTemplateIcon className="size-3.5" />
            New template
          </Button>
        }
      >
        <Tabs
          value={active}
          onValueChange={(v) => setActive(v as TemplateKey)}
        >
          <TabsList>
            {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => {
              const Icon = TEMPLATES[k].icon;
              return (
                <TabsTrigger key={k} value={k}>
                  <Icon className="size-3.5" />
                  {TEMPLATES[k].label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
            <TabsContent key={k} value={k} className="pt-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-fluid-xs">
                        Markdown
                      </Badge>
                      <span className="text-fluid-xs text-muted-foreground">
                        Tokens auto-fill at send time.
                      </span>
                    </div>
                    <span className="text-fluid-xs text-muted-foreground">
                      {drafts[k].length} chars
                    </span>
                  </div>
                  <Textarea
                    value={drafts[k]}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [k]: e.target.value }))
                    }
                    className="min-h-[360px] resize-y font-mono text-[12px] leading-relaxed"
                  />
                </div>

                <aside className="flex flex-col gap-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Wand2Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-fluid-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Preset snippets
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {current.presets.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setDrafts((prev) => ({
                              ...prev,
                              [k]: prev[k] + "\n" + p.snippet,
                            }));
                            toast.info(`Inserted: ${p.label}`);
                          }}
                          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-fluid-xs text-foreground hover:border-foreground/30 hover:bg-muted/40"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-fluid-sm font-medium text-foreground">
                        Use by default
                      </span>
                      <span className="text-fluid-xs text-muted-foreground">
                        Auto-attach this brief to any new {current.label.toLowerCase()} assignment.
                      </span>
                    </div>
                    <Switch
                      checked={defaultMap[k]}
                      onCheckedChange={(v) =>
                        setDefaultMap((prev) => ({ ...prev, [k]: v }))
                      }
                      className="ml-auto"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <ListChecksIcon className="size-3.5 text-muted-foreground" />
                      <span className="text-fluid-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Used in
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-fluid-xs text-muted-foreground">
                      <li>· {k === "vendor" ? "Send to vendor" : "Assign editor"} step</li>
                      <li>· New Project wizard · Brief sub-step</li>
                      <li>· Order detail · Assign tab</li>
                    </ul>
                  </div>

                  <Button
                    className="justify-center"
                    onClick={() => toast.success(`${current.label} brief saved`)}
                  >
                    <SaveIcon className="size-3.5" />
                    Save {current.label.toLowerCase()} brief
                  </Button>
                </aside>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </SettingsSection>
    </div>
  );
}
