"use client";

// ============================================================================
// Odone — /orders/[orderId] dynamic route
// ----------------------------------------------------------------------------
// Next.js 16 App Router page that renders the OrderDetailPage inside the
// standard SidebarProvider + EditorSidebar + SidebarInset shell with an
// EditorSiteHeader breadcrumb of "Workspace / Orders / {display_number}".
//
// Next 16 quirks:
//   - `params` is a Promise — we unwrap it with React.use().
//   - OrderDetailPage internally calls useSearchParams() for the ?tab= sync,
//     so we wrap it in <Suspense> per the App Router contract.
// ============================================================================

import * as React from "react";

import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { OrderDetailPage } from "@/components/orders/order-detail-page";
import { findOrderById } from "@/components/orders/orders-data";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type OrderRouteParams = { orderId: string };

export default function OrderDetailRoute({
  params,
}: {
  params: Promise<OrderRouteParams>;
}) {
  const { orderId } = React.use(params);
  const order = findOrderById(orderId);

  const lastCrumb = order
    ? `Order #${order.display_number}`
    : `Order ${orderId}`;

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
            { label: "Orders", href: "/orders" },
            { label: lastCrumb },
          ]}
        />
        <React.Suspense fallback={<OrderDetailFallback />}>
          <OrderDetailPage orderId={orderId} />
        </React.Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}

function OrderDetailFallback() {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="space-y-2">
        <div className="mx-auto size-8 animate-pulse rounded-full bg-muted" />
        <p className="text-fluid-sm text-muted-foreground">Loading order…</p>
      </div>
    </div>
  );
}
