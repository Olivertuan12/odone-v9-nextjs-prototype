"use client";

import * as React from "react";
import { X as XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { OrderReviewTab } from "@/components/orders/order-review-tab";
import { type Order } from "@/components/orders/orders-data";

/**
 * DeliverableReviewModal — full-screen surface for the video review +
 * feedback workspace. v2 replaces the in-page "Review" tab: triggered from
 * the Overview tab's deliverable list so the file feedback flow lives in
 * a focused modal rather than crowding the order detail page.
 *
 * Inside, it reuses the existing OrderReviewTab which already wires
 * VideoReviewPlayer + FeedbackTimeline + deliverable selector. The
 * `initialDeliverableId` prop lets callers focus the modal on a
 * specific deliverable; the user can still switch via the selector strip.
 */
export type DeliverableReviewModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: Order;
  initialDeliverableId?: string;
};

export function DeliverableReviewModal({
  open,
  onOpenChange,
  order,
  initialDeliverableId,
}: DeliverableReviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Override base-ui Dialog's default centered max-w-lg sizing so the
          // review modal takes the whole viewport (minus 8px gutter).
          "!max-w-none !w-[calc(100vw-1rem)] !h-[calc(100vh-1rem)] !translate-x-0 !translate-y-0 !left-2 !top-2",
          "flex flex-col gap-0 overflow-hidden p-0",
          "rounded-3xl border border-border bg-background shadow-modal",
          "data-open:duration-base data-open:ease-spring",
          "data-closed:duration-fast data-closed:ease-standard",
        )}
      >
        {/* Slim modal header — title + close. Detailed controls live inside
            OrderReviewTab (deliverable selector, version selector, approve). */}
        <div className="glass-strong flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 lg:px-6">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-fluid-base font-semibold tracking-tight">
              Review files · {order.property_address ?? "Order"}
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-fluid-xs text-muted-foreground">
              #{order.display_number} · {order.client_name}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close review"
            className="press grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Body — OrderReviewTab fills the remaining height */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <OrderReviewTab
            order={order}
            initialDeliverableId={initialDeliverableId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DeliverableReviewModal;
