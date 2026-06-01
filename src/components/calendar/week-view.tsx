"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  REF_NOW,
  addDays,
  isSameDay,
  startOfWeek,
  statusTone,
  formatTimeShort,
  type CalendarEvent,
} from "@/components/calendar/calendar-data";

// Hour range — 7 AM … 9 PM inclusive label, 14 hour-slots tall.
const HOUR_START = 7;
const HOUR_END = 21;
const HOUR_HEIGHT = 56; // px per hour row
const HOURS: number[] = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => i + HOUR_START,
);
// Rows of actual slot lines (one per hour, label at the top — last hour does
// not need a slot row below; total drawable height = (HOUR_END - HOUR_START) * HOUR_HEIGHT).
const ROW_COUNT = HOUR_END - HOUR_START; // 14 rows
const BODY_HEIGHT = ROW_COUNT * HOUR_HEIGHT; // 784px

const DAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export type WeekViewProps = {
  /** Any date within the week to render. */
  viewDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date) => void;
};

type LaidOutEvent = {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  col: number;
  totalCols: number;
};

/**
 * Sweep-line collision layout. Sorted by startMin, then endMin. Events that
 * overlap are grouped into a cluster; each cluster is divided into the minimum
 * number of columns such that no two events in the same column overlap.
 */
function layoutDayEvents(dayEvents: CalendarEvent[]): LaidOutEvent[] {
  const items = dayEvents
    .map((event) => {
      const startMin =
        event.start.getHours() * 60 + event.start.getMinutes();
      const endMin = event.end.getHours() * 60 + event.end.getMinutes();
      return { event, startMin, endMin };
    })
    // Clip to visible range — drop events that lie entirely outside.
    .filter(
      (e) => e.endMin > HOUR_START * 60 && e.startMin < HOUR_END * 60,
    )
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  if (items.length === 0) return [];

  // Build overlap clusters — contiguous runs where any event overlaps a peer.
  const clusters: (typeof items)[] = [];
  for (const item of items) {
    const last = clusters[clusters.length - 1];
    const lastMaxEnd = last
      ? Math.max(...last.map((x) => x.endMin))
      : 0;
    if (last && item.startMin < lastMaxEnd) {
      last.push(item);
    } else {
      clusters.push([item]);
    }
  }

  const out: LaidOutEvent[] = [];
  for (const cluster of clusters) {
    // Greedy column packing: place into the first column whose tail ends
    // at or before this event's start.
    const columns: (typeof items)[] = [];
    const assigned: Array<{ idx: number; col: number }> = [];
    cluster.forEach((item, idx) => {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        if (col[col.length - 1].endMin <= item.startMin) {
          col.push(item);
          assigned.push({ idx, col: c });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
        assigned.push({ idx, col: columns.length - 1 });
      }
    });
    const totalCols = columns.length;
    for (const a of assigned) {
      const it = cluster[a.idx];
      out.push({ ...it, col: a.col, totalCols });
    }
  }
  return out;
}

export function WeekView({
  viewDate,
  events,
  onEventClick,
  onSlotClick,
}: WeekViewProps) {
  const weekStart = React.useMemo(() => startOfWeek(viewDate), [viewDate]);
  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Bucket events per day for O(1) per-column lookup.
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = `${e.start.getFullYear()}-${e.start.getMonth()}-${e.start.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ─── Header row (sticky top) ─────────────────────────────── */}
      <div className="sticky top-0 z-20 flex shrink-0 border-b border-border/60 bg-background/95 backdrop-blur">
        {/* gutter for time labels */}
        <div className="w-16 shrink-0 border-r border-border/50" />
        {days.map((day) => {
          const today = isSameDay(day, REF_NOW);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2",
                today && "bg-accent/40",
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {DAY_SHORT[day.getDay()]}
              </span>
              <span
                className={cn(
                  "inline-grid h-7 min-w-7 place-items-center rounded-full px-2 text-sm font-semibold tabular-nums",
                  today
                    ? "bg-foreground text-background shadow-soft"
                    : "text-foreground",
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── Body (scrollable) ────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth-y">
        <div className="relative flex" style={{ minHeight: BODY_HEIGHT }}>
          {/* Time label column — sticky left so it stays visible if the
              container ever overflows horizontally. */}
          <div className="sticky left-0 z-10 w-16 shrink-0 border-r border-border/50 bg-background">
            {HOURS.map((h, i) => (
              <div
                key={h}
                // last hour label sits at the bottom edge — no row beneath.
                className={cn(
                  "relative flex justify-end pr-2",
                  i < HOURS.length - 1
                    ? ""
                    : "h-0",
                )}
                style={{
                  height: i < HOURS.length - 1 ? HOUR_HEIGHT : 0,
                }}
              >
                <span
                  className={cn(
                    "absolute right-2 -top-1 text-fluid-2xs tabular-nums text-muted-foreground",
                    i === 0 && "top-0 -translate-y-0",
                  )}
                >
                  {formatHourLabel(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const today = isSameDay(day, REF_NOW);
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayEvents = eventsByDay.get(key) ?? [];
            const laidOut = layoutDayEvents(dayEvents);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative flex-1 border-r border-dashed border-border/50 last:border-r-0",
                  today && "bg-accent/15",
                )}
                style={{ height: BODY_HEIGHT }}
              >
                {/* Hour grid lines + click targets */}
                {Array.from({ length: ROW_COUNT }, (_, i) => {
                  const hour = HOUR_START + i;
                  return (
                    <button
                      key={i}
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        const d = new Date(day);
                        d.setHours(hour, 0, 0, 0);
                        onSlotClick?.(d);
                      }}
                      className={cn(
                        "press absolute inset-x-0 block w-full cursor-pointer border-b border-dashed border-border/40 transition-colors duration-fast ease-standard hover:bg-accent/20",
                        i === ROW_COUNT - 1 && "border-b-0",
                      )}
                      style={{
                        top: i * HOUR_HEIGHT,
                        height: HOUR_HEIGHT,
                      }}
                      aria-label={`${day.toDateString()} ${formatHourLabel(hour)}`}
                    />
                  );
                })}

                {/* Now-line — only on today's column, if current time falls
                    within the visible range. */}
                {today && <NowLine />}

                {/* Event blocks */}
                {laidOut.map((laid) => {
                  const startOffsetMin =
                    Math.max(laid.startMin, HOUR_START * 60) - HOUR_START * 60;
                  const visibleEndMin = Math.min(
                    laid.endMin,
                    HOUR_END * 60,
                  );
                  const durationMin = Math.max(
                    15,
                    visibleEndMin - (HOUR_START * 60 + startOffsetMin),
                  );
                  const top = (startOffsetMin / 60) * HOUR_HEIGHT;
                  const heightPx = Math.max(
                    20,
                    (durationMin / 60) * HOUR_HEIGHT - 2,
                  );
                  const widthPct = 100 / laid.totalCols;
                  const leftPct = laid.col * widthPct;
                  const compact = heightPx < 28;

                  return (
                    <div
                      key={laid.event.id}
                      className="absolute"
                      style={{
                        top,
                        height: heightPx,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        padding: "1px 2px",
                      }}
                    >
                      <EventBlock
                        event={laid.event}
                        compact={compact}
                        onClick={onEventClick}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────────────────── */

function formatHourLabel(h: number): string {
  // 7 → "7 AM", 12 → "12 PM", 21 → "9 PM"
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${period}`;
}

/* ─── event block ─────────────────────────────────────────────────── */

type EventBlockProps = {
  event: CalendarEvent;
  compact: boolean;
  onClick?: (event: CalendarEvent) => void;
};

function EventBlock({ event, compact, onClick }: EventBlockProps) {
  const tone = statusTone(event.status);
  const time = `${formatTimeShort(event.start)} – ${formatTimeShort(event.end)}`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      title={`${time} · ${event.title}`}
      className={cn(
        "press lift group/event flex h-full w-full flex-col overflow-hidden rounded-md px-1.5 text-left transition-all duration-fast ease-standard",
        "hover:brightness-110",
        tone,
        compact ? "py-0.5" : "py-1",
      )}
    >
      {compact ? (
        <span className="truncate text-[9px] font-semibold leading-none">
          {event.title}
        </span>
      ) : (
        <>
          <span className="truncate text-[10px] font-semibold leading-tight tabular-nums opacity-90">
            {time}
          </span>
          <span className="truncate text-[11px] font-medium leading-tight">
            {event.title}
          </span>
        </>
      )}
    </button>
  );
}

/* ─── live "now" indicator ────────────────────────────────────────── */

function NowLine() {
  const [now, setNow] = React.useState<Date>(() => new Date(REF_NOW));

  React.useEffect(() => {
    // Mock-data uses a fixed REF_NOW anchor; we still tick every minute so
    // that if the anchor is ever swapped for `new Date()` this stays live.
    const id = window.setInterval(() => setNow(new Date(REF_NOW)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const minutesFromStart =
    now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
  if (
    minutesFromStart < 0 ||
    minutesFromStart > (HOUR_END - HOUR_START) * 60
  ) {
    return null;
  }
  const top = (minutesFromStart / 60) * HOUR_HEIGHT;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
      style={{ top }}
    >
      <span className="-ml-1 inline-block size-2 rounded-full bg-rose-400 shadow-soft" />
      <span className="h-px flex-1 bg-rose-400/70" />
    </div>
  );
}

export default WeekView;
