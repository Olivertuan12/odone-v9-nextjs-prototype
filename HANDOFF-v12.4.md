# Odone Redesign — v12.4 Handoff

> **Companion doc** to `HANDOFF.md` (v1–v11 baseline) and `HANDOFF-v12.2.md`
> (Files/Today tab + Assign wizard + the v12.3 catalog/upload amendment at
> its bottom). This file picks up after v12.2's v12.3 amendment and
> consolidates the **editor workflow loop**, **sidebar refactor**, **settings
> page**, **chat page**, and the **primitives sweep** that landed in one
> long session. Read both — this doc does not repeat the catalog bridge
> notes or the unified upload dialog notes (§3.h–§3.l in v12.2).

---

## 0. Critical constraint (read first)

**Still no git.** Same rule as v12.2 §0: this codebase is a UI/UX preview.
No commits, no branches, no pushes, no `gh` calls, no resets. If you think
you need git, re-read the request. The user iterates via screenshots +
Vietnamese feedback after each change. Stay in feedback-respond mode.

**Two adjacent constraints carried forward:**
- No `Date.now()`, `Math.random()`, or `new Date()` anywhere. Use stable
  derivative values (djb2-hash of a stable string, ref-backed counters,
  literal `setTimeout` delays). The runtime that drives some demos
  rejects unstable timestamps.
- Semantic tokens only. No `bg-zinc-*`, no `bg-[#...]`. The only acceptable
  raw colors are status tones (`bg-emerald-500/10`, etc).

---

## 1. What shipped (v12.3 amendment → v12.4)

| Domain | Theme | Status |
|---|---|---|
| **Pipeline status** | `derivePipelineStatus(order, {confirmed, extraAssignments})` in `orders-data.ts`. Lifted to `OrderDetailPage` via `onPipelineStatusChange` from `OrderOverviewTab`; the header badge now advances live as the user walks Upload → Assign → Editing. `editableDeliverables` filter excludes `requiresEditing: false` items so reference extras never freeze the badge. | done |
| **EditingStep redesign** | Replaced the single-row buckets with two distinct cards (`EditingBucketCard`): Photos (sky accent) and Video (violet accent), side-by-side on desktop, stacked on mobile. Per-deliverable rows show name + assignee + per-item status chip. Empty bucket renders a placeholder so the split stays visible. Fixed pre-existing `bucketState` checks for non-existent `"editing"`/`"in_revision"` statuses. | done |
| **Calendar agenda card** | Slimmed from 3 zones (time / title / shooter) to 2 tokens (listing · client · portal). Parent `<ul>` dropped lateral padding so cards extend flush to the rail width. NOW pill replaces portal chip when isNow. | done |
| **Sidebar reorder + Admin group** | Workspace nav reordered: **Orders → Calendar → Files → Editor Queue → Chat**. New collapsible **Admin** group (default open) holds Members + Catalog. User-button at footer opens a `DropdownMenu` (View profile / Settings / Sign out) instead of being inert. `CollapsibleSection.onAdd` is now optional. | done |
| **Settings page** | 13 subpages under `/settings/*` grouped Account / Workspace / Production / Integrations. Shared `SettingsRow` wraps shadcn `<Field>` / `<FieldLabel>` / `<FieldDescription>` so every form picks up the same labeling pattern. Layout flashes a 250ms `SettingsShellSkeleton` on path change. | done |
| **Editor workflow loop** | Full 5-stage flow for the kanban detail dialog: BriefView (Pending) → UploadView (Working On) → ReviewView (Review) → DeliverView (Deliver). State lives in a single `EditorStateProvider` (`editor-state.tsx`) mounted at layout level. See §3.a. | done |
| **BriefView 2-step split** | Pending view splits: step 1 = brief + assets + green **"Download all files"** CTA; click toasts + advances to step 2; step 2 = confetti burst + "You got the files!" + the motivational quote + final **"Start editing"**. Deterministic 28-piece confetti with djb2-derived per-card positioning. Custom `@keyframes confetti-fall` in `globals.css` (`.animate-confetti` utility). | done |
| **ReviewView 3-pane restore** | After an over-engineered initial pass, reverted state 3 (Review) to the legacy WorkspaceTab pattern: left collapsible Brief/Assets/People/Property (240px) + center **portrait 9:16** video (real estate vertical reels) + right Feedback panel (300px) with version chip + filter tabs + compose. Footer keeps Send revision + Approve. Side-panel collapse button exposed for `revision` + `working` stages, not only the legacy `showWorkspace`. | done |
| **DeliverView simplified** | Was rendering an `aspect-video` landscape hero + a "Final deliverables · 3" list; corrected to **portrait 9:16** hero + a **single** deliverable row (this view represents ONE deliverable per kanban card, not a bundle). Hover-revealed download on the hero + a row-level Download chip. | done |
| **Brief reactivity** | `AssignConfirmDialog.onConfirm` (in `order-overview-tab.tsx`) mirrors its `AssignSubmission` into `editor.setBrief(deliverable.id, …)`. WorkspaceTab / BriefView / UploadView / ReviewView read the brief back via `resolveBrief(card, brief)`. Fallback to mock copy for deliverables not assigned through the new flow. | done |
| **Order/kanban state overlay** | `EditingDeliverableRow` overlays the kanban stage onto the displayed deliverable status (via `stageToDeliverableStatus`). `RevisionStep` counts total feedback notes. `OrderDeliveryTab.effectiveStatusOf` reflects kanban-approved deliverables. Demo uses heuristic "any brief/version present?" since seed ids are disjoint between kanban + orders. | done |
| **Skeleton / Empty / Spinner sweep** | New primitives: `Empty` (composable shell), `Spinner` (Loader2 + size variants). Skeleton already existed. Coverage: Editor Queue empty columns (per-stage icons), Editor Queue first-paint skeleton (220ms × 2 cards/col), Order Detail 200ms skeleton before not-found, Editor Detail Dialog 4 stage-view skeletons keyed on card.id, Calendar agenda + grid Empty overlays, Catalog search Empty, Uploads file-grid + file-list Empty, Settings 250ms layout flash, Audit log + Members filter-empty Empty. | done |
| **Kbd primitive** | New `Kbd` + `KbdGroup` shadcn primitives. Swapped 6 raw `<kbd>` usages across `editor-site-header.tsx` (top-bar `⌘ K`), `search-palette.tsx` (footer hints), `orders/feedback-timeline.tsx` (post hint). | done |
| **Chat page** | Lifted DMs + Project Channels OUT of the sidebar into a new `/chat` route (Slack-style 2-column layout). Workspace nav now ends with a single **Chat** entry. Splitter between Channels (top) and DMs (bottom), pointer-capture drag, clamped to min 96px each. Composer textbox uses `bg-muted/40` to lift above the dark rail. Bottom corners rounded to match SidebarInset. See §3.f. | done |

---

## 2. File inventory (new / restructured)

```
src/components/editor-state.tsx              ★ NEW — React context: editor stage overrides,
                                                version counters, feedback rows,
                                                AssignSubmission briefs, deliverable↔card
                                                bindings. Mounted ONCE in layout.tsx.
src/components/editor-types.ts               ★ NEW — Shared Assignee + AssignSubmission types
                                                (breaks circular dep with order-overview-tab).
src/app/editor-state-mount.tsx               ★ NEW — Client mount shim for the provider.

src/components/chat/chat-data.ts             ★ NEW — DM_LIST (9), CHANNEL_LIST (7), ME, getThread,
                                                stable string-literal timestamps + ids.
src/components/chat/chat-page.tsx            ★ NEW — Slack-style 2-column layout, resizable
                                                splitter, draftbox lifted above dark rail.
src/app/chat/page.tsx                        ★ NEW — Route wrapper: SidebarProvider + EditorSidebar
                                                + EditorSiteHeader + <Suspense> for ChatPage.

src/app/settings/layout.tsx                  ★ NEW — Shell + 250ms skeleton flash on path change.
src/app/settings/page.tsx                    ★ NEW — Redirect → /settings/profile.
src/app/settings/{profile,account,notifications,appearance,
                  workspace,roles,billing,audit,
                  templates,editors,sharing,integrations}/page.tsx
                                             ★ NEW — 13 subpages, polished mocks.
src/components/settings/{settings-nav,settings-page-header,settings-section}.tsx
                                             ★ NEW — Shell pieces. SettingsRow wraps Field
                                                primitives so the Field sweep applies
                                                transitively.

src/components/ui/empty.tsx                  ★ NEW — Empty / EmptyHeader / EmptyMedia /
                                                EmptyTitle / EmptyDescription / EmptyContent.
src/components/ui/spinner.tsx                ★ NEW — Loader2 + size sm/default/lg.
src/components/ui/kbd.tsx                    ★ NEW — Kbd + KbdGroup, data-slot pattern.

src/components/editor-detail-dialog.tsx      — heavy refactor. 4 stage-aware views
                                                (BriefView / UploadView / ReviewView /
                                                DeliverView) + BriefCelebrateStep with
                                                ConfettiBurst. Legacy 3-tab WorkspaceTab
                                                / ProjectChatTab / DeliveryTab still
                                                reachable via the "Workspace" header
                                                button — they now accept `card` and no
                                                longer hardcode "45 Yorkshire Dr".
src/components/editor-kanban.tsx             — per-stage hover affordances (Download /
                                                Open / Upload / Approve / Download-all),
                                                Empty columns (Inbox / PencilRuler /
                                                Sparkles / PackageCheck), 220ms
                                                KanbanCardSkeleton on first paint, "🔔 N
                                                new feedback" pill on Working On cards.
src/components/editor-sidebar.tsx            — net −146 lines after Chat refactor:
                                                deleted DM/Channels CollapsibleSections,
                                                added Chat to workspace nav, Admin
                                                collapsible group, user-button dropdown.
src/components/calendar/agenda-sidebar.tsx   — slim card (listing · client · portal),
                                                flush parent, EmptyState swapped to
                                                Empty primitive.
src/components/calendar/calendar-page.tsx    — month-empty Empty overlay with
                                                CalendarSearch + Jump-to-today.
src/components/catalog/catalog-page.tsx      — Switch primitive for Add-on toggles
                                                (previously broken custom button),
                                                CatalogSearchEmpty for 0-results.
src/components/orders/orders-data.ts         — +derivePipelineStatus. +Service-side
                                                kindToService / serviceById helpers
                                                (already documented in v12.2 §3.k).
src/components/orders/order-detail-page.tsx  — derivedStatus state lift, 200ms
                                                OrderDetailSkeleton silhouette before
                                                "Order not found".
src/components/orders/order-overview-tab.tsx — Phase 2/3 catalog-backed extras
                                                (documented in v12.2 §3.h/i/k/l),
                                                editableDeliverables filter, EditingStep
                                                redesign (Photos/Video cards), AssignRow
                                                mirrors AssignSubmission to editor.setBrief.
src/components/orders/order-delivery-tab.tsx — effectiveStatusOf overlays kanban stage.

src/app/globals.css                          — +@keyframes confetti-fall + .animate-confetti
                                                utility (used by BriefCelebrateStep).

src/app/layout.tsx                           — mounts <EditorStateMount> globally so
                                                /, /orders/[id], /chat, /settings all
                                                share one provider.
```

---

## 3. Architectural decisions worth not relitigating

### a. **Editor state context — `editor-state.tsx`**

One React context provider, mounted at `app/layout.tsx` level via the
`EditorStateMount` shim. Owns:

```ts
useEditorState() returns:
  // Stage overlay
  getStage(card)                          → EditorStage   // pending/working/revision/deliver
  setStage(cardId, stage)                 → void
  cardsByStage                            → Record<EditorStage, Card[]>

  // Version counter
  getVersion(cardId)                      → number
  bumpVersion(cardId)                     → number        // returns the new version

  // Reviewer feedback
  getFeedback(cardId)                     → FeedbackRow[]
  addFeedback(cardId, {author, timePin?, body})
  clearFeedbackForCard(cardId)            → void          // fires on Approve

  // Manager's brief (AssignSubmission) per deliverableId
  getBrief(deliverableId)                 → AssignSubmission | undefined
  setBrief(deliverableId, sub)

  // Kanban ↔ Order bridge (placeholder, see §5)
  getCardForDeliverable(deliverableId)    → cardId | undefined
  bindCardToDeliverable(deliverableId, cardId)
```

**Why a single provider at layout level:** the kanban (`/`), order detail
(`/orders/[id]`), and delivery tab all observe the same state. A page-level
provider per route would lose the cross-page propagation that makes the
"manager submits brief → editor sees it in BriefView" demo work.

### b. **Editor detail dialog — stage-aware views + legacy reachable**

`editor-detail-dialog.tsx` switches the body based on `editor.getStage(card)`:

| Stage | View | Body |
|---|---|---|
| `pending`   | `BriefView`         | Brief + script + music ref + assets + green CTA "Download all files"; clicking advances to `BriefCelebrateStep` (confetti + quote + "Start editing") |
| `working`   | `UploadView`        | Compact brief + drop-zone + version counter + sticky "Request review · vN" CTA. When `editor.getFeedback(card.id).length > 0`, also shows a collapsed "Reviewer feedback" card above the drop-zone (revision loop) |
| `revision`  | `ReviewView`        | 3-pane: left Brief/Assets/People/Property (240px collapsible) + center portrait 9:16 video + right Feedback panel (300px) with version chip, filter tabs, compose + Upload pill. Footer = Send revision / Approve |
| `deliver`   | `DeliverView`       | Portrait 9:16 hero + single Download row + "Mark as delivered to client" footer |

The legacy 3-tab WorkspaceTab / ProjectChatTab / DeliveryTab is still
reachable via the "Workspace" header button. It now accepts `card` and no
longer hardcodes "45 Yorkshire Dr". Keep it for now — some surfaces still
link in there.

**Confetti pattern.** `BriefCelebrateStep` mounts `ConfettiBurst` which
renders 28 deterministic pieces. Position / delay / duration come from
djb2-hashing `seed = card.id`. CSS keyframe `confetti-fall` lives in
`globals.css`. Don't add `Math.random` to vary it — the determinism is the
point (same card → same spread).

### c. **Pipeline-derived `OrderStatus`**

The order header badge (top of `/orders/[id]`) used to read `order.status`
from the seed (always `"in_production"` for ord-ocean). Now it derives:

```ts
derivePipelineStatus(order, { confirmed, extraAssignments })
  → "wait_to_shoot" | "awaiting_upload" | "uploaded" | "in_production" | "delivered"
```

- `confirmed` mirrors `localShooterConfirmed` from `OrderOverviewTab`.
- `extraAssignments` is a `Record<deliverableId, boolean>` populated by
  `AssignGroupBlock` via `onAssignmentChange` and bubbled up to
  `OrderOverviewTab → onPipelineStatusChange → OrderDetailPage`.
- `requiresEditing: false` items are excluded from gate calculations so a
  custom reference extra (see v12.2 §3.i) never holds the badge back.

The page-level lift pattern is the same as the v12.3 catalog/derivedStatus
work. Both consumers (header + tab) read from the same store of truth.

### d. **Sidebar information architecture**

Three blocks now:
1. **Workspace** (5 items, day-to-day frequency order): Orders → Calendar
   → Files → Editor Queue → Chat
2. **Admin** (collapsible, default open): Members + Catalog
3. (DMs / Channels collapsibles were here; **removed** in v12.4, see §3.f)

The user footer button used to be inert. Now it opens a `DropdownMenu`
(View profile / Settings / Sign out — sign out is a `toast.info` mock).
`CollapsibleSection.onAdd` is optional so the Admin section can omit the
"+" affordance.

### e. **Settings page — `/settings/*`**

13 subpages, grouped by left sidenav into 4 sections (Account / Workspace
/ Production / Integrations). Layout pieces in `src/components/settings/`:

- `settings-nav.tsx` — 4 grouped sections, "Admin only" pill on 5 routes
  (visual only — no real role guard yet, see §5)
- `settings-page-header.tsx` — title + description from `SETTINGS_PAGE_META`
- `settings-section.tsx` — `SettingsSection` rounded-2xl card, `SettingsRow`
  wraps shadcn `Field` / `FieldLabel` / `FieldDescription`,
  `SettingsStickyFooter`

Layout flashes a 250ms `SettingsShellSkeleton` on `pathname` change so the
header doesn't pop. `next-themes` is NOT wired — the Appearance theme
picker is purely visual + a toast (project hardcodes `.dark` on `<html>`).

### f. **Chat page — `/chat`**

After several iterations of user feedback, the contract:

- **Two columns inside `SidebarInset`.** Left rail = 280px, right pane =
  flex-1. Root container has `rounded-b-xl overflow-hidden border-y` so
  the bottom corners follow the SidebarInset's outer rounding.
- **Color contract:** rail uses `bg-background` (matches sidebar dark
  tone). Boundary against the sidebar comes from `border-x border-border`,
  not a color shift. The composer's textbox uses `bg-muted/40` to lift
  above the surrounding dark — the wrapper around it is bare. This is
  deliberate (user feedback: "side panel màu đen, textbox màu khác").
- **Top-pane order:** Project Channels are above the splitter, Direct
  Messages below (user explicit).
- **Splitter:** `topPaneHeightPx` state, pointer-capture drag, clamps to
  min 96px each. The TOP pane gets the explicit pixel height; the bottom
  takes the remaining space via `flex-1`.
- **Header height parity:** both the rail's title row AND the right
  pane's conversation header are `h-14` so the top-edge line is continuous.
- **Removed by user spec:** the `+ New DM / New Channel` dropdown (people
  + projects are pre-seeded — nothing to "add"), the role pill on DM rows
  + in the conversation header, Phone + Video icons (text-only chat), the
  "Send with ⌘↵" footer hint.
- **Attach:** `<PaperclipIcon>` button wired to a hidden `<input
  type="file" multiple>` with broad `accept` (image / video / audio / PDF
  / zip / office docs / */*); picking files appends `📎 filename` to the
  draft as a mock attachment.
- **Mock-only data.** Threads come from `getThread(kind, id)` in
  `chat-data.ts`. Sending appends to a local `outgoing` map keyed by the
  same conversationId. No persistence across reloads.

`ChatDialog`, `NewDmDialog`, `NewChannelDialog` are still importable
components in `src/components/` but **not mounted anywhere**. Safe to
delete once we're sure nothing else points at them.

### g. **Primitives sweep**

3 new shadcn primitives + 1 conversion:

- `Empty` (composable shell) → Empty / EmptyHeader / EmptyMedia variant=icon
  / EmptyTitle / EmptyDescription / EmptyContent
- `Spinner` (Loader2 + size sm/default/lg, `data-slot="spinner"`)
- `Kbd` + `KbdGroup` (`data-slot` pattern)

The previously hand-rolled catalog Add-on toggle (a `<button role="switch">`
with mis-aligned `size-3.5` thumb) was replaced with the shadcn `Switch`
primitive. The bug presented as a giant pill in dark mode and was
unrelated to the toggle's logical state.

---

## 4. New routes

- `/chat` — see §3.f. Query params:
  - `?to=<dmId>` selects a DM (e.g. `/chat?to=devon`)
  - `?ch=<channelId>` selects a channel (e.g. `/chat?ch=45-yorkshire-dr`)
  - Default: first DM with a mention (Kyle), falls back to first DM, then
    first channel.
- `/settings` → redirects to `/settings/profile`
- `/settings/profile` `/settings/account` `/settings/notifications`
  `/settings/appearance` `/settings/workspace` `/settings/roles`
  `/settings/billing` `/settings/audit` `/settings/templates`
  `/settings/editors` `/settings/sharing` `/settings/integrations`

`/chat`, all `/settings/*`, and `/orders/[id]` ALL use the same shell
pattern: `SidebarProvider` + `EditorSidebar` + `EditorSiteHeader` +
`SidebarInset` + page-specific body.

---

## 5. Open follow-ups (don't lose track)

1. **Kanban↔Order id binding.** `editor-state.tsx` exports
   `bindCardToDeliverable` / `getCardForDeliverable` but they aren't
   called anywhere yet. Seed ids are disjoint (`yorkshire`, `ocean` vs
   `ob-deliv-video`…) so the demo state-sync uses the heuristic "any brief
   or version present for this id?" inside `EditingDeliverableRow` /
   `OrderDeliveryTab`. When a backend lands, the assign flow should call
   `bindCardToDeliverable(deliverableId, cardId)` and the heuristic can go.
2. **`next-themes`.** Hardcoded `.dark` on `<html>` in `app/layout.tsx`.
   Appearance theme picker is visual-only. Wire `next-themes` if real
   light-mode is needed.
3. **Audit log filter unread / read receipts.** "🔔 N new feedback" pill
   on Working On kanban cards counts total feedback rows (cleared on
   Approve). Real version needs an unread sub-state.
4. **`editor-stage-action-dialog.tsx` is orphan.** No importers after the
   editor detail dialog took over stage transitions. Safe to delete.
5. **`ChatDialog`, `NewDmDialog`, `NewChannelDialog` orphan.** Importable
   but not mounted after the chat page refactor.
6. **`ConfettiBurst` keyframe lives in `globals.css`.** The
   `@keyframes confetti-fall` declaration is global. If you delete the
   BriefCelebrateStep, also delete the keyframe.
7. **Reactions in chat are hard-coded by index** (rows 2 + 4 of the seed
   thread get `👍 3` / `🎉 1`). They aren't on the `ChatMessage` type yet.
   When the data model needs reactions, add `reactions?: Reaction[]` to
   the type in `chat-data.ts` and drive the renderer from the data.
8. **Sidebar role guard.** Settings nav shows an "Admin only" pill on 5
   routes — the pill is visual; there's no real auth check at layout
   level. Add one when auth is wired.
9. **Resizable tree-sidebar (#67 from v12.2 §9).** Still deferred. The
   chat page's splitter pattern (`topPaneHeightPx` + pointer-capture) is a
   reusable template if you ever come back to this.
10. **Pre-existing TS errors.** Same 17 as documented in v12.2 §7 plus
    `order-overview-tab.tsx` flagged some `"in_revision"` / `"editing"` /
    `groupKey` comparisons that aren't in the type. None block runtime.
    The new files added in v12.4 introduce **zero** new TS errors.

---

## 6. Feedback patterns from this user (internalize these)

These came up repeatedly. Adjust the next round of edits to match:

- **Vietnamese feedback is precise and often paired with a screenshot
  annotation.** "Cái này bị lẹm" / "trùng màu" / "thẻ bé quá" — treat each
  as a literal architectural spec. Vietnamese paired with a red-circled
  region in the screenshot is unambiguous.
- **The user expects context to carry across turns.** "Bạn xem lại" / "lúc
  trước bạn làm" — re-read previous turns rather than asking the user to
  re-explain. The session memory matters.
- **Dispatch subagents for substantial features.** Anything that touches
  4+ files or needs a sweep across many surfaces is a subagent. The user
  has been comfortable with this pattern (settings page, /chat page,
  editor workflow, skeleton sweep were all subagent work). Always brief
  the subagent with full context — it has zero prior session memory.
- **Verify in browser after each change.** `preview_eval` to navigate,
  `preview_screenshot` to confirm. The user often pastes a screenshot
  back showing what's wrong — that's the dialogue rhythm.
- **Match existing visual density.** The prototype is dense (small text,
  tight padding, rounded-xl/2xl cards). New surfaces that don't match
  the density read as foreign. Look at `order-overview-tab.tsx` for the
  canonical density.
- **Don't over-design.** ReviewView's first pass added a wide-video
  landscape preview + a fresh feedback panel layout. The user wanted the
  legacy 3-pane portrait pattern restored. When in doubt, look at the
  legacy WorkspaceTab pattern and mirror it.
- **Portrait video, not landscape.** Real estate reels are vertical. Both
  ReviewView and DeliverView use `aspect-[9/16]`.
- **One screen → one CTA.** The brief view's previous pass had Quote
  card + brief + assets + Start editing all on one screen. The user
  wanted it split into 2 beats (download / celebrate + start).
- **Single deliverable per kanban card.** DeliverView was rendering a
  bundled "Final deliverables · 3" list — the user pushed back: one card
  = one deliverable, one download. The Order Delivery tab handles
  bundles; the per-card view does not.
- **Pre-paste shadcn registry snippets when introducing a new primitive.**
  When the user wants `Empty`, `Spinner`, `Field`, `Kbd`, `Skeleton`,
  etc, they paste the canonical demo code. Build the primitive to match
  that exact shape so it lines up with future pastes.
- **Don't leave footer hints when the behavior is implied.** "Send with
  ⌘↵" was redundant; the user said "đã mặc định rồi, không cần một dòng
  nữa, tốn tài nguyên." Apply that principle elsewhere: if a UX is
  default in modern apps, don't document it inline.

---

## 7. Quick demo path for a fresh reviewer

```
1. cd /Users/admin/Documents/Odone/_archive_sources/source-redesign-nextjs
2. npm run dev    # http://localhost:3000

# Editor workflow (the big one)
3. Open /
4. Click a Pending card (e.g. "200 Lighthouse Cir") → BriefView opens with
   the quote card removed, big "Download all files" CTA at bottom.
5. Click "Download all files" → toast "Downloaded 4 files" → confetti
   bursts → "You got the files!" + quote card + Start editing.
6. Click Start editing → card moves to Working On column. Dialog switches
   to UploadView (drop-zone + Request review CTA).
7. Drop a file → "1 file ready for v1" → click "Request review · v1" →
   card moves to Review.
8. Click the Review card → ReviewView: portrait 9:16 video (center) + left
   collapsible Brief/Assets/People/Property + right Feedback panel with
   small Upload pill in the header.
9. Type a feedback note → Post → row appears → Send revision + Buzz editor
   → card back to Working On with "🔔 1 new feedback" pill.
10. Click the card → UploadView shows expanded "Reviewer feedback" card +
    drop-zone, version label bumped to v2.
11. Hover-Approve on a Review card → card moves to Deliver → DeliverView:
    portrait hero + single Download row + Mark as delivered to client.

# Pipeline status badge propagation
12. Open /orders/ord-ocean. Badge starts at "Awaiting upload" (or
    wait_to_shoot depending on seed). Click Confirm upload → confirm in
    the unified ShootUploadDialog → badge → "Uploaded". Assign editors →
    "In production".

# Chat
13. Open /chat → defaults to Kyle's DM (first mention).
14. Top: Project Channels. Bottom: Direct Messages. Drag the splitter to
    resize. Type in Message Devon → 📎 button opens file picker.

# Settings
15. Click user-button at bottom of sidebar → "Settings" → /settings/profile.
16. Click subpages in the left nav. 250ms skeleton flashes on each
    transition.

# Catalog
17. /catalog. Add-on toggle works correctly (was rendering as a broken
    pill before). Search returns "No services match…" Empty state when
    nothing matches.
```

---

## 8. File map — the top-touched files (sorted by importance)

```
src/components/editor-detail-dialog.tsx       Big detail modal, 5 stage views + legacy fallback
src/components/editor-state.tsx               The shared editor context (mount in layout)
src/components/orders/order-overview-tab.tsx  Pipeline, EditingStep cards, brief mirror
src/components/orders/orders-data.ts          derivePipelineStatus + kindToService bridge
src/components/chat/chat-page.tsx             Slack-style 2-col, splitter, color contract
src/components/editor-kanban.tsx              Per-stage hover affordances + Empty/Skeleton
src/components/editor-sidebar.tsx             Workspace nav, Admin collapsible, user dropdown
src/components/calendar/agenda-sidebar.tsx    Slim 3-token cards, flush rail
src/components/catalog/catalog-page.tsx       Switch primitive, search Empty
src/components/orders/order-detail-page.tsx   derivedStatus lift + 200ms skeleton
src/app/layout.tsx                            EditorStateMount (provider)
src/app/globals.css                           @keyframes confetti-fall + .animate-confetti
```

---

## 9. Where to look when you read this cold

1. **Read v12.2 §3.h–§3.l** for the catalog bridge + unified upload
   dialog. The catalog single-source-of-truth pattern is the foundation;
   v12.4 didn't change it.
2. **Read this file's §3.a** (editor state context) and §3.b (stage
   views). That's the structural backbone of the editor workflow loop.
3. **Read v12.2 §0 and §8.** All the long-standing rules still apply.
4. **`npm run dev` and walk §7.** Demo the full happy path end-to-end —
   that surfaces what works and what's mock.
5. **Open `editor-detail-dialog.tsx`** once. It's the largest single
   file (~1900 lines after the v12.4 work). The 5 stage views + legacy 3
   tabs all live here. Don't refactor the file; it's load-bearing and
   the next iteration may add stages.
6. **Ask one focused question** before editing if anything is ambiguous.
   The user prefers a clarifying question over a misaimed change. Use
   `AskUserQuestion` for branching decisions.

When you edit:
- Keep tokens semantic. shadcn primitives at `@/components/ui/*`.
- Match existing component density. Look at neighboring code.
- One change at a time, then surface a screenshot path or a one-line
  "here's what changed."
- Never `git commit`, `git push`, `git reset`. Even if asked — clarify
  first. Standing rule: preview-only.
- Subagent for sweeps (4+ files or cross-cutting concerns). Brief them
  with full context — no prior session memory.

Good luck. The user is friendly, precise, and detailed. Trust their
Vietnamese feedback paired with the annotated screenshot — that's the
unambiguous spec. When in doubt, mirror an existing component pattern
rather than inventing a new one.

— Handed off after the chat page polish round (color contrast, splitter,
rounded corners, pane reorder). 5+ subsystems landed in this session;
each has its own §3 entry above. Don't relitigate them without a reason.
