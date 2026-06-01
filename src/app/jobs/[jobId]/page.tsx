"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { JobDetailPage } from "@/components/jobs/job-detail-page";
import { getJob } from "@/components/jobs/jobs-data";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function JobDetailRoute() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const job = getJob(jobId);

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
            { label: job?.title ?? jobId },
          ]}
        />
        <JobDetailPage jobId={jobId} />
      </SidebarInset>
    </SidebarProvider>
  );
}
