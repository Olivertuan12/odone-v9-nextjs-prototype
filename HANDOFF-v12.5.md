# Odone Redesign — v12.5 Handoff

> **Companion doc** to `HANDOFF-v12.4.md` and `CLAUDE.md`. This file documents the UX improvements implemented in this session: hover-based item assignments, the multi-step "Add Custom Order Item" selection hierarchy, and the auto-expansion of briefing cards in the Assign wizard.

---

## 1. What Shipped (v12.4 → v12.5)

| Domain | Theme | Status |
|---|---|---|
| **Hover-Based Item Assignments** | Added individual item assignment action triggers inside `OrderItemGroupRow` on the Manager's dashboard. To avoid visual clutter, the "+ Assign" ("Giao việc") button is hidden by default and only shows on hover of the row container (`group/row`), hiding the active status badges ("Unassigned" / "Assigned (N)") while hovered. | done |
| **Assign dialog scoping** | Updated the `onAssignOrder` signature across `ManagerHubView`, `ManagerOrdersList`, and `ManagerOrderCard` to support an optional `itemKey` parameter. When clicked from an individual row, the `AssignJobDialog` initializes with Step 1 bypassed and *only* that specific item preselected. | done |
| **Custom Order Item Category-Service Flow** | Refactored the `AddOrderItemDialog` in `jobs-page.tsx` into a structured, step-by-step layout: Category/Kind buttons (Video, Photo, Other) -> Specific Service cards (e.g., Twilight Hero Shots, Listing Reel) -> Pre-filled editable Title input -> Raw files source chips selection. The raw chips section and Title input are hidden until a service option is selected. | done |
| **Auto-Expand Briefing Cards** | Updated the briefing Step 2 inside `AssignJobDialog` (`assign-job-dialog.tsx`). The first candidate item card in either category (or the only card if a single item was assigned) is expanded/open by default (`defaultOpen={picks.length === 1 || idx === 0}`), allowing managers to input instructions immediately without extra clicks. | done |
| **English Language Refinement** | Translated all custom text prompts and status labels in `jobs-page.tsx` and `assign-job-dialog.tsx` to English to maintain language consistency. | done |

---

## 2. Key File Touches

### `src/components/jobs/jobs-page.tsx`
- Refactored `AddOrderItemDialog` to support the Category -> Specific Service -> Raw Chips workflow.
- Updated `OrderItemGroupRow` container classes with Tailwind `group/row` wrapper.
- Placed "+ Assign" button inside `OrderItemGroupRow` header using `hidden group-hover/row:inline-flex` and wrapped status badges inside `inline-flex group-hover/row:hidden`.
- Propagated the `onAssignOrder: (order: CandidateOrder, itemKey?: string) => void` callback through order lists and card renderers.

### `src/components/jobs/assign-job-dialog.tsx`
- Added `defaultOpen` parameter to `BriefCard`.
- Synced the open state in `BriefCard` using `React.useEffect` bound to the `defaultOpen` prop.
- Passed `defaultOpen={picks.length === 1 || idx === 0}` in the mapping functions for Video/Carousel and Photo/Other briefing columns inside `Step2Brief`.

---

## 3. Verification Commands

Run the following commands to check code compilation and eslint compliance:
```bash
npx tsc --noEmit
npm run lint
```
*(Note: There are pre-existing calendar and data-table type mismatches in the legacy code folder `_archive/dashboard-demo/`, which do not affect runtime stability of the active files).*
