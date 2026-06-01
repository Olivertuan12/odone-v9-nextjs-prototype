"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarDays, MapPinIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  type CalendarEvent,
  formatTimeShort,
  isCancelled,
  portalLabel,
  shooterTone,
} from "@/components/calendar/calendar-data";
import { useCurrentUser } from "@/hooks/use-current-user";

// Build a Google Maps directions URL from a free-text destination string.
// Used to make the property address a one-tap navigate button for shooters.
function mapsDirectionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export type AgendaSidebarProps = {
  /** The day whose events we render. */
  selectedDate: Date;
  /** Pre-filtered events for `selectedDate`. Caller controls the slice. */
  events: CalendarEvent[];
  /** Whether `selectedDate` is "today" in the calendar's reference frame. */
  isToday: boolean;
  /** Click on an agenda row → open detail dialog upstream. */
  onEventClick?: (event: CalendarEvent) => void;
};

/**
 * Right-rail agenda panel for the focused day. Mirrors real Odone's compact
 * agenda: a small lowercase eyebrow ("Today's schedule"), a big day-and-month
 * line ("May 30"), and a muted weekday + year line. Each row uses a shooter
 * dot + time as the primary anchor, the property address in bold, the client
 * name as supporting text, and a soft portal pill on the right.
 *
 * Calendar v6: search input removed — global ⌘K search lives in the top bar
 * (EditorSiteHeader) and avoids duplicating the affordance. The header now
 * leans on a clean two-column layout: title cluster left, count badge right.
 */
export function AgendaSidebar({
  selectedDate,
  events,
  isToday,
  onEventClick,
}: AgendaSidebarProps) {
  // Always render events sorted by start time so the rail reads top→bottom.
  const sorted = React.useMemo(
    () => [...events].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events],
  );

  // Header bits: eyebrow ("Today's schedule" vs weekday name), big "May 30"
  // line, then weekday + year sublabel. Title-case eyebrow per real Odone —
  // mockup previously used SHOUTY uppercase.
  const eyebrow = isToday
    ? "Today's schedule"
    : selectedDate.toLocaleDateString("en-US", { weekday: "long" });

  const bigDate = selectedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const subLine = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
  });

  return (
    <aside
      className="flex h-full w-full min-w-0 flex-col"
      aria-label="Agenda for selected day"
    >
      {/* Header — sticky so the "Today's schedule" anchor stays visible while
          the body scrolls past dozens of events. v11 typography: lowercase
          eyebrow (less SHOUTING), smaller bigDate. */}
      <div className="sticky top-0 z-10 shrink-0 bg-background/80 pb-1.5 pt-0.5 pr-1 backdrop-blur">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium tracking-normal text-muted-foreground">
              {eyebrow}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                {bigDate}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {subLine}
              </span>
            </div>
          </div>

          {/* Count badge — small muted pill. */}
          {sorted.length > 0 && (
            <span
              aria-label={`${sorted.length} event${sorted.length === 1 ? "" : "s"}`}
              className="inline-grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-muted px-1 text-[10px] font-medium tabular-nums text-muted-foreground"
            >
              {sorted.length}
            </span>
          )}
        </div>
      </div>

      {/* Body — scrollable list or empty state. v12.3: dropped lateral
          padding so cards extend the full rail width (user feedback:
          previously left a black gutter on both sides). */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth-y py-2">
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-1.5 stagger-fade">
            {sorted.map((event, idx) => (
              <li key={event.id}>
                <AgendaItem
                  event={event}
                  // "Now" indicator — only on the first event of TODAY's
                  // agenda. Subtle pulse so the eye lands on it without
                  // dragging attention off the rest of the list.
                  isNow={isToday && idx === 0}
                  onClick={onEventClick}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function EmptyState() {
  return (
    <Empty className="h-full px-6 py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarDays className="size-5" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No orders scheduled</EmptyTitle>
        <EmptyDescription>Enjoy the day off.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

type AgendaItemProps = {
  event: CalendarEvent;
  /** When true, render a subtle pulsing "now" indicator next to the time. */
  isNow?: boolean;
  onClick?: (event: CalendarEvent) => void;
};

/**
 * v12.3 (slim revision): trimmed to three tokens — listing · client · portal.
 * The previous redesign carried too much info (time range, duration, kind
 * icon, avatar, shooter name); user feedback was that the rail only needs
 * the address, the customer, and the order origin. Now flush to the rail
 * edges (parent dropped horizontal padding).
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ ● 45 Yorkshire Dr                  Fotello   │
 *   │   ACME Realty                                │
 *   └──────────────────────────────────────────────┘
 *
 * The leading dot tints with the shooter's stable hash so the rail still
 * reads as a multi-shooter day at a glance. Cancelled rows strike through
 * the title; `isNow` adds a small NOW chip in place of the portal pill so
 * the current event is unmistakable.
 */
function AgendaItem({ event, isNow, onClick }: AgendaItemProps) {
  const startTime = formatTimeShort(event.start);
  const cancelled = isCancelled(event);
  const tone = shooterTone(event.shooterId);
  const currentUser = useCurrentUser();
  const isShooter = currentUser.role === "shooter";

  // Maps destination = property title (the address). Shooter persona's
  // single most-used tap of the day.
  const mapsHref = mapsDirectionsUrl(event.title);

  return (
    <div
      className={cn(
        "press group/agenda relative block w-full rounded-lg border px-3 py-2 text-left",
        "transition-colors duration-fast ease-standard",
        cancelled
          ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
          : isNow
            ? "border-rose-400/40 bg-card ring-1 ring-rose-400/15 hover:bg-accent/40"
            : "border-border bg-card hover:bg-accent/40",
      )}
    >
      {/* Click target for opening the event detail dialog. Sits behind the
          inline action chips so Maps/Upload taps don't open the dialog. */}
      <button
        type="button"
        onClick={() => onClick?.(event)}
        aria-label={`${event.title} at ${startTime}${isNow ? ", happening now" : ""}`}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {/* Time eyebrow — prominent tabular nums so the shooter scans down */}
      <div className="relative z-10 flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "relative inline-flex size-2 shrink-0 rounded-full",
            cancelled ? "bg-rose-400" : tone.dot,
          )}
        >
          {isNow && !cancelled && (
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 animate-ping rounded-full opacity-70",
                tone.dot,
              )}
            />
          )}
        </span>
        <span
          className={cn(
            "font-mono text-[12.5px] font-semibold tabular-nums leading-none",
            cancelled ? "text-rose-300/70 line-through" : isNow ? "text-rose-300" : "text-foreground",
          )}
        >
          {startTime}
        </span>
        {isNow && !cancelled ? (
          <span
            aria-label="Now"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300"
          >
            <span
              aria-hidden
              className="relative inline-flex size-1.5 rounded-full bg-rose-400"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />
            </span>
            Now
          </span>
        ) : (
          <span
            className={cn(
              "ml-auto inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 text-[10px] font-medium",
              cancelled
                ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
                : "border-border bg-muted/30 text-muted-foreground",
            )}
          >
            {portalLabel(event.portal)}
          </span>
        )}
      </div>

      {/* Title row — listing address. For shooters, address is a Google
          Maps directions link (one-tap navigate). For everyone else it's
          just the title; the underlying click target opens the dialog. */}
      <div className="relative z-10 mt-1 ml-4 flex items-start gap-2">
        {isShooter ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex min-w-0 flex-1 items-start gap-1 text-[13px] font-semibold leading-snug",
              cancelled ? "line-through text-rose-300" : "text-foreground hover:text-foreground hover:underline",
            )}
            title="Open in Google Maps"
          >
            <MapPinIcon className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground" />
            <span className="min-w-0 truncate">{event.title}</span>
          </a>
        ) : (
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug text-foreground",
              cancelled && "line-through text-rose-300",
            )}
          >
            {event.title}
          </span>
        )}
      </div>

      {/* Client — muted, kept on its own line so it's the last token the
          eye lands on. Aligned with the title's leading edge so the rail
          stays rhythmic. */}
      <div className="relative z-10 mt-0.5 ml-4 flex items-center gap-2 text-[11.5px] text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">{event.client}</span>
        {/* Upload affordance — shooter only, hidden on cancelled shoots */}
        {isShooter && !cancelled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toast.info(`Upload for ${event.title}`, {
                description: "Drop today's raw files for this shoot. (mock)",
              });
            }}
            title="Upload raw files for this shoot"
            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <UploadIcon className="size-3" />
            Upload
          </button>
        )}
      </div>
    </div>
  );
}

export default AgendaSidebar;
