"use client";

// ============================================================================
// Odone — Settings page header (right pane)
// ----------------------------------------------------------------------------
// Looks up the active page meta from SETTINGS_PAGE_META and renders a title +
// one-line description. Subpages don't need to know their own title — the URL
// drives it, which keeps the surface consistent.
// ============================================================================

import * as React from "react";
import { usePathname } from "next/navigation";

import { SETTINGS_PAGE_META } from "@/components/settings/settings-nav";

export function SettingsPageHeader() {
  const pathname = usePathname() ?? "";
  const meta =
    SETTINGS_PAGE_META[pathname] ??
    Object.entries(SETTINGS_PAGE_META).find(([href]) =>
      pathname.startsWith(href),
    )?.[1] ?? {
      title: "Settings",
      description: "",
    };

  return (
    <div className="flex flex-col gap-1 border-b border-border px-6 py-5">
      <h1 className="text-fluid-lg font-semibold tracking-tight text-foreground">
        {meta.title}
      </h1>
      {meta.description && (
        <p className="text-fluid-sm text-muted-foreground">
          {meta.description}
        </p>
      )}
    </div>
  );
}
