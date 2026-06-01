// Jobs / Items / Versions — prototype mock layer.
//
// Mirrors the eventual Supabase schema (see Odone/JOB_FLOW_REFACTOR_PLAN.md):
//   Job (manager → editor batch)
//     └ Item   (1 deliverable in the batch)
//         └ Version (each upload iteration)
//             └ File (carousel = N files; video/photo = 1+ files)
//
// All ids/dates are stable string literals — NO Date.now / Math.random
// (per prototype rule from CLAUDE.md).

import type { Tone } from "@/components/editor-data";

// --- enums (mirror deliverable_status_t + deliverable_kind_t) -----------

export type JobStatus =
  | "not_started"
  | "in_progress"
  | "review"
  | "approved"
  | "delivered";

export type ItemKind =
  | "video"        // single reel / walkthrough
  | "carousel"     // N short video clips
  | "photo"        // 1+ photos
  | "drone"
  | "floor_plan"
  | "twilight"
  | "3d_tour"
  | "virtual_staging"
  | "other";

export type VersionStatus =
  | "processing"
  | "ready"
  | "approved"
  | "rejected"
  | "superseded";

// --- payload shapes -----------------------------------------------------

export type Assignee = { type: "in_house" | "vendor"; name: string };

// Subset of AssignSubmission (full type in editor-types.ts).
// Whatever the manager wrote in the Assign wizard, stored per-item.
export type ItemBrief = {
  assignee: Assignee;
  note: string;
  brief?: string;
  length?: string;
  script?: string;
  musicReference?: string;
  deadline?: string;
  priority?: "low" | "normal" | "high" | "rush";
  revisions?: number;
  musicLicenseConfirmed?: boolean;
  captionsRequested?: boolean;
  kind?: ItemKind;
};

export type ItemFile = {
  id: string;
  filename: string;
  // Stable, deterministic placeholders via picsum.photos seeds
  thumbnailUrl: string;     // grid thumbnail
  posterUrl?: string;       // video poster (same as thumbnail unless varied)
  durationSec?: number;     // video only
  width?: number;
  height?: number;
  orderIndex: number;
};

export type FeedbackEntry = {
  id: string;
  fileId?: string;           // null → folder-level comment
  authorId: string;          // matches users key in editor-data
  body: string;
  timestampSec?: number;     // video timestamp anchor
  status: "open" | "resolved";
  createdAt: string;         // stable label e.g. "2h ago"
};

export type ItemVersion = {
  id: string;
  number: number;            // v1, v2, …
  status: VersionStatus;
  files: ItemFile[];
  feedback: FeedbackEntry[];
  notes?: string;            // editor's upload note
  uploadedBy?: string;
  uploadedAt: string;        // stable label
};

export type Item = {
  id: string;
  jobId: string;
  title: string;
  kind: ItemKind;
  status: JobStatus;
  brief?: ItemBrief;
  versions: ItemVersion[];
  currentVersionNumber?: number;  // points at versions[i].number
};

/**
 * Manager's brief for the WHOLE job. Per-item video specifics (script,
 * length, music ref, priority) live on Item.brief instead. This shape is
 * the contract between AssignJobDialog (writes) and JobDetail panel (reads).
 */
export type JobRequirement = {
  tone?: string;                    // free-text mood, e.g. "bright + airy"
  musicLicenseConfirmed?: boolean;
  captionsRequested?: boolean;
  brandReference?: string;          // link or short note about brand kit
  notes?: string;                   // free-form manager note for the batch
};

export type Job = {
  id: string;
  title: string;
  orderId?: string;
  orderTitle?: string;       // e.g. "245 Ocean Blvd"
  orderAddress?: string;
  editorId: string;          // matches users key in editor-data
  managerId: string;
  status: JobStatus;
  dueAt: string;             // stable label e.g. "May 20"
  createdAt: string;
  /** @deprecated kept for back-compat — promote into requirement.notes */
  notes?: string;
  requirement?: JobRequirement;
  itemIds: string[];
  tone: Tone;                // ui accent
  accepted?: boolean;        // editor accepted job
  requirementsRead?: boolean; // editor read requirements
};

// --- helpers ------------------------------------------------------------

const PICSUM = (seed: string, w = 480, h = 320) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const itemKindLabel: Record<ItemKind, string> = {
  video: "Video",
  carousel: "Carousel",
  photo: "Photo",
  drone: "Drone",
  floor_plan: "Floor plan",
  twilight: "Twilight",
  "3d_tour": "3D Tour",
  virtual_staging: "Virtual staging",
  other: "Other",
};

export const jobStatusTone: Record<JobStatus, Tone> = {
  not_started: "neutral",
  in_progress: "blue",
  review: "amber",
  approved: "emerald",
  delivered: "emerald",
};

export const jobStatusLabel: Record<JobStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  review: "In review",
  approved: "Approved",
  delivered: "Delivered",
};

// --- seed data ----------------------------------------------------------
// 4 jobs total covering: video-only, mixed (video + carousel), photo set,
// and a delivered/done job. Editors reused from editor-data.tsx users.

// helpers — keep file/version ids stable
const fileId = (jobId: string, itemKey: string, v: number, idx: number) =>
  `${jobId}-${itemKey}-v${v}-f${idx}`;
const versionId = (jobId: string, itemKey: string, v: number) =>
  `${jobId}-${itemKey}-v${v}`;
const itemId = (jobId: string, itemKey: string) => `${jobId}-${itemKey}`;

function mkVideoFile(
  jobId: string,
  itemKey: string,
  v: number,
  seed: string,
): ItemFile {
  return {
    id: fileId(jobId, itemKey, v, 0),
    filename: `${itemKey}-v${v}.mp4`,
    thumbnailUrl: PICSUM(seed, 720, 1280),
    posterUrl: PICSUM(seed, 720, 1280),
    durationSec: 28,
    width: 720,
    height: 1280,
    orderIndex: 0,
  };
}

function mkClipFiles(
  jobId: string,
  itemKey: string,
  v: number,
  baseSeed: string,
  n: number,
): ItemFile[] {
  return Array.from({ length: n }, (_, i) => ({
    id: fileId(jobId, itemKey, v, i),
    filename: `clip-${String(i + 1).padStart(2, "0")}.mp4`,
    thumbnailUrl: PICSUM(`${baseSeed}-${i + 1}`, 480, 720),
    posterUrl: PICSUM(`${baseSeed}-${i + 1}`, 480, 720),
    durationSec: 7 + (i % 4),
    width: 720,
    height: 1280,
    orderIndex: i,
  }));
}

function mkPhotoFiles(
  jobId: string,
  itemKey: string,
  v: number,
  baseSeed: string,
  n: number,
): ItemFile[] {
  return Array.from({ length: n }, (_, i) => ({
    id: fileId(jobId, itemKey, v, i),
    filename: `${itemKey}-${String(i + 1).padStart(2, "0")}.jpg`,
    thumbnailUrl: PICSUM(`${baseSeed}-${i + 1}`, 800, 600),
    width: 4000,
    height: 3000,
    orderIndex: i,
  }));
}

// ---------- JOB 1: ocean (video + carousel, in review) ------------------

const jobOcean: Job = {
  id: "job-ocean",
  title: "Ocean Blvd · social reels",
  orderId: "ord-ocean",
  orderTitle: "245 Ocean Blvd",
  orderAddress: "Jacksonville Beach, FL 32250",
  editorId: "RZ",
  managerId: "KY",
  status: "review",
  dueAt: "May 20",
  createdAt: "May 14",
  requirement: {
    tone: "Bright + airy. Hero kitchen shot leads the reel.",
    musicLicenseConfirmed: true,
    captionsRequested: false,
    brandReference: "drive/StarepBrandKit/v3",
    notes: "Match pacing from last week's Beach Blvd cut. Hold the kitchen 0.5s longer than the previous batch.",
  },
  itemIds: ["job-ocean-reel", "job-ocean-carousel"],
  tone: "amber",
};

const itemOceanReel: Item = {
  id: itemId("job-ocean", "reel"),
  jobId: "job-ocean",
  title: "Listing reel — 30s",
  kind: "video",
  status: "review",
  brief: {
    assignee: { type: "in_house", name: "RienzZzy" },
    note: "Hero shot at 0:00, drone reveal by 0:08.",
    brief: "Bright, airy walkthrough with drone reveal. Match the v1 cut from last week's Beach Blvd reel for pacing.",
    length: "30s",
    script: "Open on door → kitchen → living → pool → drone reveal.",
    musicReference: "Lo-fi calm, ~95 BPM. Reference: Beach Blvd v1 track.",
    deadline: "May 20",
    priority: "high",
    revisions: 2,
    musicLicenseConfirmed: true,
    captionsRequested: false,
    kind: "video",
  },
  currentVersionNumber: 2,
  versions: [
    {
      id: versionId("job-ocean", "reel", 1),
      number: 1,
      status: "superseded",
      files: [mkVideoFile("job-ocean", "reel", 1, "ocean-reel-v1")],
      feedback: [
        {
          id: "fb-ocean-reel-1",
          authorId: "KY",
          body: "Pacing feels rushed at 0:12 — let the kitchen shot breathe.",
          timestampSec: 12,
          status: "resolved",
          createdAt: "3d ago",
        },
        {
          id: "fb-ocean-reel-2",
          authorId: "KY",
          body: "Drone reveal landed perfectly.",
          timestampSec: 22,
          status: "resolved",
          createdAt: "3d ago",
        },
      ],
      notes: "First pass — focused on tempo.",
      uploadedBy: "RZ",
      uploadedAt: "4d ago",
    },
    {
      id: versionId("job-ocean", "reel", 2),
      number: 2,
      status: "ready",
      files: [mkVideoFile("job-ocean", "reel", 2, "ocean-reel-v2")],
      feedback: [
        {
          id: "fb-ocean-reel-3",
          authorId: "KY",
          body: "Better. Slight color drift at 0:18 — warm it half a stop?",
          timestampSec: 18,
          status: "open",
          createdAt: "1h ago",
        },
      ],
      notes: "Re-paced + held the kitchen 0.5s longer.",
      uploadedBy: "RZ",
      uploadedAt: "1d ago",
    },
  ],
};

const itemOceanCarousel: Item = {
  id: itemId("job-ocean", "carousel"),
  jobId: "job-ocean",
  title: "IG carousel — 8 clips",
  kind: "carousel",
  status: "review",
  brief: {
    assignee: { type: "in_house", name: "RienzZzy" },
    note: "8 vertical clips for IG carousel. Each 5–8s.",
    brief: "Short vertical highlights for the carousel post. v2 adds 2 extra clips (pool angle + sunset).",
    length: "8 × 7s",
    deadline: "May 21",
    priority: "normal",
    revisions: 1,
    kind: "carousel",
  },
  currentVersionNumber: 2,
  versions: [
    {
      id: versionId("job-ocean", "carousel", 1),
      number: 1,
      status: "superseded",
      files: mkClipFiles("job-ocean", "carousel", 1, "ocean-carousel-v1", 6),
      feedback: [
        {
          id: "fb-ocean-car-folder",
          authorId: "KY",
          body: "Overall looks good. Clip 3 transition feels jarring vs the rest.",
          status: "resolved",
          createdAt: "2d ago",
        },
        {
          id: "fb-ocean-car-clip3",
          fileId: fileId("job-ocean", "carousel", 1, 2),
          authorId: "KY",
          body: "Trim 0.5s off the front, the cut is hard.",
          status: "resolved",
          createdAt: "2d ago",
        },
        {
          id: "fb-ocean-car-add-shots",
          authorId: "KY",
          body: "Add 1-2 pool angle clips + a sunset hero shot to round it out.",
          status: "resolved",
          createdAt: "2d ago",
        },
      ],
      uploadedBy: "RZ",
      uploadedAt: "2d ago",
    },
    {
      id: versionId("job-ocean", "carousel", 2),
      number: 2,
      status: "ready",
      // v2: 8 files (6 original + 2 new — last two indices are new)
      files: mkClipFiles("job-ocean", "carousel", 2, "ocean-carousel-v2", 8),
      feedback: [],
      notes: "Re-cut clip 3 + added pool + sunset clips at the end.",
      uploadedBy: "RZ",
      uploadedAt: "5h ago",
    },
  ],
};

// ---------- JOB 2: yorkshire (photo set, in progress) -------------------

const jobYorkshire: Job = {
  id: "job-yorkshire",
  title: "Yorkshire Dr · listing photos",
  orderId: "ord-yorkshire",
  orderTitle: "45 Yorkshire Dr",
  orderAddress: "St. Augustine, FL 32092",
  editorId: "MA",
  managerId: "KY",
  status: "in_progress",
  dueAt: "May 22",
  createdAt: "May 18",
  requirement: {
    tone: "Natural daylight, no over-saturation.",
    musicLicenseConfirmed: false,
    captionsRequested: false,
    brandReference: "",
    notes: "Standard interior set + 6 exterior + 2 twilight. Sky replace if cloudy.",
  },
  itemIds: ["job-yorkshire-interior", "job-yorkshire-twilight"],
  tone: "blue",
};

const itemYorkshireInterior: Item = {
  id: itemId("job-yorkshire", "interior"),
  jobId: "job-yorkshire",
  title: "Interior photos — 18 frames",
  kind: "photo",
  status: "in_progress",
  brief: {
    assignee: { type: "in_house", name: "Marry Anderson" },
    note: "Brighten interiors + sky replace where needed.",
    brief: "Full interior set. Color match the kitchen frames first; everything else follows that white balance.",
    deadline: "May 22",
    priority: "normal",
    revisions: 1,
    kind: "photo",
  },
  currentVersionNumber: 1,
  versions: [
    {
      id: versionId("job-yorkshire", "interior", 1),
      number: 1,
      status: "processing",
      files: mkPhotoFiles("job-yorkshire", "interior", 1, "yorkshire-int-v1", 18),
      feedback: [],
      uploadedBy: "MA",
      uploadedAt: "2h ago",
    },
  ],
};

const itemYorkshireTwilight: Item = {
  id: itemId("job-yorkshire", "twilight"),
  jobId: "job-yorkshire",
  title: "Twilight exteriors — 2 frames",
  kind: "twilight",
  status: "not_started",
  brief: {
    assignee: { type: "in_house", name: "Marry Anderson" },
    note: "Sky replace + warm exterior lights. Standard twilight look.",
    deadline: "May 22",
    priority: "normal",
    kind: "twilight",
  },
  versions: [],
};

// ---------- JOB 3: lighthouse (just assigned, not started) --------------

const jobLighthouse: Job = {
  id: "job-lighthouse",
  title: "Lighthouse Cir · hero reel",
  orderId: "ord-lighthouse",
  orderTitle: "200 Lighthouse Cir",
  orderAddress: "Vilano Beach, FL 32084",
  editorId: "MA",
  managerId: "KY",
  status: "not_started",
  dueAt: "May 25",
  createdAt: "May 19",
  notes: "Brand-new listing — full hero treatment.",
  itemIds: ["job-lighthouse-reel"],
  tone: "neutral",
};

const itemLighthouseReel: Item = {
  id: itemId("job-lighthouse", "reel"),
  jobId: "job-lighthouse",
  title: "Hero reel — 45s",
  kind: "video",
  status: "not_started",
  brief: {
    assignee: { type: "in_house", name: "Marry Anderson" },
    note: "Standard hero. Match v12.3 Beach Blvd pacing.",
    brief: "Full hero reel. Drone establishing → walkthrough → drone exit. Music with strong build at 0:20.",
    length: "45s",
    deadline: "May 25",
    priority: "high",
    revisions: 2,
    musicLicenseConfirmed: false,
    captionsRequested: true,
    kind: "video",
  },
  versions: [],
};

// ---------- JOB 4: park (delivered, archived view) ----------------------

const jobPark: Job = {
  id: "job-park",
  title: "Park Ave · listing reel",
  orderId: "ord-park",
  orderTitle: "800 Park Ave",
  orderAddress: "Jacksonville, FL 32209",
  editorId: "MA",
  managerId: "KY",
  status: "delivered",
  dueAt: "May 17",
  createdAt: "May 10",
  itemIds: ["job-park-reel"],
  tone: "emerald",
};

const itemParkReel: Item = {
  id: itemId("job-park", "reel"),
  jobId: "job-park",
  title: "Listing reel — 30s",
  kind: "video",
  status: "delivered",
  brief: {
    assignee: { type: "in_house", name: "Marry Anderson" },
    note: "Standard 30s reel.",
    length: "30s",
    deadline: "May 17",
    priority: "normal",
    kind: "video",
  },
  currentVersionNumber: 2,
  versions: [
    {
      id: versionId("job-park", "reel", 1),
      number: 1,
      status: "superseded",
      files: [mkVideoFile("job-park", "reel", 1, "park-reel-v1")],
      feedback: [
        {
          id: "fb-park-1",
          authorId: "KY",
          body: "Music feels off — try the warmer track from Devon's library.",
          timestampSec: 4,
          status: "resolved",
          createdAt: "5d ago",
        },
      ],
      uploadedBy: "MA",
      uploadedAt: "6d ago",
    },
    {
      id: versionId("job-park", "reel", 2),
      number: 2,
      status: "approved",
      files: [mkVideoFile("job-park", "reel", 2, "park-reel-v2")],
      feedback: [
        {
          id: "fb-park-2",
          authorId: "KY",
          body: "Approved. Sending today.",
          status: "resolved",
          createdAt: "2d ago",
        },
      ],
      uploadedBy: "MA",
      uploadedAt: "3d ago",
    },
  ],
};

// --- collections + lookup -----------------------------------------------

// Live arrays — mock layer allows runtime mutation via createJobMock().
// React components subscribe via subscribeJobs() so list updates after creation.
export const jobs: Job[] = [jobOcean, jobYorkshire, jobLighthouse, jobPark];

export const items: Item[] = [
  itemOceanReel,
  itemOceanCarousel,
  itemYorkshireInterior,
  itemYorkshireTwilight,
  itemLighthouseReel,
  itemParkReel,
];

const jobById = new Map(jobs.map((j) => [j.id, j]));
const itemById = new Map(items.map((it) => [it.id, it]));

// ---- candidate (unassigned) source for the Assign Job wizard ----------
// Mock orders + the items that could be batched into a new job. Reused by
// AssignJobDialog Step 1.

export type CandidateOrder = {
  id: string;
  title: string;
  address: string;
  rawReady: boolean;
  candidates: CandidateItem[];
};

export type CandidateItem = {
  key: string;          // stable within order
  title: string;
  kind: ItemKind;
  expectedFileCount?: number;
  defaultPriority?: "low" | "normal" | "high" | "rush";
};

export const candidateOrders: CandidateOrder[] = [
  {
    id: "ord-marsh",
    title: "612 Marshview Dr",
    address: "Saint Augustine, FL 32084",
    rawReady: true,
    candidates: [
      { key: "reel-30", title: "Listing reel — 30s", kind: "video", defaultPriority: "high" },
      { key: "carousel-6", title: "IG carousel — 6 clips", kind: "carousel" },
      { key: "interior", title: "Interior photos — 22 frames", kind: "photo", expectedFileCount: 22 },
      { key: "twilight", title: "Twilight exteriors — 2 frames", kind: "twilight", expectedFileCount: 2 },
      { key: "drone", title: "Drone establishers — 4 frames", kind: "drone", expectedFileCount: 4 },
    ],
  },
  {
    id: "ord-palm",
    title: "78 Palmera Ct",
    address: "Ponte Vedra, FL 32082",
    rawReady: true,
    candidates: [
      { key: "reel-45", title: "Hero reel — 45s", kind: "video", defaultPriority: "high" },
      { key: "interior", title: "Interior photos — 14 frames", kind: "photo", expectedFileCount: 14 },
      { key: "3d", title: "3D walkthrough tour", kind: "3d_tour" },
    ],
  },
  {
    id: "ord-bay",
    title: "1402 Bay Harbor Ln",
    address: "Jacksonville, FL 32256",
    rawReady: false, // raw not uploaded yet — dimmed/disabled in picker
    candidates: [
      { key: "reel-30", title: "Listing reel — 30s", kind: "video" },
      { key: "interior", title: "Interior photos — 16 frames", kind: "photo" },
    ],
  },
];

// ---- runtime mutation (mock) -------------------------------------------

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeJobs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Stable id from string (djb2). No Math.random/Date.now allowed.
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

export type CreateJobInput = {
  order: CandidateOrder;
  editorId: string;
  managerId: string;
  dueAt: string;
  requirement?: JobRequirement;
  picks: Array<{
    candidate: CandidateItem;
    brief?: ItemBrief;
  }>;
};

export function createJobMock(input: CreateJobInput): Job {
  const seed = `${input.order.id}-${input.editorId}-${jobs.length}-${input.picks.map((p) => p.candidate.key).join(",")}`;
  const jobId = `job-${djb2(seed)}`;
  const newItems: Item[] = input.picks.map((p, i) => ({
    id: `${jobId}-${p.candidate.key}`,
    jobId,
    title: p.candidate.title,
    kind: p.candidate.kind,
    status: "not_started",
    brief: p.brief,
    versions: [],
  }));

  const newJob: Job = {
    id: jobId,
    title: `${input.order.title.split(" · ")[0]} · ${input.picks.length} ${input.picks.length === 1 ? "item" : "items"}`,
    orderId: input.order.id,
    orderTitle: input.order.title,
    orderAddress: input.order.address,
    editorId: input.editorId,
    managerId: input.managerId,
    status: "not_started",
    dueAt: input.dueAt,
    createdAt: "just now",
    requirement: input.requirement,
    itemIds: newItems.map((it) => it.id),
    tone: "neutral",
  };

  jobs.unshift(newJob);
  jobById.set(newJob.id, newJob);
  for (const it of newItems) {
    items.push(it);
    itemById.set(it.id, it);
  }
  notify();
  return newJob;
}

export function getJob(id: string): Job | undefined {
  return jobById.get(id);
}

export function getItem(id: string): Item | undefined {
  return itemById.get(id);
}

export function getItemsForJob(jobId: string): Item[] {
  const job = jobById.get(jobId);
  if (!job) return [];
  return job.itemIds.map((id) => itemById.get(id)!).filter(Boolean);
}

export function getCurrentVersion(item: Item): ItemVersion | undefined {
  if (!item.versions.length) return undefined;
  const target = item.currentVersionNumber;
  if (target != null) {
    const found = item.versions.find((v) => v.number === target);
    if (found) return found;
  }
  return item.versions[item.versions.length - 1];
}

/**
 * Files in `version` that don't have a positional counterpart in the
 * previous version of `item` — i.e. newly added in this upload.
 * Heuristic: any file whose order_index is >= the previous version's file
 * count is considered new. Sufficient for the prototype until the backend
 * supplies a real "supersedes" link.
 */
export type ManagerOrder = {
  id: string;
  title: string;
  address: string;
  rawReady: boolean;
  /** Items still up for grabs — empty if everything's been batched. */
  candidates: CandidateItem[];
  allOrderItems: CandidateItem[];
  jobs: Job[];
};

export function getCategoryForKind(kind: ItemKind): "video" | "photo" | "other" {
  if (kind === "video" || kind === "carousel") return "video";
  if (kind === "photo" || kind === "twilight" || kind === "virtual_staging") return "photo";
  return "other";
}

export function getManagerOrders(): ManagerOrder[] {
  const byId = new Map<string, ManagerOrder>();

  // 1. Seed from candidateOrders (full address + candidates + rawReady).
  for (const c of candidateOrders) {
    byId.set(c.id, {
      id: c.id,
      title: c.title,
      address: c.address,
      rawReady: c.rawReady,
      candidates: [...c.candidates],
      allOrderItems: [...c.candidates],
      jobs: [],
    });
  }

  // 2. Merge orders referenced by existing jobs (may not be in candidateOrders).
  //    For "spin up another job" we need items the manager can re-batch —
  //    derive them from the existing jobs' items so the dialog isn't empty.
  for (const j of jobs) {
    if (!j.orderId) continue;
    const jobItems = j.itemIds.map((id) => itemById.get(id)).filter((it): it is Item => !!it);
    const itemAsCandidates: CandidateItem[] = jobItems.map((it) => ({
      key: it.id,
      title: it.title,
      kind: it.kind,
      defaultPriority: it.brief?.priority,
    }));

    const existing = byId.get(j.orderId);
    if (existing) {
      existing.jobs.push(j);
      // Merge allOrderItems — keep dedupe by key.
      const seen = new Set(existing.allOrderItems.map((c) => c.key));
      for (const c of itemAsCandidates) {
        if (!seen.has(c.key)) {
          existing.allOrderItems.push(c);
          seen.add(c.key);
        }
      }
    } else {
      byId.set(j.orderId, {
        id: j.orderId,
        title: j.orderTitle ?? j.title,
        address: j.orderAddress ?? "",
        // If we only know about it through a job, raw must've been ready.
        rawReady: true,
        candidates: [],
        allOrderItems: itemAsCandidates,
        jobs: [j],
      });
    }
  }

  // 3. For each order, filter candidates that are already assigned to jobs.
  for (const order of byId.values()) {
    if (order.jobs.length > 0) {
      const assignedKeys = new Set<string>();
      for (const j of order.jobs) {
        const prefix = `${j.id}-`;
        for (const itemId of j.itemIds) {
          const item = itemById.get(itemId);
          if (item) {
            if (item.id.startsWith(prefix)) {
              assignedKeys.add(item.id.substring(prefix.length));
            } else {
              const suffix = item.id.substring(item.id.lastIndexOf("-") + 1);
              assignedKeys.add(suffix);
            }
          }
        }
      }
      order.candidates = order.allOrderItems.filter((c) => !assignedKeys.has(c.key));
    } else {
      order.candidates = [...order.allOrderItems];
    }
  }

  // Sort: orders with pending work first, then by title.
  return Array.from(byId.values()).sort((a, b) => {
    const aHot = a.candidates.length > 0 ? 0 : 1;
    const bHot = b.candidates.length > 0 ? 0 : 1;
    if (aHot !== bHot) return aHot - bHot;
    return a.title.localeCompare(b.title);
  });
}

export function getNewFileIds(item: Item, version: ItemVersion): Set<string> {
  const idx = item.versions.findIndex((v) => v.id === version.id);
  if (idx <= 0) return new Set();
  const prev = item.versions[idx - 1];
  const prevCount = prev.files.length;
  return new Set(
    version.files
      .filter((f) => f.orderIndex >= prevCount)
      .map((f) => f.id),
  );
}

export function updateJobStatusFromItems(jobId: string) {
  const job = jobById.get(jobId);
  if (!job) return;
  const items = getItemsForJob(jobId);
  if (!items.length) return;

  const statuses = items.map((it) => it.status);

  let nextStatus: JobStatus = "not_started";
  if (statuses.every((s) => s === "delivered")) {
    nextStatus = "delivered";
  } else if (statuses.every((s) => s === "approved" || s === "delivered")) {
    nextStatus = "approved";
  } else if (statuses.some((s) => s === "review")) {
    nextStatus = "review";
  } else if (statuses.some((s) => s === "in_progress")) {
    nextStatus = "in_progress";
  } else if (statuses.some((s) => s === "approved")) {
    nextStatus = "in_progress";
  } else {
    nextStatus = "not_started";
  }

  if (job.status !== nextStatus) {
    job.status = nextStatus;
  }
}

export function transitionItem(itemId: string, nextStatus: JobStatus) {
  const item = itemById.get(itemId);
  if (!item) return;
  item.status = nextStatus;

  // Sync version statuses
  const currentVersion = getCurrentVersion(item);
  if (currentVersion) {
    if (nextStatus === "approved" || nextStatus === "delivered") {
      currentVersion.status = "approved";
    } else if (nextStatus === "in_progress") {
      currentVersion.status = "rejected";
    }
  }

  if (item.jobId) {
    updateJobStatusFromItems(item.jobId);
  }
  notify();
}

export function transitionJob(jobId: string, nextStatus: JobStatus) {
  const job = jobById.get(jobId);
  if (!job) return;
  job.status = nextStatus;

  if (nextStatus === "delivered") {
    const jobItems = getItemsForJob(jobId);
    for (const item of jobItems) {
      item.status = "delivered";
      const currentVersion = getCurrentVersion(item);
      if (currentVersion) {
        currentVersion.status = "approved";
      }
    }
  }
  notify();
}

export function uploadItemVersion(
  itemId: string,
  fileCount: number,
  uploadedBy: string = "MA",
  notes?: string,
): ItemVersion | undefined {
  const item = itemById.get(itemId);
  if (!item) return undefined;
  const job = jobById.get(item.jobId);
  if (!job) return undefined;

  const nextNumber = item.versions.length ? (item.versions[item.versions.length - 1].number + 1) : 1;
  const itemKey = item.id.startsWith(job.id + "-") ? item.id.substring(job.id.length + 1) : item.id;
  const vId = versionId(job.id, itemKey, nextNumber);

  let files: ItemFile[] = [];
  const seed = `${job.id}-${itemKey}-v${nextNumber}`;
  if (item.kind === "video") {
    files = [mkVideoFile(job.id, itemKey, nextNumber, `${seed}-reel`)];
  } else if (item.kind === "carousel") {
    files = mkClipFiles(job.id, itemKey, nextNumber, `${seed}-carousel`, fileCount || 6);
  } else {
    files = mkPhotoFiles(job.id, itemKey, nextNumber, `${seed}-photos`, fileCount || 10);
  }

  const newVersion: ItemVersion = {
    id: vId,
    number: nextNumber,
    status: "ready",
    files,
    feedback: [],
    notes,
    uploadedBy,
    uploadedAt: "just now",
  };

  item.versions.push(newVersion);
  item.currentVersionNumber = nextNumber;
  item.status = "review";

  if (job.status === "not_started") {
    job.status = "in_progress";
  }
  updateJobStatusFromItems(job.id);
  notify();
  return newVersion;
}

export function addCandidateItem(orderId: string, title: string, kind: ItemKind) {
  let order = candidateOrders.find((o) => o.id === orderId);
  if (!order) {
    const j = jobs.find((job) => job.orderId === orderId);
    order = {
      id: orderId,
      title: j?.orderTitle ?? "Custom Order",
      address: j?.orderAddress ?? "",
      rawReady: true,
      candidates: [],
    };
    candidateOrders.push(order);
  }
  const key = `custom-${order.id}-${order.candidates.length}`;
  order.candidates.push({
    key,
    title,
    kind,
    defaultPriority: "normal",
  });
  notify();
}

export function acceptJob(jobId: string) {
  const job = jobById.get(jobId);
  if (job) {
    job.accepted = true;
    notify();
  }
}

export function readRequirements(jobId: string) {
  const job = jobById.get(jobId);
  if (job) {
    job.requirementsRead = true;
    notify();
  }
}
