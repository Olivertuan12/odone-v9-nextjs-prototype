"use client";

// ============================================================================
// Odone — /chat route
// ----------------------------------------------------------------------------
// Slack-style chat surface. Lives inside the standard app shell
// (SidebarProvider + EditorSidebar + EditorSiteHeader + SidebarInset) — same
// pattern as /orders/[orderId]/page.tsx. The body is delegated to ChatPage,
// which reads ?to= / ?ch= and renders the 2-column layout.
//
// ChatPage internally calls useSearchParams(), so the App Router contract
// requires us to wrap it in <Suspense>.
// ============================================================================

import * as React from "react";

import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { ChatPage } from "@/components/chat/chat-page";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ChatRoute() {
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
            { label: "Chat" },
          ]}
        />
        <React.Suspense fallback={<ChatFallback />}>
          <ChatPage />
        </React.Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ChatFallback() {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="space-y-2">
        <div className="mx-auto size-8 animate-pulse rounded-full bg-muted" />
        <p className="text-fluid-sm text-muted-foreground">Loading chat…</p>
      </div>
    </div>
  );
}
