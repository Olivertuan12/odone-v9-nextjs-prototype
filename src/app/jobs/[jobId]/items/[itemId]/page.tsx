"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { ItemVersionPage } from "@/components/jobs/item-version-page";
import { getItem, getJob } from "@/components/jobs/jobs-data";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ItemVersionRoute() {
  const params = useParams<{ jobId: string; itemId: string }>();
  const job = getJob(params.jobId);
  const item = getItem(params.itemId);

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
            { label: "Jobs", href: "/jobs" },
            { label: job?.title ?? params.jobId, href: `/jobs/${params.jobId}` },
            { label: item?.title ?? params.itemId },
          ]}
        />
        <ItemVersionPage jobId={params.jobId} itemId={params.itemId} />
      </SidebarInset>
    </SidebarProvider>
  );
}
