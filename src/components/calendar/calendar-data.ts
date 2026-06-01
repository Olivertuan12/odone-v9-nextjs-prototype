// Mock data for the Calendar page. Anchored at REF_NOW so events are stable
// across reloads. Mirrors the real Odone-v8 ScheduledOrder shape but lighter.

export const REF_NOW = new Date("2026-05-30T10:00:00");

export type EventStatus =
  | "scheduled"
  | "in-progress"
  | "review"
  | "delivered"
  | "overdue"
  | "cancelled";

export type EventKind = "shoot" | "edit" | "deliver";

/**
 * Portal source — mirrors real Odone `form_source` column. Drives the small
 * portal badge in the agenda sidebar so editors can tell at a glance which
 * intake system created the order. "other" is a catch-all for manual orders.
 */
export type EventPortal = "fotello" | "hd-photo-hub" | "tonomo" | "other";

export type CalendarEvent = {
  id: string;
  /**
   * Order identifier matching the orders mock data (e.g. "ord-yorkshire").
   * Used to deep-link "Open order" from the event detail dialog.
   */
  orderId: string;
  title: string;
  client: string;
  shooterId: string;
  shooterName: string;
  shooterInitials: string;
  start: Date;
  end: Date;
  kind: EventKind;
  status: EventStatus;
  portal: EventPortal;
  notes?: string;
};

// Status tone classes — used both by event pills (background tint) and the
// agenda detail dialog. Aligns with DESIGN.md §5 status palette.
const STATUS_TONE: Record<EventStatus, string> = {
  scheduled:
    "bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30",
  "in-progress":
    "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  review:
    "bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/30",
  delivered:
    "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  overdue:
    "bg-rose-500/15 text-rose-400 ring-1 ring-inset ring-rose-500/30",
  cancelled:
    "bg-muted/40 text-muted-foreground ring-1 ring-inset ring-border",
};

const STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: "Scheduled",
  "in-progress": "In progress",
  review: "In review",
  delivered: "Delivered",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const KIND_LABEL: Record<EventKind, string> = {
  shoot: "Shoot",
  edit: "Edit",
  deliver: "Deliver",
};

const PORTAL_LABEL: Record<EventPortal, string> = {
  fotello: "Fotello",
  "hd-photo-hub": "HD Photo Hub",
  tonomo: "Tonomo",
  other: "Other",
};

export function statusTone(s: EventStatus): string {
  return STATUS_TONE[s];
}

export function statusLabel(s: EventStatus): string {
  return STATUS_LABEL[s];
}

export function kindLabel(k: EventKind): string {
  return KIND_LABEL[k];
}

export function portalLabel(p: EventPortal): string {
  return PORTAL_LABEL[p];
}

// Hash-based shooter palette — picks a stable tone per shooter id so calendars
// stay consistent across reloads and new shooters get a colour without manual
// wiring. Mirrors real Odone's `getShooterTone` fallback. Each tuple is
// (dotBg, softTint) — dot is the saturated bullet used in pills, tint is the
// month-pill background used to subtly group same-shooter events in a day.
const SHOOTER_PALETTE = [
  { dot: "bg-sky-400", tint: "bg-sky-500/10 text-sky-200 ring-sky-500/20" },
  {
    dot: "bg-violet-400",
    tint: "bg-violet-500/10 text-violet-200 ring-violet-500/20",
  },
  {
    dot: "bg-amber-400",
    tint: "bg-amber-500/10 text-amber-200 ring-amber-500/20",
  },
  {
    dot: "bg-emerald-400",
    tint: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20",
  },
  { dot: "bg-rose-400", tint: "bg-rose-500/10 text-rose-200 ring-rose-500/20" },
  { dot: "bg-cyan-400", tint: "bg-cyan-500/10 text-cyan-200 ring-cyan-500/20" },
] as const;

export type ShooterTone = (typeof SHOOTER_PALETTE)[number];

export function shooterTone(shooterId: string): ShooterTone {
  // djb2-style hash so dot colors stay stable per id. Empty/unknown ids fall
  // back to the first entry rather than throwing.
  if (!shooterId) return SHOOTER_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < shooterId.length; i++) {
    hash = shooterId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SHOOTER_PALETTE[Math.abs(hash) % SHOOTER_PALETTE.length];
}

/**
 * Visual decoration to layer onto cancelled events. Returned as a class string
 * so callers can append it to existing tone classes (`cn(statusTone(status),
 * status === "cancelled" && cancelledTone())`).
 *
 * Keeps cancelled rows readable but signals they shouldn't drive action — used
 * by EventPill, WeekView, AgendaSidebar, and the detail dialog.
 */
export function cancelledTone(): string {
  return "opacity-60 line-through";
}

/** Convenience: true when an event has been cancelled. */
export function isCancelled(e: CalendarEvent): boolean {
  return e.status === "cancelled";
}

// Map an event title (address) to the order id in orders-data. Anything not
// listed falls back to a deterministic synthetic id (`ord-misc-{slug}`) so a
// CalendarEvent always has a non-empty orderId for navigation wiring. The four
// addresses that exist in the orders mock data resolve to their real ord-* id;
// other addresses on the calendar (e.g. "33 Marina Ave") synthesise an id so
// the UI doesn't blow up when a user clicks "Open order".
const TITLE_TO_ORDER_ID: Record<string, string> = {
  "45 Yorkshire Dr": "ord-yorkshire",
  "13364 Beach Blvd": "ord-beach",
  "245 Ocean Blvd": "ord-ocean",
  "200 Lighthouse Cir": "ord-lighthouse",
};

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function orderIdForTitle(title: string): string {
  return TITLE_TO_ORDER_ID[title] ?? `ord-misc-${slugifyTitle(title)}`;
}

// Generate ~30 events scattered across May–June 2026 (a 60-day window around
// REF_NOW). Realistic real-estate workflow: morning shoots, midday edits,
// evening deliveries.
const SEED: Array<{
  offset: number;
  hour: number;
  durationMin: number;
  title: string;
  client: string;
  shooter: { id: string; name: string; initials: string };
  kind: EventKind;
  status: EventStatus;
  portal: EventPortal;
  notes?: string;
  /** Optional explicit override; otherwise resolved from TITLE_TO_ORDER_ID. */
  orderId?: string;
}> = [
  // Past — delivered or review
  { offset: -14, hour: 9, durationMin: 90, title: "45 Yorkshire Dr", client: "ACME Realty", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "delivered", portal: "fotello", notes: "Sunrise twilight + drone pass" },
  { offset: -12, hour: 14, durationMin: 60, title: "13364 Beach Blvd", client: "Sunshine Homes", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "delivered", portal: "hd-photo-hub" },
  { offset: -9, hour: 11, durationMin: 75, title: "200 Lighthouse Cir", client: "Coastal Group", shooter: { id: "sara", name: "Sara Chen", initials: "SC" }, kind: "shoot", status: "delivered", portal: "tonomo" },
  { offset: -7, hour: 9, durationMin: 90, title: "245 Ocean Blvd", client: "ACME Realty", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "review", portal: "fotello", notes: "Pending client approval on twilight set" },
  { offset: -5, hour: 13, durationMin: 60, title: "12 Pine St", client: "Sunshine Homes", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "cancelled", portal: "hd-photo-hub", notes: "Client postponed — rescheduling next week." },
  { offset: -4, hour: 16, durationMin: 30, title: "200 Lighthouse Cir", client: "Coastal Group", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "deliver", status: "delivered", portal: "tonomo" },
  { offset: -3, hour: 10, durationMin: 120, title: "5577 Magnolia Ln", client: "Heritage Realty", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "overdue", portal: "other", notes: "Editor flagged exposure issues" },

  // Today
  { offset: 0, hour: 9, durationMin: 90, title: "88 Coastal Way", client: "Coastal Group", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "in-progress", portal: "tonomo" },
  { offset: 0, hour: 12, durationMin: 60, title: "245 Ocean Blvd", client: "ACME Realty", shooter: { id: "sara", name: "Sara Chen", initials: "SC" }, kind: "edit", status: "in-progress", portal: "fotello" },
  { offset: 0, hour: 16, durationMin: 30, title: "13364 Beach Blvd", client: "Sunshine Homes", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "deliver", status: "scheduled", portal: "hd-photo-hub" },

  // Tomorrow / next 7 days
  { offset: 1, hour: 9, durationMin: 90, title: "33 Marina Ave", client: "Coastal Group", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "scheduled", portal: "tonomo" },
  { offset: 1, hour: 14, durationMin: 60, title: "1245 River Rd", client: "ACME Realty", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "scheduled", portal: "fotello" },
  { offset: 2, hour: 10, durationMin: 75, title: "100 Sunset Pl", client: "Sunshine Homes", shooter: { id: "sara", name: "Sara Chen", initials: "SC" }, kind: "shoot", status: "scheduled", portal: "hd-photo-hub" },
  { offset: 3, hour: 9, durationMin: 90, title: "77 Harbor Pt", client: "Heritage Realty", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "scheduled", portal: "other" },
  { offset: 3, hour: 15, durationMin: 45, title: "5577 Magnolia Ln", client: "Heritage Realty", shooter: { id: "sara", name: "Sara Chen", initials: "SC" }, kind: "edit", status: "scheduled", portal: "other" },
  { offset: 4, hour: 11, durationMin: 60, title: "1245 River Rd", client: "ACME Realty", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "scheduled", portal: "fotello" },
  { offset: 5, hour: 8, durationMin: 120, title: "800 Park Ave", client: "Coastal Group", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "scheduled", portal: "tonomo" },
  { offset: 6, hour: 13, durationMin: 90, title: "45 Yorkshire Dr", client: "ACME Realty", shooter: { id: "sara", name: "Sara Chen", initials: "SC" }, kind: "edit", status: "scheduled", portal: "fotello" },
  { offset: 7, hour: 10, durationMin: 60, title: "200 Lighthouse Cir", client: "Coastal Group", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "scheduled", portal: "tonomo" },

  // Next 7-30 days
  { offset: 9, hour: 9, durationMin: 90, title: "12 Pine St", client: "Sunshine Homes", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "scheduled", portal: "hd-photo-hub" },
  { offset: 10, hour: 14, durationMin: 60, title: "245 Ocean Blvd", client: "ACME Realty", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "scheduled", portal: "fotello" },
  { offset: 12, hour: 11, durationMin: 75, title: "88 Coastal Way", client: "Coastal Group", shooter: { id: "sara", name: "Sara Chen", initials: "SC" }, kind: "shoot", status: "scheduled", portal: "tonomo" },
  { offset: 14, hour: 9, durationMin: 90, title: "33 Marina Ave", client: "Coastal Group", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "scheduled", portal: "tonomo" },
  { offset: 15, hour: 16, durationMin: 30, title: "100 Sunset Pl", client: "Sunshine Homes", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "deliver", status: "cancelled", portal: "hd-photo-hub", notes: "Owner pulled the listing." },
  { offset: 17, hour: 9, durationMin: 90, title: "1245 River Rd", client: "ACME Realty", shooter: { id: "sara", name: "Sara Chen", initials: "SC" }, kind: "shoot", status: "scheduled", portal: "fotello" },
  { offset: 18, hour: 10, durationMin: 120, title: "5577 Magnolia Ln", client: "Heritage Realty", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "scheduled", portal: "other" },
  { offset: 21, hour: 14, durationMin: 60, title: "77 Harbor Pt", client: "Heritage Realty", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "scheduled", portal: "other" },
  { offset: 24, hour: 9, durationMin: 90, title: "45 Yorkshire Dr", client: "ACME Realty", shooter: { id: "kyle", name: "Kyle Anderson", initials: "KA" }, kind: "shoot", status: "scheduled", portal: "fotello" },
  { offset: 26, hour: 13, durationMin: 60, title: "200 Lighthouse Cir", client: "Coastal Group", shooter: { id: "sara", name: "Sara Chen", initials: "SC" }, kind: "shoot", status: "scheduled", portal: "tonomo" },
  { offset: 28, hour: 10, durationMin: 90, title: "800 Park Ave", client: "Coastal Group", shooter: { id: "mj", name: "MJ Rivera", initials: "MR" }, kind: "shoot", status: "scheduled", portal: "tonomo" },
];

function buildEvent(
  seed: (typeof SEED)[number],
  index: number,
): CalendarEvent {
  const start = new Date(REF_NOW);
  start.setDate(start.getDate() + seed.offset);
  start.setHours(seed.hour, 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + seed.durationMin);
  return {
    id: `evt-${String(index).padStart(3, "0")}`,
    orderId: seed.orderId ?? orderIdForTitle(seed.title),
    title: seed.title,
    client: seed.client,
    shooterId: seed.shooter.id,
    shooterName: seed.shooter.name,
    shooterInitials: seed.shooter.initials,
    start,
    end,
    kind: seed.kind,
    status: seed.status,
    portal: seed.portal,
    notes: seed.notes,
  };
}

export const events: CalendarEvent[] = SEED.map(buildEvent);

// Convenience selectors -----------------------------------------------------

export function eventsInRange(start: Date, end: Date): CalendarEvent[] {
  return events.filter((e) => e.start >= start && e.start <= end);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  d.setMilliseconds(-1);
  return d;
}

/** Start of the week — Monday-first per real Odone convention. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const offset = dow === 0 ? 6 : dow - 1; // Sun → 6 days back, else dow - 1
  d.setDate(d.getDate() - offset);
  return d;
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatTimeRange(start: Date, end: Date): string {
  const fmt = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatTimeShort(d: Date): string {
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(":00", "");
}

export function formatDayHeader(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
