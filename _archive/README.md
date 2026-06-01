# Archive

Files that were part of earlier prototype iterations but are not referenced
by any live code in Odone v9 (see `../HANDOFF-v9.md`).

Kept on disk so the git history and the visual record stay intact —
re-import any file by moving it back to its original `src/components/…`
or `src/app/…` location if a regression makes you want it.

## `legacy-dialogs/`

Three chat-related dialogs (`chat-dialog`, `new-dm-dialog`, `new-channel-dialog`)
that were superseded when the Chat surface moved into `src/components/chat/chat-page.tsx`
in v12.4. `new-project-dialog` is here because the "+ New Project" button
was removed from the header in v9 (manager doesn't create projects from
inside the app — orders come from the external booking portal).

## `dashboard-demo/`

The shadcn dashboard-01 demo (`/dashboard` route + its component pieces:
`data-table`, `chart-area-interactive`, `section-cards`, `nav-*`,
`app-sidebar`, `site-header`). Only referenced from the dashboard route
itself; the route had no sidebar link and was carrying 3 known TS errors.

The v9 layout uses `editor-sidebar.tsx` + `editor-site-header.tsx` —
those NEW names live under `src/components/`, not in this archive.

## Not archived (kept under `src/`)

- `editor-kanban.tsx`, `editor-list.tsx`, `editor-detail-dialog.tsx`,
  `editor-state.tsx`, `editor-stage-action-dialog.tsx`, `editor-status-pill.tsx`,
  `editor-address-popover.tsx`, `editor-types.ts` — these were the v8
  Editor Queue stack. They still ship because the legacy kanban view at
  `/` (admin overview) and the order surface's review modal both depend
  on them. Migration plan is in `HANDOFF-v9.md §8 Phase 6`.

- `src/components/mobile/`, `src/app/mobile/` — separate redesign track
  per the original `CLAUDE.md`. Not v9-aware. Audit before archiving.
