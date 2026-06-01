"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  X as XIcon,
  Clock,
  User,
  ExternalLink,
  LayoutGrid,
  Columns3,
  SlidersHorizontal,
  Check,
  CalendarSearch,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { AgendaSidebar } from "@/components/calendar/agenda-sidebar";
import { GoogleSyncChip } from "@/components/calendar/google-sync-chip";
import {
  events as allEvents,
  REF_NOW,
  addMonths,
  addDays,
  formatMonthYear,
  formatDayHeader,
  formatTimeRange,
  isSameDay,
  isSameMonth,
  startOfWeek,
  statusLabel,
  statusTone,
  kindLabel,
  cancelledTone,
  shooterTone,
  type CalendarEvent,
  type EventPortal,
  type EventStatus,
} from "@/components/calendar/calendar-data";
import { useCurrentUser } from "@/hooks/use-current-user";

type View = "month" | "week";

// Portal filter — matches CalendarEvent.portal values + a stable label.
const PORTALS: ReadonlyArray<{ key: EventPortal; label: string }> = [
  { key: "fotello", label: "Fotello" },
  { key: "hd-photo-hub", label: "HD Photo Hub" },
  { key: "tonomo", label: "Tonomo" },
  { key: "other", label: "Other" },
];

// Stage (status) filter ordered by workflow flow.
const STAGES: ReadonlyArray<{ key: EventStatus; label: string }> = [
  { key: "scheduled", label: "Scheduled" },
  { key: "in-progress", label: "In progress" },
  { key: "review", label: "In review" },
  { key: "delivered", label: "Delivered" },
  { key: "overdue", label: "Overdue" },
  { key: "cancelled", label: "Cancelled" },
];

// Blocker preset: stages an admin usually wants to scan first.
const BLOCKER_STAGES: ReadonlySet<EventStatus> = new Set(["overdue", "review"]);

// Last-sync anchor: REF_NOW − 5 minutes — mirrors the mock "fresh" sync state.
const MOCK_LAST_SYNC_AT = new Date(REF_NOW.getTime() - 5 * 60 * 1000);

/**
 * Format a week range for the date stepper, e.g. "May 25 – 31, 2026" or
 * "May 30 – Jun 5, 2026" when crossing month boundaries.
 */
function formatWeekRange(viewDate: Date): string {
  const start = startOfWeek(viewDate);
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", opts);
  const endStr =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}`
      : end.toLocaleDateString("en-US", opts);
  return `${startStr} – ${endStr}, ${end.getFullYear()}`;
}

function parseCheckParam<K extends string>(
  raw: string | null,
  validKeys: readonly K[],
  fallbackAllOn: Record<K, boolean>,
): Record<K, boolean> {
  if (!raw) return fallbackAllOn;
  const wanted = new Set(raw.split(",").map((s) => s.trim()));
  const intersection = validKeys.filter((k) => wanted.has(k));
  if (intersection.length === 0) return fallbackAllOn;
  return Object.fromEntries(
    validKeys.map((k) => [k, wanted.has(k)]),
  ) as Record<K, boolean>;
}

function isView(v: string | null): v is View {
  return v === "month" || v === "week";
}

// ---------------------------------------------------------------------------
// Display preferences — surfaced via Options menu.
// ---------------------------------------------------------------------------
type DisplayPrefs = {
  compactDensity: boolean;
  hideWeekends: boolean;
  groupByShooter: boolean;
};

export function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();
  const isShooter = currentUser.role === "shooter";

  // Capture the role-switch helper once at mount. useSearchParams returns a
  // new object on every render, so reading it inside the URL-persistence
  // effect (or putting it in that effect's deps) would create a render loop.
  // The `?as=` param is a static mock helper for the prototype — it does not
  // change during a session, so a ref grabbed at first render is correct.
  const asParamRef = React.useRef<string | null>(null);
  if (asParamRef.current === null) {
    asParamRef.current = searchParams.get("as");
  }

  // ── Derive shooter list from event data (admin/editor/va see all) ─────
  const shooters = React.useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; initials: string }
    >();
    for (const e of allEvents) {
      if (!map.has(e.shooterId)) {
        map.set(e.shooterId, {
          id: e.shooterId,
          name: e.shooterName,
          initials: e.shooterInitials,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // ── URL-hydrated initial state ────────────────────────────────
  const initialView: View = isView(searchParams.get("view"))
    ? (searchParams.get("view") as View)
    : "month";
  const initialUpcoming = searchParams.get("upcoming") === "1";

  const stageKeys = React.useMemo(() => STAGES.map((s) => s.key), []);
  const shooterKeys = React.useMemo(
    () => shooters.map((s) => s.id),
    [shooters],
  );

  const initialStages = React.useMemo(
    () =>
      parseCheckParam(
        searchParams.get("stages"),
        stageKeys,
        Object.fromEntries(stageKeys.map((k) => [k, true])) as Record<
          EventStatus,
          boolean
        >,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const initialPortals = React.useMemo(
    () =>
      parseCheckParam(
        searchParams.get("portals"),
        PORTALS.map((p) => p.key),
        { fotello: true, "hd-photo-hub": true, tonomo: true, other: true },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const initialShooterChecks = React.useMemo(() => {
    if (isShooter) {
      // Shooter role: locked to self. Other shooters in the list stay `false`
      // and the pill UI is hidden.
      return Object.fromEntries(
        shooterKeys.map((k) => [k, k === currentUser.id]),
      ) as Record<string, boolean>;
    }
    return parseCheckParam(
      searchParams.get("shooters"),
      shooterKeys,
      Object.fromEntries(shooterKeys.map((k) => [k, true])) as Record<
        string,
        boolean
      >,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShooter, currentUser.id, shooterKeys]);

  const initialPrefs: DisplayPrefs = React.useMemo(
    () => ({
      compactDensity: searchParams.get("density") === "compact",
      hideWeekends: searchParams.get("weekends") === "0",
      groupByShooter: searchParams.get("group") === "shooter",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [viewDate, setViewDate] = React.useState<Date>(REF_NOW);
  const [view, setView] = React.useState<View>(initialView);
  const [activeEvent, setActiveEvent] = React.useState<CalendarEvent | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = React.useState<Date>(REF_NOW);

  // ── Filter state ───────────────────────────────────────────────
  const [upcomingOnly, setUpcomingOnly] = React.useState(initialUpcoming);
  const [stageChecks, setStageChecks] = React.useState<
    Record<EventStatus, boolean>
  >(initialStages);
  const [portalChecks, setPortalChecks] = React.useState<
    Record<EventPortal, boolean>
  >(initialPortals);
  const [shooterChecks, setShooterChecks] = React.useState<
    Record<string, boolean>
  >(initialShooterChecks);
  const [prefs, setPrefs] = React.useState<DisplayPrefs>(initialPrefs);

  // Google sync mock state — connected by default, but a tiny demo toggle lets
  // us flip to the "Connect Google Calendar" amber-CTA state so design review
  // can compare both. The toggle lives next to the chip and is purely visual.
  const [connected, setConnected] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSyncAt, setLastSyncAt] = React.useState<Date>(MOCK_LAST_SYNC_AT);

  // ── URL persistence ─────────────────────────────────────────────
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (view !== "month") params.set("view", view);
    if (upcomingOnly) params.set("upcoming", "1");

    const onPortals = PORTALS.filter((p) => portalChecks[p.key]).map(
      (p) => p.key,
    );
    if (onPortals.length !== PORTALS.length) {
      params.set("portals", onPortals.join(","));
    }

    const onStages = STAGES.filter((s) => stageChecks[s.key]).map(
      (s) => s.key,
    );
    if (onStages.length !== STAGES.length) {
      params.set("stages", onStages.join(","));
    }

    if (!isShooter) {
      const onShooters = shooters
        .filter((s) => shooterChecks[s.id])
        .map((s) => s.id);
      if (onShooters.length !== shooters.length && shooters.length > 0) {
        params.set("shooters", onShooters.join(","));
      }
    }

    if (prefs.compactDensity) params.set("density", "compact");
    if (prefs.hideWeekends) params.set("weekends", "0");
    if (prefs.groupByShooter) params.set("group", "shooter");

    // Preserve ?as= for the role-switch mock helper.
    if (asParamRef.current) params.set("as", asParamRef.current);

    const qs = params.toString();
    const next = qs ? `/calendar?${qs}` : "/calendar";
    router.replace(next, { scroll: false });
  }, [
    view,
    upcomingOnly,
    stageChecks,
    portalChecks,
    shooterChecks,
    prefs,
    isShooter,
    shooters,
    router,
  ]);

  // ── Derived event slice ─────────────────────────────────────────
  const filteredEvents = React.useMemo(() => {
    return allEvents.filter((e) => {
      // Hard role guard: shooter only sees their own events.
      if (isShooter && e.shooterId !== currentUser.id) return false;
      if (upcomingOnly && e.start < REF_NOW) return false;
      if (!portalChecks[e.portal]) return false;
      if (!stageChecks[e.status]) return false;
      if (!isShooter && !shooterChecks[e.shooterId]) return false;
      return true;
    });
  }, [
    upcomingOnly,
    portalChecks,
    stageChecks,
    shooterChecks,
    isShooter,
    currentUser.id,
  ]);

  // Date stepper label — month view shows "MMM YYYY", week view shows the
  // range. Moved out of the stepper itself; rendered above the calendar grid.
  const dateLabel =
    view === "week" ? formatWeekRange(viewDate) : formatMonthYear(viewDate);
  const isOnCurrentRange =
    view === "week"
      ? isSameDay(startOfWeek(viewDate), startOfWeek(REF_NOW))
      : isSameMonth(viewDate, REF_NOW);

  // Header subtitle uses GLOBAL totals (scoped to the role guard) so the count
  // doesn't change when the user toggles filters.
  const globalStats = React.useMemo(() => {
    const scope = isShooter
      ? allEvents.filter((e) => e.shooterId === currentUser.id)
      : allEvents;
    const total = scope.length;
    const upcoming = scope.filter((e) => e.start >= REF_NOW).length;
    return { total, upcoming };
  }, [isShooter, currentUser.id]);

  const upcomingCount = globalStats.upcoming;

  // Events for the focused agenda day.
  const agendaEvents = React.useMemo(
    () => filteredEvents.filter((e) => isSameDay(e.start, selectedDate)),
    [filteredEvents, selectedDate],
  );

  const handlePrev = React.useCallback(() => {
    setViewDate((d) => (view === "week" ? addDays(d, -7) : addMonths(d, -1)));
  }, [view]);
  const handleNext = React.useCallback(() => {
    setViewDate((d) => (view === "week" ? addDays(d, 7) : addMonths(d, 1)));
  }, [view]);
  const handleToday = React.useCallback(() => {
    setViewDate(REF_NOW);
    setSelectedDate(REF_NOW);
  }, []);

  // v11: click an event → go straight to Order Detail (Notion-style page
  // navigation). The old preview dialog was minimal and the user wanted full
  // context instead of a peek. We pass `?from=calendar` so the destination can
  // render a context-aware back link.
  const handleEventClick = React.useCallback(
    (e: CalendarEvent) => {
      router.push(`/orders/${e.orderId}?from=calendar`);
    },
    [router],
  );

  const handleDayClick = React.useCallback((d: Date) => {
    setSelectedDate(d);
  }, []);

  // Google sync handlers — all toast-only mocks.
  const handleSync = React.useCallback(() => {
    setSyncing(true);
    toast.info("Syncing Google Calendar…");
    window.setTimeout(() => {
      setSyncing(false);
      setLastSyncAt(new Date());
      toast.success("Google Calendar synced");
    }, 1200);
  }, []);
  const handleConnect = React.useCallback(() => {
    setConnected(true);
    setLastSyncAt(new Date());
    toast.success("Google Calendar connected");
  }, []);
  const handleDisconnect = React.useCallback(() => {
    setConnected(false);
    toast.warning("Google Calendar disconnected");
  }, []);
  const handleResubscribe = React.useCallback(
    () => toast.info("Webhook resubscribed"),
    [],
  );
  const handleClearCache = React.useCallback(
    () => toast.info("Cache cleared — full re-sync queued"),
    [],
  );

  const openOrder = React.useCallback(
    (event: CalendarEvent) => {
      setActiveEvent(null);
      router.push(`/orders/${event.orderId}?tab=review`);
    },
    [router],
  );

  const togglePortal = React.useCallback(
    (key: EventPortal, next: boolean) => {
      setPortalChecks((prev) => ({ ...prev, [key]: next }));
    },
    [],
  );

  const toggleStage = React.useCallback(
    (key: EventStatus, next: boolean) => {
      setStageChecks((prev) => ({ ...prev, [key]: next }));
    },
    [],
  );

  const toggleShooter = React.useCallback((id: string, next: boolean) => {
    setShooterChecks((prev) => ({ ...prev, [id]: next }));
  }, []);

  const setAllStages = React.useCallback((on: boolean) => {
    setStageChecks(
      Object.fromEntries(STAGES.map((s) => [s.key, on])) as Record<
        EventStatus,
        boolean
      >,
    );
  }, []);

  const applyBlockerPreset = React.useCallback(() => {
    setStageChecks(
      Object.fromEntries(
        STAGES.map((s) => [s.key, BLOCKER_STAGES.has(s.key)]),
      ) as Record<EventStatus, boolean>,
    );
  }, []);

  const setAllShooters = React.useCallback(
    (on: boolean) => {
      setShooterChecks(
        Object.fromEntries(shooters.map((s) => [s.id, on])) as Record<
          string,
          boolean
        >,
      );
    },
    [shooters],
  );

  const togglePref = React.useCallback(
    <K extends keyof DisplayPrefs>(key: K) => {
      setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  // ── Counts for pill badges ────────────────────────────────────────
  const portalsOnCount = Object.values(portalChecks).filter(Boolean).length;
  const stagesOnCount = Object.values(stageChecks).filter(Boolean).length;
  const shootersOnCount = isShooter
    ? 1
    : Object.values(shooterChecks).filter(Boolean).length;

  const portalsLabel =
    portalsOnCount === PORTALS.length
      ? "All portals"
      : portalsOnCount === 0
        ? "No portals"
        : `${portalsOnCount} portal${portalsOnCount === 1 ? "" : "s"}`;

  const shootersLabel =
    shootersOnCount === shooters.length
      ? "All shooters"
      : shootersOnCount === 0
        ? "No shooters"
        : `${shootersOnCount} of ${shooters.length}`;

  // Per-status counts inside the visible (role-scoped) event pool — so the
  // Options menu can show "Scheduled · 12" honestly.
  const stageCounts = React.useMemo(() => {
    const base = isShooter
      ? allEvents.filter((e) => e.shooterId === currentUser.id)
      : allEvents;
    const counts: Record<EventStatus, number> = {
      scheduled: 0,
      "in-progress": 0,
      review: 0,
      delivered: 0,
      overdue: 0,
      cancelled: 0,
    };
    for (const e of base) counts[e.status]++;
    return counts;
  }, [isShooter, currentUser.id]);

  const shooterCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of allEvents) {
      counts[e.shooterId] = (counts[e.shooterId] ?? 0) + 1;
    }
    return counts;
  }, []);

  // Today flag for agenda eyebrow + pulse indicator.
  const isAgendaToday = isSameDay(selectedDate, REF_NOW);

  // Number of "extra" filters surfaced via the Options menu — stage off + each
  // display tweak. Used to badge the trigger so applied filters are visible.
  const activeOptionsCount =
    (STAGES.length - stagesOnCount) +
    (prefs.compactDensity ? 1 : 0) +
    (prefs.hideWeekends ? 1 : 0) +
    (prefs.groupByShooter ? 1 : 0);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* ── Header
           Row 1: H1 (date) + Sync chip
           Row 2: subtitle (with clickable "N upcoming" toggle)
           Row 3: [Today][<][>]  (left)   +   Shooters · Portals · Month|Week · ⚙   (right) ── */}
      <div className="flex flex-col gap-2.5 border-b border-border px-4 pt-4 pb-3 lg:px-6 lg:pt-5 lg:pb-3.5">
        {/* ── Row 1: title + sync only ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1
            className="truncate text-fluid-3xl font-bold tracking-tight tabular-nums"
            aria-live="polite"
          >
            {dateLabel}
          </h1>

          <GoogleSyncChip
            connected={connected}
            syncing={syncing}
            lastSyncAt={lastSyncAt}
            onSync={handleSync}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onResubscribe={handleResubscribe}
            onClearCache={handleClearCache}
          />
        </div>

        {/* ── Row 2: subtitle with clickable "N upcoming" toggle ── */}
        <p className="text-xs font-medium text-muted-foreground">
          {isShooter && (
            <>
              <span className="text-foreground/80">{currentUser.name}</span>
              <span aria-hidden className="mx-1.5 text-muted-foreground/40">
                •
              </span>
            </>
          )}
          <span className="tabular-nums">
            {globalStats.total} scheduled
          </span>
          <span aria-hidden className="mx-1.5 text-muted-foreground/40">
            •
          </span>
          <button
            type="button"
            onClick={() => setUpcomingOnly((v) => !v)}
            aria-pressed={upcomingOnly}
            className={cn(
              "press inline-flex items-center -mx-1 rounded-md px-1 align-baseline tabular-nums transition-colors duration-fast ease-standard",
              upcomingOnly
                ? "text-foreground underline decoration-foreground/40 underline-offset-4"
                : "hover:text-foreground",
            )}
          >
            {upcomingCount} upcoming
          </button>
          {isShooter && (
            <>
              <span aria-hidden className="mx-1.5 text-muted-foreground/40">
                •
              </span>
              <span className="text-foreground/70">showing only yours</span>
            </>
          )}
        </p>

        {/* ── Row 3: stepper (left) · filters + view + options (right) ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Google-style stepper: [Today] [<] [>] — left of the row. */}
          <div
            role="group"
            aria-label="Date navigation"
            className="inline-flex h-8 items-center gap-0.5 rounded-full border border-border bg-background p-0.5"
          >
            <button
              type="button"
              onClick={handleToday}
              disabled={isOnCurrentRange}
              aria-label="Jump to today"
              className={cn(
                "press inline-flex h-7 items-center rounded-full px-3 text-[11px] font-semibold transition-colors duration-fast ease-standard",
                isOnCurrentRange
                  ? "cursor-default text-muted-foreground/50"
                  : "text-foreground hover:bg-accent",
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrev}
              aria-label={view === "week" ? "Previous week" : "Previous month"}
              className="press grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-fast ease-standard"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={view === "week" ? "Next week" : "Next month"}
              className="press grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-fast ease-standard"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {/* Spacer pushes the rest of the row to the right edge. */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Shooters multi-select — admin/editor/va only. Hidden for shooter
              role since they are locked to their own events. */}
          {!isShooter && shooters.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "press inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold",
                      "text-muted-foreground hover:bg-accent hover:text-foreground",
                      "transition-colors duration-fast ease-standard",
                    )}
                  >
                    Shooters
                    <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums text-foreground">
                      {shootersOnCount}
                    </span>
                  </button>
                }
              />
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="w-60 rounded-xl"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>Shooters</span>
                    <span className="text-[10px] normal-case tracking-normal text-muted-foreground/70">
                      {shootersLabel}
                    </span>
                  </DropdownMenuLabel>
                  {shooters.map((s) => {
                    const tone = shooterTone(s.id);
                    const count = shooterCounts[s.id] ?? 0;
                    return (
                      <DropdownMenuCheckboxItem
                        key={s.id}
                        checked={shooterChecks[s.id] ?? false}
                        onCheckedChange={(next) =>
                          toggleShooter(s.id, Boolean(next))
                        }
                      >
                        <span className="flex flex-1 items-center gap-2">
                          <span
                            aria-hidden
                            className={cn("size-2 shrink-0 rounded-full", tone.dot)}
                          />
                          <span className="flex-1 truncate">{s.name}</span>
                          <span className="text-[10px] tabular-nums text-muted-foreground/70">
                            {count}
                          </span>
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuGroup>
                {shootersOnCount !== shooters.length && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setAllShooters(true)}>
                      <Check className="size-3.5" />
                      Show all shooters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Portals multi-select dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "press inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold",
                    "text-muted-foreground hover:bg-accent hover:text-foreground",
                    "transition-colors duration-fast ease-standard",
                  )}
                >
                  Portals
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums text-foreground">
                    {portalsOnCount}
                  </span>
                </button>
              }
            />
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="w-52 rounded-xl"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>Portals</span>
                  <span className="text-[10px] normal-case tracking-normal text-muted-foreground/70">
                    {portalsLabel}
                  </span>
                </DropdownMenuLabel>
                {PORTALS.map((p) => (
                  <DropdownMenuCheckboxItem
                    key={p.key}
                    checked={portalChecks[p.key]}
                    onCheckedChange={(next) =>
                      togglePortal(p.key, Boolean(next))
                    }
                  >
                    {p.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              {portalsOnCount !== PORTALS.length && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      setPortalChecks({
                        fotello: true,
                        "hd-photo-hub": true,
                        tonomo: true,
                        other: true,
                      })
                    }
                  >
                    <Check className="size-3.5" />
                    Show all portals
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Month / Week toggle */}
          <div
            role="group"
            aria-label="Calendar view"
            className="inline-flex h-8 items-center rounded-full border border-border bg-background p-0.5"
          >
            <button
              type="button"
              onClick={() => setView("month")}
              aria-label="Month view"
              aria-pressed={view === "month"}
              className={cn(
                "press inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors duration-fast ease-standard",
                view === "month"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Month</span>
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              aria-label="Week view"
              aria-pressed={view === "week"}
              className={cn(
                "press inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors duration-fast ease-standard",
                view === "week"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Columns3 className="size-3.5" />
              <span className="hidden sm:inline">Week</span>
            </button>
          </div>

          {/* Options — icon-only trigger */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label={
                    activeOptionsCount > 0
                      ? `Calendar options (${activeOptionsCount} active)`
                      : "Calendar options"
                  }
                  className={cn(
                    "press relative grid size-8 place-items-center rounded-full border border-border bg-background",
                    "text-muted-foreground hover:bg-accent hover:text-foreground",
                    "transition-colors duration-fast ease-standard",
                  )}
                >
                  <SlidersHorizontal className="size-3.5" aria-hidden />
                  {activeOptionsCount > 0 && (
                    <span
                      aria-hidden
                      className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-foreground text-[9px] font-bold text-background tabular-nums ring-2 ring-background"
                    >
                      {activeOptionsCount}
                    </span>
                  )}
                </button>
              }
            />
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-64 rounded-xl"
            >
              {/* STAGE section */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>Stage</span>
                  <span className="text-[10px] normal-case tracking-normal text-muted-foreground/70">
                    {stagesOnCount === STAGES.length
                      ? "All stages"
                      : `${stagesOnCount} of ${STAGES.length}`}
                  </span>
                </DropdownMenuLabel>
                {STAGES.map((s) => {
                  const count = stageCounts[s.key];
                  return (
                    <DropdownMenuCheckboxItem
                      key={s.key}
                      checked={stageChecks[s.key]}
                      onCheckedChange={(next) =>
                        toggleStage(s.key, Boolean(next))
                      }
                    >
                      <span className="flex flex-1 items-center gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            "inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
                            statusDotClass(s.key),
                          )}
                        />
                        <span className="flex-1 truncate">{s.label}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground/70">
                          {count}
                        </span>
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAllStages(true)}>
                <Check className="size-3.5" />
                Show all stages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={applyBlockerPreset}>
                <span
                  aria-hidden
                  className="inline-flex size-3.5 items-center justify-center"
                >
                  <span className="size-2 rounded-full bg-rose-500" />
                </span>
                Only blockers (Overdue + Review)
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* DISPLAY section */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Display
                </DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={prefs.compactDensity}
                  onCheckedChange={() => togglePref("compactDensity")}
                >
                  Compact density
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={prefs.hideWeekends}
                  onCheckedChange={() => togglePref("hideWeekends")}
                >
                  Hide weekends
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={prefs.groupByShooter}
                  onCheckedChange={() => togglePref("groupByShooter")}
                  disabled={view !== "week"}
                >
                  Group rows by shooter
                  <span className="ml-auto text-[9px] uppercase tracking-wide text-muted-foreground/60">
                    Week
                  </span>
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Body — calendar grid (left) + agenda panel (right) ───────── */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3 lg:p-4">
        <section
          aria-label="Calendar grid"
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
        >
          {view === "month" ? (
            <MonthView
              viewDate={viewDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          ) : (
            <WeekView
              viewDate={viewDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onSlotClick={handleDayClick}
            />
          )}

          {/* Grid-level empty overlay — fires when the current filter slice
              has zero events in the visible range. Probably won't trigger with
              seed data, but the code path keeps the calendar honest. Pointer-
              events disabled so day clicks underneath still register. */}
          {filteredEvents.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
              <Empty className="pointer-events-auto max-w-sm rounded-2xl border border-border bg-background/95 shadow-md backdrop-blur">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarSearch className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>No shoots in this range</EmptyTitle>
                  <EmptyDescription>
                    Adjust the stage / portal / shooter filters or jump to
                    today to see what's on the books.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={handleToday}
                  >
                    Jump to today
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          )}
        </section>

        {/* Right rail — focused-day agenda lives as its own card. Hidden on
            very narrow widths to keep the month grid breathable. */}
        <section
          aria-label="Agenda"
          className="hidden w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-transparent pl-3 md:flex"
        >
          <AgendaSidebar
            selectedDate={selectedDate}
            events={agendaEvents}
            isToday={isAgendaToday}
            onEventClick={handleEventClick}
          />
        </section>
      </div>

      {/* ── Event detail dialog ───────────────────────────── */}
      <EventDetailDialog
        event={activeEvent}
        onOpenChange={(open) => !open && setActiveEvent(null)}
        onOpenOrder={openOrder}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status dot helper — solid dot in the stage's accent colour. Keeps the
// Options menu visually scannable without re-using the full statusTone pill.
// ---------------------------------------------------------------------------
function statusDotClass(s: EventStatus): string {
  switch (s) {
    case "scheduled":
      return "bg-blue-500";
    case "in-progress":
      return "bg-amber-500";
    case "review":
      return "bg-violet-500";
    case "delivered":
      return "bg-emerald-500";
    case "overdue":
      return "bg-rose-500";
    case "cancelled":
      return "bg-muted-foreground/60";
  }
}

// ---------------------------------------------------------------------------
// EventDetailDialog — quick preview of an event with a link to Order Detail.
// ---------------------------------------------------------------------------

function EventDetailDialog({
  event,
  onOpenChange,
  onOpenOrder,
}: {
  event: CalendarEvent | null;
  onOpenChange: (open: boolean) => void;
  onOpenOrder: (event: CalendarEvent) => void;
}) {
  const open = event !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-w-md gap-0 overflow-hidden rounded-2xl p-0",
          "data-open:duration-base data-open:ease-spring",
          "data-closed:duration-fast data-closed:ease-standard",
          "shadow-modal ring-1 ring-foreground/10",
        )}
      >
        {event && (
          <>
            {/* Header */}
            <div className="glass-strong flex items-start gap-3 rounded-t-2xl border-b border-border px-5 py-4 backdrop-blur">
              <div className="min-w-0 flex-1">
                <DialogTitle
                  className={cn(
                    "truncate text-fluid-base font-semibold tracking-tight",
                    event.status === "cancelled" && cancelledTone(),
                  )}
                >
                  {event.title}
                </DialogTitle>
                <DialogDescription className="mt-0.5 truncate text-fluid-xs text-muted-foreground">
                  {event.client} · {kindLabel(event.kind)}
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="press grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3 px-5 py-4">
              {/* Status chip */}
              <div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-fluid-2xs font-semibold",
                    statusTone(event.status),
                  )}
                >
                  {statusLabel(event.status)}
                </span>
              </div>

              {/* Meta rows */}
              <div className="space-y-1.5 text-fluid-xs">
                <MetaRow icon={Clock} label="Time">
                  <span className="font-medium text-foreground">
                    {formatDayHeader(event.start)}
                  </span>
                  <span className="mx-1.5 text-muted-foreground/40">•</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatTimeRange(event.start, event.end)}
                  </span>
                </MetaRow>
                <MetaRow icon={User} label="Shooter">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="grid size-4 place-items-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground">
                      {event.shooterInitials}
                    </span>
                    <span className="font-medium text-foreground">
                      {event.shooterName}
                    </span>
                  </span>
                </MetaRow>
              </div>

              {event.notes && (
                <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-fluid-xs text-foreground/90">
                  {event.notes}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-border bg-muted/30 px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="press h-8 rounded-full px-4"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenOrder(event)}
                className="press lift h-8 gap-1.5 rounded-full px-4"
              >
                <ExternalLink className="size-3.5" />
                Open order
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="mr-2 text-muted-foreground">{label}</span>
        {children}
      </div>
    </div>
  );
}

export default CalendarPage;
