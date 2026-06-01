# Odone Editor Queue — UI Handoff

**Status:** UI/UX mockup with no real backend wiring. All data is mock and lives in TypeScript files. Replace mocks with Supabase queries to ship.

**Stack:** Next.js 16.2 (App Router) · React 19 · Tailwind v4 · shadcn (style `base-nova`) · base-ui primitives · sonner · lucide-react@1.16

---

## 1. Run

```bash
cd odone-editor-queue
npm install        # (already installed)
npm run dev        # http://localhost:3000
```

Dark mode is hardcoded via `className="dark"` on `<html>` in `src/app/layout.tsx`. Wire `next-themes` if you want light/dark toggle.

---

## 2. Routes

| Path | File | What it is |
|---|---|---|
| `/` | `src/app/page.tsx` | **Editor Queue** — the main app. Sidebar shell + Kanban/List + Detail Dialog |
| `/dashboard` | `src/app/dashboard/page.tsx` | shadcn dashboard-01 demo (left over from initial scaffold). Has 2 pre-existing TS errors in `data-table.tsx` — unrelated to Editor Queue, ignore or delete. |

Layout (`src/app/layout.tsx`) mounts: children + `<NotificationSimulator />` + `<Toaster position="top-center">`.

---

## 3. Component map

### Shell (page-level)

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Composes `SidebarProvider` + `EditorSidebar` + `EditorSiteHeader` + `EditorKanban` + `EditorDetailDialog` |
| `editor-sidebar.tsx` | Left sidebar — Workspace nav (Editor Queue, Calendar, Orders, **Members**), Direct Messages, Project Channels, user footer. Collapsible sections. DM/Channel rows open `ChatDialog`. |
| `editor-site-header.tsx` | Top header — sidebar toggle, breadcrumb, **Search pill (⌘K)**, **Bell → NotificationPopover**, **+ New Project**. Registers global ⌘K listener. |

### Queue views

| File | Purpose |
|---|---|
| `editor-kanban.tsx` | The Kanban board (4 columns) + Board/List toggle + filter pills + stage CTA buttons. Renders `EditorList` when switched. Internal `KanbanCard` component. |
| `editor-list.tsx` | Sortable Table view of all cards. Header click sorts asc/desc. Hover reveals address. Footer row has aggregate stats. |
| `editor-data.tsx` | **Single source of truth** for mock data: `users`, `columns`, `Card` type, `Tone`, `MediaType`, status enums, shared tone token maps. |
| `editor-status-pill.tsx` | Status pill component (Loader / CircleCheck / AlertCircle based on `status.kind`) |
| `editor-address-popover.tsx` | Map-pin popover with copy address (used in earlier iterations; still exported) |

### Detail dialog (the big one)

| File | Purpose |
|---|---|
| `editor-detail-dialog.tsx` | The main order detail modal. ~1500 lines. Has 4 internal views: **AwaitingUploadView**, **WorkspaceTab**, **ProjectChatTab**, **DeliveryTab**. Floating Cloud-Code-style tab cluster. |
| `editor-stage-action-dialog.tsx` | Stage action confirmation dialog (Download / Upload new version / Send to client). Triggered by kanban card CTA hover button. |
| `send-to-client-dialog.tsx` | Delivery dialog: email composer + share link + download-all + external sync (HD Photo Hub / Tonomo / Photello) |

### New project wizard

| File | Purpose |
|---|---|
| `new-project-dialog.tsx` | **5-step wizard**: Source → Details → Extras → Files → Confirm. Compact step indicator (only current expanded). Multi-reference assets with kind chips (color tones per kind). External vendor email field + 2 footer actions (Send to vendor / Create Project). |

### Communication popovers / dialogs

| File | Purpose |
|---|---|
| `notification-popover.tsx` | Bell popover — All/Unread tabs, 6 mock notifications |
| `notification-simulator.tsx` | Fires mock incoming toast every 25–45s via sonner |
| `new-dm-dialog.tsx` | Create new DM (multi-select people, group hint) |
| `new-channel-dialog.tsx` | Create new channel (name, description, public/private, members) |
| `members-dialog.tsx` | Workspace members table — name/email, role select, status, last active, more menu |
| `chat-dialog.tsx` | Chat conversation modal (used by DM/Channel clicks in sidebar) |
| `search-palette.tsx` | ⌘K command palette — grouped results (Recent / Clients / Channels / Files) |
| `queue-filter-popover.tsx` | Filter popover (stages, assignees, types, date range, overdue) — **not yet wired into kanban**, exported for future use |

### UI primitives (`src/components/ui/`)

All from shadcn `base-nova` style. Available:
`avatar`, `badge`, `breadcrumb`, `button`, `button-group`, `calendar`, `card`, `chart`, `checkbox`, `dialog`, `drawer`, `dropdown-menu`, `field`, `hover-card`, `input`, `input-group`, `label`, `navigation-menu`, `popover`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`.

Add more with `npx shadcn@latest add <name>`.

---

## 4. Data model (mock → real)

All mock data is in `src/components/editor-data.tsx`. Replace each export with a hook that queries Supabase. The TypeScript types stay the same.

### `users` (Record<id, User>)

```ts
type User = { id; name; role; image; initials; tone }
```

**Schema source:** `profiles` table (joined with `auth.users` for email/avatar). `tone` is a Tailwind className string — drop it and compute from role/seeded color instead.

### `columns` (Column[])

```ts
type Column = { key; title; tone; count; cards: Card[]; showAdd?; emptyAdd? }
```

5 columns map to deliverable status flow:
- `pending` → "Awaiting Upload" (deliverable.status = `not_started`)
- `working` → "Working On" (`in_progress`)
- `revision` → "Revision" (`review`)
- `deliver` → "Deliver" (`approved` not yet `delivered`)

**Schema source:** Query `deliverables` joined with `orders` + `current_version` + latest comments count.

### `Card` (the most important type)

```ts
type Card = {
  id: string;
  title: string;          // short address — orders.property_address or computed
  address: string;        // full — orders.client_name maybe?
  type: MediaType;        // "Walkthrough" | "Drone" | "Photo" — derive from deliverable.kind
  version?: string;       // "v1"|"v2"... — from current_version.version_number
  status: { label; tone; kind?: "in-process" | "done" | "overdue" };
  deadline: string;       // "May 19" — from orders.due_at
  editTime?: string;      // "14h" — derive from updated_at
  notes?: { current; total };  // from comments where status='open' / total
  assignees: string[];    // user IDs — from deliverables.assigned_to (single now, array for future)
  tone: Tone;             // status color
  pulse?; dimmed?; overdue?;
};
```

### Note: hardcoded "45 Yorkshire Dr"

The detail dialog ignores the clicked card and always shows mock data for **45 Yorkshire Dr**. To wire real data: pass `card` from `EditorKanban`/`EditorList` → `page.tsx` → `EditorDetailDialog`.

```ts
// page.tsx — change from
const [detailOpen, setDetailOpen] = useState(false);
// to
const [openCard, setOpenCard] = useState<Card | null>(null);
// then propagate `openCard` to EditorDetailDialog and use card fields internally
```

---

## 5. Real wiring checklist

The order is roughly the path of least resistance:

### 5a. Data layer
1. **Set up Supabase client** (`@supabase/supabase-js`). Add env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. **Replace `editor-data.tsx` mocks** with hooks: `useUsers()`, `useColumns()`, `useCard(id)`. Use React Query / SWR / Server Components.
3. **Schema reference:** see [section 6 below](#6-schema-cheatsheet).

### 5b. Pass real card to detail dialog
4. Lift `openCard` state to `page.tsx`. Thread `card` prop through `EditorDetailDialog` and replace the hardcoded `"45 Yorkshire Dr"` literals (they're scattered — grep for them).

### 5c. Actions
5. **Approve / Unlock** → mutation on `deliverable_versions.status` (approved/rejected). Trigger toast + close.
6. **Add note (feedback)** → insert into `comments` with `timestamp_seconds`. Wire to input in `WorkspaceTab` right column.
7. **Edit / Delete feedback** → update / delete on `comments`. Already wired UI-side via dropdown menu.
8. **Send to client** → call edge function that generates `share_links` row + sends email.
9. **Download all assets** → presigned URLs from R2 (referenced in raw_uploads migration).
10. **Stage Upload (new version)** → upload to R2, call `register_version_rpc` (function exists per schema agent earlier).
11. **Mark as sent (Deliver)** → set `deliverables.delivered_at = now()`.
12. **Create Project (wizard)** → insert order + deliverables + (if vendor email) generate external share link.
13. **Send to vendor** → insert share_link with external scope + email vendor.

### 5d. Real-time
14. **Notifications** → replace `NotificationSimulator` with Supabase Realtime channel subscribing to `activity_log` inserts. Filter by current workspace.
15. **Chat** → realtime channel on `messages` table (build it; not in schema yet).

### 5e. Search
16. **⌘K palette** → query `orders.display_number`, `properties.address`, `clients.name`, `share_links`, `deliverables.title` via Postgres full-text or RPC.

---

## 6. Schema cheatsheet (from Supabase migrations)

Lives in `Odone-v8-review/supabase/migrations/`. Phase 2 tables:

- **orders** — `id, workspace_id, display_number, client_id, property_id, scheduled_at, due_at, notes, customer_notes, order_value_cents, form_source, assigned_shooter, raw_complete_at, ...`
- **deliverables** — `id, order_id, kind (video|photo|drone|floor_plan), title, description, status (not_started→in_progress→review→approved→delivered), assigned_to, due_at, current_version_id, delivered_at, ready_for_delivery_at, video_overview`
- **deliverable_versions** — `id, deliverable_id, version_number, status (processing→ready→approved→rejected→superseded), primary_file_id, notes, uploaded_by`
- **comments** — `id, version_id, parent_id, body, timestamp_seconds, status (open|resolved), author_user_id | author_share_link_id`
- **activity_log** — `id, workspace_id, actor_user_id, actor_email, action, target_type, target_id, metadata (jsonb)`
- **share_links** — `id, deliverable_id, token, expires_at, password_hash, can_download, created_by, revoked_at`
- **clients** — `id, name, email, company_name, brokerage, source, notes, preferences (jsonb), timezone, tags[]`
- **profiles** — `user_id, workspace_id, role (admin|manager|editor|shooter|va)`

Useful RPCs already exist: `register_version_rpc`, `review_decision_sync`, plus admin RPCs in phase2.

---

## 7. Design tokens

All in `src/app/globals.css`. shadcn semantic tokens (CSS vars) drive everything:

- `--background`, `--foreground` — page bg/text
- `--card`, `--card-foreground` — card surfaces
- `--popover`, `--popover-foreground` — overlays
- `--primary`, `--secondary`, `--accent`, `--muted` — interactive states
- `--border`, `--ring` — borders/focus
- `--sidebar-*` — sidebar-specific (Tailwind classes `bg-sidebar`, `bg-sidebar-accent`, etc.)
- `--chart-1..5` — chart colors

**Rule:** any new UI must use semantic tokens. Never `bg-zinc-*`, `bg-[#...]`. The only colored Tailwind classes acceptable are tone-specific status badges (`bg-emerald-500/10`, `text-rose-400`, etc.) — see `editor-data.tsx`'s tone maps.

---

## 8. Conventions / patterns to keep

- **All client components** start with `"use client";`. Server components (none yet) don't.
- **No useEffect for data fetching** in component bodies — add hooks in `editor-data.tsx` when wiring.
- **Toasts** for confirmations via `sonner.toast.success(...)` / `.info(...)` / `.error(...)`.
- **Dialogs** use shadcn `<Dialog>` (base-ui under the hood). Pass `showCloseButton={false}` to use a custom close icon.
- **Popovers** use `<Popover>` with `<PopoverContent>` — solid `bg-popover` is built in. Don't add bg overrides.
- **Drag/drop** for file uploads uses native HTML5 (no library).

---

## 9. Known issues / debt

| Issue | Where | Action |
|---|---|---|
| `data-table.tsx` has 2 TS errors (`render` prop on `Dialog` triggers) | `src/components/data-table.tsx` | Delete the file (only used by `/dashboard` demo) OR refactor to current shadcn dialog API |
| `calendar.tsx` has 1 TS error (`table` not in react-day-picker v10 ClassNames) | `src/components/ui/calendar.tsx` | Run `npx shadcn@latest add calendar --overwrite` once react-day-picker support updates, or downgrade rdp to v9 |
| `lucide-react@1.16.0` is current major — most icon names are stable but a few renamed from 0.x. Reference: https://lucide.dev/icons | All component files | Just be aware when copying snippets from old shadcn docs |
| Detail dialog hardcoded to 45 Yorkshire Dr | `editor-detail-dialog.tsx` | See §5b — thread `card` prop through |
| Filter popover not wired to kanban | `queue-filter-popover.tsx` exists; kanban shows static filter pills | Wire when filtering needed |
| Channel chat from sidebar opens generic chat (not order-specific) | `chat-dialog.tsx` | Lookup order by channel name in real wiring |
| No persistence between sessions | All state is React `useState` | Backend wiring will handle this |
| Toast notifications simulated | `notification-simulator.tsx` | Replace with Supabase realtime |

---

## 10. File ownership map (who renders what)

```
src/app/page.tsx
└─ SidebarProvider
   ├─ EditorSidebar (src/components/editor-sidebar.tsx)
   │  ├─ uses: ui/sidebar, ui/avatar, ui/badge
   │  ├─ opens: ChatDialog, NewDmDialog, NewChannelDialog, MembersDialog
   │  └─ users data from: editor-data.tsx
   └─ SidebarInset
      ├─ EditorSiteHeader
      │  └─ opens: SearchPalette, NotificationPopover, NewProjectDialog
      └─ EditorKanban
         ├─ renders: KanbanCard or EditorList (toggled)
         ├─ data from: editor-data.tsx (columns, users)
         ├─ opens: EditorStageActionDialog (Pending/Working/Deliver)
         └─ Click card → opens EditorDetailDialog

EditorDetailDialog
├─ AwaitingUploadView (first-time)
├─ WorkspaceTab
│  ├─ Left: Brief / Assets / People / Property (collapsible)
│  ├─ Center: video player with floating tab cluster overlay
│  └─ Right: Feedback panel (rounded card)
├─ ProjectChatTab
└─ DeliveryTab
   ├─ Left: Client / Order Item / Preflight (cards)
   ├─ Center: Deliverable groups (Photos / 2D / 3D / Video)
   └─ Right: Share links + Activity log
   └─ "Send to client" → SendToClientDialog
```

---

## 11. Quick commands

```bash
# Add shadcn component
npx shadcn@latest add <name>

# Typecheck
npx tsc --noEmit

# Filter out known unrelated errors
npx tsc --noEmit 2>&1 | grep -vE "(data-table|calendar)"

# Verify dev serves
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/
```

---

## 12. Replacing the live Odone UI tomorrow — concrete plan

1. **Branch off live odone-v8 codebase**, copy `src/components/editor-*.tsx`, `editor-data.tsx`, `notification-simulator.tsx`, `chat-dialog.tsx`, `members-dialog.tsx`, `new-*-dialog.tsx`, `notification-popover.tsx`, `queue-filter-popover.tsx`, `search-palette.tsx`, `send-to-client-dialog.tsx`, `editor-status-pill.tsx`, `editor-address-popover.tsx`.

2. **Copy all of `src/components/ui/`** OR diff against your existing ui folder and merge only newer ones (`button-group`, `input-group`, `calendar`, `field`, `slider`, `switch`, `navigation-menu`, `hover-card`, `popover` if missing).

3. **Add `tw-animate-css`** to `globals.css` import if not already (used by tabs/popover animations).

4. **Mount layout pieces** in your existing layout: `<NotificationSimulator />` + `<Toaster position="top-center" richColors closeButton />`.

5. **Replace mocks** — start with `useUsers()` and `useColumns()` hooks in `editor-data.tsx`. Everything else cascades.

6. **Test order:** `/` Kanban renders → click card opens detail → click stage CTA opens action dialog → toast fires. If those 4 work, 80% is done.

7. **Wire actions one by one** per §5c. Each is independent.

The UI is decoupled from data — there's nothing in the components that depends on a specific mock value. Swap data sources without touching JSX.
