"use client";

// ============================================================================
// Odone — /settings/appearance
// ----------------------------------------------------------------------------
// Theme picker (Dark / Light / System), accent swatch row, density toggle,
// sidebar-default-state toggle, and a small live-preview card showing a mini
// sidebar + content mock. The app is hardcoded to .dark on <html> for the
// preview, so theme selection is purely visual.
// ============================================================================

import * as React from "react";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { toast } from "sonner";

import { SettingsSection } from "@/components/settings/settings-section";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light" | "system";
type Density = "comfortable" | "compact";
type SidebarDefault = "open" | "collapsed";

const ACCENTS = [
  { id: "emerald", label: "Emerald", className: "bg-emerald-500" },
  { id: "violet", label: "Violet", className: "bg-violet-500" },
  { id: "sky", label: "Sky", className: "bg-sky-500" },
  { id: "amber", label: "Amber", className: "bg-amber-500" },
];

export default function AppearanceSettingsPage() {
  const [theme, setTheme] = React.useState<Theme>("dark");
  const [accent, setAccent] = React.useState("emerald");
  const [density, setDensity] = React.useState<Density>("comfortable");
  const [sidebarDefault, setSidebarDefault] =
    React.useState<SidebarDefault>("open");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <SettingsSection
        title="Theme"
        description="Affects the in-app surface. System follows your OS preference."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <ThemeCard
            id="dark"
            label="Dark"
            description="Best for production work at night."
            active={theme === "dark"}
            onSelect={() => {
              setTheme("dark");
              toast.info("Theme: Dark (preview only)");
            }}
            preview={
              <div className="flex items-stretch gap-1.5">
                <div className="w-6 rounded-sm bg-foreground/10" />
                <div className="flex-1 rounded-sm bg-foreground/5" />
              </div>
            }
            icon={MoonIcon}
          />
          <ThemeCard
            id="light"
            label="Light"
            description="Bright surface, higher contrast."
            active={theme === "light"}
            onSelect={() => {
              setTheme("light");
              toast.info("Theme: Light (preview only)");
            }}
            preview={
              <div className="flex items-stretch gap-1.5">
                <div className="w-6 rounded-sm bg-foreground/40" />
                <div className="flex-1 rounded-sm bg-background ring-1 ring-foreground/20" />
              </div>
            }
            icon={SunIcon}
          />
          <ThemeCard
            id="system"
            label="System"
            description="Follow your operating system."
            active={theme === "system"}
            onSelect={() => {
              setTheme("system");
              toast.info("Theme: System (preview only)");
            }}
            preview={
              <div className="flex items-stretch gap-1.5">
                <div className="w-6 rounded-sm bg-gradient-to-b from-foreground/40 to-foreground/10" />
                <div className="flex-1 rounded-sm bg-gradient-to-b from-background to-foreground/5" />
              </div>
            }
            icon={MonitorIcon}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Accent color"
        description="Used for primary buttons, active nav, and selection chips."
      >
        <div className="flex flex-wrap items-center gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={accent === a.id}
              aria-label={a.label}
              onClick={() => {
                setAccent(a.id);
                toast.info(`Accent: ${a.label}`);
              }}
              className={cn(
                "group relative grid size-9 place-items-center rounded-full ring-2 ring-transparent transition-all duration-fast ease-standard",
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
      </SettingsSection>

      <SettingsSection
        title="Density"
        description="Affects table row heights, card padding, and dialog spacing."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectionCard
            label="Comfortable"
            description="Default. More breathing room around cards and rows."
            active={density === "comfortable"}
            onSelect={() => setDensity("comfortable")}
            preview={
              <div className="flex flex-col gap-2">
                <div className="h-4 rounded-sm bg-foreground/10" />
                <div className="h-4 rounded-sm bg-foreground/10" />
                <div className="h-4 rounded-sm bg-foreground/10" />
              </div>
            }
          />
          <SelectionCard
            label="Compact"
            description="Higher information density for power users."
            active={density === "compact"}
            onSelect={() => setDensity("compact")}
            preview={
              <div className="flex flex-col gap-1">
                <div className="h-2.5 rounded-sm bg-foreground/10" />
                <div className="h-2.5 rounded-sm bg-foreground/10" />
                <div className="h-2.5 rounded-sm bg-foreground/10" />
                <div className="h-2.5 rounded-sm bg-foreground/10" />
                <div className="h-2.5 rounded-sm bg-foreground/10" />
              </div>
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Sidebar default state"
        description="What you see when you open Odone in a new tab."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectionCard
            label="Open"
            description="Full sidebar with labels visible."
            active={sidebarDefault === "open"}
            onSelect={() => setSidebarDefault("open")}
            preview={
              <div className="flex h-16 gap-2">
                <div className="w-12 rounded-sm bg-foreground/15" />
                <div className="flex-1 rounded-sm bg-foreground/5" />
              </div>
            }
          />
          <SelectionCard
            label="Collapsed"
            description="Icons-only rail; expands on hover."
            active={sidebarDefault === "collapsed"}
            onSelect={() => setSidebarDefault("collapsed")}
            preview={
              <div className="flex h-16 gap-2">
                <div className="w-4 rounded-sm bg-foreground/15" />
                <div className="flex-1 rounded-sm bg-foreground/5" />
              </div>
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Live preview"
        description="A miniature of how Odone will look with the current selection."
      >
        <LivePreview
          accent={ACCENTS.find((a) => a.id === accent)!.className}
          dense={density === "compact"}
          collapsed={sidebarDefault === "collapsed"}
        />
      </SettingsSection>
    </div>
  );
}

function ThemeCard({
  label,
  description,
  active,
  onSelect,
  preview,
  icon: Icon,
}: {
  id: string;
  label: string;
  description: string;
  active: boolean;
  onSelect: () => void;
  preview: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors duration-fast ease-standard hover:bg-muted/40",
        active ? "border-foreground/30 ring-2 ring-foreground/15" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-fluid-sm font-medium text-foreground">
            {label}
          </span>
        </div>
        {active && (
          <span className="grid size-4 place-items-center rounded-full bg-foreground text-background">
            <CheckIcon className="size-3" />
          </span>
        )}
      </div>
      <div className="h-16 rounded-lg border border-border bg-muted/40 p-2">
        {preview}
      </div>
      <p className="text-fluid-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function SelectionCard({
  label,
  description,
  active,
  onSelect,
  preview,
}: {
  label: string;
  description: string;
  active: boolean;
  onSelect: () => void;
  preview: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors duration-fast ease-standard hover:bg-muted/40",
        active ? "border-foreground/30 ring-2 ring-foreground/15" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-fluid-sm font-medium text-foreground">
          {label}
        </span>
        {active && (
          <span className="grid size-4 place-items-center rounded-full bg-foreground text-background">
            <CheckIcon className="size-3" />
          </span>
        )}
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        {preview}
      </div>
      <p className="text-fluid-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function LivePreview({
  accent,
  dense,
  collapsed,
}: {
  accent: string;
  dense: boolean;
  collapsed: boolean;
}) {
  return (
    <div className="flex h-44 overflow-hidden rounded-xl border border-border bg-background">
      <div
        className={cn(
          "flex flex-col gap-1.5 border-r border-border bg-card/80 transition-all",
          collapsed ? "w-10 p-1.5" : "w-32 p-2",
        )}
      >
        <div className="flex items-center gap-1.5">
          <div className={cn("size-4 rounded", accent)} />
          {!collapsed && (
            <span className="text-[10px] font-semibold text-foreground">
              Odone
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-col gap-1">
          {["Orders", "Calendar", "Files", "Editor Queue"].map((it, i) => (
            <div
              key={it}
              className={cn(
                "flex items-center gap-1.5 rounded-md",
                dense ? "px-1 py-0.5" : "px-1.5 py-1",
                i === 0 && "bg-accent",
              )}
            >
              <span className="size-2 rounded-sm bg-foreground/30" />
              {!collapsed && (
                <span
                  className={cn(
                    "truncate text-[10px]",
                    i === 0 ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {it}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-[11px] font-medium text-foreground">Orders</div>
          <div className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold text-background", accent)}>
            + New
          </div>
        </div>
        <div className={cn("flex flex-col gap-1.5", dense ? "p-2" : "p-3")}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-md border border-border bg-card",
                dense ? "px-2 py-1" : "px-2 py-1.5",
              )}
            >
              <div className={cn("size-2 rounded-full", accent)} />
              <div className="h-2 flex-1 rounded-sm bg-foreground/10" />
              <div className="h-2 w-8 rounded-sm bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
