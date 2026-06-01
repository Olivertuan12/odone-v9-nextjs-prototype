"use client";

// ============================================================================
// Odone — Order Detail Page composition
// ----------------------------------------------------------------------------
// Full /orders/[orderId] page body. Wires OrderDetailHeader to the four tab
// content panels (Overview / Review / Delivery / Chat) and syncs the active
// tab with the URL `?tab=` search param.
//
// DESIGN.md compliance:
//   §1 radius — not-found Card uses rounded-2xl; back link uses rounded-full
//   §2 button — secondary outline Back link with .press
//   §3 icons  — CalendarDays for "Back to Calendar", CircleAlert for empty state
//   §4 date   — no relative time; nothing rendered here, tabs own date strings
//   §5 color  — semantic tokens only; no zinc / no hex
//   §8 layout — full-height flex column, header shrink-0, body flex-1 min-h-0
// ============================================================================

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDaysIcon, CircleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { findOrderById, type OrderStatus } from "@/components/orders/orders-data";
import {
  OrderDetailHeader,
  type OrderDetailTab,
} from "@/components/orders/order-detail-header";
import { OrderOverviewTab } from "@/components/orders/order-overview-tab";
// OrderReviewTab no longer used as a tab — moved into DeliverableReviewModal,
// which is opened from the Overview tab's deliverable list (v2 sync).
import { OrderDeliveryTab } from "@/components/orders/order-delivery-tab";
import { OrderChatTab } from "@/components/orders/order-chat-tab";

// ============================================================================
// Tab key guard — keeps URL `?tab=` honest.
// ============================================================================
const TAB_KEYS: readonly OrderDetailTab[] = [
  "overview",
  "delivery",
  "chat",
];

function isOrderDetailTab(v: string | null | undefined): v is OrderDetailTab {
  return !!v && (TAB_KEYS as readonly string[]).includes(v);
}

// ============================================================================
// Props
// ============================================================================
export type OrderDetailPageProps = {
  orderId: string;
};

// ============================================================================
// Component
// ============================================================================
export function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const order = findOrderById(orderId);

  // ----- Tab state synced with URL ?tab= --------------------------------
  const urlTab = searchParams.get("tab");
  const initialTab: OrderDetailTab = isOrderDetailTab(urlTab)
    ? urlTab
    : "overview";
  const [activeTab, setActiveTab] = React.useState<OrderDetailTab>(initialTab);

  // Keep local state in sync if user navigates back/forward in browser.
  React.useEffect(() => {
    if (isOrderDetailTab(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    // We only react to URL changes here — never to activeTab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const handleTabChange = React.useCallback(
    (tab: OrderDetailTab) => {
      setActiveTab(tab);
      router.replace(`/orders/${orderId}?tab=${tab}`, { scroll: false });
    },
    [orderId, router],
  );

  // ----- Header action handlers (placeholders for the mockup) -----------
  const handleShare = React.useCallback(() => {
    toast.info("Opening share dialog");
  }, []);

  const handleMarkComplete = React.useCallback(() => {
    toast.success("Order marked complete");
  }, []);

  // ----- Loading flash → not-found ------------------------------------
  // When the lookup misses, show a brief skeleton silhouette so the page
  // doesn't pop straight into an error card. 200ms is enough for the
  // user to register "loading" rather than "broken" without dragging out
  // a real not-found case. Stable timeout literal — no measured times.
  const [showSkeletonForNotFound, setShowSkeletonForNotFound] =
    React.useState(true);
  React.useEffect(() => {
    if (order) return;
    const t = setTimeout(() => setShowSkeletonForNotFound(false), 200);
    return () => clearTimeout(t);
  }, [order]);

  if (!order) {
    if (showSkeletonForNotFound) {
      return <OrderDetailSkeleton />;
    }
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md rounded-2xl border-border bg-card text-center">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-10">
            <span className="flex size-12 items-center justify-center rounded-full bg-rose-500/10">
              <CircleAlertIcon className="size-5 text-rose-400" />
            </span>
            <div className="space-y-1">
              <h2 className="text-fluid-lg font-semibold text-foreground">
                Order not found
              </h2>
              <p className="text-fluid-sm text-muted-foreground">
                We couldn&rsquo;t find an order with ID{" "}
                <code className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[0.85em] text-foreground">
                  {orderId}
                </code>
                .
              </p>
            </div>
            {/* base-ui Button uses `render` (not Radix's `asChild`). When
                rendering as an anchor, opt out of `nativeButton` semantics. */}
            <Button
              variant="outline"
              nativeButton={false}
              className="rounded-full press gap-1.5"
              render={<Link href="/calendar" />}
            >
              <CalendarDaysIcon className="size-4" />
              Back to Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // v12.3: pipeline-derived status. OrderOverviewTab pushes the current
  // status up via `onPipelineStatusChange` whenever pipeline state shifts
  // (upload confirm, assignments, …). We overlay it on the seed before
  // passing to the header so the badge advances live with the demo.
  const [derivedStatus, setDerivedStatus] = React.useState<OrderStatus | null>(null);
  const effectiveOrder = derivedStatus
    ? { ...order, status: derivedStatus }
    : order;

  // ----- Tab content router --------------------------------------------
  const tabContent = (() => {
    switch (activeTab) {
      case "overview":
        return (
          <OrderOverviewTab
            order={order}
            onPipelineStatusChange={setDerivedStatus}
          />
        );
      case "delivery":
        return <OrderDeliveryTab order={order} />;
      case "chat":
        return <OrderChatTab order={order} />;
    }
  })();

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden",
      )}
    >
      <OrderDetailHeader
        order={effectiveOrder}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onShare={handleShare}
        onMarkComplete={handleMarkComplete}
        className="shrink-0"
      />
      {/* v11 fix: tab body must scroll independently. Was overflow-hidden,
          which clipped long sections (Production files, Project items) and
          the user reported the page didn't scroll. */}
      <div className="flex-1 min-h-0 overflow-y-auto">{tabContent}</div>
    </div>
  );
}

// ============================================================================
// Skeleton — silhouette of OrderDetailHeader (h2 + subline + pills row) +
// the 3-pane body. Matches the real layout's vertical rhythm so the swap
// to real content feels stable instead of "page resized".
// ============================================================================
function OrderDetailSkeleton() {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden",
      )}
      aria-busy="true"
    >
      <div className="shrink-0 border-b border-border bg-card/40 px-6 py-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-md" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden px-6 py-6">
        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
            <Skeleton className="mt-3 h-9 w-full rounded-md" />
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:col-span-2">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
