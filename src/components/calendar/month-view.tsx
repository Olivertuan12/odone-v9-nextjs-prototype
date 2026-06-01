"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { EventPill } from "@/components/calendar/event-pill";
import {
  REF_NOW,
  addDays,
  isSameDay,
  startOfMonth,
  startOfWeek,
  type CalendarEvent,
} from "@/components/calendar/calendar-data";

// Monday-first per real Odone convention (v3 sync)
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type MonthViewProps = {
  /** Any date within the month to render. */
  viewDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
};

/**
 * Month grid — 6 × 7 cells starting from the Monday on or before the 1st.
 *
 * Calendar v7: cells use `rounded-md` (6px) instead of `rounded-2xl` (20px)
 * and live directly in the body — no outer wrapper card. This pulls them
 * back into a cohesive grid (rather than the floating-card look v6 had)
 * while still keeping a soft, never-sharp corner per DESIGN.md §1. Today
 * still gets a foreground-tinted border so it pops without breaking the
 * shared grid rhythm.
 */
export function MonthView({
  viewDate,
  events,
  onEventClick,
  onDayClick,
}: MonthViewProps) {
  // 6 × 7 = 42 cells starting from the Monday on or before the 1st of month.
  const firstOfMonth = startOfMonth(viewDate);
  const gridStart = startOfWeek(firstOfMonth);
  const cells = React.useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart],
  );

  // Group events by `yyyy-mm-dd` for O(1) lookup per cell.
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = `${e.start.getFullYear()}-${e.start.getMonth()}-${e.start.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    return map;
  }, [events]);

  const currentMonth = viewDate.getMonth();

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Day-of-week header strip */}
      <div className="grid shrink-0 grid-cols-7 gap-1 px-0.5 pb-1">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid — fills remaining height, each row equal. Tighter gap (gap-1)
          so the grid reads as one cohesive surface rather than floating cards. */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1 p-0.5">
        {cells.map((date, i) => {
          const inThisMonth = date.getMonth() === currentMonth;
          const isToday = isSameDay(date, REF_NOW);
          const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayEvents = eventsByDay.get(dayKey) ?? [];
          // Real Odone shows up to 4 pills per cell; +N more sits at the tail.
          const visible = dayEvents.slice(0, 4);
          const overflow = dayEvents.length - visible.length;

          return (
            // Use a div (not button) so EventPill buttons inside don't nest
            // a <button> in a <button> — invalid HTML and a hydration error.
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick?.(date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick?.(date);
                }
              }}
              className={cn(
                "press group/cell flex min-h-0 cursor-pointer flex-col gap-0.5 overflow-hidden rounded-md border px-1.5 pb-1.5 pt-1.5 text-left transition-colors duration-fast ease-standard outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                inThisMonth
                  ? "border-border bg-card hover:bg-accent/40"
                  : "border-border/40 bg-muted/15 text-muted-foreground/50 hover:bg-accent/20",
                isToday && "border-foreground/50 ring-1 ring-foreground/30",
              )}
              aria-label={date.toDateString()}
            >
              {/* Header row — day number top-left, event count top-right */}
              <div className="flex shrink-0 items-center justify-between gap-1 px-0.5">
                <span
                  className={cn(
                    "inline-grid h-5 min-w-5 place-items-center rounded-full text-[11px] font-bold tabular-nums",
                    isToday
                      ? "bg-foreground text-background"
                      : inThisMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                  )}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span
                    aria-label={`${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                    className="text-[10px] font-semibold tabular-nums text-muted-foreground/60"
                  >
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Events stack — tight, edge-to-edge */}
              <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                {visible.map((event) => (
                  <EventPill
                    key={event.id}
                    event={event}
                    onClick={onEventClick}
                  />
                ))}
                {overflow > 0 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick?.(date);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onDayClick?.(date);
                      }
                    }}
                    className="press shrink-0 cursor-pointer rounded-full px-1.5 text-left text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    +{overflow} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;
