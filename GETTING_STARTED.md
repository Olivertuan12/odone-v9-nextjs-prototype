# Getting Started — Odone v9 Next.js Prototype

> **TL;DR:** `npm install && npm run dev` → http://localhost:3000  
> Then add `?as=kyle_m` to URL to see the Manager Hub.

---

## 1. First-time setup

```bash
git clone https://github.com/Olivertuan12/odone-v9-nextjs-prototype.git
cd odone-v9-nextjs-prototype
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 2. Read docs in this exact order

Before touching any code, read these files **top to bottom**:

1. **`README.md`** — Project overview, stack, routes, data model at a glance.
2. **`HANDOFF-v9.md`** — **The canonical doc.** Component map, conventions, known gaps & next steps. This is your bible.
3. **`DESIGN.md`** — Tokens, colors, typography, spacing system.
4. **`CLAUDE.md`** — High-level context and project conventions.

Historical context (read only if you need to understand evolution):
- `HANDOFF.md` — v1 through v11
- `HANDOFF-v12.2.md` / `HANDOFF-v12.4.md` / `HANDOFF-v12.5.md` — v12 iterations
- `REDESIGN_LOG.md` — Visual design decisions

---

## 3. How to test different personas

The app is **role-driven**. The home page (`/`) redirects based on the current user role.

Switch persona via URL query param:

| Persona | URL | Role | What you'll see |
|---|---|---|---|
| Oliver Tuan | `/?as=admin` | admin | Manager Hub (`/jobs`) |
| Kyle Norman | `/?as=kyle_m` | manager | Manager Hub (`/jobs`) |
| Marry Anderson | `/?as=marry` | editor | My Queue (`/jobs`) |
| RienzZzy | `/?as=rienz` | editor | My Queue (`/jobs`) |
| MJ Pereira | `/?as=mj_e` | editor | My Queue (`/jobs`) |
| Kyle Anderson | `/?as=kyle` | shooter | Calendar (`/calendar`) |
| Sara Chen | `/?as=sara` | shooter | Calendar (`/calendar`) |

You can also switch via the sidebar footer → **"View as…"** dropdown.

### Quick test checklist for AI changes
After any edit, verify these 4 views:
1. **Manager** (`?as=kyle_m`) — `/jobs` page shows compact order cards
2. **Editor** (`?as=marry`) — `/jobs` page shows item-level queue with sections
3. **Shooter** (`?as=sara`) — `/calendar` shows agenda with Maps links
4. **Order detail** — click any order card → `/orders/[orderId]` shows detail + "Assign as Job" CTA

---

## 4. Project structure (what matters)

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Role-routed home redirect
│   ├── jobs/               # /jobs (Manager Hub + Editor Queue)
│   ├── orders/             # /orders + /orders/[orderId]
│   ├── calendar/           # /calendar (shooter home)
│   ├── chat/               # /chat
│   ├── uploads/            # /uploads
│   ├── catalog/            # /catalog
│   ├── settings/           # /settings/* (13 subpages)
│   ├── dashboard/          # LEGACY — archive candidate
│   └── mobile/             # LEGACY — separate redesign track
│
├── components/
│   ├── jobs/               # ★ v9 canonical components
│   │   ├── jobs-data.ts    # Types, seed data, mock mutators
│   │   ├── jobs-page.tsx   # /jobs entry (ManagerHubView, EditorMyQueueView)
│   │   ├── assign-job-dialog.tsx
│   │   ├── job-detail-page.tsx
│   │   ├── item-version-page.tsx
│   │   ├── feedback-panel.tsx
│   │   ├── carousel-view.tsx
│   │   └── photo-grid-view.tsx
│   ├── orders/             # Order surface
│   ├── calendar/           # Calendar surface
│   ├── chat/               # Chat surface
│   ├── uploads/            # Files browser
│   ├── ui/                 # shadcn primitives (Dialog, Popover, Sidebar, etc.)
│   ├── editor-data.tsx     # Mock users, tone tokens, specialty constants
│   ├── editor-sidebar.tsx  # Nav + persona switcher
│   └── editor-site-header.tsx
│
├── hooks/
│   └── use-current-user.ts # MOCK_USERS + role-home routing
│
└── lib/
    └── utils.ts            # cn() and helpers
```

---

## 5. Critical conventions (do not break)

### All components are client components
Every `.tsx` file must start with:
```tsx
"use client";
```
There are **no server components** in this prototype.

### Use semantic tokens only
✅ `bg-card`, `bg-popover`, `border-border`, `text-foreground`, `bg-sidebar`  
❌ Never `bg-zinc-*` or `bg-[#…]`

The only acceptable raw colors are status tones (`bg-emerald-500/10`, `text-rose-400`), and even those should route through helpers in `editor-data.tsx` (`badgeTone`, `toneDot`, `toneAccent`).

### Stable data rule
**Forbidden in mock data AND components:** `Date.now()`, `new Date()`, `Math.random()`  
Use stable string literals, djb2-hash of seeds, or ref-counted increments. See `HANDOFF-v9.md` §4.

### Status enum
Status values **must** mirror Supabase `deliverable_status_t`:
```
not_started → in_progress → review → approved → delivered
```
Do **not** invent new status values.

### Dialogs & Popovers
- **Dialogs** = shadcn Dialog (base-ui under the hood)
- **Popovers** = shadcn Popover (base-ui)
- base-ui submenus use `render={…}` instead of Radix's `asChild`

### Toasts
Use `sonner`:
```tsx
import { toast } from "sonner";
toast.success("Title", { description: "Details…" });
```

---

## 6. Data model cheat sheet

```
Order (CandidateOrder | ManagerOrder)
  └─ Job
      └─ Item (deliverable)
          └─ ItemVersion (v1, v2, …)
              └─ ItemFile
              └─ FeedbackEntry[]
```

Key types in `src/components/jobs/jobs-data.ts`:
- `Job` — batch of items assigned to one editor
- `Item` — single deliverable (video, carousel, photo, drone, etc.)
- `ItemVersion` — each upload iteration
- `ItemFile` — R2 reference (carousel = N files; video/photo = 1+)
- `FeedbackEntry` — threaded feedback per version

### Mock mutators you can call
| Function | What it does |
|---|---|
| `createJobMock(input)` | Appends a new Job + Items. Notifies subscribers. |
| `subscribeJobs(listener)` | Pub-sub for reactive updates. |
| `transitionItem(itemId, nextStatus)` | Moves item to next status. |
| `transitionJob(jobId, nextStatus)` | Moves job to next status. |
| `uploadItemVersion(itemId, files, note)` | Creates new version, bumps number. |
| `getManagerOrders()` | Merges candidate orders + existing job orders. |

---

## 7. Where to start for common tasks

### "I need to change the Jobs list"
→ `src/components/jobs/jobs-page.tsx`  
Look for `ManagerHubView` (order-centric cards) or `EditorMyQueueView` (item-level list).

### "I need to change how items are reviewed"
→ `src/components/jobs/item-version-page.tsx`  
Gallery/Single mode, Filmstrip, Feedback panel, Brief popover.

### "I need to change the assign flow"
→ `src/components/jobs/assign-job-dialog.tsx`  
3-step wizard: Order → Editor → Brief → Review.

### "I need to change order details"
→ `src/components/orders/order-overview-tab.tsx`  
~3600 LOC monolith. Tread carefully.

### "I need to add a new route"
Create `src/app/new-route/page.tsx` with `"use client"`. Add to `editor-sidebar.tsx` nav if needed.

### "I need to add mock data"
Edit `src/components/jobs/jobs-data.ts` in the seed data section. Use **stable ids** only.

---

## 8. Common pitfalls

1. **Hydration mismatch** — `useCurrentUser()` reads `?as=` after mount. Don't read URL params during render.
2. **Grid/Flex gap gotchas** — Tailwind v4 uses `gap-*` utilities. `space-x-*` still works but gap is preferred.
3. **Dialog z-index wars** — shadcn base-ui dialogs stack via portals. Don't manually set z-index.
4. **File imports** — Always use `@/components/...` alias, never relative `../../` paths.
5. **Mock state is global** — `jobs-data.ts` exports live arrays. Mutators modify them in-place. Subscribers re-render.

---

## 9. Build & type check

```bash
npm run lint          # ESLint (warnings in archived files expected)
npx tsc --noEmit      # Type check (3 pre-existing errors in archive)
```

---

## 10. Need help?

- Read **`HANDOFF-v9.md`** first — 90% of answers are there.
- Check `src/components/jobs/jobs-data.ts` for data shapes.
- Check `src/hooks/use-current-user.ts` for persona switching logic.
