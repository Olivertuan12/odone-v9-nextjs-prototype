"use client";

import * as React from "react";

import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { JobsPage } from "@/components/jobs/jobs-page";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function JobsRoute() {
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
          breadcrumb={[{ label: "Workspace" }, { label: "Jobs" }]}
        />
        <JobsPage />
      </SidebarInset>
    </SidebarProvider>
  );
}
