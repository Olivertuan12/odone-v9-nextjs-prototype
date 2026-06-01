# Redesign Log — Odone UI/UX

> Sổ tay tiến độ. Mỗi lần bắt đầu / kết thúc làm một page, cập nhật ở đây để khi quay lại biết đang ở đâu.

---

## Quy tắc

- **Page-by-page.** Làm xong một page hoàn chỉnh (responsive + motion + polish) rồi mới chuyển sang page khác.
- **Review checkpoint.** Sau mỗi page, screenshot ở 4 size (1920, 1440, 1280, 768) → user review → mark Done.
- **Scope:** chỉ UI/UX trong `_archive_sources/source-redesign-nextjs`. Không động `Odone/app` thật.
- **Reference:** `Odone-v8-main/` (worktree origin/main) là nguồn tham khảo feature & component có thật.

---

## Foundation (Global — đã xong)

✅ **2026-05-30 — Đợt 1: Foundation tokens**
- `globals.css` thêm: motion durations/easings (Apple style), radius scale 2xl/3xl/4xl, fluid type clamp(), fluid spacing, glass surface (light/dark), shadow elevation 3 tầng, utility class `.press` / `.lift` / `.scroll-smooth-*` / `.hairline` / `.stagger-fade`, `prefers-reduced-motion` block.
- Verify: console clean, visual không đổi (tokens chỉ được expose, chưa apply ở component nào).

---

## Pages

### `/` Editor Queue (partial)

**Status:** ⏳ Đang dở — đã audit baseline, chưa apply token nào lên component.

Baseline issues đã xác định:
- Kanban grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` (thiếu `lg:` ở giữa)
- Sidebar width cố định 240px, không auto-collapse trên iPad
- Header search pill `w-[240px]` cứng, "+ New Project" không thu lại, breadcrumb không truncate
- Hover-only states (iPad cảm ứng mất affordance)
- Animation: chỉ có `transition-colors` + `hover:scale-110` + `animate-pulse`, thiếu spring/stagger/layout-animation

Screenshots baseline:
- 1920x1080: 4 cột clean
- 1440x900: 4 cột clean, sidebar 220px
- 1280x800: kanban stack dọc (FAIL)
- 768 tablet: sidebar không collapse, kanban 2x2 wrap, header overflow (FAIL)

### `/uploads` UploadsV2 (file management)

**Status:** ✅ Done — chờ user review.

**Build:** workflow `wf_9a22543a-1b3` (12 sub-agents, ~11 phút, 723k tokens). Tất cả 12 file tạo OK, dev server không có compile error mới. Picsum thumbnails render.

**Post-build fixes:** 
- `uploads-header.tsx`: `md:` → `lg:` cho action label + search input + separator (header không tràn ở 768/1024)
- `src/app/uploads/page.tsx`: bỏ `EditorSiteHeader` (hardcoded "Editor Queue" gây sai breadcrumb, đè không gian dọc + tràn ngang ở 768)

**Verify multiple viewports:**
- 1920: 6 cols, header gọn, tree visible ✅
- 1440: 4 cols, header full với labels ✅
- 1280: 4 cols, header full ✅
- 1024 (iPad landscape): 3 cols + tree visible, header gần đủ (New Folder sát mép) ✅
- 768 (iPad portrait): header gọn (icon-only) nhưng còn cắt vì EditorSidebar (Workspace nav) chiếm 190px → fix là cross-cutting với Editor Queue (Đợt sau)

**Known issue (chấp nhận tạm):** Ở 768, EditorSidebar không auto-collapse → ăn 190px của content. Fix khi làm /editor-queue Đợt 2 (sidebar `collapsible="offcanvas"` dưới 1024px).

Scope đã chốt với user:
- 1 route `/uploads`, mode global hoặc `?orderId=X` (giống Dropbox/GDrive, di chuyển tự do giữa order)
- Mock data, thumbnails Picsum, không upload thật
- Build cả 12 component song song qua sub-agents để tiết kiệm context main

12 files sẽ được tạo:
- `uploads-data.tsx` (foundation, blocks others) — types + 48 mock files + tree
- 10 song song: `tree-sidebar`, `file-card`, `file-grid`, `file-list`, `bulk-actions-bar`, `upload-drop-zone`, `file-preview-modal`, `folder-share-dialog`, `new-folder-dialog`, `uploads-header`
- Integration cuối: `uploads-page.tsx`, `src/app/uploads/page.tsx`, +sửa `editor-sidebar.tsx` thêm Files entry

Tham khảo Odone-v8 thật (worktree):
- `src/pages/UploadsV2.tsx`
- `src/pages/uploads-explorer/` (components, types, utils)
- `src/components/uploads/`: `FileGrid`, `FolderTreeSidebar`, `FolderShareDialog`, `UploadDropZone`
- `src/components/`: `FileManagerModal`, `FilePreview`, `BulkActionsBar`, `WatermarkOverlay`, `ShareLinkDialog`

### `/calendar` Calendar

**Status:** ✅ Done — chờ user review.

**Build:**
- `src/components/calendar/calendar-data.ts` — 30 mock events spread May–June 2026 (REF_NOW = 2026-05-30), realistic real-estate workflow (sunrise shoots, midday edits, evening deliveries), 5 status states (scheduled/in-progress/review/delivered/overdue)
- `src/components/calendar/event-pill.tsx` — colored chip với time + title truncate, tone theo status
- `src/components/calendar/month-view.tsx` — 6×7 grid, day-of-week header, today highlight (filled pill), other-month muted, 3 events per cell + "+N more"
- `src/components/calendar/calendar-page.tsx` — Editor-Queue-style header (H1 "May 2026" + stats), Prev/Today/Next nav cluster, Month/Week toggle, EventDetailDialog với time range + shooter + notes + Open order CTA
- `src/app/calendar/page.tsx` — route shell với EditorSiteHeader breadcrumb `Workspace / Calendar`

**Verify:** 19 event pills render, click event → dialog mở với detail, Today nút disabled khi ở current month, prev/next navigate month.

**Known:** Week view chưa làm — placeholder graceful. Sẽ làm khi cần.

### `/orders/[orderId]` Order Detail

**Status:** ✅ Done — chờ user review.

**Build:** workflow `wf_5a2585cf-e96` (13 sub-agents, ~13 phút, 933k tokens). Tất cả file tạo OK.

**Files mới (12):**
- `src/components/orders/orders-data.ts` (1800 dòng) — 4 orders (ord-yorkshire/beach/ocean/lighthouse), 11 deliverables, versions, comments với timestamp, 36 raw uploads, 17 chat messages, 31 activity entries, 8 catalog items + helpers
- `video-review-player.tsx` — poster + play overlay + scrub bar với comment markers (Popover hover preview)
- `feedback-timeline.tsx` — comments list với timestamp pill (click seek), resolve toggle, filter pills (All/Open/Resolved), composer "At {current time}"
- `order-detail-header.tsx` — H1 + stats line + status badge + Share + More menu + Tabs + Open files link
- `order-overview-tab.tsx` — Project items pricing, Property card + mini map, Client (VIP badge), Booking details, Raw uploads preview
- `order-review-tab.tsx` — Deliverable strip selector + 2-col layout (player left + feedback right) + Approve/Request revision buttons
- `order-delivery-tab.tsx` — Final package checklist với match → deliverable + Quick downloads + Timeline + Recipients
- `order-chat-tab.tsx` — Project chat (grouped by sender, "you" bubble vs others, composer)
- `order-detail-page.tsx` — page composition, useSearchParams tab, useRouter cho tab sync URL
- `src/app/orders/[orderId]/page.tsx` — Next 16 dynamic route, React.use(params), Suspense, EditorSiteHeader breadcrumb dynamic

**Calendar v2 (modify):**
- `calendar-data.ts` thêm `orderId`, `cancelled` status, `cancelledTone()` helper
- `calendar-page.tsx`: GoogleSyncChip emerald "Synced • 5m ago" với dropdown (Sync now / Resubscribe / Clear cache / Disconnect), Shooter pills (All/Kyle/MJ/Sara, color dots), Upcoming toggle, Portals dropdown (3 checkbox), AgendaSidebar right panel (Today's schedule with events), Week view wire, "Open order" router.push → /orders/:id?tab=review
- `agenda-sidebar.tsx`, `google-sync-chip.tsx`, `week-view.tsx` (collision-aware time grid 7am-9pm) — 3 components mới

**Post-build fix:**
- 3 chỗ `asChild` (Radix syntax) → `render={<Comp />}` (base-ui pattern): order-detail-page Back button, order-overview-tab Maps link, video-review-player PopoverTrigger

**Verify flow end-to-end:**
1. /calendar → click event Yorkshire → dialog → "Open order" → /orders/ord-yorkshire?tab=review ✅
2. /orders/ord-yorkshire — 4 tabs render đẹp: Overview (project items/client/booking/raw preview), Review (video player + 4 comments + composer), Delivery (catalog checklist + timeline + recipients), Chat (5-msg conversation grouped by sender) ✅
3. Order Detail header → "Open files" → /uploads?orderId=ord-yorkshire ✅
4. Sidebar: Orders highlighted khi ở /orders/* ✅

### Settings shell

**Status:** ❌ Chưa tồn tại trong mockup.

---

## Pending review items (cần user duyệt)

- [ ] Scope cuối: 5 page cốt lõi / 10 page / toàn bộ 30 route?
- [ ] Thứ tự page làm trước?
- [ ] `EditorDetailDialog` (modal) → giữ hay tách route `/orders/:id`?

---

## Log lịch sử (newest first)

| Ngày | Page | Việc | Trạng thái |
|---|---|---|---|
| 2026-05-30 | (global) | **DESIGN.md** ground truth — radius, shape, icon mapping, date format US, color tokens, spacing, motion, layout, form — mọi component mới phải check | ✅ Done |
| 2026-05-30 | (global) | Sidebar nav: usePathname active state, tất cả nav items thành `<Link>`, stub `/calendar` `/orders` để navigation không 404 | ✅ Done |
| 2026-05-30 | /calendar | v7 balance (subagent): user thấy v6 quá đà — gom hết filter vào Options menu khiến "Today" lonely, rounding quá nhiều. Restore filter pills inline: `< May 2026 >` chevrons + Today + Upcoming + **All/Recent/Starred** + Portals + Options visible. Cells rounded-md (6px) thay 2xl, bỏ rounded-3xl wrapper grid — feel grid cohesive hơn. H1 revert "Calendar" static (match real Odone). **URL persistence** (?view=&upcoming=&recency=&portals=), **Week borders dim** (dashed/border/40), **Now pulse** trên first event của today trong agenda. | ✅ Done |
| 2026-05-30 | /calendar + global | v6 holistic restructure (UI subagent): (1) **Global bottom-round fix** — SidebarInset thêm `overflow-hidden` để clip children's hard edges (agenda border-l) bị các 4 rounded corners — fix tất cả page. (2) **H1 = date label** thay "Calendar" — Month view show "May 2026", Week view show "May 25 – 31, 2026", click chevron update H1. (3) **`< Today >` centered** stepper — 3-button pill với Today centered giữa prev/next. (4) **Month/Week icon toggle** (LayoutGrid + Columns3, no text). (5) **Options dropdown** (SlidersHorizontal icon) gom Upcoming + Portals filters + active count badge. (6) **Cells rounded-2xl** riêng từng cell, gap-1.5 thay bg-border divider. (7) **Groups wrapped trong rounded-3xl cards** (calendar grid + agenda). Bỏ Search input agenda. | ✅ Done |
| 2026-05-30 | /calendar | v5 polish per user: bỏ "Demo: connected" debug pill, bỏ "+ New booking" button (real Odone không có vì order chỉ vào qua Google), date stepper borderless (chỉ chevrons + label), agenda sidebar thêm Search input ở top với filter live + smart empty state ("No matches" khi search). | ✅ Done |
| 2026-05-30 | /calendar | v4 UI polish (subagent): day number top-LEFT + count badge top-RIGHT per cell, today RING (không fill), bỏ shooter pills riêng → chỉ All + Portals dropdown, event pill = shooter dot + title only (no time prefix), cancelled rose strike-through, agenda sidebar dùng portal badge (Fotello/Tonomo/HD Photo Hub) thay kind badge, big "May 30" + "2026 Saturday" eyebrow. Thêm EventPortal type + hash-based shooterTone + connected/disconnected demo toggle. | ✅ Done |
| 2026-05-30 | /orders + /calendar | Sync với real Odone: Calendar v3 (H1 "Calendar" static + global stats, Mon-first week, inline nav row stepper + Today + Upcoming + shooter pills + Portals dropdown, event pills bỏ time prefix). Order Detail v2 (bỏ Review tab → 3 tabs Overview/Delivery/Chat underline style, click deliverable trong Production files section mở DeliverableReviewModal full-screen với video player + feedback timeline + Approve buttons). | ✅ Done |
| 2026-05-30 | /orders + /calendar | Workflow 13 sub-agents build: /orders/[orderId] page với 4 tab (Overview/Review/Delivery/Chat) port từ EditorDetailDialog WorkspaceTab + Calendar v2 (Google sync chip, Week view time grid, Agenda sidebar, Shooter/Portal/Upcoming filters, cancelled events). Flow Calendar → Order Detail → File Mgmt wired đầy đủ. | ✅ Done |
| 2026-05-30 | /uploads | v9 layout polish: Search input chuyển vào đầu Tree sidebar (trên RAW/Final pill, anchored với folder context). Action cluster gọn: Upload (primary) + ⋯ More dropdown chứa New folder + Share. Footer đảo chiều: zoom slider TRƯỚC view toggle (đọc: chọn size → chọn view). | ✅ Done |
| 2026-05-30 | /calendar | Build Calendar page Editor-Queue style: H1 "May 2026" + stats + Prev/Today/Next + New booking. MonthView 6×7 grid với event pills (5 status tones), today indicator. EventDetailDialog click event hiển thị time range + shooter + notes + "Open order" CTA. Week view placeholder. | ✅ Done |
| 2026-05-30 | /uploads + sidebar | v8: bỏ duplicate Search trong sidebar (chỉ còn top ⌘K), add in-folder Search input ở filter row trái (placeholder dynamic theo folder name), move View toggle + Zoom slider từ filter row xuống **footer sticky bottom bar** (không đảo vị trí khi switch grid↔list, đồng thời fill vùng đen dưới), move kind chip (Twilight/Drone/etc) từ top-left → bottom-left overlay thumbnail (không chừa chỗ cho checkbox top-left). | ✅ Done |
| 2026-05-30 | /uploads | v7 sync header với Editor Queue: restore EditorSiteHeader top bar (breadcrumb prop `Workspace / Files`), restructure UploadsPage inline với H1 lớn (text-fluid-3xl bold), stats subtitle (32 files · 5.3 GB · Last updated MMM D, YYYY), filter pills + view controls đồng level. Bỏ UploadsHeader 2-row riêng và folder-actions row. Action buttons Upload/New folder/Share trong title row right. | ✅ Done |
| 2026-05-30 | (global) | EditorSiteHeader thêm prop `breadcrumb?: {label, href?}[]` dynamic. Default vẫn `Workspace / Editor Queue` cho backward-compat. Breadcrumb item có href → render `<Link>`, không có → static span. | ✅ Done |
| 2026-05-30 | /uploads | v6 Share dialog 2-step refactor: bỏ icon header lớn, gộp Settings (expiry/password/download) thành 1 card chia hàng có divider, suggested chips compact 1-dòng, **password input chỉ hiện khi switch on**. Step 1 Configure → Create link → Step 2 Link ready (chỉ hiện link + Copy + summary chips + Done/Edit settings). Dialog ngắn ~40% so trước. | ✅ Done |
| 2026-05-30 | /uploads | v5 alignment fix: TreeSidebar RAW/Final wrapper + folder-actions row đều `h-14` để first tree row align với first table header row. `h-24` bottom spacer giờ conditional theo `selectedIds.size > 0` để bỏ dải đen dưới khi không có selection. | ✅ Done |
| 2026-05-30 | /uploads | v4 hotfix: SidebarProvider `h-svh` để cap height (root cause: `min-h-svh` không có max, UploadsPage 2083px tràn 900px viewport). View toggle Grid/List + Permission segmented dùng `!rounded-l-full / !rounded-r-full / !rounded-none` đè shadcn default. Bottom rounded corner giờ visible đúng. | ✅ Done |
| 2026-05-30 | /uploads | v3 fixes per user review: list view overflow-x-auto, KindBadge/Thumbnail bo lại theo DESIGN.md, share dialog tất cả button → rounded-full, date relative → US absolute (MMM D, YYYY) cả file & tree date folders, h-svh → h-full để fill SidebarInset rounded inset không tràn | ✅ Done |
| 2026-05-30 | /uploads | v2 review pass: dọn row 1 (chỉ còn sidebar toggle + breadcrumb + search), RAW/Final → tree sidebar header (icon pill toggle), Upload/New folder/Share → folder-action row, fix bottom black gap (h-svh) | ✅ Done |
| 2026-05-30 | /uploads | Workflow 12 sub-agents build File Mgmt (foundation + 10 components + integration) | ✅ Done |
| 2026-05-30 | /uploads | Fix responsive header (md→lg cho label/search), bỏ EditorSiteHeader trên route uploads | ✅ Done |
| 2026-05-30 | (global) | Đợt 1 foundation tokens vào globals.css | ✅ Done |
| 2026-05-30 | (global) | Audit responsive + animation baseline | ✅ Done |
| 2026-05-30 | (global) | Khởi động Preview MCP, baseline 4 viewport sizes | ✅ Done |
| 2026-05-30 | (global) | Tạo worktree Odone-v8-main từ origin/main để tham khảo | ✅ Done |
