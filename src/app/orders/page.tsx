"use client";

import * as React from "react";
import { PackageIcon } from "lucide-react";

import { EditorSidebar } from "@/components/editor-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function OrdersRoute() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <EditorSidebar variant="inset" />
      <SidebarInset>
        <div className="flex h-svh flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="grid size-14 place-items-center rounded-3xl bg-card text-muted-foreground">
            <PackageIcon className="size-7" />
          </div>
          <h1 className="text-fluid-2xl font-semibold tracking-tight">Orders</h1>
          <p className="max-w-md text-fluid-sm text-muted-foreground">
            Order detail route is queued after Calendar. Coming soon.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
