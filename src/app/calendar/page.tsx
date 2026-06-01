"use client";

import * as React from "react";

import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { CalendarPage } from "@/components/calendar/calendar-page";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function CalendarRoute() {
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
          breadcrumb={[
            { label: "Workspace" },
            { label: "Calendar" },
          ]}
        />
        {/* CalendarPage calls useSearchParams() to hydrate view + filter
            state from the URL — Next 16 App Router requires a Suspense
            boundary around any client component that reads search params. */}
        <React.Suspense fallback={<CalendarFallback />}>
          <CalendarPage />
        </React.Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}

function CalendarFallback() {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="space-y-2">
        <div className="mx-auto size-8 animate-pulse rounded-full bg-muted" />
        <p className="text-fluid-sm text-muted-foreground">Loading calendar…</p>
      </div>
    </div>
  );
}
