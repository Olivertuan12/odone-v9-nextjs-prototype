"use client";

// ============================================================================
// Odone — Order Detail Header
// ----------------------------------------------------------------------------
// Sticky page header for /orders/[orderId]. Editor-Queue style:
//   row 1 → H1 (property address) + stats subtitle + actions (right)
//   row 2 → segmented tabs (Overview / Review / Delivery / Chat) + Open files
//
// DESIGN.md compliance:
//   §1 radius — rounded-full on every button + segmented item
//                rounded-2xl never applied here (this is page chrome, not a card)
//   §2 button — outline + ghost variants only, .press on every clickable
//   §3 icons — Share2, MoreHorizontal, ExternalLink, Copy, Check, HardDrive
//              (per locked mapping; NO Share / MoreVertical / Trash)
//   §4 date  — formatTimeRange (no relative time)
//   §5 color — status pill uses statusTone() (semantic /10 or /15 only)
//   §8 layout — sticky top-0 glass header (caller can opt into sticky)
// ============================================================================

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  HardDriveIcon,
  MoreHorizontalIcon,
  Share2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import {
  formatTimeRange,
  statusLabel,
  statusTone,
  type Order,
} from "@/components/orders/orders-data";

// ============================================================================
// Tab key — exported so callers can keep typed state.
// ============================================================================
// v2: Review tab removed — feedback video now opens as a modal from the
// Overview tab's deliverable list. Match real Odone 3-tab structure.
export type OrderDetailTab = "overview" | "delivery" | "chat";

const TABS: { key: OrderDetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "delivery", label: "Delivery" },
  { key: "chat", label: "Chat" },
];

// ============================================================================
// Props
// ============================================================================
export type OrderDetailHeaderProps = {
  order: Order;
  activeTab: OrderDetailTab;
  onTabChange: (t: OrderDetailTab) => void;
  /** Optional override; defaults to a toast for the mockup. */
  onShare?: () => void;
  /** Optional override; defaults to a toast for the mockup. */
  onMarkComplete?: () => void;
  /** When true, adds sticky + glass classes (caller decides scroll context). */
  sticky?: boolean;
  className?: string;
};

// ============================================================================
// Component
// ============================================================================
export function OrderDetailHeader({
  order,
  activeTab,
  onTabChange,
  onShare,
  onMarkComplete,
  sticky = false,
  className,
}: OrderDetailHeaderProps) {
  const handleShare = React.useCallback(() => {
    if (onShare) {
      onShare();
      return;
    }
    toast.success("Share link ready", {
      description: order.property_address,
    });
  }, [onShare, order.property_address]);

  const handleMarkComplete = React.useCallback(() => {
    if (onMarkComplete) {
      onMarkComplete();
      return;
    }
    toast.success("Marked complete", {
      description: `#${order.display_number} archived`,
    });
  }, [onMarkComplete, order.display_number]);

  const handleCopyOrderId = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      toast.success("Order ID copied", { description: order.id });
    } catch {
      toast.error("Couldn't copy order ID");
    }
  }, [order.id]);

  const handleCopyAddress = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(order.property_address);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy address");
    }
  }, [order.property_address]);

  // v11: context-aware back link. Reads ?from= so the back affordance points
  // to whatever surface launched this detail page. Defaults to /orders.
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const back = React.useMemo(() => {
    switch (fromParam) {
      case "calendar":
        return { href: "/calendar", label: "Back to Calendar" };
      case "editor":
      case "editor-queue":
        return { href: "/", label: "Back to Editor Queue" };
      case "uploads":
      case "files":
        return {
          href: `/uploads?orderId=${encodeURIComponent(order.id)}`,
          label: "Back to Files",
        };
      default:
        return { href: "/orders", label: "Back to Orders" };
    }
  }, [fromParam, order.id]);

  return (
    <header
      className={cn(
        "flex flex-col gap-2 border-b border-border px-4 lg:px-6 pt-2 lg:pt-2.5 pb-0",
        sticky && "sticky top-0 z-30 glass",
        className,
      )}
    >
      {/* ─── Row 0: Back (bigger) + Share + Options — clean top toolbar ─── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={back.href}
          className="press inline-flex h-8 items-center gap-1.5 -ml-2 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:bg-muted/60 hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {back.label}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="press !rounded-full"
          >
            <Share2Icon className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="More actions"
                  className="press !rounded-full"
                />
              }
            >
              <MoreHorizontalIcon className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
              <DropdownMenuItem onClick={handleMarkComplete}>
                <CheckIcon className="size-4" />
                Mark complete
              </DropdownMenuItem>
              {order.google_calendar_link && (
                <DropdownMenuItem
                  render={
                    <a
                      href={order.google_calendar_link}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <ExternalLinkIcon className="size-4" />
                  Open in Google Calendar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyAddress}>
                <CopyIcon className="size-4" />
                Copy address
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyOrderId}>
                <CopyIcon className="size-4" />
                Copy order ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Row 1: Title block — no inline actions (moved to Row 0) ─── */}
      <div className="flex min-w-0 flex-col gap-1">
        <h1
          className="truncate text-fluid-3xl font-bold tracking-tight text-foreground"
          title={order.property_address}
        >
          {order.property_address}
        </h1>

        {/* Stats line 1: #N · client · status pill */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="font-mono">#{order.display_number}</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="truncate text-foreground/80">
            {order.client_name}
          </span>
          {order.client_company && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="truncate">{order.client_company}</span>
            </>
          )}
          <Badge
            variant="secondary"
            className={cn(
              "ml-1 h-5 rounded-full border-0 px-2 py-0 text-[10.5px] font-semibold uppercase tracking-wide",
              statusTone(order.status),
            )}
          >
            {statusLabel(order.status)}
          </Badge>
        </div>

        {/* Stats line 2: time range · shooter */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {formatTimeRange(order.scheduled_at, order.scheduled_end)}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="flex items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarImage
                src={`https://i.pravatar.cc/64?u=${order.assigned_shooter}`}
                alt={order.shooter_name}
              />
              <AvatarFallback className="text-[9px]">
                {order.shooter_initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-foreground/80">
              {order.shooter_name}
            </span>
          </span>
          {order.weather_emoji && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span aria-hidden>{order.weather_emoji}</span>
            </>
          )}
        </div>
      </div>

      {/* ─── Row 2: Underline tabs + Open files ─────────────────────────
          v11: removed duplicate border-b (header outer already provides the
          bottom edge). Active tab indicator floats just above that edge.
          Added top spacing so tabs breathe under the title block. */}
      <div className="mt-1 flex items-center gap-1">
        <nav
          role="tablist"
          aria-label="Order detail sections"
          className="flex items-center gap-1"
        >
          {TABS.map((t) => {
            const isActive = t.key === activeTab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(t.key)}
                className={cn(
                  "press relative -mb-px h-9 px-3 text-xs font-semibold transition-colors duration-fast ease-standard",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {/* Active underline indicator */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-opacity duration-fast ease-standard",
                    isActive ? "bg-foreground opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </nav>

        <Link
          href={`/uploads?orderId=${encodeURIComponent(order.id)}&from=order`}
          className="press ml-auto mb-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-xs font-semibold text-muted-foreground transition-colors duration-fast ease-standard hover:bg-muted hover:text-foreground"
        >
          <HardDriveIcon className="size-3.5" />
          <span className="hidden sm:inline">Open files</span>
        </Link>
      </div>
    </header>
  );
}
