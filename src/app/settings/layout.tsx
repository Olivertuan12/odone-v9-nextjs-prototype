"use client";

// ============================================================================
// Odone — /settings layout
// ----------------------------------------------------------------------------
// Reuses the workspace chrome (SidebarProvider + EditorSidebar +
// EditorSiteHeader) so Settings sits inside the same shell as Orders / Files
// / Editor Queue. Inside the SidebarInset we render a two-column page body:
//   [ settings sidenav ~240px ] [ right pane with page header + children ]
//
// v13: a 250ms skeleton flash when the active subpage changes. Each path
// navigation runs a one-shot timer (cleaned up on unmount) that overlays the
// page header + first two card silhouettes. No measured times — a literal
// 250ms delay is enough to register "loading" between subpage swaps without
// dragging out real renders.
// ============================================================================

import * as React from "react";
import { usePathname } from "next/navigation";

import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [loadingShell, setLoadingShell] = React.useState(true);

  React.useEffect(() => {
    setLoadingShell(true);
    const t = setTimeout(() => setLoadingShell(false), 250);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <SidebarProvider
      className="h-svh"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <EditorSidebar variant="inset" />
      <SidebarInset>
        <EditorSiteHeader
          breadcrumb={[{ label: "Workspace" }, { label: "Settings" }]}
        />
        <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
          <aside
            aria-label="Settings navigation"
            className="hidden w-60 shrink-0 overflow-y-auto border-r border-border bg-background lg:block"
          >
            <SettingsNav />
          </aside>
          <main className="flex flex-1 flex-col overflow-hidden">
            {loadingShell ? (
              <SettingsShellSkeleton />
            ) : (
              <>
                <SettingsPageHeader />
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {children}
                </div>
              </>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SettingsShellSkeleton() {
  return (
    <>
      <div
        className="flex flex-col gap-2 border-b border-border px-6 py-5"
        aria-busy="true"
      >
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <section
              key={i}
              className="rounded-2xl border border-border bg-card"
            >
              <header className="flex flex-col gap-1 border-b border-border px-5 py-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </header>
              <div className="flex flex-col gap-4 px-5 py-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center sm:gap-6"
                  >
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-9 w-full max-w-md" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
