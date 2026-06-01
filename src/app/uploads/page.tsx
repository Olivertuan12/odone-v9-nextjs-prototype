"use client";

import * as React from "react";

import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { UploadsPage } from "@/components/uploads/uploads-page";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function UploadsRoute() {
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
        {/* Global top bar — same shell as Editor Queue, breadcrumb adapted */}
        <EditorSiteHeader
          breadcrumb={[
            { label: "Workspace" },
            { label: "Files" },
          ]}
        />
        <React.Suspense
          fallback={
            <div className="flex h-[calc(100svh-var(--header-height))] items-center justify-center text-sm text-muted-foreground">
              Loading files…
            </div>
          }
        >
          <UploadsPage />
        </React.Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
