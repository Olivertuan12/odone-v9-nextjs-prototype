# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js version warning (from AGENTS.md)

This is **Next.js 16.2** — APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code. Heed deprecation notices.

## Status

UI/UX mockup for **Odone v9** — role-driven workflow for media production. **No backend wiring.** Mock data lives in `src/components/jobs/jobs-data.ts` (Jobs/Items/Versions, the canonical model) and `src/components/editor-data.tsx` (users + tone tokens). The eventual target is Supabase (schema lives in a sibling repo at `Odone-v8-review/supabase/migrations/`).

**Canonical handoff: [HANDOFF-v9.md](HANDOFF-v9.md)** — read it first. Covers routes, role homes, component map (active / legacy / archived), data model, persona switcher, conventions, file ownership, gaps, how-to-run. The older `HANDOFF.md`, `HANDOFF-v12.2.md`, `HANDOFF-v12.4.md`, `HANDOFF-v12.5.md` are kept as historical reference but v9 is the working baseline.

Files no longer wired into v9 live under `_archive/` (zero-importer dialogs + dashboard demo). See `_archive/README.md`.

## Commands

```bash
npm run dev              # http://localhost:3000
npm run build
npm run lint             # eslint (flat config in eslint.config.mjs)
npx tsc --noEmit         # typecheck — has 3 known errors in data-table.tsx + calendar.tsx (see HANDOFF §9)
npx shadcn@latest add <name>   # add new shadcn primitive
```

There is no test runner configured.

## Stack

- **Next.js 16.2** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind v4** (PostCSS plugin only — no `tailwind.config.*`; tokens live in `src/app/globals.css`)
- **shadcn** style `base-nova`, built on **base-ui** primitives (not Radix)
- **lucide-react@1.16** for icons (1.x is current major — names may differ from old 0.x snippets)
- **sonner** for toasts, **vaul** for drawers, **@dnd-kit** for sortable, **recharts** for charts, **react-day-picker v10**, **zod v4**
- Path alias `@/*` → `src/*`. Component aliases from `components.json`: `@/components`, `@/components/ui`, `@/lib/utils`, `@/hooks`

## Architecture

### Routes

- `/` (`src/app/page.tsx`) — **the app**. Composes `SidebarProvider` + `EditorSidebar` + `EditorSiteHeader` + `EditorKanban` + `EditorDetailDialog`.
- `/dashboard` — leftover shadcn dashboard-01 demo. Has the known TS errors. Safe to delete.
- `/mobile` — mobile-specific surface (separate redesign track).

`src/app/layout.tsx` hardcodes `className="dark"` on `<html>` and mounts `<NotificationSimulator />` + `<Toaster position="top-center" />` globally.

### Single source of truth for data

`src/components/editor-data.tsx` exports `users`, `columns`, and the `Card` / `Tone` / `MediaType` / status enum types. Every other component reads from here. **When wiring real data, replace these exports with hooks (`useUsers()`, `useColumns()`, `useCard(id)`) — types stay the same and JSX never changes.** See HANDOFF §4–§5 for the full mapping to Supabase tables (`orders`, `deliverables`, `deliverable_versions`, `comments`, `share_links`, etc).

### The "big" component

`editor-detail-dialog.tsx` (~1500 lines) is the order detail modal. It contains four internal views (AwaitingUploadView, WorkspaceTab, ProjectChatTab, DeliveryTab) and a floating tab cluster. It currently **ignores the clicked card and always renders hardcoded "45 Yorkshire Dr" data** — fixing that means lifting `openCard` state to `page.tsx` and threading it through. See HANDOFF §4 last subsection.

### Sidebar / header surface

`editor-sidebar.tsx` owns workspace nav, DMs, channels — clicks open `ChatDialog`/`NewDmDialog`/`NewChannelDialog`/`MembersDialog`. `editor-site-header.tsx` registers the global `⌘K` listener (opens `SearchPalette`) and owns the bell (→ `NotificationPopover`) and `+ New Project` (→ `NewProjectDialog`, a 5-step wizard).

### Component file ownership

For the full file-ownership tree (who renders what, who opens which dialog), see HANDOFF §10. Don't reconstruct it from memory — it's easy to miss the chain through `EditorKanban → EditorList → KanbanCard → EditorStageActionDialog`.

## Conventions

- **All components are client components** — start every new component with `"use client";`. There are no server components yet.
- **No `useEffect` for data fetching.** When wiring real data, add hooks in `editor-data.tsx`, not in component bodies.
- **Use semantic tokens only.** Backgrounds/text/borders must reference shadcn CSS vars (`bg-background`, `bg-card`, `bg-popover`, `border-border`, `text-foreground`, `bg-sidebar`, etc.) from `globals.css`. **Never** use `bg-zinc-*` or `bg-[#...]`. The only acceptable raw Tailwind colors are status tone classes (`bg-emerald-500/10`, `text-rose-400`) — and even those should come from the tone maps in `editor-data.tsx`.
- **Dialogs:** shadcn `<Dialog>` (base-ui under the hood). Pass `showCloseButton={false}` when supplying a custom close icon.
- **Popovers:** `<PopoverContent>` already has solid `bg-popover` — don't add overrides.
- **Toasts:** `sonner.toast.success/info/error` for action confirmations.
- **Drag/drop for file uploads:** native HTML5, no library.

## Known issues (don't get distracted by these)

- `src/components/data-table.tsx` — 2 TS errors, only used by `/dashboard` demo. Delete or refactor; ignore for Editor Queue work.
- `src/components/ui/calendar.tsx` — 1 TS error from `react-day-picker` v10 typing. Re-add via shadcn when upstream catches up, or pin rdp to v9.
- Detail dialog hardcoded to "45 Yorkshire Dr" — see HANDOFF §4/§5b before refactoring.
- `queue-filter-popover.tsx` exists but is **not yet wired** into the kanban (kanban shows static filter pills).
- Chat from a sidebar channel opens a generic chat dialog, not an order-specific one.
