# Odone v9 — Media Production Workflow UI

> **Next.js prototype** for a real-estate media production workflow platform.  
> This repo contains the full frontend prototype including the v9 redesign, historical handoffs, and archived components.

---

## What this is

Odone is a role-driven media production workflow UI for real-estate listings. It connects shooters, editors, managers, and admins through a unified pipeline:

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

**Current baseline:** v9 (see `HANDOFF-v9.md` — the canonical working doc).  
**Historical docs:** `HANDOFF.md` (v1–v11), `HANDOFF-v12.2.md`, `HANDOFF-v12.4.md`, `HANDOFF-v12.5.md`.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2 (App Router, React 19) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (PostCSS only, tokens in `src/app/globals.css`) |
| Components | shadcn/ui (`base-nova` on base-ui) |
| Icons | lucide-react@1.16 |
| Notifications | sonner (toasts) |
| Drawers | vaul |
| Drag & Drop | @dnd-kit |
| Tables | @tanstack/react-table |

**Path alias:** `@/*` → `src/*`

**Important convention:** All components are **client components** (`"use client"`). No server components yet. No backend wiring — mock data lives in `*-data.ts` files.

---

## How to run

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:
```bash
npm run lint
npx tsc --noEmit   # (3 known pre-existing errors in archived dashboard demo files)
```

---

## Role system & persona switch

Four primary roles. The home page (`/`) redirects per role:

| Role | Home route | View |
|---|---|---|
| admin | `/jobs` | Manager Hub (admin = manager permissions) |
| manager | `/jobs` | Manager Hub |
| editor | `/jobs` | My Queue (item-level flat list) |
| shooter | `/calendar` | Calendar agenda |
| va | `/jobs` | Generic jobs list (fallback) |

**Switch persona:** `?as=<key>` URL param or sidebar footer **"View as…"** submenu.

Mock users (in `src/hooks/use-current-user.ts`):
- `?as=admin` → Oliver Tuan (Admin)
- `?as=kyle_m` → Kyle Norman (Manager)
- `?as=marry` → Marry Anderson (Editor)
- `?as=rienz` → RienzZzy (Editor)
- `?as=mj_e` → MJ Pereira (Editor)
- `?as=kyle` → Kyle Anderson (Shooter)
- `?as=sara` → Sara Chen (Shooter)

---

## Key routes

| Route | What |
|---|---|
| `/` | Role-routed home redirect |
| `/jobs` | Manager Hub / Editor My Queue / Generic list (role-aware) |
| `/jobs/[jobId]` | Job detail — items list + requirement side panel |
| `/jobs/[jobId]/items/[itemId]` | Item Version page — gallery/single mode, Filmstrip, Feedback panel, Brief popover |
| `/orders` | Order list (legacy surface) |
| `/orders/[orderId]` | Order detail — "Assign as Job" primary CTA |
| `/calendar` | Shoot scheduling — agenda + month view |
| `/chat` | Slack-style DMs + Project Channels |
| `/uploads` | Files browser — raw + delivery + Shoots tab with `MyShootsView` |
| `/catalog` | Service catalog |
| `/settings/*` | 13 subpages (Account / Workspace / Production / Integrations / …) |
| `/dashboard` | **Legacy demo** — archive candidate |
| `/mobile` | **Separate redesign track** — archive candidate |

---

## Important files for AI continuation

### Canonical docs (read these first)
1. **`HANDOFF-v9.md`** — Current working baseline. Component map, data model, conventions, known gaps & next steps.
2. **`CLAUDE.md`** — Project-level conventions and context pointers.
3. **`DESIGN.md`** — Token + system reference (color, typography, spacing).

### Historical handoffs
- `HANDOFF.md` — v1 through v11 baseline
- `HANDOFF-v12.2.md` — v12.2 + v12.3 amendments
- `HANDOFF-v12.4.md` — v12.4 catalog / detail dialog wiring
- `HANDOFF-v12.5.md` — v12.5 iteration
- `REDESIGN_LOG.md` — Visual design decisions log

### Core data + pages
- `src/components/jobs/jobs-data.ts` — Types (`Job`, `Item`, `ItemVersion`, `ItemFile`, `FeedbackEntry`), seed data, mock mutators (`createJobMock`, `subscribeJobs`, `transitionItem`, `transitionJob`, `uploadItemVersion`).
- `src/components/jobs/jobs-page.tsx` — `/jobs` entry point. ManagerHubView (compact cards), EditorMyQueueView, GenericJobsList.
- `src/components/jobs/assign-job-dialog.tsx` — 3-step assign wizard.
- `src/components/jobs/job-detail-page.tsx` — `/jobs/[jobId]` shell.
- `src/components/jobs/item-version-page.tsx` — `/jobs/[jobId]/items/[itemId]` gallery + review.
- `src/components/jobs/feedback-panel.tsx` — Right-rail feedback thread.
- `src/components/orders/order-overview-tab.tsx` — Order detail monolith (~3600 LOC).
- `src/components/orders/order-detail-page.tsx` — Order detail shell.
- `src/components/calendar/calendar-page.tsx` — Calendar surface.
- `src/components/uploads/uploads-page.tsx` — Files browser.
- `src/hooks/use-current-user.ts` — `MOCK_USERS`, `ROLE_HOME_ROUTE`, persona switching.

### UI primitives
- `src/components/ui/*` — shadcn components (Dialog, Popover, Sidebar, Table, Tabs, etc.)

---

## Data model (mock layer)

```
Order (CandidateOrder | ManagerOrder)
  └─ Job
      └─ Item (the "deliverable")
          └─ ItemVersion (v1, v2, …)
              └─ ItemFile (R2 reference; carousel = N files, video = 1)
              └─ FeedbackEntry[]
```

Status enum mirrors Supabase `deliverable_status_t`:
`not_started` → `in_progress` → `review` → `approved` → `delivered`

All mock data uses **stable ids** — no `Date.now()` or `Math.random()`. See `HANDOFF-v9.md` §4 for stability rules.

---

## Conventions

- `"use client"` everywhere
- Semantic tokens only: `bg-card`, `bg-popover`, `border-border`, `text-foreground`. Never raw `bg-zinc-*`.
- Dialogs = shadcn Dialog (base-ui)
- Popovers = shadcn Popover (base-ui)
- Toasts = sonner
- Status tones route through `badgeTone` / `toneDot` / `toneAccent` in `editor-data.tsx`

---

## Archive

`_archive/` contains legacy components no longer imported by the live tree:
- `legacy-dialogs/` — 4 orphaned dialog files
- `dashboard-demo/` — shadcn dashboard-01 demo scaffolding (`/dashboard` route)

---

## License

Internal prototype — STAREP MEDIA.
