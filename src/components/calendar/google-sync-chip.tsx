"use client";

// ============================================================================
// Odone — GoogleSyncChip
// ----------------------------------------------------------------------------
// Pill button shown in the Calendar header indicating Google Calendar
// connection + sync state. Critical because all orders enter Odone exclusively
// through Google Calendar import. Click behavior:
//   - disconnected → fires onConnect immediately (no dropdown)
//   - connected   → opens dropdown with Sync now / Resubscribe / Clear cache /
//                   Disconnect actions and a header row of last-sync date.
//
// Mirrors /Users/admin/Documents/Odone-v8-main/src/pages/Calendar.tsx sync
// flow but stripped to a presentational mock (props-driven, no Supabase).
//
// DESIGN.md compliance:
//   §1 — rounded-full pill, h-9, dropdown content rounded-xl
//   §2 — .press feedback, secondary border style
//   §3 — Globe, ChevronDown, Loader2, RefreshCw, Bell, Trash2, X icons (size-3.5)
//   §4 — formatDateUS + formatTimeUS (no relative drift beyond "Just now")
//   §5 — emerald (connected) / amber (syncing) / rose (disconnected) /10 tints
// ============================================================================

import * as React from "react";
import {
  Bell,
  ChevronDown,
  Globe,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ----------------------------------------------------------------------------
// Date helpers (inline — keep the chip self-contained; matches DESIGN.md §4).
// ----------------------------------------------------------------------------

const US_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDateUS(d: Date): string {
  return `${US_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTimeUS(d: Date): string {
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Returns "Just now" if synced within the last 90 seconds, otherwise an
 * absolute US-formatted timestamp. DESIGN.md §4 disallows generic relative
 * time ("8 hours ago"); the single "Just now" affordance keeps the chip
 * legible right after a manual sync without sliding into vague terms.
 */
function syncedLabel(at: Date): string {
  const diffMs = Date.now() - at.getTime();
  if (diffMs < 90_000) return "Just now";
  // Same day → time only, otherwise date.
  const now = new Date();
  const sameDay =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();
  return sameDay ? formatTimeUS(at) : formatDateUS(at);
}

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------

export interface GoogleSyncChipProps {
  connected: boolean;
  lastSyncAt?: Date | null;
  syncing?: boolean;
  onSync: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onResubscribe: () => void;
  onClearCache: () => void;
  className?: string;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function GoogleSyncChip({
  connected,
  lastSyncAt = null,
  syncing = false,
  onSync,
  onConnect,
  onDisconnect,
  onResubscribe,
  onClearCache,
  className,
}: GoogleSyncChipProps) {
  // Resolve tone + text triplet (dot, label, container tint).
  const state: "disconnected" | "syncing" | "connected" = !connected
    ? "disconnected"
    : syncing
      ? "syncing"
      : "connected";

  const tone =
    state === "disconnected"
      ? {
          dot: "bg-rose-400",
          tint: "bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 border-rose-500/20",
          label: "Connect Google Calendar",
        }
      : state === "syncing"
        ? {
            dot: "bg-amber-400 animate-pulse",
            tint: "bg-amber-500/10 hover:bg-amber-500/15 text-amber-200 border-amber-500/20",
            label: "Syncing…",
          }
        : {
            dot: "bg-emerald-400",
            tint: "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200 border-emerald-500/20",
            label: lastSyncAt
              ? `Synced · ${syncedLabel(lastSyncAt)}`
              : "Synced",
          };

  // Disconnected → bypass the dropdown and trigger the OAuth consent flow
  // immediately. Matches the v8 Calendar page behavior where the chip itself
  // is the "Connect" CTA when no token exists.
  if (state === "disconnected") {
    return (
      <button
        type="button"
        onClick={onConnect}
        aria-label={tone.label}
        className={cn(
          // Narrow: icon-only square. lg: expand into pill with label.
          "press inline-flex h-8 items-center gap-2 rounded-full border text-xs font-medium transition-colors duration-fast ease-standard",
          "px-2 lg:px-3",
          tone.tint,
          className,
        )}
      >
        <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden />
        <Globe className="size-3.5" aria-hidden />
        <span className="hidden lg:inline">{tone.label}</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={tone.label}
            className={cn(
              "press inline-flex h-8 items-center gap-2 rounded-full border text-xs font-medium transition-colors duration-fast ease-standard",
              "px-2 lg:px-3",
              tone.tint,
              className,
            )}
          >
            <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden />
            <Globe className="size-3.5" aria-hidden />
            <span className="hidden items-center gap-1.5 lg:inline-flex">
              {state === "syncing" && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              )}
              {tone.label}
            </span>
            <ChevronDown
              className="hidden size-3.5 opacity-70 lg:inline"
              aria-hidden
            />
          </button>
        }
      />
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-64 rounded-xl"
      >
        <div className="px-2 pt-1.5 pb-2">
          <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Last synced
          </div>
          <div className="mt-0.5 text-xs font-medium text-foreground">
            {lastSyncAt
              ? `${formatDateUS(lastSyncAt)} · ${formatTimeUS(lastSyncAt)}`
              : "Never"}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (!syncing) onSync();
          }}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          <span>{syncing ? "Syncing…" : "Sync now"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResubscribe}>
          <Bell className="size-4" aria-hidden />
          <span>Resubscribe webhooks</span>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onClearCache}>
          <Trash2 className="size-4" aria-hidden />
          <span>Clear cache &amp; re-sync</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDisconnect}>
          <X className="size-4" aria-hidden />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
