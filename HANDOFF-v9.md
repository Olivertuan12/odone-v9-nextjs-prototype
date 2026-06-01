# Odone v9 — Handoff

> **Canonical doc for the prototype as of June 2026.**
> Supersedes HANDOFF.md, HANDOFF-v12.2.md, HANDOFF-v12.4.md. Those remain
> as historical reference but v9 is the working baseline. Read this first.

---

## TL;DR (Vietnamese)

Odone v9 là phiên bản role-driven của prototype. Bốn role (admin / manager / editor / shooter) đều có một home riêng — không ai phải nhìn 80% màn không liên quan. Manager + Admin sống ở **Manager Hub** (`/jobs`) — danh sách order-centric, mỗi order có roll-up nhiều job, click "Spin up another job" để mở AssignJobDialog đã pre-locked theo order đó. Editor sống ở **My Queue** (`/jobs`) — danh sách item-level, nhóm theo "Needs revision / Working / Awaiting review / Upcoming / Done", có inline Upload button. Shooter sống ở **Calendar** (`/calendar`) — agenda với address là Google Maps link và Upload affordance per shoot. Dialog assign giờ không hỏi pick order khi context đã rõ. Brief đã thành popover button trong header thay vì left pane chiếm chỗ. Order detail có "Assign as Job" CTA primary.

---

## 1. What Odone v9 is

A media-production workflow UI for real-estate listings, prototyped in Next.js. Four roles flow:

```
Booking (external) → Calendar (auto-sync)
                        ↓
                   Shooter shoots + EOD-uploads + confirms
                        ↓
                   Manager Hub — assigns raw as a Job to one editor
                        ↓
                   Editor My Queue — downloads brief, edits, uploads versions
                        ↓
                   Manager reviews — Approve or Send revision
                        ↓
                   Approved → client share link
```

**Stack:** Next.js 16.2 (App Router, React 19), TypeScript strict, Tailwind v4 (PostCSS only, tokens in `src/app/globals.css`), shadcn `base-nova` on base-ui, lucide-react@1.16, sonner toasts, vaul drawers, @dnd-kit. Path alias `@/*` → `src/*`. **All components are client components.** No backend wiring — mock data in `editor-data.tsx` and `src/components/jobs/jobs-data.ts`.

---

## 2. Routes & role-routed home

`src/app/page.tsx` (`/`) reads `useCurrentUser()` and redirects per `ROLE_HOME_ROUTE`:

| Role | Home route | Where they live |
|---|---|---|
| admin | `/jobs` | Manager Hub (admin = manager for permissions) |
| manager | `/jobs` | Manager Hub |
| editor | `/jobs` | My Queue (different branch in `jobs-page.tsx`) |
| shooter | `/calendar` | Calendar agenda with Maps + Upload affordances |
| va | `/jobs` | Generic Jobs list (fallback) |

Persona is set via `?as=<key>` URL param OR via sidebar footer **"View as…"** submenu (no need to remember keys). Mock users live in `src/hooks/use-current-user.ts → MOCK_USERS`.

**Other routes (auxiliary):**
- `/orders` + `/orders/[orderId]` — Order detail with new "Assign as Job" primary CTA
- `/jobs/[jobId]` — Job detail (items + requirement side panel)
- `/jobs/[jobId]/items/[itemId]` — Item Version page (gallery / single mode, Filmstrip, Feedback panel, Brief popover)
- `/calendar` — Shoot scheduling (agenda + month)
- `/chat` — Slack-style DMs + Project Channels (currently not Job-aware; see Gaps)
- `/uploads` — Files browser (raw + delivery + Shoots tab with `MyShootsView`)
- `/catalog` — Service catalog
- `/settings/*` — 13 subpages (Account / Workspace / Production / Integrations)
- `/dashboard` — **legacy demo, candidate for archive** (zero links to it)
- `/mobile` — **separate redesign track, not v9-aware** (also archive candidate)

---

## 3. Component map

### Active v9 (Jobs domain — the new flow)

| File | LOC | Role |
|---|---:|---|
| `src/components/jobs/jobs-data.ts` | ~950 | Type definitions (`Job`, `Item`, `ItemVersion`, `ItemFile`, `JobRequirement`, `CandidateOrder`, `ManagerOrder`), seed data, `subscribeJobs()`, `createJobMock()`, `getManagerOrders()` helper merging candidate + jobs orders, and state transition mutators (`transitionItem`, `transitionJob`, `uploadItemVersion`, `updateJobStatusFromItems`) |
| `src/components/jobs/jobs-page.tsx` | 1066 | `/jobs` entry — branches by role: `ManagerHubView` (order-centric cards w/ nested jobs), `EditorMyQueueView` (flat item-level grouped), `GenericJobsList` (va fallback). `CounterPill`, `RawReadyCard`, `ManagerOrderCard`, `ManagerOrderJobRow`, `EditorItemRow`. |
| `src/components/jobs/job-detail-page.tsx` | ~490 | `/jobs/[jobId]` — items list + requirement side panel (`RequirementCard`), plus manager batch actions (`Approve all`, `Send revision`, `Mark delivered`). Click item → ItemVersion page |
| `src/components/jobs/item-version-page.tsx` | ~790 | `/jobs/[jobId]/items/[itemId]` — Gallery/Single mode, `VersionSelector`, `ReviewingVersionLine` ("v2 LATEST · uploaded by"), role-gated Approve/Send revision (manager) or Upload/Mark ready (editor) in header, `BriefPopover` (renders item brief + job requirement) |
| `src/components/jobs/feedback-panel.tsx` | ~680 | Right rail: All / Undone / Done tabs, real Upload in panel header updating mock state, inline Edit / Reply / Resolve, Download All, timestamp pin composer |
| `src/components/jobs/carousel-view.tsx` | ~330 | Carousel item variant — clip grid (gallery) + Filmstrip (single), `new in v2` indicator |
| `src/components/jobs/photo-grid-view.tsx` | ~210 | Photo item variant — thumbnail grid + single mode preview, shares Filmstrip from carousel-view |
| `src/components/jobs/assign-job-dialog.tsx` | 1086 | 3-step wizard. **Accepts `initialOrder?`** — when set, hides order picker, pre-ticks items, dialog runs straight to Brief step. `Step1OrderHeader` shows "FROM ORDER" badge. Editor picker shows specialty (video/photo/both) badges + smart hint when picks span both kinds. |

### Active v9 (cross-surface support)

| File | Notes |
|---|---|
| `src/hooks/use-current-user.ts` | `MOCK_USERS`, `ROLE_HOME_ROUTE`, `useCurrentUser()`. Reads `?as=` after mount to avoid hydration mismatch. |
| `src/components/editor-data.tsx` | `users` map (MA / RZ / MJ / KY) with `specialty: "video" \| "photo" \| "both"`. `VIDEO_KINDS` + `PHOTO_KINDS` sets used by AssignDialog to recommend editors. `columns` legacy export still used by `editor-kanban.tsx` (admin overview). |
| `src/components/editor-sidebar.tsx` | Workspace nav (Orders / Calendar / Files / Jobs / Chat), Admin group (Members / Catalog), footer reads `currentUser` + "View as…" persona switcher. **"Editor Queue" entry removed** (replaced by Jobs). |
| `src/components/editor-site-header.tsx` | Breadcrumb + Search palette + Bell. **"+ New Project" button removed** — there's no manual project-creation flow (orders come from external booking portal). |
| `src/app/page.tsx` | Role-routed home (`/` redirects per `ROLE_HOME_ROUTE`). Admin sees Manager Hub by virtue of redirect to `/jobs`; the in-place fallback render is the legacy `EditorKanban` (kept for now, see Gaps). |
| `src/components/orders/order-overview-tab.tsx` | **3594 LOC** monolith. New: prominent "Assign as Job" CTA in `AssignStep` opens `AssignJobDialog` with the current order pre-locked as `initialOrder` (converted from `Order.deliverables` to `CandidateOrder`). `canManage` now includes manager (not just admin). Per-row `AssignConfirmDialog` still exists as edge-case fallback. |
| `src/components/orders/order-delivery-tab.tsx` | Reads `useEditorState` to overlay kanban-approved deliverables. **Will need migration once Jobs becomes source of truth.** |
| `src/components/calendar/agenda-sidebar.tsx` | `AgendaItem` per row: prominent time (tabular nums), address wrapped in Google Maps `dir/?api=1&destination=…` anchor (shooter only), Upload affordance button (shooter only), Now/portal indicator. |
| `src/components/uploads/my-shoots-view.tsx` | Shooter's day-of-work board (Shoots tab inside `/uploads`). `ShootCard` address also wrapped in Maps link. Drag-drop upload + Confirm flow. |

### Legacy still-wired (kept for back-compat)

These components are referenced from the live tree but the v9 design intends to eventually replace or retire them. Don't extend; don't delete yet either.

| File | Used by | Plan |
|---|---|---|
| `src/components/editor-kanban.tsx` | `app/page.tsx` (admin in-place render before redirect fires) | Retire once admin home is clearly Manager Hub. The kanban view of jobs *could* live on `/jobs` as a Board toggle; doesn't exist yet. |
| `src/components/editor-list.tsx` | `editor-kanban.tsx` | Goes with kanban. |
| `src/components/editor-detail-dialog.tsx` (~1500 LOC) | `app/page.tsx`, `order-overview-tab.tsx → EditingStep` | The 4-stage detail modal. `ItemVersionPage` is the canonical replacement; this stays until order-overview-tab is migrated. |
| `src/components/editor-state.tsx` | `app/layout.tsx (EditorStateMount)`, `order-overview-tab.tsx`, `order-delivery-tab.tsx` | Global context for the old kanban (stage / version / feedback / brief per card-id). New flow uses `jobs-data.ts` subscriptions. Both run in parallel for now. |
| `src/components/editor-stage-action-dialog.tsx` | (search currently shows no imports — see Archive candidates) | |
| `src/components/editor-status-pill.tsx` | `editor-list.tsx` / kanban | |
| `src/components/editor-types.ts` | Shared `Assignee`, `AssignSubmission` types — still used by both old and new flows | Keep. |

### Archive candidates (truly orphan or out-of-scope for v9)

The following should be moved to `_archive/` because nothing in the live `/jobs|/orders|/calendar|/uploads|/chat|/settings|/catalog` tree imports them. Confirm with `grep -rln` before moving.

| File | Why |
|---|---|
| `src/components/chat-dialog.tsx`, `src/components/new-dm-dialog.tsx`, `src/components/new-channel-dialog.tsx` | Only referenced in comments in `editor-sidebar.tsx` and `chat/chat-page.tsx`. Not mounted. |
| `src/components/new-project-dialog.tsx` | "+ New Project" button removed from header in v9. No callers. |
| `src/components/data-table.tsx`, `src/components/chart-area-interactive.tsx`, `src/components/section-cards.tsx`, `src/components/nav-documents.tsx`, `src/components/nav-main.tsx`, `src/components/nav-secondary.tsx`, `src/components/nav-user.tsx`, `src/components/app-sidebar.tsx`, `src/components/site-header.tsx` | shadcn dashboard-01 demo scaffolding. Only used by `app/dashboard/page.tsx` legacy demo. |
| `src/app/dashboard/page.tsx` | Legacy shadcn demo route. No links from sidebar. Has 2 known TS errors. |
| `src/app/mobile/*` | Separate redesign track per CLAUDE.md — not v9-aware. |

---

## 4. Data model (mock layer)

### Hierarchy

```
Order (CandidateOrder | ManagerOrder)
  └─ Job
      └─ Item (the "deliverable" in v8 backend speak)
          └─ ItemVersion (v1, v2, …)
              └─ ItemFile (R2 reference; carousel = N files, video = 1)
              └─ FeedbackEntry[]
```

### Types (`jobs-data.ts`)

```ts
type JobStatus = "not_started" | "in_progress" | "review" | "approved" | "delivered";
// Mirrors Supabase deliverable_status_t — do NOT invent new status values.

type ItemKind = "video" | "carousel" | "photo" | "drone" | "floor_plan" | "twilight" | "3d_tour" | "virtual_staging" | "other";

type JobRequirement = {
  tone?: string;
  musicLicenseConfirmed?: boolean;
  captionsRequested?: boolean;
  brandReference?: string;
  notes?: string;
};

type ItemBrief = {
  assignee, note, brief?, length?, script?, musicReference?,
  deadline?, priority?, revisions?, musicLicenseConfirmed?, captionsRequested?, kind?
};

type Job = {
  id, title, orderId?, orderTitle?, orderAddress?,
  editorId, managerId, status, dueAt, createdAt,
  requirement?: JobRequirement, notes? (deprecated),
  itemIds: string[], tone
};

type Item = { id, jobId, title, kind, status, brief?, versions: ItemVersion[], currentVersionNumber? };
type ItemVersion = { id, number, status, files: ItemFile[], feedback: FeedbackEntry[], notes?, uploadedBy?, uploadedAt };
type FeedbackEntry = { id, fileId?, authorId, body, timestampSec?, status: "open"|"resolved", createdAt };
```

### Mock mutators

| Function | What |
|---|---|
| `createJobMock(input)` | Appends a new `Job` + its `Item[]` to in-memory arrays. Notifies subscribers via `subscribeJobs(listener)`. |
| `subscribeJobs(listener)` | Simple pub-sub. JobsPage uses it to re-render after `createJobMock`. |
| `getManagerOrders()` | Merges `candidateOrders` + orders referenced by existing `jobs[]`. Items in jobs become candidates so "Spin up another job" still has things to pick. |
| `getCurrentVersion(item)` | Returns the version whose `number === currentVersionNumber`, else the last. |
| `getNewFileIds(item, version)` | Diffs file count vs previous version to badge `new in v2` thumbnails. |

### Stability rule

`Date.now()`, `new Date()`, `Math.random()` are **forbidden** in mock data and components. The runtime that drives some demos rejects unstable values. Use:
- stable string literals for ids (`"job-ocean"`, `"job-ocean-reel"`)
- djb2-hash of stable seeds (`djb2(orderId + editorId + idx)`)
- ref-counted increments

---

## 5. Persona switching

```ts
// src/hooks/use-current-user.ts
export const MOCK_USERS = {
  admin:  { id: "admin",  name: "Oliver Tuan",   role: "admin"   },
  kyle_m: { id: "KY",     name: "Kyle Norman",   role: "manager" },
  marry:  { id: "MA",     name: "Marry Anderson",role: "editor"  },
  rienz:  { id: "RZ",     name: "RienzZzy",      role: "editor"  },
  mj_e:   { id: "MJ",     name: "MJ Pereira",    role: "editor"  },
  kyle:   { id: "kyle",   name: "Kyle Anderson", role: "shooter" },
  sara:   { id: "sara",   name: "Sara Chen",     role: "shooter" },
  // ...
};
```

Two ways to switch:

1. **URL**: `/?as=kyle_m` (manager), `/?as=rienz` (editor), `/?as=sara` (shooter), etc.
2. **Sidebar footer dropdown → "View as…"** submenu lists 6 personas + role labels + checkmark on active. Click reloads with the new `?as=`.

---

## 6. Conventions

| Rule | Why |
|---|---|
| **"use client" everywhere** | No server components yet. All components are client. |
| **Semantic tokens only** | `bg-card`, `bg-popover`, `border-border`, `text-foreground`, `bg-sidebar`. Never `bg-zinc-*` or `bg-[#…]`. The only acceptable raw colors are status tones (`bg-emerald-500/10`, `text-rose-400`) — and even those should route through `toneDot` / `badgeTone` / `toneAccent` in `editor-data.tsx`. |
| **Dialogs = shadcn Dialog (base-ui)** | `showCloseButton={false}` when supplying a custom X. |
| **Popovers = shadcn Popover (base-ui)** | `<PopoverContent>` already has solid `bg-popover` — don't override. base-ui submenus use `render={…}` instead of Radix's `asChild`. |
| **Toasts = sonner** | `toast.success/info/error`. Description is the second arg. |
| **Stable timestamps** | See §4. |
| **Reuse Odone DB enums** | Status enum mirrors `deliverable_status_t`. Don't invent new values. |
| **No backend wiring** | Approve / Send revision / Upload fire toasts only. State mutators (`transitionItem`, `transitionJob`) are not yet wired — see Gaps. |

---

## 7. File ownership map

```
src/app/
├── page.tsx                       Role-routed home (admin sees legacy kanban; others redirect)
├── layout.tsx                     Mounts dark theme, sonner Toaster, NotificationSimulator, EditorStateMount
├── editor-state-mount.tsx         Shim client-mounts EditorStateProvider (legacy)
├── jobs/
│   ├── page.tsx                   <JobsPage /> — role-aware
│   ├── [jobId]/page.tsx           Job detail shell
│   └── [jobId]/items/[itemId]/page.tsx  Item Version page shell
├── orders/
│   ├── page.tsx                   Order list (legacy)
│   └── [orderId]/page.tsx         Order detail shell → order-overview-tab
├── calendar/page.tsx              Calendar shell (shooter home)
├── chat/page.tsx                  Chat shell
├── uploads/page.tsx               Files + Shoots tabs
├── catalog/page.tsx               Catalog
├── settings/*                     13 subpages (account / workspace / production / integrations)
├── dashboard/                     LEGACY demo — archive candidate
└── mobile/                        Separate track — archive candidate

src/components/
├── jobs/                          v9 canonical: data, page, dialogs, views, feedback, item-version
├── orders/                        Order surface (still uses EditorDetailDialog for review)
├── calendar/                      Calendar surface (agenda has shooter polish)
├── chat/                          Slack-style chat (NOT Job-aware yet)
├── uploads/                       Files + MyShootsView
├── catalog/                       Catalog
├── settings/                      Settings subpages
├── mobile/                        Mobile track — archive candidate
├── ui/                            shadcn primitives (base-ui under the hood)
├── editor-data.tsx                Mock users + tone tokens + specialty constants
├── editor-sidebar.tsx             Nav + footer persona switcher
├── editor-site-header.tsx         Breadcrumb + search + bell
├── editor-kanban.tsx              LEGACY kanban (admin / overview)
├── editor-list.tsx                LEGACY (used by kanban)
├── editor-detail-dialog.tsx       LEGACY ~1500 LOC modal — kept for orders surface review
├── editor-state.tsx               LEGACY context provider (cardId-keyed state)
├── editor-stage-action-dialog.tsx ARCHIVE candidate (no importers)
├── editor-status-pill.tsx         LEGACY (used by editor-list)
├── editor-types.ts                Shared Assignee + AssignSubmission types
├── editor-address-popover.tsx     Used by kanban card
├── chat-dialog.tsx                ARCHIVE candidate
├── new-dm-dialog.tsx              ARCHIVE candidate
├── new-channel-dialog.tsx         ARCHIVE candidate
├── new-project-dialog.tsx         ARCHIVE candidate (button removed in v9)
├── members-dialog.tsx             Opened from sidebar Members entry
├── notification-popover.tsx       Bell dropdown
├── notification-simulator.tsx     Dev-only mock notifications generator
├── search-palette.tsx             ⌘K palette
├── send-to-client-dialog.tsx      Used by order surface
├── queue-filter-popover.tsx       Wired? Verify; potentially orphan
├── data-table.tsx                 ARCHIVE candidate (dashboard demo)
├── chart-area-interactive.tsx     ARCHIVE candidate
├── section-cards.tsx              ARCHIVE candidate
├── nav-{documents,main,secondary,user}.tsx  ARCHIVE candidates
├── app-sidebar.tsx                ARCHIVE candidate (dashboard demo)
└── site-header.tsx                ARCHIVE candidate (dashboard demo)

src/hooks/
└── use-current-user.ts            MOCK_USERS + role-home routing
```

---

## 8. Known gaps & next steps

Phased — each phase is independently shippable.

### Phase 5 — finishing touches (in progress)

1. **Real state mutators (completed).** Approve / Send revision / Upload mutate real local mock state. Added `transitionItem(itemId, next)` + `transitionJob(jobId, next)` + `uploadItemVersion` in `jobs-data.ts`; wired `item-version-page.tsx` and `feedback-panel.tsx` handlers. Job status automatically rolls up from item statuses.
2. **Celebrations.** Port `BriefCelebrateStep` (confetti + quote + "Start editing") from `editor-detail-dialog.tsx` to `item-version-page.tsx` first-download + first-approve flows.
3. **Chat per Job.** When `createJobMock` runs, append a `scope: "job"` Channel in `chat-data.ts`. Add an "Open chat" button to Job detail header. Optional: post system messages on lifecycle events (assigned / upload / approved).
4. **`JobEmbed` in chat.** Parser in `chat-page.tsx` that unfurls `/jobs/…` URLs as cards.

### Phase 6 — Orders ↔ Jobs migration

5. **Add `Deliverable.job_id` FK in `orders-data.ts`.** Today nothing on the order page knows which Job a deliverable belongs to.
6. **Migrate `order-overview-tab.tsx → EditingStep` to be Job-grouped.** Currently it groups by kind (Photos / Video / Other). With job_id, each Job becomes its own bucket. Clicking a row deep-links to `/jobs/[id]/items/[itemId]` instead of opening `EditorDetailDialog`.
7. **Retire `EditorDetailDialog`** once EditingStep stops opening it. ~1500 LOC delete.
8. **Migrate `useEditorState`** consumers (`order-delivery-tab.tsx`, three callers in `order-overview-tab.tsx`) to `subscribeJobs` from `jobs-data.ts`.

### Phase 7 — Calendar lane for Jobs

9. **Add `parseStableDueDate(label, refYear): Date`** helper in `jobs-data.ts` (no Date.now / Math.random).
10. **Extend `CalendarEvent`** with `kind: "shoot" | "job_due" | "item_deadline"` + optional `jobId` / `itemId`.
11. **Render Jobs lane** in `agenda-sidebar.tsx` for the focused day.
12. **Pills deep-link** to `/jobs/[id]` (or item).

### Phase 8 — Files ↔ Item Version bridge

13. **Add `jobId` / `itemId` / `versionNumber`** to `UnifiedFile` in `uploads-data.tsx`.
14. **Route delivery file clicks** to `/jobs/{jobId}/items/{itemId}?fileId=…` instead of `FilePreviewModal`.
15. **`item-version-page.tsx`** reads `?fileId=` to seed single-mode on that file.

### Phase 9 — Backend wiring

When Supabase migrations land (see sibling `Odone-v8/app/supabase/migrations/` for the production app's plan), swap the `*-data.ts` mock exports for real hooks:

- `useJobs()`, `useJob(id)`, `useItem(id)` — React Query wrappers
- Wire `useUploadVersionMutation` to write to `delivery/<id>/v<n>/` (worker pass-through)
- Update `database.types.ts` via `npm run types:gen`

The component JSX never changes — only the data source.

---

## 9. How to run

```bash
cd /Users/admin/Documents/Odone/_archive_sources/source-redesign-nextjs
npm run dev          # http://localhost:3000
npm run lint
npx tsc --noEmit     # (3 known pre-existing errors in data-table.tsx + calendar.tsx)
```

Walking the four personas (use sidebar footer → View as…):

1. **Kyle Norman (Manager)** — lands on `/jobs?as=kyle_m`. Sees "Today, Kyle" with order cards. Pick **Spin up another job** on Ocean Blvd → dialog opens with FROM ORDER pre-locked + items pre-ticked. Pick editor (specialty badge visible) → Brief → Review → Create. Open an existing job → review v2 → use Brief popover button in header.
2. **RienzZzy (Editor)** — switch to `?as=rienz`. Lands on `/jobs` → "My Queue" item-level. Sees 2 items in Awaiting review (status badge matches section name). Open a video item → Filmstrip on the right is now empty (1 file, video).
3. **Marry Anderson (Editor)** — `?as=marry`. Multiple sections: Working / Upcoming / Done. Each Working/Upcoming row has inline `↑ v(n+1)` Upload button.
4. **Sara Chen (Shooter)** — `?as=sara`. Lands on `/calendar`. Right rail Today's schedule has prominent time (12 PM), address as Maps link, Upload affordance button.
5. **Oliver Tuan (Admin)** — `?as=admin`. Lands on `/jobs` (same as manager — admin = manager for permissions).

---

## 10. Documents superseded

- `HANDOFF.md` (v1–v11 baseline) — historical
- `HANDOFF-v12.2.md` — v12.2 + v12.3 amendment, historical
- `HANDOFF-v12.4.md` — v12.4 catalog / detail dialog wiring, historical
- `REDESIGN_LOG.md` — design log, still useful for visual decisions
- `DESIGN.md` — token + system reference, still authoritative for color / typography

When adding to or refactoring v9, **update §3 (Component map) and §8 (Gaps) of THIS doc.** Don't fork a new HANDOFF-v9.1 — bump the section, not the file.
