"use client";

// ============================================================================
// Types
// ============================================================================

export type UnifiedFile = {
  id: string;
  filename: string;
  byte_size: number;
  mime_type: string;
  created_at: string;
  kind: "photo" | "video" | "other";
  kindLabel: string;
  thumbnail: string;
  shooterId: string;
  shooterName: string;
  orderId: string;
  orderLabel: string;
  starred: boolean;
  archived: boolean;
};

export type TreeNode = {
  id: string;
  type: "root" | "section" | "shooter" | "date" | "order" | "category" | "client";
  label: string;
  icon?: string;
  count?: number;
  bytes?: number;
  meta?: string;
  children?: TreeNode[];
};

export type ViewMode = "grid" | "list";
export type SortKey = "filename" | "date" | "size" | "kind" | "shooter" | "order";
export type SortDir = "asc" | "desc";
export type FilterTab = "all" | "recent" | "starred" | "archived";
export type TopTab = "raw" | "final" | "shoots";
export type CategoryKind =
  | "photo"
  | "video"
  | "drone"
  | "floor-plan"
  | "twilight"
  | "3d-tour"
  | "virtual-staging"
  | "other";

// ============================================================================
// Shooters
// ============================================================================

export const shooters: Array<{
  id: string;
  name: string;
  initials: string;
  role: "Shooter" | "Editor";
}> = [
  { id: "shooter-kyle", name: "Kyle Anderson", initials: "KA", role: "Shooter" },
  { id: "shooter-mj", name: "MJ Rivera", initials: "MR", role: "Shooter" },
  { id: "shooter-sara", name: "Sara Chen", initials: "SC", role: "Editor" },
];

// ============================================================================
// Orders
// ============================================================================

export const orders: Array<{ id: string; address: string; client: string }> = [
  { id: "order-yorkshire", address: "45 Yorkshire Dr", client: "ACME Realty" },
  { id: "order-beach", address: "13364 Beach Blvd", client: "Sunshine Homes" },
  { id: "order-ocean", address: "245 Ocean Blvd", client: "Coastal Group" },
  { id: "order-pine", address: "12 Pine St", client: "ACME Realty" },
  { id: "order-lighthouse", address: "200 Lighthouse Cir", client: "Sunshine Homes" },
  { id: "order-coastal", address: "88 Coastal Way", client: "Coastal Group" },
];

// ============================================================================
// Category icons (lucide names)
// ============================================================================

export const categoryIcons: Record<CategoryKind, string> = {
  photo: "Image",
  video: "Video",
  drone: "Plane",
  "floor-plan": "Box",
  twilight: "Sun",
  "3d-tour": "Box",
  "virtual-staging": "Home",
  other: "File",
};

// ============================================================================
// Helpers (top-level so we can use them when seeding)
// ============================================================================

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

/**
 * US date format per DESIGN.md §4. MMM D, YYYY (e.g. "May 30, 2026").
 * Never use relative time ("8 hours ago", "yesterday") for file timestamps —
 * absolute dates are easier to scan and group into folders.
 */
export function formatDateUS(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "May 30, 2026 · 2:30 PM" */
export function formatDateTimeUS(iso: string): string {
  const d = new Date(iso);
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
export function formatTimeUS(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * v12.2: MM/DD/YYYY format (US calendar order) per user spec — used
 * everywhere on the Files page (file rows, cards, tree, subtitle) so
 * dates are uniform. Function name kept as `formatDateDMY` to avoid
 * touching every callsite; order swapped to month/day/year.
 */
export function formatDateDMY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Back-compat alias — was formatDateUS, now points to formatDateDMY so the
 * Files page displays MM/DD/YYYY throughout (file list rows, file cards,
 * tree date nodes). Existing callsites get the new format automatically.
 */
export const formatRelativeTime = formatDateDMY;

export function toneFor(kind: UnifiedFile["kind"]): string {
  switch (kind) {
    case "photo":
      return "sky";
    case "video":
      return "violet";
    default:
      return "amber";
  }
}

// ============================================================================
// File seeding
// ============================================================================

// Reference date: keep deterministic relative to "now" (uses real Date).
const REF_NOW = new Date();

function daysAgo(d: number, hour = 10, minute = 0): string {
  const t = new Date(REF_NOW);
  t.setDate(t.getDate() - d);
  t.setHours(hour, minute, 0, 0);
  return t.toISOString();
}

type FileSeed = {
  id: string;
  filename: string;
  kind: UnifiedFile["kind"];
  kindLabel: string;
  byte_size: number;
  mime_type: string;
  shooterId: string;
  orderId: string;
  created_at: string;
  starred?: boolean;
  archived?: boolean;
};

const MB = 1024 * 1024;

const fileSeeds: FileSeed[] = [
  // ---- Kyle / 45 Yorkshire Dr / Day 0 ----
  { id: "f01", filename: "DSC_1201.jpg", kind: "photo", kindLabel: "Photo", byte_size: 18 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(0, 9, 12), starred: true },
  { id: "f02", filename: "DSC_1202.jpg", kind: "photo", kindLabel: "Photo", byte_size: 16 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(0, 9, 14) },
  { id: "f03", filename: "DSC_1203.jpg", kind: "photo", kindLabel: "Twilight", byte_size: 22 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(0, 18, 32), starred: true },
  { id: "f04", filename: "DSC_1204.jpg", kind: "photo", kindLabel: "Photo", byte_size: 14 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(0, 9, 22) },
  { id: "f05", filename: "drone_pass_01.mp4", kind: "video", kindLabel: "Drone", byte_size: 820 * MB, mime_type: "video/mp4", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(0, 10, 5) },
  { id: "f06", filename: "drone_pass_02.mp4", kind: "video", kindLabel: "Drone", byte_size: 640 * MB, mime_type: "video/mp4", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(0, 10, 12), starred: true },
  { id: "f07", filename: "floorplan_v1.pdf", kind: "other", kindLabel: "Floor Plan", byte_size: 4 * MB, mime_type: "application/pdf", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(0, 11, 0) },

  // ---- Kyle / 12 Pine St / Day 2 ----
  { id: "f08", filename: "DSC_1310.jpg", kind: "photo", kindLabel: "Photo", byte_size: 12 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-pine", created_at: daysAgo(2, 11, 0) },
  { id: "f09", filename: "DSC_1311.jpg", kind: "photo", kindLabel: "Photo", byte_size: 13 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-pine", created_at: daysAgo(2, 11, 12) },
  { id: "f10", filename: "DSC_1312.jpg", kind: "photo", kindLabel: "Photo", byte_size: 11 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-pine", created_at: daysAgo(2, 11, 24) },
  { id: "f11", filename: "VID_walkthrough.mp4", kind: "video", kindLabel: "Video", byte_size: 420 * MB, mime_type: "video/mp4", shooterId: "shooter-kyle", orderId: "order-pine", created_at: daysAgo(2, 12, 4), starred: true },
  { id: "f12", filename: "3d_tour_link.txt", kind: "other", kindLabel: "3D Tour", byte_size: 24 * 1024, mime_type: "text/plain", shooterId: "shooter-kyle", orderId: "order-pine", created_at: daysAgo(2, 12, 30) },

  // ---- MJ / 13364 Beach Blvd / Day 1 ----
  { id: "f13", filename: "IMG_5601.jpg", kind: "photo", kindLabel: "Photo", byte_size: 9 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(1, 8, 14) },
  { id: "f14", filename: "IMG_5602.jpg", kind: "photo", kindLabel: "Photo", byte_size: 10 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(1, 8, 18) },
  { id: "f15", filename: "IMG_5603.jpg", kind: "photo", kindLabel: "Photo", byte_size: 11 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(1, 8, 22), starred: true },
  { id: "f16", filename: "IMG_5604.jpg", kind: "photo", kindLabel: "Photo", byte_size: 8 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(1, 8, 26) },
  { id: "f17", filename: "IMG_5605.jpg", kind: "photo", kindLabel: "Twilight", byte_size: 24 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(1, 19, 2) },
  { id: "f18", filename: "VID_001.mp4", kind: "video", kindLabel: "Video", byte_size: 320 * MB, mime_type: "video/mp4", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(1, 9, 6) },
  { id: "f19", filename: "VID_002.mp4", kind: "video", kindLabel: "Video", byte_size: 280 * MB, mime_type: "video/mp4", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(1, 9, 14) },
  { id: "f20", filename: "drone_orbit.mp4", kind: "video", kindLabel: "Drone", byte_size: 1100 * MB, mime_type: "video/mp4", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(1, 10, 30), starred: true },

  // ---- MJ / 200 Lighthouse Cir / Day 4 ----
  { id: "f21", filename: "IMG_5710.jpg", kind: "photo", kindLabel: "Photo", byte_size: 7 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-lighthouse", created_at: daysAgo(4, 14, 2) },
  { id: "f22", filename: "IMG_5711.jpg", kind: "photo", kindLabel: "Photo", byte_size: 8 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-lighthouse", created_at: daysAgo(4, 14, 8) },
  { id: "f23", filename: "IMG_5712.jpg", kind: "photo", kindLabel: "Photo", byte_size: 9 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-lighthouse", created_at: daysAgo(4, 14, 16) },
  { id: "f24", filename: "VID_lighthouse.mp4", kind: "video", kindLabel: "Video", byte_size: 510 * MB, mime_type: "video/mp4", shooterId: "shooter-mj", orderId: "order-lighthouse", created_at: daysAgo(4, 15, 0) },
  { id: "f25", filename: "drone_high.mp4", kind: "video", kindLabel: "Drone", byte_size: 980 * MB, mime_type: "video/mp4", shooterId: "shooter-mj", orderId: "order-lighthouse", created_at: daysAgo(4, 15, 22), archived: true },
  { id: "f26", filename: "floorplan_v2.pdf", kind: "other", kindLabel: "Floor Plan", byte_size: 3 * MB, mime_type: "application/pdf", shooterId: "shooter-mj", orderId: "order-lighthouse", created_at: daysAgo(4, 16, 0) },

  // ---- Sara / 245 Ocean Blvd / Day 1 (editor / final) ----
  { id: "f27", filename: "245_Ocean_001_edit.jpg", kind: "photo", kindLabel: "Photo", byte_size: 6 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-ocean", created_at: daysAgo(1, 16, 4), starred: true },
  { id: "f28", filename: "245_Ocean_002_edit.jpg", kind: "photo", kindLabel: "Photo", byte_size: 6 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-ocean", created_at: daysAgo(1, 16, 10) },
  { id: "f29", filename: "245_Ocean_003_edit.jpg", kind: "photo", kindLabel: "Virtual Staging", byte_size: 8 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-ocean", created_at: daysAgo(1, 16, 22) },
  { id: "f30", filename: "245_Ocean_004_edit.jpg", kind: "photo", kindLabel: "Virtual Staging", byte_size: 7 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-ocean", created_at: daysAgo(1, 16, 30) },
  { id: "f31", filename: "245_Ocean_twilight.jpg", kind: "photo", kindLabel: "Twilight", byte_size: 19 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-ocean", created_at: daysAgo(1, 20, 0), starred: true },
  { id: "f32", filename: "245_Ocean_walkthrough.mp4", kind: "video", kindLabel: "Video", byte_size: 220 * MB, mime_type: "video/mp4", shooterId: "shooter-sara", orderId: "order-ocean", created_at: daysAgo(1, 17, 0) },
  { id: "f33", filename: "245_Ocean_3dtour.zip", kind: "other", kindLabel: "3D Tour", byte_size: 92 * MB, mime_type: "application/zip", shooterId: "shooter-sara", orderId: "order-ocean", created_at: daysAgo(1, 17, 20) },

  // ---- Sara / 88 Coastal Way / Day 6 (editor / final) ----
  { id: "f34", filename: "88_Coastal_001.jpg", kind: "photo", kindLabel: "Photo", byte_size: 5 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-coastal", created_at: daysAgo(6, 13, 8) },
  { id: "f35", filename: "88_Coastal_002.jpg", kind: "photo", kindLabel: "Photo", byte_size: 6 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-coastal", created_at: daysAgo(6, 13, 14) },
  { id: "f36", filename: "88_Coastal_003.jpg", kind: "photo", kindLabel: "Photo", byte_size: 5 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-coastal", created_at: daysAgo(6, 13, 20) },
  { id: "f37", filename: "88_Coastal_floorplan.pdf", kind: "other", kindLabel: "Floor Plan", byte_size: 2 * MB, mime_type: "application/pdf", shooterId: "shooter-sara", orderId: "order-coastal", created_at: daysAgo(6, 14, 2), archived: true },
  { id: "f38", filename: "88_Coastal_video.mp4", kind: "video", kindLabel: "Video", byte_size: 180 * MB, mime_type: "video/mp4", shooterId: "shooter-sara", orderId: "order-coastal", created_at: daysAgo(6, 14, 12) },

  // ---- Kyle / 45 Yorkshire Dr / Day 8 (older batch) ----
  { id: "f39", filename: "DSC_1100.jpg", kind: "photo", kindLabel: "Photo", byte_size: 15 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(8, 10, 2) },
  { id: "f40", filename: "DSC_1101.jpg", kind: "photo", kindLabel: "Photo", byte_size: 17 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(8, 10, 8) },
  { id: "f41", filename: "DSC_1102.jpg", kind: "photo", kindLabel: "Photo", byte_size: 14 * MB, mime_type: "image/jpeg", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(8, 10, 14), archived: true },
  { id: "f42", filename: "VID_archived.mp4", kind: "video", kindLabel: "Video", byte_size: 95 * MB, mime_type: "video/mp4", shooterId: "shooter-kyle", orderId: "order-yorkshire", created_at: daysAgo(8, 11, 0) },

  // ---- MJ / 13364 Beach Blvd / Day 11 (older) ----
  { id: "f43", filename: "IMG_5500.jpg", kind: "photo", kindLabel: "Photo", byte_size: 9 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(11, 9, 14) },
  { id: "f44", filename: "IMG_5501.jpg", kind: "photo", kindLabel: "Photo", byte_size: 10 * MB, mime_type: "image/jpeg", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(11, 9, 22) },
  { id: "f45", filename: "VID_early_walk.mp4", kind: "video", kindLabel: "Video", byte_size: 240 * MB, mime_type: "video/mp4", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(11, 10, 0) },
  { id: "f46", filename: "drone_recon.mp4", kind: "video", kindLabel: "Drone", byte_size: 720 * MB, mime_type: "video/mp4", shooterId: "shooter-mj", orderId: "order-beach", created_at: daysAgo(11, 10, 30) },

  // ---- Sara / 12 Pine St / Day 3 (editor final) ----
  { id: "f47", filename: "12_Pine_hero.jpg", kind: "photo", kindLabel: "Photo", byte_size: 8 * MB, mime_type: "image/jpeg", shooterId: "shooter-sara", orderId: "order-pine", created_at: daysAgo(3, 12, 4), starred: true },
  { id: "f48", filename: "12_Pine_walkthrough.mp4", kind: "video", kindLabel: "Video", byte_size: 260 * MB, mime_type: "video/mp4", shooterId: "shooter-sara", orderId: "order-pine", created_at: daysAgo(3, 12, 32) },
];

function thumbFor(seed: FileSeed): string {
  if (seed.kind === "photo") return `https://picsum.photos/seed/${seed.id}/600/400`;
  if (seed.kind === "video") return `https://picsum.photos/seed/v${seed.id}/600/400`;
  return "";
}

function shooterName(id: string): string {
  return shooters.find((s) => s.id === id)?.name ?? "Unknown";
}

function orderLabel(id: string): string {
  return orders.find((o) => o.id === id)?.address ?? "Unassigned";
}

export const files: UnifiedFile[] = fileSeeds.map((s) => ({
  id: s.id,
  filename: s.filename,
  byte_size: s.byte_size,
  mime_type: s.mime_type,
  created_at: s.created_at,
  kind: s.kind,
  kindLabel: s.kindLabel,
  thumbnail: thumbFor(s),
  shooterId: s.shooterId,
  shooterName: shooterName(s.shooterId),
  orderId: s.orderId,
  orderLabel: orderLabel(s.orderId),
  starred: Boolean(s.starred),
  archived: Boolean(s.archived),
}));

// ============================================================================
// Tree construction
// ============================================================================

function kindToCategoryKind(label: string): CategoryKind {
  const l = label.toLowerCase();
  if (l === "photo") return "photo";
  if (l === "video") return "video";
  if (l === "drone") return "drone";
  if (l === "floor plan") return "floor-plan";
  if (l === "twilight") return "twilight";
  if (l === "3d tour") return "3d-tour";
  if (l === "virtual staging") return "virtual-staging";
  return "other";
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Tree folder date labels — DD/MM/YYYY per v12.2 user spec. Mirror
 * formatDateDMY so tree dates match the list/grid dates.
 */
function dateLabel(iso: string): string {
  return formatDateDMY(iso);
}

type Bucket = {
  items: UnifiedFile[];
  bytes: number;
};

function emptyBucket(): Bucket {
  return { items: [], bytes: 0 };
}

function buildRawSection(allFiles: UnifiedFile[]): TreeNode {
  // Shooter → Date → Order → Category
  type ShooterMap = Map<string, Map<string, Map<string, Map<string, Bucket>>>>;
  const byShooter: ShooterMap = new Map();

  for (const f of allFiles) {
    if (!byShooter.has(f.shooterId)) byShooter.set(f.shooterId, new Map());
    const byDate = byShooter.get(f.shooterId)!;
    const dk = dateKey(f.created_at);
    if (!byDate.has(dk)) byDate.set(dk, new Map());
    const byOrder = byDate.get(dk)!;
    if (!byOrder.has(f.orderId)) byOrder.set(f.orderId, new Map());
    const byCat = byOrder.get(f.orderId)!;
    const catKey = f.kindLabel;
    if (!byCat.has(catKey)) byCat.set(catKey, emptyBucket());
    const bucket = byCat.get(catKey)!;
    bucket.items.push(f);
    bucket.bytes += f.byte_size;
  }

  const shooterChildren: TreeNode[] = [];
  for (const shooter of shooters) {
    const dateMap = byShooter.get(shooter.id);
    if (!dateMap) continue;

    let shooterCount = 0;
    let shooterBytes = 0;
    const dateChildren: TreeNode[] = [];

    const dateKeysSorted = Array.from(dateMap.keys()).sort((a, b) => (a < b ? 1 : -1));
    for (const dk of dateKeysSorted) {
      const orderMap = dateMap.get(dk)!;
      let dateCount = 0;
      let dateBytes = 0;
      const orderChildren: TreeNode[] = [];
      // pick a representative iso for labeling
      let repIso = "";

      for (const [orderId, catMap] of orderMap.entries()) {
        let orderCount = 0;
        let orderBytes = 0;
        const catChildren: TreeNode[] = [];

        for (const [catLabel, bucket] of catMap.entries()) {
          const ck = kindToCategoryKind(catLabel);
          catChildren.push({
            id: `raw/${shooter.id}/${dk}/${orderId}/cat:${ck}`,
            type: "category",
            label: catLabel,
            icon: categoryIcons[ck],
            count: bucket.items.length,
            bytes: bucket.bytes,
          });
          orderCount += bucket.items.length;
          orderBytes += bucket.bytes;
          if (!repIso && bucket.items[0]) repIso = bucket.items[0].created_at;
        }

        catChildren.sort((a, b) => a.label.localeCompare(b.label));
        orderChildren.push({
          id: `raw/${shooter.id}/${dk}/${orderId}`,
          type: "order",
          label: orderLabel(orderId),
          icon: "Folder",
          count: orderCount,
          bytes: orderBytes,
          meta: orders.find((o) => o.id === orderId)?.client,
          children: catChildren,
        });
        dateCount += orderCount;
        dateBytes += orderBytes;
      }

      orderChildren.sort((a, b) => a.label.localeCompare(b.label));
      dateChildren.push({
        id: `raw/${shooter.id}/${dk}`,
        type: "date",
        label: dateLabel(repIso || dk),
        icon: "Calendar",
        count: dateCount,
        bytes: dateBytes,
        meta: dk,
        children: orderChildren,
      });
      shooterCount += dateCount;
      shooterBytes += dateBytes;
    }

    shooterChildren.push({
      id: `raw/${shooter.id}`,
      type: "shooter",
      label: shooter.name,
      icon: "User",
      count: shooterCount,
      bytes: shooterBytes,
      meta: shooter.role,
      children: dateChildren,
    });
  }

  shooterChildren.sort((a, b) => a.label.localeCompare(b.label));
  const totalCount = shooterChildren.reduce((acc, n) => acc + (n.count ?? 0), 0);
  const totalBytes = shooterChildren.reduce((acc, n) => acc + (n.bytes ?? 0), 0);

  return {
    id: "raw",
    type: "section",
    label: "RAW",
    icon: "FolderOpen",
    count: totalCount,
    bytes: totalBytes,
    children: shooterChildren,
  };
}

function buildDeliverySection(allFiles: UnifiedFile[]): TreeNode {
  // Client → Order → Category — final delivery section; use editor (Sara) files,
  // but fall back to all files grouped by client so the section isn't empty.
  type ClientMap = Map<string, Map<string, Map<string, Bucket>>>;
  const byClient: ClientMap = new Map();

  for (const f of allFiles) {
    const order = orders.find((o) => o.id === f.orderId);
    if (!order) continue;
    const clientKey = order.client;
    if (!byClient.has(clientKey)) byClient.set(clientKey, new Map());
    const byOrder = byClient.get(clientKey)!;
    if (!byOrder.has(f.orderId)) byOrder.set(f.orderId, new Map());
    const byCat = byOrder.get(f.orderId)!;
    const catKey = f.kindLabel;
    if (!byCat.has(catKey)) byCat.set(catKey, emptyBucket());
    const bucket = byCat.get(catKey)!;
    bucket.items.push(f);
    bucket.bytes += f.byte_size;
  }

  const clientChildren: TreeNode[] = [];
  for (const [client, orderMap] of byClient.entries()) {
    let clientCount = 0;
    let clientBytes = 0;
    const orderChildren: TreeNode[] = [];

    for (const [orderId, catMap] of orderMap.entries()) {
      let orderCount = 0;
      let orderBytes = 0;
      const catChildren: TreeNode[] = [];
      for (const [catLabel, bucket] of catMap.entries()) {
        const ck = kindToCategoryKind(catLabel);
        catChildren.push({
          id: `delivery/${client}/${orderId}/cat:${ck}`,
          type: "category",
          label: catLabel,
          icon: categoryIcons[ck],
          count: bucket.items.length,
          bytes: bucket.bytes,
        });
        orderCount += bucket.items.length;
        orderBytes += bucket.bytes;
      }
      catChildren.sort((a, b) => a.label.localeCompare(b.label));
      orderChildren.push({
        id: `delivery/${client}/${orderId}`,
        type: "order",
        label: orderLabel(orderId),
        icon: "Folder",
        count: orderCount,
        bytes: orderBytes,
        children: catChildren,
      });
      clientCount += orderCount;
      clientBytes += orderBytes;
    }

    orderChildren.sort((a, b) => a.label.localeCompare(b.label));
    clientChildren.push({
      id: `delivery/${client}`,
      type: "client",
      label: client,
      icon: "Building2",
      count: clientCount,
      bytes: clientBytes,
      children: orderChildren,
    });
  }

  clientChildren.sort((a, b) => a.label.localeCompare(b.label));
  const totalCount = clientChildren.reduce((acc, n) => acc + (n.count ?? 0), 0);
  const totalBytes = clientChildren.reduce((acc, n) => acc + (n.bytes ?? 0), 0);

  return {
    id: "delivery",
    type: "section",
    label: "Delivery",
    icon: "Share2",
    count: totalCount,
    bytes: totalBytes,
    children: clientChildren,
  };
}

export const tree: TreeNode = {
  id: "root",
  type: "root",
  label: "All files",
  icon: "Home",
  children: [buildRawSection(files), buildDeliverySection(files)],
};
