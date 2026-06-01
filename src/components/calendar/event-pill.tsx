"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type CalendarEvent,
  formatTimeShort,
  shooterTone,
  isCancelled,
} from "@/components/calendar/calendar-data";

export type EventPillProps = {
  event: CalendarEvent;
  onClick?: (e: CalendarEvent) => void;
};

/**
 * Tight, single-line pill rendered inside MonthView day cells. Matches real
 * Odone's OrderPill — shooter dot + truncated title only, no time prefix (the
 * cell is too narrow and the agenda rail handles times). Cancelled events get
 * a rose tint + strike-through; everything else uses the neutral muted chip so
 * shooter dots provide the only colour, mirroring v8.
 */
export function EventPill({ event, onClick }: EventPillProps) {
  const cancelled = isCancelled(event);
  const tone = shooterTone(event.shooterId);
  const time = formatTimeShort(event.start);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      title={`${time} · ${event.title} · ${event.shooterName}`}
      className={cn(
        "press group/pill flex w-full items-center gap-1 truncate rounded-full px-1.5 text-left text-[10px] font-medium leading-5",
        "h-5 transition-colors duration-fast ease-standard",
        cancelled
          ? "bg-rose-500/10 text-rose-300 line-through opacity-80 hover:bg-rose-500/20"
          : "bg-muted/60 text-foreground hover:bg-muted",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          cancelled ? "bg-rose-400" : tone.dot,
        )}
      />
      <span className="truncate">{event.title}</span>
    </button>
  );
}

export default EventPill;
