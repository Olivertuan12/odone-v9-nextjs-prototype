# Odone Redesign — v12.2 Handoff

> **Companion doc** to `HANDOFF.md` (which covers the Editor Queue shell and v1–v11 baseline). This file picks up where v12 left off and consolidates the **Uploads** + **Orders/Assign** work landed across v12.0 → v12.2. Read both — this file does *not* repeat the queue-side mapping.

---

## 0. Critical constraint (read first)

**The whole codebase is a UI/UX preview. NEVER touch git.** No commits, no branches, no pushes, no `gh` calls, no resets. The user's working files live here at HEAD; treat the repo as read-write for source files only. If you think you need git, you don't — re-read the request.

The user iterates by giving Vietnamese feedback on screenshots after each change. Stay in feedback-respond mode; do not pre-commit work for them.

---

## 1. What shipped in v12.0 → v12.2

| Theme | What changed | Status |
|---|---|---|
| Theme regression fix | Tailwind v4 was stripping `.dark { ... }` because it lived outside `@layer base`. Wrapped both `:root` and `.dark` in `@layer base` in `globals.css`. | done |
| Files page (`/uploads`) — project scoping | Tree scoped via `pruneTreeToOrder()`; RAW vs Final routing fixed (BFS used to land users on Final because delivery node was shallower — now iterates `raw` first). | done |
| Files page — sticky sortable headers | Replaced shadcn `<Table>` (its `<div overflow-x-auto>` wrapper silently breaks `position: sticky`) with **raw CSS Grid**. `thead` was lifted **out** of the rounded card so corner-clipping no longer fights sticky. | done |
| Files page — date format | All formatters now MM/DD/YYYY. `formatRelativeTime` is aliased to `formatDateDMY`. Date is also in the search haystack so users can type `05/30/2026` or `2026-05-30`. | done |
| Files page — drop zone | Removed the always-on drop box. Drag from anywhere over the file pane now lights up a transient overlay; releases over the overlay enqueue uploads. | done |
| Preview modal — arrow keys | `document.addEventListener("keydown", handler, true)` (capture phase) escapes the Dialog's focus trap. Prev/Next button click handlers also `stopPropagation`. | done |
| Today tab — new shooter view | `/uploads` top tabs are now `Today` + `RAW` + `Final` (`TopTab = "shoots" \| "raw" \| "final"`). Today shows MyShootsView with per-shoot cards. | done |
| Today tab — ShootUploadDialog | One drop zone per `deliverable` instead of one big bucket. Pre-made services (`virtual_staging`, `3d_tour`) render as "Pre-made · no shoot needed" rows instead. | done |
| Today tab — SplitFilesDialog | When 2+ shoots are open and the shooter dumps a card on the background, we open a per-file order picker pre-filled by `file.lastModified ∈ shoot.scheduled_at..scheduled_end`. | done |
| Today tab — UploadTracker | Drive-style floating panel pinned bottom-right. Simulated progress via `setInterval` (250 ms ticks; `Δ = max(2, 12 - Math.floor(fileCount/3))`). Re-opens on new job push (prevCount ref). | done |
| Order Overview — confirm-upload dialog | After RAW upload, shooter confirms via checklist. Each upload kind chip (Photos / Videos / Other) is color-tinted to match list-view kind badges (sky / violet / amber). | done |
| Order Overview — multi-step Assign wizard | 4 steps: **Editor → Brief → Schedule → Review**. Stepper rail clickable backward only. Step 1 sorts pool by specialty match; Step 4 Review surfaces a vendor handoff block when assignee is a vendor. | done |
| Order Overview — Upload step per-deliverable rows | Replaced kind chips + thumbnail strip with per-deliverable rows that mirror the Today tab's ShootUploadDialog layout (icon · label · status). Counts distributed across deliverables of matching kind affinity; pre-made items render as "Pre-made · no shoot needed" with no count. | done |
| Upload ↔ Assign label parity (v12.3) | Both rows now resolve via `deliverableDisplayName(d)`. v12.3 routes the lookup through the catalog (`serviceById` → `kindToService` → `kindLabel`) so a single source — `catalog-data.ts` — drives every display surface (Upload step, Assign rows, Items popup, Today-tab dialog). Eliminates the prior `KIND_TO_CATALOG` drift (e.g. "AI Video Elements" vs "AI Video Elements (3-5 Scenes)"). | done |
| Catalog ↔ orders bridge (v12.3) | New `Service.deliverableKind?: DeliverableKind` field declares the 8 core 1:1 mappings (Real Estate Photos→photo, Drone Video→drone, Standard Listing Video→walkthrough, Premium Reel Video→video, 2D Floor Plans→floor_plan, Floor Plans Upgrade→3d_tour, Real twilights→twilight, AI Video Elements→virtual_staging). `kindToService(kind)` + `serviceById(id)` helpers replace the deleted `KIND_TO_CATALOG`. See §3.k. | done |
| Assign — Add extra item: catalog picker + Custom tab (v12.3) | `AddOrderItemDialog` rewritten as a two-tab UX. **From catalog** lists the 17 `SERVICES` grouped by `ServiceCategory`, greys out services already in the order, and pushes a Deliverable with `serviceId` set and `requiresEditing: true`. **Custom reference** keeps the name + group + note form for voiceover scripts / brand assets, sets `requiresEditing: false`. State still lives on `OrderOverviewTab` so both Upload and Assign render the new item. See §3.i. | done |
| Pipeline gates skip reference items (v12.3) | `editingDone` / `revisionDone` / `assignDone` filter on `editableDeliverables = order.deliverables.filter(d => d.requiresEditing !== false)`. Custom reference extras therefore appear in lists but never freeze the pipeline. See §3.i. | done |
| Unified Upload+Confirm dialog (v12.3) | `ShootUploadDialog` absorbed the old `ShooterConfirmUploadDialog`: when `onConfirmed` is supplied, the footer hosts a primary Confirm CTA that enables once every shoot-required deliverable has ≥1 file. The Order Overview Upload step replaced its inline rows + separate checklist dialog with a single "Open upload" button that mounts this dialog. Today tab (MyShootsView) uses the same dialog and now actually wires confirm (was a dead-end). `UploadDeliverableRow` + `ShooterConfirmUploadDialog` deleted. See §3.l. | done |
| Assign — removed redundant "N of N assigned" subtitle | Step header already shows the count chevron summary; the duplicate line was log spam. v12.3: summary denominator now uses `editableDeliverables.length` so reference extras don't inflate the count. | done |
| Demo data | `BEACH_DELIVERABLES` extended to 10 items (incl. pre-made `virtual_staging` + `3d_tour`) so the 1-dialog stress test covers all icons. `ord-ocean` is the canonical "Assign step demo" order. | done |

---

## 2. File inventory (new in v12)

```
src/components/uploads/
  my-shoots-view.tsx          ★ NEW (v12.0) — Today tab content
  shoot-upload-dialog.tsx     ★ NEW (v12.0) — per-deliverable drop zones
  split-files-dialog.tsx      ★ NEW (v12.1) — multi-order dump router
  upload-tracker.tsx          ★ NEW (v12.0) — Drive-style progress panel

src/components/uploads/  (modified, biggest churn)
  uploads-page.tsx            — TopTab extended, projectKey bridging, BulkBar absolute
                                v12.3: deleted confirmShoot + ShooterConfirmUploadDialog mount
  uploads-data.tsx            — TopTab + SortKey types, formatDateDMY MM/DD/YYYY
  file-list.tsx               — REWRITTEN to CSS Grid (no <Table>), split thead
  file-preview-modal.tsx      — keydown capture phase
  tree-sidebar.tsx            — Today tab in the top switcher
  bulk-actions-bar.tsx        — whitespace-nowrap on selected pill
  folder-share-dialog.tsx     — redesigned spacing (ShooterConfirmUpload skeleton)
  shoot-upload-dialog.tsx     — v12.3: gained optional onConfirmed/confirmed props;
                                catalog-aware displayLabel() replaces raw kindLabel
  my-shoots-view.tsx          — v12.3: dropped onOpenConfirm prop; wires onConfirmed
                                on ShootUploadDialog directly

src/components/orders/
  order-overview-tab.tsx      — confirm-upload checklist + 4-step Assign wizard
                                v12.3: KIND_TO_CATALOG deleted (use kindToService);
                                AddOrderItemDialog rewritten as catalog picker + Custom tab;
                                UploadStep simplified to single "Open upload" button;
                                deleted UploadDeliverableRow + ShooterConfirmUploadDialog;
                                editableDeliverables filter for pipeline gates
  orders-data.ts              — BEACH_DELIVERABLES to 10 items, requires_capture flag
                                lives in deliverableRequiresCapture() helper in
                                shoot-upload-dialog.tsx (not on the type yet — see §6)
                                v12.3: +Deliverable.serviceId? +Deliverable.requiresEditing?

src/components/catalog/
  catalog-data.ts             — v12.3: +Service.deliverableKind? (8 core mappings);
                                +kindToService(kind) +serviceById(id) helpers

src/app/globals.css           — :root + .dark wrapped in @layer base
```

---

## 3. Architectural decisions worth not relitigating

### a. **Sticky `thead` + rounded card = pick one**

Sticky needs `overflow: visible` on every intermediate ancestor; rounded clip needs `overflow: hidden` on the parent. They fight. We tried in this order:
1. `overflow-hidden` on card → kills sticky.
2. `clip-path: inset(0 round 1rem)` → also kills sticky in Safari/Webkit.
3. Mask overlay sitting on top → painted over the scrollbar and bled focus rings.
4. **Final solution (per user spec):** physically **separate `<thead>` from the rounded card**. Header is a flat div above; body card holds only rows. Sticky is then a non-issue because there's no `thead` inside the scroll container. CSS Grid (not `<table>`) keeps the columns aligned between the standalone header div and each row div.

If you're tempted to put `thead` back inside, re-read this. The fix has shipped through 3 rounds of feedback.

### b. **Why CSS Grid replaced `<Table>` on `/uploads` list view**

shadcn's `<Table>` wraps `<table>` in `<div overflow-x-auto>`. That wrapper silently breaks `position: sticky` (any scrolling/clipping ancestor between the sticky element and the viewport is the new scroll container). Bypass it. The grid template is:

```ts
// shared between the header div and each body row div
const COLS =
  "grid-cols-[5rem_minmax(120px,1fr)_9rem_10rem_3rem] " +
  "md:grid-cols-[5rem_minmax(160px,2fr)_9rem_10rem_8rem_3rem] " +
  "lg:grid-cols-[5rem_minmax(200px,3fr)_9rem_10rem_8rem_8rem_3rem]";
```

Checkbox lives in the **Preview** column header (label flips to `N selected`). Avoid adding a 7th column without renegotiating the breakpoints.

### c. **`projectKey` bridge: `ord-X` vs `order-X`**

Orders are keyed `ord-ocean`, but the uploads tree was built around `order-ocean`. Don't refactor either — they ship independently. Compute the bridge at the boundary:

```ts
const projectKey = orderId.replace(/^ord-/, "");
```

`pruneTreeToOrder(tree, projectKey)` then scopes the sidebar to that project. `findFirstOrderNode(tree)` iterates **raw section first** so the URL lands on RAW (delivery node is shallower in the BFS, which used to win).

### d. **Date.now / Math.random are off-limits in `Workflow` scripts**

Anywhere that runs through the Workflow runtime, prefer deterministic seeds. The `vendorAccessLink()` helper in `order-overview-tab.tsx` is the pattern: take vendor name + service name, slugify, then djb2-hash to a base-36 token:

```ts
const token = Array
  .from(slug)
  .reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381)
  .toString(36);
```

Stable, repeatable, no `Date.now()`. Apply the same pattern to any other token/id generator you add.

### e. **`requires_capture` lives on the helper, not the type**

`deliverableRequiresCapture(kind: DeliverableKind): boolean` in `shoot-upload-dialog.tsx` returns `false` for `virtual_staging` and `3d_tour`. The same predicate is duplicated as `deliverableRequiresShoot` in `order-overview-tab.tsx` — kept local on purpose so neither file imports from the other (Today dialog and Order Overview ship independently). We deliberately did NOT add a `requires_capture: boolean` to the `Deliverable` type yet — when the real backend lands, this should become a column on `deliverables` (or computed from `service.kind`) and **both helpers** should be deleted. Until then, every place that branches on "does this need a shoot" calls the local helper.

### e.bis **Per-deliverable row pattern (shared visual idiom)**

Two surfaces now render a deliverable as a row:
1. `shoot-upload-dialog.tsx` — interactive drop zone per row (Today tab).
2. `order-overview-tab.tsx` → `UploadDeliverableRow` — read-only post-upload summary (Order Overview).

Both use the same anatomy: `[icon chip] [label + sublabel] [right action/chip]`. The Order Overview variant splits its file counts via `deliverableRawAffinity()` — maps `video|walkthrough → video`, `floor_plan|3d_tour → other`, everything else → `photo`, then evenly distributes `kindBreakdown` across deliverables of that affinity (pre-made items always get 0). If you add a new `DeliverableKind`, update **both** the icon switch and the affinity switch in lockstep.

### h. **Upload ↔ Assign content parity (v12.3)**

User insight: if Upload step labels don't match Assign step labels, you can't reason about which uploaded files belong to which assigned editor. v12.3 routes every display through `deliverableDisplayName(d)` with the catalog as single source of truth:

```ts
function deliverableDisplayName(d: { id, kind, kindLabel, serviceId? }): string {
  if (d.serviceId) {
    const svc = serviceById(d.serviceId);
    if (svc) return svc.name;        // catalog-backed extra
  }
  if (d.id.startsWith("extra-")) return d.kindLabel;  // custom reference
  return serviceNameFor(d.kind);                       // serviceNameFor = kindToService(kind)?.name
}
```

Resolution order: **serviceId > extra-id > kind**. Surfaces using it: `UploadDeliverableRow` (deleted, see §3.l), `AssignRow`, `Items` popup (`buildOverviewItems`), Today-tab `ShootUploadDialog` (`displayLabel` mirror). Adding any new surface that names a deliverable is the right move — never inline `serviceNameFor(d.kind)` or `d.kindLabel` again, both miss the other cases.

The Today-tab dialog has a sibling helper `displayLabel(d)` in `shoot-upload-dialog.tsx` that follows the same order. They diverged historically; if you move either, move both.

### i. **Extras (manager-added order items, v12.3 redesign)**

The "+ Add item" button at the top of `AssignStep` opens `AddOrderItemDialog`, which now has TWO tabs:

1. **From catalog** — lists the 17 `SERVICES` from `catalog-data.ts`, grouped by `ServiceCategory` (Photos / Video / Floor Plan / Website). Services already in the order are greyed out with an "Already added" badge (matched by `serviceId` first, falling back to `kindToService(d.kind)`). Click → submit pushes a `Deliverable` with `serviceId` set, `kind` from `Service.deliverableKind ?? ASSIGN_GROUP_DEFAULT_KIND[categoryToGroup(svc.category)]`, and `requiresEditing: true`.
2. **Custom reference** — free-text name + group selector + optional note. For voiceover scripts, brand guidelines, look books — material that isn't a sellable catalog service. Submit pushes a Deliverable with `kindLabel = name`, `serviceId: undefined`, and `requiresEditing: false`.

State still lives at `OrderOverviewTab` (not `AssignStep`) so the extras show up in BOTH Upload and Assign rows. State shape:

```ts
const [extraDeliverables, setExtraDeliverables] = React.useState<Deliverable[]>([]);
const order = useMemo(() => ({
  ...orderProp,
  deliverables: [...orderProp.deliverables, ...extraDeliverables],
}), [orderProp, extraDeliverables]);
```

`handleAddExtra` accepts an `AddExtraPayload` discriminated union (`{ mode: "catalog", service } | { mode: "custom", name, group, note? }`) so the dialog stays generic and the OrderOverview composes the right Deliverable shape.

**Pipeline gates filter reference items.** Custom extras have `requiresEditing: false` so `editingDone` / `revisionDone` / `assignDone` skip them. Without this, attaching a reference mid-project would freeze the pipeline (all reference items would be stuck at `status: "not_started"`).

```ts
const editableDeliverables = order.deliverables.filter((d) => d.requiresEditing !== false);
// assignDone / editingDone / revisionDone iterate `editableDeliverables`, not `order.deliverables`.
```

**Deliberate decoupling: don't add an editor picker to `AddOrderItemDialog`.** Per explicit user spec (`"chọn editor, sau đó cho tôi edit nữa"`), creation and assignment are separate steps. After submit, the new row goes through the normal `AssignRow` flow.

`categoryToGroup(ServiceCategory): AssignGroupKey` bridges catalog → assign bucket. `Floor Plan` and `Website` both land in "Other"; Photos/Video map 1:1.

### j. **Single line about "log" feedback**

User feedback "bỏ phần log" = remove ambient state-tracker subtitles when the same info is already in the step header. The original "3 of 3 assigned" line at the top of `AssignStep` duplicated the chevron summary. Apply this principle elsewhere: if you see `"{n} of {m} {verb}"` repeated inside a step that already has a count in its header, delete it.

v12.3: the chevron-summary denominator now uses `editableDeliverables.length` (not `order.deliverables.length`) so adding a custom reference extra doesn't inflate the count.

### k. **Catalog as single source of truth (v12.3)**

Until v12.3, `order-overview-tab.tsx` carried a local `KIND_TO_CATALOG: Record<DeliverableKind, {name, priceCents, isAddOn}>` that duplicated catalog data — and drifted from it ("AI Video Elements" vs "AI Video Elements (3-5 Scenes)"; `isAddOn` flags out of sync for `twilight` / `3d_tour`). v12.3 deletes that map and uses the catalog directly.

Contract:
- `catalog-data.ts` is authoritative for service identity (name, price, category, add-on status).
- `Service.deliverableKind?: DeliverableKind` declares which of the 8 core services maps 1:1 to a `DeliverableKind`. Add-ons / website builds / extra batches don't ship as standalone deliverables and stay unmapped.
- Two helpers expose the bridge:
  ```ts
  export function kindToService(kind: DeliverableKind): Service | undefined
  export function serviceById(id: string): Service | undefined
  ```
- `Deliverable.serviceId?: string` (added to `orders-data.ts`) records the catalog id when a row was added via the catalog picker. `buildOverviewItems` branches on `serviceId` first, falling back to `kindToService(d.kind)` for legacy seeds.

When the real backend lands: replace `SERVICES` with a hook, keep `kindToService` / `serviceById` as derived views, and the rest of the UI is untouched. Do NOT re-introduce a `KIND_TO_CATALOG` map — drift will return immediately.

### l. **Unified Upload + Confirm dialog (v12.3)**

Pre-v12.3 the codebase had two near-identical surfaces:
1. `ShootUploadDialog` (Today tab) — interactive drop zones, no confirm. Card's "Confirm" button was a dead-end (no consumer wired).
2. `ShooterConfirmUploadDialog` (Order Overview) — checklist UI, no drop zones. Confirm flipped `localShooterConfirmed`.

v12.3 collapses them. `ShootUploadDialog` is now the single upload surface, with an optional footer Confirm CTA. New props:

```ts
type ShootUploadDialogProps = {
  // existing: open, onOpenChange, shoot, uploadCounts, onUpload
  /** Supplied → footer hosts a primary Confirm button that enables once
   *  every shoot-required deliverable has ≥1 file. Omitted → close-only. */
  onConfirmed?: () => void;
  /** Already-confirmed state. Footer shows "Confirmed" pill instead of CTA. */
  confirmed?: boolean;
};
```

**Confirm gate** lives inside the dialog:
```ts
const shootRequired = shoot.deliverables.filter((d) => deliverableRequiresCapture(d.kind));
const everyRequiredHasFiles =
  shootRequired.length > 0 &&
  shootRequired.every((d) => (uploadCounts[d.id] ?? 0) > 0);
const canConfirm = Boolean(onConfirmed) && everyRequiredHasFiles && !confirmed;
```

Pre-made items (`virtual_staging`, `3d_tour`) don't count toward the gate — they never get a fresh capture.

**State ownership.** `uploadCounts` lives in the parent:
- `OrderOverviewTab.uploadCounts: Record<deliverableId, number>` — single order
- `MyShootsView.uploadCounts: Record<shootId, Record<deliverableId, number>>` — many shoots

Both parents pass `onUpload` to bump counts. Both wire `onConfirmed` — Order Overview flips `localShooterConfirmed` (advances pipeline to Assign); Today tab fires a toast (mock for now; in production it would POST `/orders/{id}/confirm-raw`).

**Deleted in this collapse:**
- `UploadDeliverableRow` (inline read-only summary in `UploadStep`)
- `perDeliverableCounts` useMemo (distributed `rawUploadsForOrder` aggregate counts across kinds — irrelevant once the dialog is interactive)
- `deliverableRequiresShoot` + `deliverableRawAffinity` helpers (the dialog has its own `deliverableRequiresCapture`)
- `ShooterConfirmUploadDialog` export
- `uploads-page.tsx`'s `confirmShoot` state + ShooterConfirmUploadDialog mount
- `MyShootsView.onOpenConfirm` prop (shoot-card "Confirm" now just opens the same dialog)

Result: the new `UploadStep` is ~80 lines instead of ~200, and Today + Order Overview share one rendering pipeline.

### f. **Upload tracker pattern**

`useUploadTracker()` returns `{ jobs, addJob, dismiss }`. `addJob` pushes a `{ shootId, shootAddress, deliverableLabel, fileCount }` and the hook auto-ticks via `setInterval` until every job hits 100. When the real backend lands, replace the `setInterval` block with XHR/`fetch` progress events; the panel UI stays put. The panel re-opens on new job push via a `prevCount` ref so a user who manually collapsed it gets notified when new uploads arrive.

### g. **Vendor handoff block in Assign Step 4**

Vendors do **not** have Odone accounts. Submit can't directly route to them. The flow:

1. Manager picks a vendor in Step 1.
2. Steps 2–3 fill brief + schedule normally.
3. Step 4 Review shows a vendor block (amber tint) containing:
   - Read-only Editor Queue access link (mock token).
   - Optional vendor email (manager may leave blank).
   - **Copy brief + link** button → `navigator.clipboard.writeText(buildVendorClipboard(...))`. Button label flips to `Copied` (emerald) for 2s + toast.
4. Submit still runs (the order is now "assigned to a vendor") but the actual file delivery happens through the link, not Odone messaging.

`buildVendorClipboard()` returns a plain-text payload (greeting, link, bullet summary, signoff). Vendor email line is appended only if filled.

---

## 4. Routes + how to demo each feature

| URL | Tour |
|---|---|
| `/uploads?orderId=ord-ocean` | Files page scoped to one project. Click `Today` / `RAW` / `Final` to swap top tab. List view: sticky headers; click a sort header twice to flip direction. Search `05/30/2026` to test date matching. |
| `/uploads?as=mj` | Mock-role swap. `mj` = Maya Jones (shooter). Shows only her assigned shoots in Today. Available roles: `kyle`, `mj`, `sara`, `dana`. Default (no `?as`) = admin (sees the "Viewing as" dropdown). |
| `/orders/ord-ocean` | The Assign wizard demo. Confirm the upload via the checklist on the Overview tab; the Assign step unlocks. Click `Assign` on **Standard Listing Video** → Editor → pick `Tonomo Edit` → Brief → Schedule → Review. Vendor block surfaces in Step 4. |
| `/orders/ord-beach` | The 10-deliverable stress test. Maya's shoot. Use this to verify the ShootUploadDialog scroll behavior, the Pre-made rows, and the per-deliverable progress UI. |

### Quick demo script for a fresh reviewer

```
1. npm run dev
2. Open http://localhost:3000/uploads?as=mj — confirm Today tab shows MJ's shoots
3. Click any shoot card → ShootUploadDialog with per-deliverable drop zones
4. Drop files (or click Add) → UploadTracker pops bottom-right, progress ticks
5. Close dialog → progress keeps running in tracker
6. Open http://localhost:3000/orders/ord-ocean → Overview tab → Confirm upload
7. Assign step appears → pick a deliverable → Assign → walk the 4-step wizard
8. In Step 1, pick a vendor; in Step 4, copy the access link
```

---

## 5. Mock role system

- `useCurrentUser()` returns `{ id: "kyle" | "mj" | "sara" | "dana", role: "admin" | "shooter" | "manager" }`.
- URL flag `?as=<id>` overrides the default. Default user is admin (sees everything + "Viewing as" dropdown in MyShootsView).
- Order shooter ids are `shooter-<id>` (e.g. `shooter-mj`). The bridge in MyShootsView:

```ts
function effectiveShooterId(userId: string): string {
  if (userId.startsWith("shooter-")) return userId;
  return `shooter-${userId}`;
}
```

- Filter test: `o.assigned_shooter === effectiveShooterId(currentUserId)`.

Don't change the `shooter-` prefix scheme without updating both files (`my-shoots-view.tsx` and `uploads-page.tsx`).

---

## 6. Wiring checklist (mock → real)

When the backend lands, swap in this order — each is independent:

1. **`Deliverable.requires_capture: boolean`** — add column, derive in the API response, then delete `deliverableRequiresCapture()` from `shoot-upload-dialog.tsx`.
2. **`useUploadTracker()`** — replace the `setInterval` simulation block (lines ~66–81 of `upload-tracker.tsx`) with real XHR `progress` listeners. The `addJob` API stays the same.
3. **`vendorAccessLink()`** — replace with backend-issued signed URL. Token format up to backend; clipboard payload formatter (`buildVendorClipboard`) stays.
4. **`EDITOR_POOL_WITH_LOAD`** constant — replace with `useEditorPool()` hook returning the same shape (`{ id, type, name, specialties, load, rate? }`). The sort-by-specialty-match logic in Step 1 stays.
5. **`SplitFilesDialog` auto-match** — currently `file.lastModified ∈ scheduled_at..scheduled_end`. When EXIF capture timestamps are available, prefer those (`file.lastModified` lies on cards that have been re-saved). UI doesn't change.
6. **`ShootUploadDialog.onConfirmed`** (v12.3) — currently fires `localShooterConfirmed = true` in Order Overview (mock toast in Today tab). Real version POSTs `/orders/{id}/confirm-raw` with shooter signature + returns updated `raw_complete_at`. Both call sites stay identical; only the callback body changes.
7. **`SERVICES` catalog** (v12.3) — replace the static array in `catalog-data.ts` with a `useServices()` hook returning the same `Service[]` shape. `kindToService` / `serviceById` keep working as derived views over whatever source the hook hits. Do NOT add a parallel `KIND_TO_CATALOG` — see §3.k.
8. **`Deliverable.serviceId`** (v12.3) — backend should accept it on create, store as FK to `services.id`, and return it on read. UI already branches on it; no code changes needed beyond the data layer.

---

## 7. Known issues (do not fix unless asked)

- **`src/components/data-table.tsx`** — 2 pre-existing TS errors. Only used by `/dashboard` demo route. Ignore.
- **`src/components/ui/calendar.tsx`** — 1 pre-existing TS error from react-day-picker v10. Either pin to v9 or wait for upstream. Ignore for now.
- **Resizable tree-sidebar (#67)** — deferred. User said "for now temporarily" — leave the divider non-resizable until they revisit.
- **Inbox subfolder concept** — rejected. User wants delivered orders archived FROM the sidebar (chat preserved), no Inbox folder. Do NOT propose it again.

---

## 8. Recent UX feedback patterns to remember

These came up multiple times. Internalize them so the next round of edits is on-spec:

- **Dialog footers**: button labels must match behavior. `Done` was misleading on ShootUploadDialog because uploads continue after close — renamed to `Close` with `X` icon. If a button only dismisses, call it `Close`.
- **Confirm buttons appear only when ready.** ShootCard's `Confirm` button is hidden while uploads are in flight. The check is `!hasActiveUploads && (status === "uploaded" || sessionCount > 0)`. Mirror this pattern for any future "submit final state" CTAs.
- **Pre-made / system-provided items are visible but skipped.** They appear in the dialog list with a `Pre-made` chip but render no drop zone and no progress bar. They count toward "order has N items" but not toward "needs N uploads."
- **Vendor flow always needs a copy button.** Anywhere a vendor is in the loop, the manager needs a copyable handoff (link + brief). Vendors won't get an inbox in Odone for now.
- **Date format is MM/DD/YYYY.** US-style, swapped from the earlier DD/MM/YYYY pass. Don't switch back without explicit ask.
- **No `Math.random()` or `Date.now()` in code that may run in Workflow scripts.** Use slugify + djb2-hash for tokens; pass timestamps in via args.
- **Card balance matters.** User pushes back when a card has unbalanced rows (e.g. one item with 4 lines next to one with 2). Match line counts within a card.
- **Vietnamese feedback is precise.** Treat sentences like "tách thanh head của table ra" as a literal architectural spec (split the thead out), not a hint.

---

## 9. Open / deferred work

| ID | Subject | Status | Notes |
|---|---|---|---|
| #67 | Resizable tree-sidebar divider | deferred | User said skip for now. Likely a future v13 task. |
| — | Replace `deliverableRequiresCapture()` helper with type column | wiring | See §6.1. |
| — | Real upload progress events | wiring | See §6.2. |
| — | Vendor link backend | wiring | See §6.3. |
| — | Archive delivered orders FROM sidebar (chat preserved) | open | User mentioned in passing; no design yet. NOT an Inbox folder. |

---

## 10. Quick orientation for the next AI editor

If you're reading this cold, do these 5 things in order:

1. **Read `HANDOFF.md` §1–§5** (the v1–v11 baseline: routes, component map, data model, wiring patterns).
2. **Skim this file** in full. Pay attention to §0 (no git!), §3 (decisions), and §8 (feedback patterns).
3. **`npm run dev` and walk the demo script in §4.** Watch how the Today tab → ShootUploadDialog → UploadTracker → Order detail → Assign wizard flows together.
4. **Open `src/components/uploads/uploads-page.tsx`** and `src/components/orders/order-overview-tab.tsx` and skim once. These are the two big files; everything else is pulled in by them.
5. **Ask the user one focused question** about scope before editing if their request is ambiguous. Don't speculate; the user prefers a clarifying question over a misaimed change.

When you edit:
- Keep tokens semantic (`bg-card`, `text-muted-foreground`, etc.). No `bg-zinc-*`.
- Match existing component density. shadcn primitives + Tailwind utility patterns already established.
- One change at a time, then surface a screenshot path or a one-line "here's what changed."
- Never `git commit`, `git push`, `git reset`. Even if asked — clarify first. The standing rule is preview-only.

Good luck. The user is friendly and detailed; trust their feedback, and when in doubt, mirror an existing component pattern rather than inventing a new one.

— Handed off at the end of v12.2, after the Assign wizard's vendor copy-link block was verified.

— v12.3 amendment: catalog is now the single source of service identity (§3.k); `AddOrderItemDialog` is a two-tab catalog picker (§3.i); `ShootUploadDialog` absorbed the confirm checklist into one footer CTA (§3.l). Pipeline gates filter on `requiresEditing` so custom reference extras never freeze the queue. The three subsystems — catalog, orders, uploads — share one bridge (`Service.deliverableKind` + `Deliverable.serviceId`) instead of three parallel naming systems.
