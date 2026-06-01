"use client";

// ============================================================================
// Odone — Order Detail mock data + types
// ----------------------------------------------------------------------------
// Single source of truth for the Order Detail page + Calendar v2 wiring in
// the Next.js 16 mockup. All real shapes mirrored from the v8 Supabase repo
// (see /Users/admin/Documents/Odone-v8-main/src/hooks/{useOrders,useDeliverable,
// useRawUploads,useComments}.ts). When wiring to Supabase later, swap these
// consts for React-Query hooks — the TS types here should remain stable.
//
// DESIGN.md compliance:
//   §3 icon system — kindIcon() returns lucide names from the locked map
//   §4 date format — formatDateUS / formatTimeRange (no relative time)
//   §5 status tone — statusTone() / deliverableStatusTone() use /10 + /15 only
// ============================================================================

// ============================================================================
// 1. Enums
// ============================================================================

/**
 * Order lifecycle. Mirrors v8 `orders.stage` (server-derived) but flattened to
 * a closed enum the UI can render directly.
 *
 * Progression: wait_to_shoot → awaiting_upload → uploaded → in_production → delivered.
 * In_production covers both "editor working" and "review with client" — sub-state
 * lives on each deliverable's DeliverableStatus.
 */
export type OrderStatus =
  | "wait_to_shoot"
  | "awaiting_upload"
  | "uploaded"
  | "in_production"
  | "delivered";

/** Per-deliverable lifecycle. Mirrors v8 `deliverables.status`. */
export type DeliverableStatus =
  | "not_started"
  | "in_progress"
  | "review"
  | "approved"
  | "delivered";

/** Deliverable category. Mirrors v8 `deliverables.kind`. */
export type DeliverableKind =
  | "video"
  | "photo"
  | "drone"
  | "floor_plan"
  | "3d_tour"
  | "walkthrough"
  | "twilight"
  | "virtual_staging";

/** Where the order came from. */
export type FormSource = "intake_form" | "calendar" | "walk_in";

/** Status of a single uploaded version inside a deliverable. */
export type DeliverableVersionStatus =
  | "processing"
  | "ready"
  | "approved"
  | "rejected"
  | "superseded";

// ============================================================================
// 2. Domain models
// ============================================================================

export type Comment = {
  id: string;
  version_id: string;
  author_name: string;
  author_initials: string;
  author_avatar: string;
  body: string;
  /**
   * Seconds offset into the video where the comment was placed. NULL for
   * photo / floor-plan deliverables and for top-level threads not pinned to
   * a frame. v8 stores this on `comments.timestamp_seconds`.
   */
  timestamp_seconds: number | null;
  created_at: string;
  resolved: boolean;
  replies?: Comment[];
};

export type DeliverableVersion = {
  id: string;
  deliverable_id: string;
  version_number: number;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
  uploaded_by_name: string;
  status: DeliverableVersionStatus;
  notes: string;
};

export type Deliverable = {
  id: string;
  order_id: string;
  kind: DeliverableKind;
  kindLabel: string;
  title: string;
  description: string;
  status: DeliverableStatus;
  assigned_editor_id: string | null;
  assigned_editor_name: string | null;
  /** Points at one entry inside `versions` — the version the UI shows by default. */
  current_version_id: string | null;
  delivered_at: string | null;
  versions: DeliverableVersion[];
  comments: Comment[];
  /** Picsum-seeded poster for grid/list rendering. */
  primary_thumbnail: string;
  /**
   * v12.3: when this deliverable was added from the catalog picker, holds
   * the source `Service.id`. Lets Upload/Assign rows resolve the canonical
   * catalog name/price via `serviceById()` instead of re-deriving from `kind`.
   * Null/undefined for legacy mock seeds (resolved by kind) and for custom
   * extras (resolved by `kindLabel`). See HANDOFF §3.k.
   */
  serviceId?: string;
  /**
   * v12.3: false means this item is reference material the editor doesn't
   * ship a version for (voiceover script, brand guidelines, look book…).
   * Pipeline gates (`editingDone`, `revisionDone`) skip these so adding a
   * reference item mid-project never freezes the pipeline. Defaults to true
   * when omitted, so legacy seeds keep current behavior. See HANDOFF §3.i.
   */
  requiresEditing?: boolean;
};

export type RawSummary = {
  count: number;
  bytes: number;
  last_uploaded_at: string | null;
};

export type Order = {
  id: string;
  display_number: number;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string;
  property_address: string;
  property_sqft?: number;
  property_lat?: number;
  property_lng?: number;
  scheduled_at: string;
  scheduled_end: string;
  assigned_shooter: string;
  shooter_name: string;
  shooter_initials: string;
  status: OrderStatus;
  /** When the shooter finished uploading all RAW assets. NULL while still pending. */
  raw_complete_at: string | null;
  delivered_at: string | null;
  form_source: FormSource;
  /** External cross-link to the portal that created the order (e.g. Fotello "#161"). */
  source_order_id: string | null;
  /** Deep link back to the Google Calendar event. */
  google_calendar_link: string | null;
  customer_notes: string;
  internal_notes: string;
  order_value_cents: number;
  weather_emoji: string;
  raw_summary: RawSummary;
  deliverables: Deliverable[];
};

export type RawUpload = {
  id: string;
  order_id: string;
  filename: string;
  byte_size: number;
  mime_type: string;
  kind: "photo" | "video" | "other";
  created_at: string;
  uploaded_by_name: string;
  thumbnail: string;
};

export type ChatMessage = {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name: string;
  sender_initials: string;
  sender_avatar: string;
  body: string;
  created_at: string;
  reactions?: { emoji: string; count: number }[];
};

export type ActivityEntry = {
  id: string;
  order_id: string;
  actor_name: string;
  actor_initials: string;
  action: string;
  target_type: "order" | "deliverable" | "version" | "raw_upload" | "comment" | "share_link";
  target_id: string;
  created_at: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type CatalogItem = {
  id: string;
  title: string;
  kind: DeliverableKind | "other";
  quantity: number;
  price_cents?: number;
  is_addon: boolean;
};

// ============================================================================
// 3. Reference clock + relative ISO helpers
// ============================================================================

/** Anchor "now" for deterministic mock data. Fed to all daysAgo()-style calls. */
export const REF_NOW = new Date("2026-05-30T10:00:00");

function iso(d: Date): string {
  return d.toISOString();
}

function shiftDays(days: number, hour = 10, minute = 0): string {
  const t = new Date(REF_NOW);
  t.setDate(t.getDate() + days);
  t.setHours(hour, minute, 0, 0);
  return iso(t);
}

function shiftHours(hours: number, baseDayShift = 0, baseHour = 10, baseMinute = 0): string {
  const t = new Date(REF_NOW);
  t.setDate(t.getDate() + baseDayShift);
  t.setHours(baseHour + hours, baseMinute, 0, 0);
  return iso(t);
}

function shiftMinutes(days: number, hour: number, minute: number): string {
  const t = new Date(REF_NOW);
  t.setDate(t.getDate() + days);
  t.setHours(hour, minute, 0, 0);
  return iso(t);
}

const MB = 1024 * 1024;

// ============================================================================
// 4. Status label + tone tables
// ============================================================================

export function statusLabel(s: OrderStatus): string {
  switch (s) {
    case "wait_to_shoot":
      return "Wait to shoot";
    case "awaiting_upload":
      return "Awaiting upload";
    case "uploaded":
      return "Uploaded";
    case "in_production":
      return "In production";
    case "delivered":
      return "Delivered";
  }
}

/**
 * v12.3: derive the current `OrderStatus` from live pipeline state rather
 * than reading the static seed. Used by the order detail header badge so
 * it advances as the user walks the demo (Wait to shoot → Awaiting upload
 * → Uploaded → In production → Delivered). Mirrors the gates in
 * `order-overview-tab.tsx::OrderOverviewTab`.
 *
 * Inputs that AREN'T on the Order yet (in-session mocks):
 *   - `confirmed`: true when the shooter has clicked "Confirm upload"
 *      (locally tracked in OrderOverviewTab, lifted by the page for sharing).
 *   - `extraAssignments`: assignment overrides per deliverable id. Lets
 *      the badge react to the user assigning editors mid-demo.
 *
 * `requiresEditing: false` items (custom reference extras) are excluded
 * from the assign / editing gates so they never freeze the badge.
 */
export function derivePipelineStatus(
  order: Order,
  opts: {
    confirmed?: boolean;
    extraAssignments?: Record<string, boolean>;
  } = {},
): OrderStatus {
  if (order.delivered_at) return "delivered";

  const filesPresent = order.raw_summary.count > 0;
  const uploadConfirmed = Boolean(order.raw_complete_at) || Boolean(opts.confirmed);

  if (!filesPresent && !uploadConfirmed) return "wait_to_shoot";
  if (!uploadConfirmed) return "awaiting_upload";

  const editable = order.deliverables.filter((d) => d.requiresEditing !== false);
  if (editable.length === 0) return "uploaded";

  const assignedCount = editable.filter(
    (d) =>
      Boolean(d.assigned_editor_name) ||
      Boolean(opts.extraAssignments?.[d.id]),
  ).length;
  if (assignedCount < editable.length) return "uploaded";

  return "in_production";
}

/**
 * Returns DESIGN.md §5 status tone class pair (background + text) for an
 * order status pill. Always /10 background, brighter /400 text.
 */
export function statusTone(s: OrderStatus): string {
  switch (s) {
    case "wait_to_shoot":
      return "bg-violet-500/10 text-violet-300";
    case "awaiting_upload":
      return "bg-amber-500/15 text-amber-300";
    case "uploaded":
      return "bg-sky-500/10 text-sky-400";
    case "in_production":
      return "bg-blue-500/10 text-blue-300";
    case "delivered":
      return "bg-emerald-500/10 text-emerald-400";
  }
}

export function deliverableStatusLabel(s: DeliverableStatus): string {
  switch (s) {
    case "not_started":
      return "Not started";
    case "in_progress":
      return "Editing";
    case "review":
      return "In review";
    case "approved":
      return "Approved";
    case "delivered":
      return "Delivered";
  }
}

export function deliverableStatusTone(s: DeliverableStatus): string {
  switch (s) {
    case "not_started":
      return "bg-muted text-muted-foreground";
    case "in_progress":
      return "bg-blue-500/10 text-blue-300";
    case "review":
      return "bg-amber-500/15 text-amber-300";
    case "approved":
      return "bg-emerald-500/10 text-emerald-400";
    case "delivered":
      return "bg-emerald-500/10 text-emerald-400";
  }
}

/**
 * Lucide icon name per DESIGN.md §3. Components import the actual component
 * from `lucide-react`; data layer just exposes the string so we don't pull
 * the icon library into a server-renderable data module.
 */
export function kindIcon(k: DeliverableKind): string {
  switch (k) {
    case "video":
      return "Video";
    case "walkthrough":
      return "Video";
    case "photo":
      return "Image";
    case "drone":
      return "Plane";
    case "floor_plan":
      return "Box";
    case "3d_tour":
      return "Box";
    case "twilight":
      return "Sun";
    case "virtual_staging":
      return "Home";
  }
}

export function kindLabel(k: DeliverableKind): string {
  switch (k) {
    case "video":
      return "Video";
    case "walkthrough":
      return "Video walkthrough";
    case "photo":
      return "Photo set";
    case "drone":
      return "Drone";
    case "floor_plan":
      return "Floor plan";
    case "3d_tour":
      return "3D tour";
    case "twilight":
      return "Twilight";
    case "virtual_staging":
      return "Virtual staging";
  }
}

// ============================================================================
// 5. Formatting helpers (re-exports + locals)
// ============================================================================

/** "May 30, 2026" — US absolute, per DESIGN.md §4. */
export function formatDateUS(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "May 30, 2026 · 2:30 PM" */
export function formatDateTimeUS(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}

/** "2:30 PM" */
export function formatTimeUS(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "9:00 AM – 10:30 AM" — for calendar / scheduled_at rendering. */
export function formatTimeRange(startIso: string, endIso: string): string {
  const start = formatTimeUS(startIso);
  const end = formatTimeUS(endIso);
  if (start === "—" || end === "—") return "—";
  return `${start} – ${end}`;
}

/** Bytes → "1.2 GB". Mirrored from uploads-data formatBytes. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const decimals = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 1;
  return `${v.toFixed(decimals)} ${units[i]}`;
}

/** Cents → "$1,250.00" */
export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

// ============================================================================
// 6. Shared people / shooters / editors directory
// ============================================================================

const PEOPLE = {
  shooterKyle: {
    id: "shooter-kyle",
    name: "Kyle Anderson",
    initials: "KA",
    avatar: "https://i.pravatar.cc/150?u=kyle",
  },
  shooterMJ: {
    id: "shooter-mj",
    name: "MJ Rivera",
    initials: "MJ",
    avatar: "https://i.pravatar.cc/150?u=mj",
  },
  shooterDana: {
    id: "shooter-dana",
    name: "Dana Park",
    initials: "DP",
    avatar: "https://i.pravatar.cc/150?u=dana",
  },
  editorMarry: {
    id: "editor-marry",
    name: "Marry Anderson",
    initials: "MA",
    avatar: "https://i.pravatar.cc/150?u=marry",
  },
  editorRienz: {
    id: "editor-rienz",
    name: "RienzZzy",
    initials: "RZ",
    avatar: "https://i.pravatar.cc/150?u=rienz",
  },
  editorMjp: {
    id: "editor-mjp",
    name: "MJ Pereira",
    initials: "MP",
    avatar: "https://i.pravatar.cc/150?u=mjpereira",
  },
  managerKyle: {
    id: "manager-kyle",
    name: "Kyle Norman",
    initials: "KN",
    avatar: "https://i.pravatar.cc/150?u=kylen",
  },
  clientSarah: {
    id: "client-sarah",
    name: "Sarah Connor",
    initials: "SC",
    avatar: "https://i.pravatar.cc/150?u=sarah",
  },
  clientAvery: {
    id: "client-avery",
    name: "Avery Bloom",
    initials: "AB",
    avatar: "https://i.pravatar.cc/150?u=avery",
  },
  clientDerek: {
    id: "client-derek",
    name: "Derek Holt",
    initials: "DH",
    avatar: "https://i.pravatar.cc/150?u=derek",
  },
} as const;

// ============================================================================
// 7. Order 1 — 45 Yorkshire Dr (in_production, the deep workflow demo)
// ============================================================================

const YORKSHIRE_VIDEO_VERSIONS: DeliverableVersion[] = [
  {
    id: "yk-v1-ver1",
    deliverable_id: "yk-deliv-video",
    version_number: 1,
    file_name: "45_Yorkshire_walkthrough_v1.mp4",
    file_size_bytes: 480 * MB,
    mime_type: "video/mp4",
    created_at: shiftMinutes(-3, 16, 12),
    uploaded_by_name: PEOPLE.editorRienz.name,
    status: "superseded",
    notes: "Initial cut — color slightly cool.",
  },
  {
    id: "yk-v1-ver2",
    deliverable_id: "yk-deliv-video",
    version_number: 2,
    file_name: "45_Yorkshire_walkthrough_v2.mp4",
    file_size_bytes: 520 * MB,
    mime_type: "video/mp4",
    created_at: shiftMinutes(-1, 9, 30),
    uploaded_by_name: PEOPLE.editorRienz.name,
    status: "ready",
    notes: "Pulled exposure on the kitchen island, re-graded twilight pan.",
  },
];

const YORKSHIRE_VIDEO_COMMENTS: Comment[] = [
  {
    id: "yk-c1",
    version_id: "yk-v1-ver2",
    author_name: PEOPLE.editorMarry.name,
    author_initials: PEOPLE.editorMarry.initials,
    author_avatar: PEOPLE.editorMarry.avatar,
    body: "Kitchen island still reads a bit muddy at 0:12 — can we brighten just the counter highlights another half stop?",
    timestamp_seconds: 12.5,
    created_at: shiftMinutes(-1, 11, 4),
    resolved: false,
    replies: [
      {
        id: "yk-c1r1",
        version_id: "yk-v1-ver2",
        author_name: PEOPLE.editorRienz.name,
        author_initials: PEOPLE.editorRienz.initials,
        author_avatar: PEOPLE.editorRienz.avatar,
        body: "On it — pushing a v3 in the next 30 minutes.",
        timestamp_seconds: 12.5,
        created_at: shiftMinutes(-1, 11, 14),
        resolved: false,
      },
    ],
  },
  {
    id: "yk-c2",
    version_id: "yk-v1-ver2",
    author_name: PEOPLE.managerKyle.name,
    author_initials: PEOPLE.managerKyle.initials,
    author_avatar: PEOPLE.managerKyle.avatar,
    body: "This pan is too fast — slow to 0.5x speed and let viewers register the staircase detail.",
    timestamp_seconds: 47,
    created_at: shiftMinutes(-1, 13, 22),
    resolved: false,
  },
  {
    id: "yk-c3",
    version_id: "yk-v1-ver2",
    author_name: PEOPLE.editorMarry.name,
    author_initials: PEOPLE.editorMarry.initials,
    author_avatar: PEOPLE.editorMarry.avatar,
    body: "Color grade matches set tone — looks great here. Approving this section.",
    timestamp_seconds: 90,
    created_at: shiftMinutes(-1, 14, 0),
    resolved: true,
  },
  {
    id: "yk-c4",
    version_id: "yk-v1-ver2",
    author_name: PEOPLE.managerKyle.name,
    author_initials: PEOPLE.managerKyle.initials,
    author_avatar: PEOPLE.managerKyle.avatar,
    body: "Remove the drone shot at 02:15 — it cuts the indoor flow and the framing is a little crooked.",
    timestamp_seconds: 135,
    created_at: shiftMinutes(-1, 15, 41),
    resolved: false,
  },
];

const YORKSHIRE_PHOTO_VERSIONS: DeliverableVersion[] = [
  {
    id: "yk-photo-ver1",
    deliverable_id: "yk-deliv-photo",
    version_number: 1,
    file_name: "45_Yorkshire_photos_v1.zip",
    file_size_bytes: 380 * MB,
    mime_type: "application/zip",
    created_at: shiftMinutes(-2, 18, 0),
    uploaded_by_name: PEOPLE.editorMarry.name,
    status: "approved",
    notes: "All 30 hero photos color-matched against the twilight set.",
  },
];

const YORKSHIRE_DRONE_VERSIONS: DeliverableVersion[] = [
  {
    id: "yk-drone-ver1",
    deliverable_id: "yk-deliv-drone",
    version_number: 1,
    file_name: "45_Yorkshire_drone_master.mp4",
    file_size_bytes: 710 * MB,
    mime_type: "video/mp4",
    created_at: shiftMinutes(-2, 17, 30),
    uploaded_by_name: PEOPLE.editorMjp.name,
    status: "approved",
    notes: "Approved, sent to client via share link YK-DRONE-001.",
  },
];

const YORKSHIRE_DELIVERABLES: Deliverable[] = [
  {
    id: "yk-deliv-video",
    order_id: "ord-yorkshire",
    kind: "walkthrough",
    kindLabel: kindLabel("walkthrough"),
    title: "Master walkthrough",
    description:
      "2-minute branded walkthrough — emphasize island lighting, primary suite, and twilight closing.",
    status: "review",
    assigned_editor_id: PEOPLE.editorRienz.id,
    assigned_editor_name: PEOPLE.editorRienz.name,
    current_version_id: "yk-v1-ver2",
    delivered_at: null,
    versions: YORKSHIRE_VIDEO_VERSIONS,
    comments: YORKSHIRE_VIDEO_COMMENTS,
    primary_thumbnail: "https://picsum.photos/seed/yk-vid/640/360",
  },
  {
    id: "yk-deliv-photo",
    order_id: "ord-yorkshire",
    kind: "photo",
    kindLabel: kindLabel("photo"),
    title: "Hero photo set (30)",
    description: "Front exterior, kitchen, primary suite, twilight exteriors.",
    status: "approved",
    assigned_editor_id: PEOPLE.editorMarry.id,
    assigned_editor_name: PEOPLE.editorMarry.name,
    current_version_id: "yk-photo-ver1",
    delivered_at: null,
    versions: YORKSHIRE_PHOTO_VERSIONS,
    comments: [
      {
        id: "yk-pc1",
        version_id: "yk-photo-ver1",
        author_name: PEOPLE.clientSarah.name,
        author_initials: PEOPLE.clientSarah.initials,
        author_avatar: PEOPLE.clientSarah.avatar,
        body: "These look spectacular — exteriors especially. Approving the set.",
        timestamp_seconds: null,
        created_at: shiftMinutes(-2, 19, 12),
        resolved: true,
      },
    ],
    primary_thumbnail: "https://picsum.photos/seed/yk-photo/640/360",
  },
  {
    id: "yk-deliv-drone",
    order_id: "ord-yorkshire",
    kind: "drone",
    kindLabel: kindLabel("drone"),
    title: "Drone reveal pass",
    description: "60-second drone reveal, opening on the cul-de-sac approach.",
    status: "delivered",
    assigned_editor_id: PEOPLE.editorMjp.id,
    assigned_editor_name: PEOPLE.editorMjp.name,
    current_version_id: "yk-drone-ver1",
    delivered_at: shiftMinutes(-2, 18, 5),
    versions: YORKSHIRE_DRONE_VERSIONS,
    comments: [
      {
        id: "yk-dc1",
        version_id: "yk-drone-ver1",
        author_name: PEOPLE.clientSarah.name,
        author_initials: PEOPLE.clientSarah.initials,
        author_avatar: PEOPLE.clientSarah.avatar,
        body: "Drone reveal is gorgeous, exactly the vibe we wanted.",
        timestamp_seconds: 8,
        created_at: shiftMinutes(-2, 19, 30),
        resolved: true,
      },
    ],
    primary_thumbnail: "https://picsum.photos/seed/yk-drone/640/360",
  },
];

// ============================================================================
// 8. Order 2 — 13364 Beach Blvd (awaiting_upload, today)
// ============================================================================

const BEACH_DELIVERABLES: Deliverable[] = [
  {
    id: "bb-deliv-video",
    order_id: "ord-beach",
    kind: "walkthrough",
    kindLabel: kindLabel("walkthrough"),
    title: "Branded walkthrough",
    description: "Standard 90-second branded walkthrough, agent voice-over.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-vid/640/360",
  },
  {
    id: "bb-deliv-photo",
    order_id: "ord-beach",
    kind: "photo",
    kindLabel: kindLabel("photo"),
    title: "Hero photo set (25)",
    description: "Front exterior + interior staging set.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-photo/640/360",
  },
  // v12.2: extended BEACH order to 10 deliverables so the ShootUploadDialog
  // can be reviewed at full density. Mix of capture-required items + two
  // pre-made (virtual_staging + 3d_tour) so the "no upload needed" row
  // path is also exercised.
  {
    id: "bb-deliv-twilight",
    order_id: "ord-beach",
    kind: "twilight",
    kindLabel: kindLabel("twilight"),
    title: "Twilight exteriors (6)",
    description: "Front + side angles at golden hour.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-tw/640/360",
  },
  {
    id: "bb-deliv-drone-photo",
    order_id: "ord-beach",
    kind: "drone",
    kindLabel: kindLabel("drone"),
    title: "Aerial stills (8)",
    description: "Top-down + 45° hero shots showcasing the cul-de-sac.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-drone1/640/360",
  },
  {
    id: "bb-deliv-drone-video",
    order_id: "ord-beach",
    kind: "drone",
    kindLabel: kindLabel("drone"),
    title: "Drone reveal (45s)",
    description: "Open on the water, pull back to reveal the property.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-drone2/640/360",
  },
  {
    id: "bb-deliv-floor",
    order_id: "ord-beach",
    kind: "floor_plan",
    kindLabel: kindLabel("floor_plan"),
    title: "Floor plan — 2D",
    description: "Measured on-site, deliver dimensions in feet.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-floor/640/360",
  },
  {
    id: "bb-deliv-walk-cinematic",
    order_id: "ord-beach",
    kind: "walkthrough",
    kindLabel: kindLabel("walkthrough"),
    title: "Cinematic walkthrough (60s)",
    description: "Unbranded cinematic cut for social.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-cine/640/360",
  },
  {
    id: "bb-deliv-detail",
    order_id: "ord-beach",
    kind: "photo",
    kindLabel: kindLabel("photo"),
    title: "Detail / lifestyle (15)",
    description: "Close-ups of finishes, fixtures, hardware.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-detail/640/360",
  },
  {
    id: "bb-deliv-video-short",
    order_id: "ord-beach",
    kind: "video",
    kindLabel: kindLabel("video"),
    title: "Vertical reel (30s)",
    description: "Native 9:16 cut for Instagram + TikTok.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-reel/640/360",
  },
  {
    id: "bb-deliv-staging",
    order_id: "ord-beach",
    kind: "virtual_staging",
    kindLabel: kindLabel("virtual_staging"),
    title: "Virtual staging — empty rooms",
    description:
      "Applied to existing hero photos. No on-site shoot required.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-stage/640/360",
  },
  {
    id: "bb-deliv-3d",
    order_id: "ord-beach",
    kind: "3d_tour",
    kindLabel: kindLabel("3d_tour"),
    title: "Matterport 3D tour",
    description:
      "Outsourced scan — partner team uploads the model directly.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/bb-3d/640/360",
  },
];

// ============================================================================
// 9. Order 3 — 245 Ocean Blvd (wait_to_shoot, tomorrow)
// ============================================================================

const OCEAN_DELIVERABLES: Deliverable[] = [
  {
    id: "ob-deliv-video",
    order_id: "ord-ocean",
    kind: "walkthrough",
    kindLabel: kindLabel("walkthrough"),
    title: "Master walkthrough",
    description: "2-minute cinematic walkthrough, exterior to interior.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/ob-vid/640/360",
  },
  {
    id: "ob-deliv-photo",
    order_id: "ord-ocean",
    kind: "photo",
    kindLabel: kindLabel("photo"),
    title: "Hero photo set (30)",
    description: "Beach view, interiors, primary suite, twilight optional.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/ob-photo/640/360",
  },
  {
    id: "ob-deliv-drone",
    order_id: "ord-ocean",
    kind: "drone",
    kindLabel: kindLabel("drone"),
    title: "Drone reveal",
    description: "60-second drone reveal — ocean-front approach.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/ob-drone/640/360",
  },
  {
    id: "ob-deliv-twilight",
    order_id: "ord-ocean",
    kind: "twilight",
    kindLabel: kindLabel("twilight"),
    title: "Twilight photos (6)",
    description: "Golden-hour + blue-hour exterior set, 6 selects.",
    status: "not_started",
    assigned_editor_id: null,
    assigned_editor_name: null,
    current_version_id: null,
    delivered_at: null,
    versions: [],
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/ob-twilight/640/360",
  },
];

// ============================================================================
// 10. Order 4 — 200 Lighthouse Cir (delivered, -7 days)
// ============================================================================

const LIGHTHOUSE_VIDEO_VERSIONS: DeliverableVersion[] = [
  {
    id: "lh-v1-ver1",
    deliverable_id: "lh-deliv-video",
    version_number: 1,
    file_name: "200_Lighthouse_walkthrough_v1.mp4",
    file_size_bytes: 410 * MB,
    mime_type: "video/mp4",
    created_at: shiftMinutes(-9, 14, 20),
    uploaded_by_name: PEOPLE.editorRienz.name,
    status: "superseded",
    notes: "First pass — pacing was slow in the foyer.",
  },
  {
    id: "lh-v1-ver2",
    deliverable_id: "lh-deliv-video",
    version_number: 2,
    file_name: "200_Lighthouse_walkthrough_v2.mp4",
    file_size_bytes: 440 * MB,
    mime_type: "video/mp4",
    created_at: shiftMinutes(-8, 11, 12),
    uploaded_by_name: PEOPLE.editorRienz.name,
    status: "approved",
    notes: "Approved by client; tightened intro to 8s.",
  },
];

const LIGHTHOUSE_PHOTO_VERSIONS: DeliverableVersion[] = [
  {
    id: "lh-photo-ver1",
    deliverable_id: "lh-deliv-photo",
    version_number: 1,
    file_name: "200_Lighthouse_photos_v1.zip",
    file_size_bytes: 340 * MB,
    mime_type: "application/zip",
    created_at: shiftMinutes(-9, 16, 0),
    uploaded_by_name: PEOPLE.editorMarry.name,
    status: "approved",
    notes: "Approved as final delivery set.",
  },
];

const LIGHTHOUSE_FLOORPLAN_VERSIONS: DeliverableVersion[] = [
  {
    id: "lh-fp-ver1",
    deliverable_id: "lh-deliv-floorplan",
    version_number: 1,
    file_name: "200_Lighthouse_floorplan.pdf",
    file_size_bytes: 4 * MB,
    mime_type: "application/pdf",
    created_at: shiftMinutes(-9, 12, 0),
    uploaded_by_name: PEOPLE.editorMjp.name,
    status: "approved",
    notes: "Final floor plan, color-coded by room function.",
  },
];

const LIGHTHOUSE_DELIVERABLES: Deliverable[] = [
  {
    id: "lh-deliv-video",
    order_id: "ord-lighthouse",
    kind: "walkthrough",
    kindLabel: kindLabel("walkthrough"),
    title: "Branded walkthrough",
    description: "2-minute branded walkthrough, oceanfront emphasis.",
    status: "delivered",
    assigned_editor_id: PEOPLE.editorRienz.id,
    assigned_editor_name: PEOPLE.editorRienz.name,
    current_version_id: "lh-v1-ver2",
    delivered_at: shiftMinutes(-7, 9, 30),
    versions: LIGHTHOUSE_VIDEO_VERSIONS,
    comments: [
      {
        id: "lh-vc1",
        version_id: "lh-v1-ver2",
        author_name: PEOPLE.clientAvery.name,
        author_initials: PEOPLE.clientAvery.initials,
        author_avatar: PEOPLE.clientAvery.avatar,
        body: "Approved — sharing with the listing team today.",
        timestamp_seconds: null,
        created_at: shiftMinutes(-7, 9, 35),
        resolved: true,
      },
    ],
    primary_thumbnail: "https://picsum.photos/seed/lh-vid/640/360",
  },
  {
    id: "lh-deliv-photo",
    order_id: "ord-lighthouse",
    kind: "photo",
    kindLabel: kindLabel("photo"),
    title: "Hero photo set (28)",
    description: "Full interior + exterior + twilight composite.",
    status: "delivered",
    assigned_editor_id: PEOPLE.editorMarry.id,
    assigned_editor_name: PEOPLE.editorMarry.name,
    current_version_id: "lh-photo-ver1",
    delivered_at: shiftMinutes(-7, 9, 32),
    versions: LIGHTHOUSE_PHOTO_VERSIONS,
    comments: [
      {
        id: "lh-pc1",
        version_id: "lh-photo-ver1",
        author_name: PEOPLE.clientAvery.name,
        author_initials: PEOPLE.clientAvery.initials,
        author_avatar: PEOPLE.clientAvery.avatar,
        body: "Beautiful work, especially the twilight composites.",
        timestamp_seconds: null,
        created_at: shiftMinutes(-7, 10, 8),
        resolved: true,
      },
    ],
    primary_thumbnail: "https://picsum.photos/seed/lh-photo/640/360",
  },
  {
    id: "lh-deliv-floorplan",
    order_id: "ord-lighthouse",
    kind: "floor_plan",
    kindLabel: kindLabel("floor_plan"),
    title: "Branded floor plan",
    description: "Color-coded by room function, dimensions included.",
    status: "delivered",
    assigned_editor_id: PEOPLE.editorMjp.id,
    assigned_editor_name: PEOPLE.editorMjp.name,
    current_version_id: "lh-fp-ver1",
    delivered_at: shiftMinutes(-7, 9, 40),
    versions: LIGHTHOUSE_FLOORPLAN_VERSIONS,
    comments: [],
    primary_thumbnail: "https://picsum.photos/seed/lh-fp/640/360",
  },
];

// ============================================================================
// 11. Orders array
// ============================================================================

export const orders: Order[] = [
  // ---- Order 1 — 45 Yorkshire Dr ----
  {
    id: "ord-yorkshire",
    display_number: 1042,
    client_name: "Sarah Connor",
    client_email: "sarah.connor@acmerealty.com",
    client_phone: "+1 (904) 555-0142",
    client_company: "ACME Realty",
    property_address: "45 Yorkshire Dr, Saint Augustine, FL 32092",
    property_sqft: 3120,
    property_lat: 29.9012,
    property_lng: -81.4279,
    scheduled_at: shiftMinutes(-3, 9, 0),
    scheduled_end: shiftMinutes(-3, 10, 30),
    assigned_shooter: PEOPLE.shooterKyle.id,
    shooter_name: PEOPLE.shooterKyle.name,
    shooter_initials: PEOPLE.shooterKyle.initials,
    status: "in_production",
    raw_complete_at: shiftMinutes(-3, 12, 30),
    delivered_at: null,
    form_source: "intake_form",
    source_order_id: "FOTELLO-1042",
    google_calendar_link:
      "https://www.google.com/calendar/event?eid=mock_yorkshire_evt",
    customer_notes:
      "Lockbox code 4422. Owners ask for extra detail shots of the chef's kitchen island and the new pergola in the backyard. Twilight shoot preferred if weather holds.",
    internal_notes:
      "Realtor Sarah has flagged this as her flagship listing for the quarter. Keep her looped in on Slack #acme-realty.",
    order_value_cents: 89500,
    weather_emoji: "☀️",
    raw_summary: {
      count: 12,
      bytes: 4_280_000_000,
      last_uploaded_at: shiftMinutes(-3, 12, 30),
    },
    deliverables: YORKSHIRE_DELIVERABLES,
  },

  // ---- Order 2 — 13364 Beach Blvd ----
  {
    id: "ord-beach",
    display_number: 1043,
    client_name: "Avery Bloom",
    client_email: "avery@sunshinehomes.com",
    client_phone: "+1 (904) 555-0188",
    client_company: "Sunshine Homes",
    property_address: "13364 Beach Blvd, Jacksonville, FL 32224",
    property_sqft: 2480,
    property_lat: 30.2902,
    property_lng: -81.3936,
    scheduled_at: shiftMinutes(0, 13, 0),
    scheduled_end: shiftMinutes(0, 14, 30),
    assigned_shooter: PEOPLE.shooterMJ.id,
    shooter_name: PEOPLE.shooterMJ.name,
    shooter_initials: PEOPLE.shooterMJ.initials,
    status: "awaiting_upload",
    raw_complete_at: null,
    delivered_at: null,
    form_source: "calendar",
    source_order_id: null,
    google_calendar_link:
      "https://www.google.com/calendar/event?eid=mock_beach_evt",
    customer_notes:
      "Two-car garage, please include drone of the cul-de-sac and a sunset photo if time allows.",
    internal_notes: "Sunshine Homes — net-30 invoicing.",
    order_value_cents: 64500,
    weather_emoji: "⛅",
    raw_summary: {
      count: 0,
      bytes: 0,
      last_uploaded_at: null,
    },
    deliverables: BEACH_DELIVERABLES,
  },

  // ---- Order 3 — 245 Ocean Blvd ----
  {
    id: "ord-ocean",
    display_number: 1044,
    client_name: "Sarah Connor",
    client_email: "sarah.connor@acmerealty.com",
    client_phone: "+1 (904) 555-0142",
    client_company: "ACME Realty",
    property_address: "245 Ocean Blvd, Jacksonville Beach, FL 32250",
    property_sqft: 4200,
    property_lat: 30.2891,
    property_lng: -81.3922,
    scheduled_at: shiftMinutes(1, 9, 30),
    scheduled_end: shiftMinutes(1, 11, 30),
    assigned_shooter: PEOPLE.shooterDana.id,
    shooter_name: PEOPLE.shooterDana.name,
    shooter_initials: PEOPLE.shooterDana.initials,
    status: "wait_to_shoot",
    raw_complete_at: null,
    delivered_at: null,
    form_source: "intake_form",
    source_order_id: "FOTELLO-1044",
    google_calendar_link:
      "https://www.google.com/calendar/event?eid=mock_ocean_evt",
    customer_notes:
      "Hero listing — ocean-front estate. Twilight blue-hour MUST be captured. Owners away during shoot; lockbox code on intake form.",
    internal_notes: "Top priority. Confirm drone clearance the morning of.",
    order_value_cents: 152000,
    weather_emoji: "☀️",
    // v12: bumped raw count > 0 + left deliverables.assigned_editor_id = null
    // so this order sits at Pipeline Step 2 (Assign) — used as the demo
    // case for explaining the assign flow.
    raw_summary: {
      count: 18,
      bytes: 4_800_000_000,
      last_uploaded_at: "2026-05-30T11:00:00",
    },
    deliverables: OCEAN_DELIVERABLES,
  },

  // ---- Order 4 — 200 Lighthouse Cir ----
  {
    id: "ord-lighthouse",
    display_number: 1035,
    client_name: "Derek Holt",
    client_email: "derek.holt@coastalgroup.com",
    client_phone: "+1 (904) 555-0211",
    client_company: "Coastal Group",
    property_address: "200 Lighthouse Cir, Vilano Beach, FL 32084",
    property_sqft: 2960,
    property_lat: 29.9272,
    property_lng: -81.2706,
    scheduled_at: shiftMinutes(-7, 10, 0),
    scheduled_end: shiftMinutes(-7, 11, 30),
    assigned_shooter: PEOPLE.shooterMJ.id,
    shooter_name: PEOPLE.shooterMJ.name,
    shooter_initials: PEOPLE.shooterMJ.initials,
    status: "delivered",
    raw_complete_at: shiftMinutes(-9, 14, 0),
    delivered_at: shiftMinutes(-7, 9, 32),
    form_source: "calendar",
    source_order_id: null,
    google_calendar_link:
      "https://www.google.com/calendar/event?eid=mock_lighthouse_evt",
    customer_notes: "Property is staged through Friday; please be quiet around 11 AM as owners are working from home.",
    internal_notes: "Final delivered set; archive after invoice clears.",
    order_value_cents: 78500,
    weather_emoji: "🌤️",
    raw_summary: {
      count: 24,
      bytes: 8_750_000_000,
      last_uploaded_at: shiftMinutes(-9, 14, 0),
    },
    deliverables: LIGHTHOUSE_DELIVERABLES,
  },
];

// ============================================================================
// 12. Raw uploads (keyed by order)
// ============================================================================

function rawSeed(
  id: string,
  orderId: string,
  filename: string,
  kind: "photo" | "video" | "other",
  size: number,
  mime: string,
  uploadedAt: string,
  uploadedByName: string,
  seed: string,
): RawUpload {
  return {
    id,
    order_id: orderId,
    filename,
    byte_size: size,
    mime_type: mime,
    kind,
    created_at: uploadedAt,
    uploaded_by_name: uploadedByName,
    thumbnail:
      kind === "other"
        ? ""
        : `https://picsum.photos/seed/${seed}/600/400`,
  };
}

const YK = PEOPLE.shooterKyle.name;
const MJN = PEOPLE.shooterMJ.name;

export const rawUploads: RawUpload[] = [
  // ---- 45 Yorkshire (12) ----
  rawSeed("ru-yk-1", "ord-yorkshire", "DSC_1201.jpg", "photo", 18 * MB, "image/jpeg", shiftMinutes(-3, 11, 22), YK, "ru-yk-1"),
  rawSeed("ru-yk-2", "ord-yorkshire", "DSC_1202.jpg", "photo", 16 * MB, "image/jpeg", shiftMinutes(-3, 11, 24), YK, "ru-yk-2"),
  rawSeed("ru-yk-3", "ord-yorkshire", "DSC_1203.jpg", "photo", 22 * MB, "image/jpeg", shiftMinutes(-3, 11, 26), YK, "ru-yk-3"),
  rawSeed("ru-yk-4", "ord-yorkshire", "DSC_1204.jpg", "photo", 14 * MB, "image/jpeg", shiftMinutes(-3, 11, 28), YK, "ru-yk-4"),
  rawSeed("ru-yk-5", "ord-yorkshire", "DSC_1205.jpg", "photo", 17 * MB, "image/jpeg", shiftMinutes(-3, 11, 30), YK, "ru-yk-5"),
  rawSeed("ru-yk-6", "ord-yorkshire", "DSC_1206.jpg", "photo", 19 * MB, "image/jpeg", shiftMinutes(-3, 11, 32), YK, "ru-yk-6"),
  rawSeed("ru-yk-7", "ord-yorkshire", "DSC_1207.jpg", "photo", 21 * MB, "image/jpeg", shiftMinutes(-3, 11, 36), YK, "ru-yk-7"),
  rawSeed("ru-yk-8", "ord-yorkshire", "DSC_1208.jpg", "photo", 15 * MB, "image/jpeg", shiftMinutes(-3, 11, 40), YK, "ru-yk-8"),
  rawSeed("ru-yk-9", "ord-yorkshire", "walkthrough_main.mp4", "video", 820 * MB, "video/mp4", shiftMinutes(-3, 12, 5), YK, "ru-yk-9"),
  rawSeed("ru-yk-10", "ord-yorkshire", "drone_pass_01.mp4", "video", 640 * MB, "video/mp4", shiftMinutes(-3, 12, 14), YK, "ru-yk-10"),
  rawSeed("ru-yk-11", "ord-yorkshire", "drone_pass_02.mp4", "video", 580 * MB, "video/mp4", shiftMinutes(-3, 12, 22), YK, "ru-yk-11"),
  rawSeed("ru-yk-12", "ord-yorkshire", "floorplan_scan.pdf", "other", 4 * MB, "application/pdf", shiftMinutes(-3, 12, 30), YK, "ru-yk-12"),

  // ---- 200 Lighthouse (24) ----
  rawSeed("ru-lh-1", "ord-lighthouse", "IMG_5710.jpg", "photo", 17 * MB, "image/jpeg", shiftMinutes(-9, 13, 12), MJN, "ru-lh-1"),
  rawSeed("ru-lh-2", "ord-lighthouse", "IMG_5711.jpg", "photo", 18 * MB, "image/jpeg", shiftMinutes(-9, 13, 14), MJN, "ru-lh-2"),
  rawSeed("ru-lh-3", "ord-lighthouse", "IMG_5712.jpg", "photo", 16 * MB, "image/jpeg", shiftMinutes(-9, 13, 16), MJN, "ru-lh-3"),
  rawSeed("ru-lh-4", "ord-lighthouse", "IMG_5713.jpg", "photo", 19 * MB, "image/jpeg", shiftMinutes(-9, 13, 18), MJN, "ru-lh-4"),
  rawSeed("ru-lh-5", "ord-lighthouse", "IMG_5714.jpg", "photo", 22 * MB, "image/jpeg", shiftMinutes(-9, 13, 20), MJN, "ru-lh-5"),
  rawSeed("ru-lh-6", "ord-lighthouse", "IMG_5715.jpg", "photo", 18 * MB, "image/jpeg", shiftMinutes(-9, 13, 22), MJN, "ru-lh-6"),
  rawSeed("ru-lh-7", "ord-lighthouse", "IMG_5716.jpg", "photo", 16 * MB, "image/jpeg", shiftMinutes(-9, 13, 24), MJN, "ru-lh-7"),
  rawSeed("ru-lh-8", "ord-lighthouse", "IMG_5717.jpg", "photo", 17 * MB, "image/jpeg", shiftMinutes(-9, 13, 26), MJN, "ru-lh-8"),
  rawSeed("ru-lh-9", "ord-lighthouse", "IMG_5718.jpg", "photo", 19 * MB, "image/jpeg", shiftMinutes(-9, 13, 28), MJN, "ru-lh-9"),
  rawSeed("ru-lh-10", "ord-lighthouse", "IMG_5719.jpg", "photo", 22 * MB, "image/jpeg", shiftMinutes(-9, 13, 30), MJN, "ru-lh-10"),
  rawSeed("ru-lh-11", "ord-lighthouse", "IMG_5720.jpg", "photo", 14 * MB, "image/jpeg", shiftMinutes(-9, 13, 32), MJN, "ru-lh-11"),
  rawSeed("ru-lh-12", "ord-lighthouse", "IMG_5721.jpg", "photo", 13 * MB, "image/jpeg", shiftMinutes(-9, 13, 34), MJN, "ru-lh-12"),
  rawSeed("ru-lh-13", "ord-lighthouse", "IMG_5722.jpg", "photo", 18 * MB, "image/jpeg", shiftMinutes(-9, 13, 36), MJN, "ru-lh-13"),
  rawSeed("ru-lh-14", "ord-lighthouse", "IMG_5723.jpg", "photo", 16 * MB, "image/jpeg", shiftMinutes(-9, 13, 38), MJN, "ru-lh-14"),
  rawSeed("ru-lh-15", "ord-lighthouse", "IMG_5724.jpg", "photo", 17 * MB, "image/jpeg", shiftMinutes(-9, 13, 40), MJN, "ru-lh-15"),
  rawSeed("ru-lh-16", "ord-lighthouse", "IMG_5725.jpg", "photo", 19 * MB, "image/jpeg", shiftMinutes(-9, 13, 42), MJN, "ru-lh-16"),
  rawSeed("ru-lh-17", "ord-lighthouse", "twilight_set_01.jpg", "photo", 24 * MB, "image/jpeg", shiftMinutes(-9, 19, 22), MJN, "ru-lh-17"),
  rawSeed("ru-lh-18", "ord-lighthouse", "twilight_set_02.jpg", "photo", 26 * MB, "image/jpeg", shiftMinutes(-9, 19, 24), MJN, "ru-lh-18"),
  rawSeed("ru-lh-19", "ord-lighthouse", "twilight_set_03.jpg", "photo", 25 * MB, "image/jpeg", shiftMinutes(-9, 19, 26), MJN, "ru-lh-19"),
  rawSeed("ru-lh-20", "ord-lighthouse", "walkthrough_master.mp4", "video", 510 * MB, "video/mp4", shiftMinutes(-9, 14, 0), MJN, "ru-lh-20"),
  rawSeed("ru-lh-21", "ord-lighthouse", "drone_orbit_01.mp4", "video", 980 * MB, "video/mp4", shiftMinutes(-9, 14, 30), MJN, "ru-lh-21"),
  rawSeed("ru-lh-22", "ord-lighthouse", "drone_orbit_02.mp4", "video", 740 * MB, "video/mp4", shiftMinutes(-9, 14, 44), MJN, "ru-lh-22"),
  rawSeed("ru-lh-23", "ord-lighthouse", "floorplan_scan.pdf", "other", 3 * MB, "application/pdf", shiftMinutes(-9, 14, 50), MJN, "ru-lh-23"),
  rawSeed("ru-lh-24", "ord-lighthouse", "site_notes.txt", "other", 24 * 1024, "text/plain", shiftMinutes(-9, 14, 52), MJN, "ru-lh-24"),
];

// ============================================================================
// 13. Chat messages (per-order project chat)
// ============================================================================

export const chatMessages: ChatMessage[] = [
  // ---- 45 Yorkshire — 5 messages ----
  {
    id: "msg-yk-1",
    order_id: "ord-yorkshire",
    sender_id: PEOPLE.shooterKyle.id,
    sender_name: PEOPLE.shooterKyle.name,
    sender_initials: PEOPLE.shooterKyle.initials,
    sender_avatar: PEOPLE.shooterKyle.avatar,
    body: "Wrapped at 45 Yorkshire — uploading the full set now, should be done within the hour.",
    created_at: shiftMinutes(-3, 10, 35),
  },
  {
    id: "msg-yk-2",
    order_id: "ord-yorkshire",
    sender_id: PEOPLE.editorRienz.id,
    sender_name: PEOPLE.editorRienz.name,
    sender_initials: PEOPLE.editorRienz.initials,
    sender_avatar: PEOPLE.editorRienz.avatar,
    body: "Got it — I'll start the walkthrough cut as soon as the RAW lands.",
    created_at: shiftMinutes(-3, 10, 38),
  },
  {
    id: "msg-yk-3",
    order_id: "ord-yorkshire",
    sender_id: PEOPLE.editorRienz.id,
    sender_name: PEOPLE.editorRienz.name,
    sender_initials: PEOPLE.editorRienz.initials,
    sender_avatar: PEOPLE.editorRienz.avatar,
    body: "Posted v2 of the walkthrough — pulled exposure on the kitchen island and re-graded the twilight pan.",
    created_at: shiftMinutes(-1, 9, 32),
    reactions: [{ emoji: "👀", count: 2 }],
  },
  {
    id: "msg-yk-4",
    order_id: "ord-yorkshire",
    sender_id: PEOPLE.editorMarry.id,
    sender_name: PEOPLE.editorMarry.name,
    sender_initials: PEOPLE.editorMarry.initials,
    sender_avatar: PEOPLE.editorMarry.avatar,
    body: "Nice — left a comment on the kitchen island, otherwise looking sharp.",
    created_at: shiftMinutes(-1, 11, 5),
  },
  {
    id: "msg-yk-5",
    order_id: "ord-yorkshire",
    sender_id: PEOPLE.managerKyle.id,
    sender_name: PEOPLE.managerKyle.name,
    sender_initials: PEOPLE.managerKyle.initials,
    sender_avatar: PEOPLE.managerKyle.avatar,
    body: "Two notes from me on the v2 pan + drone shot at 02:15. Let's slot a v3 review tomorrow morning.",
    created_at: shiftMinutes(-1, 15, 42),
    reactions: [{ emoji: "👍", count: 1 }],
  },

  // ---- 13364 Beach Blvd — 1 message ----
  {
    id: "msg-bb-1",
    order_id: "ord-beach",
    sender_id: PEOPLE.shooterMJ.id,
    sender_name: PEOPLE.shooterMJ.name,
    sender_initials: PEOPLE.shooterMJ.initials,
    sender_avatar: PEOPLE.shooterMJ.avatar,
    body: "Heading to the Beach Blvd property now — ETA 1 PM.",
    created_at: shiftMinutes(0, 12, 14),
  },

  // ---- 200 Lighthouse Cir — 12 messages ----
  {
    id: "msg-lh-1",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.shooterMJ.id,
    sender_name: PEOPLE.shooterMJ.name,
    sender_initials: PEOPLE.shooterMJ.initials,
    sender_avatar: PEOPLE.shooterMJ.avatar,
    body: "On site at 200 Lighthouse — twilight conditions look ideal, will hold the drone for blue hour.",
    created_at: shiftMinutes(-9, 13, 10),
  },
  {
    id: "msg-lh-2",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.managerKyle.id,
    sender_name: PEOPLE.managerKyle.name,
    sender_initials: PEOPLE.managerKyle.initials,
    sender_avatar: PEOPLE.managerKyle.avatar,
    body: "Sounds good — Derek confirmed they're flexible on timing today.",
    created_at: shiftMinutes(-9, 13, 14),
  },
  {
    id: "msg-lh-3",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.shooterMJ.id,
    sender_name: PEOPLE.shooterMJ.name,
    sender_initials: PEOPLE.shooterMJ.initials,
    sender_avatar: PEOPLE.shooterMJ.avatar,
    body: "Wrapped — uploading 24 files (3 drone passes incl). RAW landing in ~25 min.",
    created_at: shiftMinutes(-9, 14, 0),
  },
  {
    id: "msg-lh-4",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.editorMarry.id,
    sender_name: PEOPLE.editorMarry.name,
    sender_initials: PEOPLE.editorMarry.initials,
    sender_avatar: PEOPLE.editorMarry.avatar,
    body: "Starting photo selects now.",
    created_at: shiftMinutes(-9, 15, 30),
  },
  {
    id: "msg-lh-5",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.editorRienz.id,
    sender_name: PEOPLE.editorRienz.name,
    sender_initials: PEOPLE.editorRienz.initials,
    sender_avatar: PEOPLE.editorRienz.avatar,
    body: "Walkthrough v1 up for internal review.",
    created_at: shiftMinutes(-9, 14, 22),
  },
  {
    id: "msg-lh-6",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.editorMarry.id,
    sender_name: PEOPLE.editorMarry.name,
    sender_initials: PEOPLE.editorMarry.initials,
    sender_avatar: PEOPLE.editorMarry.avatar,
    body: "Foyer felt slow — try a tighter intro?",
    created_at: shiftMinutes(-9, 14, 40),
  },
  {
    id: "msg-lh-7",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.editorRienz.id,
    sender_name: PEOPLE.editorRienz.name,
    sender_initials: PEOPLE.editorRienz.initials,
    sender_avatar: PEOPLE.editorRienz.avatar,
    body: "v2 incoming — tightened to 8s.",
    created_at: shiftMinutes(-8, 10, 50),
  },
  {
    id: "msg-lh-8",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.editorMarry.id,
    sender_name: PEOPLE.editorMarry.name,
    sender_initials: PEOPLE.editorMarry.initials,
    sender_avatar: PEOPLE.editorMarry.avatar,
    body: "Photos done — sharing internal preview link.",
    created_at: shiftMinutes(-8, 12, 18),
    reactions: [{ emoji: "🎉", count: 2 }],
  },
  {
    id: "msg-lh-9",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.managerKyle.id,
    sender_name: PEOPLE.managerKyle.name,
    sender_initials: PEOPLE.managerKyle.initials,
    sender_avatar: PEOPLE.managerKyle.avatar,
    body: "Pushing the full set to Derek for sign-off this afternoon.",
    created_at: shiftMinutes(-8, 14, 30),
  },
  {
    id: "msg-lh-10",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.clientDerek.id,
    sender_name: PEOPLE.clientDerek.name,
    sender_initials: PEOPLE.clientDerek.initials,
    sender_avatar: PEOPLE.clientDerek.avatar,
    body: "Beautiful work team — approving everything.",
    created_at: shiftMinutes(-7, 9, 32),
    reactions: [{ emoji: "🙏", count: 3 }],
  },
  {
    id: "msg-lh-11",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.managerKyle.id,
    sender_name: PEOPLE.managerKyle.name,
    sender_initials: PEOPLE.managerKyle.initials,
    sender_avatar: PEOPLE.managerKyle.avatar,
    body: "Final share link sent. Invoice queued.",
    created_at: shiftMinutes(-7, 10, 0),
  },
  {
    id: "msg-lh-12",
    order_id: "ord-lighthouse",
    sender_id: PEOPLE.shooterMJ.id,
    sender_name: PEOPLE.shooterMJ.name,
    sender_initials: PEOPLE.shooterMJ.initials,
    sender_avatar: PEOPLE.shooterMJ.avatar,
    body: "Closing out my side — moving on to the next shoot. ✌️",
    created_at: shiftMinutes(-7, 10, 12),
  },
];

// ============================================================================
// 14. Activity entries
// ============================================================================

export const activityEntries: ActivityEntry[] = [
  // ---- 45 Yorkshire — 8 entries ----
  {
    id: "act-yk-1",
    order_id: "ord-yorkshire",
    actor_name: PEOPLE.shooterKyle.name,
    actor_initials: PEOPLE.shooterKyle.initials,
    action: "uploaded 12 raw files",
    target_type: "order",
    target_id: "ord-yorkshire",
    created_at: shiftMinutes(-3, 12, 30),
    metadata: { file_count: 12, total_bytes: 4_280_000_000 },
  },
  {
    id: "act-yk-2",
    order_id: "ord-yorkshire",
    actor_name: PEOPLE.editorRienz.name,
    actor_initials: PEOPLE.editorRienz.initials,
    action: "started editing the walkthrough",
    target_type: "deliverable",
    target_id: "yk-deliv-video",
    created_at: shiftMinutes(-3, 14, 10),
  },
  {
    id: "act-yk-3",
    order_id: "ord-yorkshire",
    actor_name: PEOPLE.editorRienz.name,
    actor_initials: PEOPLE.editorRienz.initials,
    action: "uploaded Walkthrough v1",
    target_type: "version",
    target_id: "yk-v1-ver1",
    created_at: shiftMinutes(-3, 16, 12),
  },
  {
    id: "act-yk-4",
    order_id: "ord-yorkshire",
    actor_name: PEOPLE.editorMarry.name,
    actor_initials: PEOPLE.editorMarry.initials,
    action: "approved the Hero photo set",
    target_type: "deliverable",
    target_id: "yk-deliv-photo",
    created_at: shiftMinutes(-2, 18, 30),
  },
  {
    id: "act-yk-5",
    order_id: "ord-yorkshire",
    actor_name: PEOPLE.editorMjp.name,
    actor_initials: PEOPLE.editorMjp.initials,
    action: "delivered Drone reveal pass",
    target_type: "deliverable",
    target_id: "yk-deliv-drone",
    created_at: shiftMinutes(-2, 18, 5),
  },
  {
    id: "act-yk-6",
    order_id: "ord-yorkshire",
    actor_name: PEOPLE.editorRienz.name,
    actor_initials: PEOPLE.editorRienz.initials,
    action: "uploaded Walkthrough v2",
    target_type: "version",
    target_id: "yk-v1-ver2",
    created_at: shiftMinutes(-1, 9, 30),
  },
  {
    id: "act-yk-7",
    order_id: "ord-yorkshire",
    actor_name: PEOPLE.editorMarry.name,
    actor_initials: PEOPLE.editorMarry.initials,
    action: "left 1 comment on Walkthrough v2",
    target_type: "comment",
    target_id: "yk-c1",
    created_at: shiftMinutes(-1, 11, 4),
  },
  {
    id: "act-yk-8",
    order_id: "ord-yorkshire",
    actor_name: PEOPLE.managerKyle.name,
    actor_initials: PEOPLE.managerKyle.initials,
    action: "requested a v3 review tomorrow morning",
    target_type: "order",
    target_id: "ord-yorkshire",
    created_at: shiftMinutes(-1, 15, 50),
  },

  // ---- 13364 Beach Blvd — 2 entries ----
  {
    id: "act-bb-1",
    order_id: "ord-beach",
    actor_name: PEOPLE.managerKyle.name,
    actor_initials: PEOPLE.managerKyle.initials,
    action: "created the order from Calendar",
    target_type: "order",
    target_id: "ord-beach",
    created_at: shiftMinutes(-2, 11, 0),
  },
  {
    id: "act-bb-2",
    order_id: "ord-beach",
    actor_name: PEOPLE.shooterMJ.name,
    actor_initials: PEOPLE.shooterMJ.initials,
    action: "is en route to the property",
    target_type: "order",
    target_id: "ord-beach",
    created_at: shiftMinutes(0, 12, 14),
  },

  // ---- 245 Ocean Blvd — 1 entry ----
  {
    id: "act-ob-1",
    order_id: "ord-ocean",
    actor_name: PEOPLE.managerKyle.name,
    actor_initials: PEOPLE.managerKyle.initials,
    action: "scheduled the shoot for tomorrow",
    target_type: "order",
    target_id: "ord-ocean",
    created_at: shiftMinutes(-1, 14, 22),
  },

  // ---- 200 Lighthouse Cir — 20+ entries ----
  {
    id: "act-lh-1",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.managerKyle.name,
    actor_initials: PEOPLE.managerKyle.initials,
    action: "created the order from Google Calendar",
    target_type: "order",
    target_id: "ord-lighthouse",
    created_at: shiftMinutes(-10, 8, 0),
  },
  {
    id: "act-lh-2",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.shooterMJ.name,
    actor_initials: PEOPLE.shooterMJ.initials,
    action: "confirmed the shoot",
    target_type: "order",
    target_id: "ord-lighthouse",
    created_at: shiftMinutes(-10, 9, 12),
  },
  {
    id: "act-lh-3",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.shooterMJ.name,
    actor_initials: PEOPLE.shooterMJ.initials,
    action: "arrived on site",
    target_type: "order",
    target_id: "ord-lighthouse",
    created_at: shiftMinutes(-9, 13, 10),
  },
  {
    id: "act-lh-4",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.shooterMJ.name,
    actor_initials: PEOPLE.shooterMJ.initials,
    action: "uploaded 24 raw files",
    target_type: "order",
    target_id: "ord-lighthouse",
    created_at: shiftMinutes(-9, 14, 0),
    metadata: { file_count: 24, total_bytes: 8_750_000_000 },
  },
  {
    id: "act-lh-5",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.editorMarry.name,
    actor_initials: PEOPLE.editorMarry.initials,
    action: "started editing Hero photo set",
    target_type: "deliverable",
    target_id: "lh-deliv-photo",
    created_at: shiftMinutes(-9, 15, 30),
  },
  {
    id: "act-lh-6",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.editorRienz.name,
    actor_initials: PEOPLE.editorRienz.initials,
    action: "started editing Branded walkthrough",
    target_type: "deliverable",
    target_id: "lh-deliv-video",
    created_at: shiftMinutes(-9, 14, 22),
  },
  {
    id: "act-lh-7",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.editorRienz.name,
    actor_initials: PEOPLE.editorRienz.initials,
    action: "uploaded Walkthrough v1",
    target_type: "version",
    target_id: "lh-v1-ver1",
    created_at: shiftMinutes(-9, 14, 22),
  },
  {
    id: "act-lh-8",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.editorMarry.name,
    actor_initials: PEOPLE.editorMarry.initials,
    action: "requested a tighter intro on v1",
    target_type: "comment",
    target_id: "lh-internal-comment-1",
    created_at: shiftMinutes(-9, 14, 40),
  },
  {
    id: "act-lh-9",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.editorRienz.name,
    actor_initials: PEOPLE.editorRienz.initials,
    action: "uploaded Walkthrough v2",
    target_type: "version",
    target_id: "lh-v1-ver2",
    created_at: shiftMinutes(-8, 11, 12),
  },
  {
    id: "act-lh-10",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.editorMjp.name,
    actor_initials: PEOPLE.editorMjp.initials,
    action: "uploaded final Floor plan",
    target_type: "version",
    target_id: "lh-fp-ver1",
    created_at: shiftMinutes(-9, 12, 0),
  },
  {
    id: "act-lh-11",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.editorMarry.name,
    actor_initials: PEOPLE.editorMarry.initials,
    action: "approved Hero photo set",
    target_type: "deliverable",
    target_id: "lh-deliv-photo",
    created_at: shiftMinutes(-8, 12, 20),
  },
  {
    id: "act-lh-12",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.managerKyle.name,
    actor_initials: PEOPLE.managerKyle.initials,
    action: "shared internal preview with the client",
    target_type: "share_link",
    target_id: "lh-share-internal",
    created_at: shiftMinutes(-8, 14, 30),
  },
  {
    id: "act-lh-13",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.clientDerek.name,
    actor_initials: PEOPLE.clientDerek.initials,
    action: "viewed the preview link",
    target_type: "share_link",
    target_id: "lh-share-internal",
    created_at: shiftMinutes(-7, 9, 0),
  },
  {
    id: "act-lh-14",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.clientDerek.name,
    actor_initials: PEOPLE.clientDerek.initials,
    action: "approved the Branded walkthrough",
    target_type: "deliverable",
    target_id: "lh-deliv-video",
    created_at: shiftMinutes(-7, 9, 30),
  },
  {
    id: "act-lh-15",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.clientDerek.name,
    actor_initials: PEOPLE.clientDerek.initials,
    action: "approved the Hero photo set",
    target_type: "deliverable",
    target_id: "lh-deliv-photo",
    created_at: shiftMinutes(-7, 9, 31),
  },
  {
    id: "act-lh-16",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.clientDerek.name,
    actor_initials: PEOPLE.clientDerek.initials,
    action: "approved the Branded floor plan",
    target_type: "deliverable",
    target_id: "lh-deliv-floorplan",
    created_at: shiftMinutes(-7, 9, 32),
  },
  {
    id: "act-lh-17",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.managerKyle.name,
    actor_initials: PEOPLE.managerKyle.initials,
    action: "marked the order as delivered",
    target_type: "order",
    target_id: "ord-lighthouse",
    created_at: shiftMinutes(-7, 9, 32),
  },
  {
    id: "act-lh-18",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.managerKyle.name,
    actor_initials: PEOPLE.managerKyle.initials,
    action: "sent the final share link to the client",
    target_type: "share_link",
    target_id: "lh-share-final",
    created_at: shiftMinutes(-7, 10, 0),
  },
  {
    id: "act-lh-19",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.clientDerek.name,
    actor_initials: PEOPLE.clientDerek.initials,
    action: "downloaded the full delivery zip",
    target_type: "share_link",
    target_id: "lh-share-final",
    created_at: shiftMinutes(-6, 14, 8),
  },
  {
    id: "act-lh-20",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.managerKyle.name,
    actor_initials: PEOPLE.managerKyle.initials,
    action: "queued the invoice",
    target_type: "order",
    target_id: "ord-lighthouse",
    created_at: shiftMinutes(-6, 15, 0),
  },
  {
    id: "act-lh-21",
    order_id: "ord-lighthouse",
    actor_name: PEOPLE.clientDerek.name,
    actor_initials: PEOPLE.clientDerek.initials,
    action: "paid the invoice in full",
    target_type: "order",
    target_id: "ord-lighthouse",
    created_at: shiftMinutes(-3, 11, 0),
  },
];

// ============================================================================
// 15. Catalog items (typical media production line-items)
// ============================================================================

export const catalogItems: CatalogItem[] = [
  {
    id: "cat-video-walkthrough",
    title: "Video walkthrough (90s branded)",
    kind: "walkthrough",
    quantity: 1,
    price_cents: 35000,
    is_addon: false,
  },
  {
    id: "cat-photo-hero",
    title: "Hero photo set (25 selects)",
    kind: "photo",
    quantity: 25,
    price_cents: 22500,
    is_addon: false,
  },
  {
    id: "cat-drone-pass",
    title: "Drone reveal pass",
    kind: "drone",
    quantity: 2,
    price_cents: 18000,
    is_addon: false,
  },
  {
    id: "cat-floorplan",
    title: "Branded floor plan",
    kind: "floor_plan",
    quantity: 1,
    price_cents: 9500,
    is_addon: true,
  },
  {
    id: "cat-twilight",
    title: "Twilight photo set (6 selects)",
    kind: "twilight",
    quantity: 6,
    price_cents: 14500,
    is_addon: true,
  },
  {
    id: "cat-3d-tour",
    title: "3D virtual tour",
    kind: "3d_tour",
    quantity: 1,
    price_cents: 21500,
    is_addon: true,
  },
  {
    id: "cat-virtual-staging",
    title: "Virtual staging (per room)",
    kind: "virtual_staging",
    quantity: 4,
    price_cents: 8000,
    is_addon: true,
  },
  {
    id: "cat-rush",
    title: "Rush delivery (24h turnaround)",
    kind: "other",
    quantity: 1,
    price_cents: 12500,
    is_addon: true,
  },
];

// ============================================================================
// 16. Lookup helpers
// ============================================================================

export function findOrderById(id: string): Order | null {
  return orders.find((o) => o.id === id) ?? null;
}

export function findDeliverableById(id: string): Deliverable | null {
  for (const o of orders) {
    const d = o.deliverables.find((d) => d.id === id);
    if (d) return d;
  }
  return null;
}

export function rawUploadsForOrder(orderId: string): RawUpload[] {
  return rawUploads.filter((r) => r.order_id === orderId);
}

export function chatForOrder(orderId: string): ChatMessage[] {
  return chatMessages
    .filter((m) => m.order_id === orderId)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

export function activityForOrder(orderId: string): ActivityEntry[] {
  return activityEntries
    .filter((a) => a.order_id === orderId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
