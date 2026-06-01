# Odone Design System — Single Source of Truth

> Mọi component mới hoặc sửa, MỞ FILE NÀY TRƯỚC. Tất cả radii, button shape, icon, date format, color phải tuân thủ. Không tạo ngoại lệ. Nếu cần ngoại lệ, thêm vào file này TRƯỚC khi code.

---

## 1. Radius / Shape — ONE language

**Quy tắc duy nhất: KHÔNG bao giờ có cạnh vuông (sharp).** Mọi surface đều bo.

| Element | Class | Pixel | Khi dùng |
|---|---|---|---|
| Primary button, pill, segmented toggle, chip, badge | `rounded-full` | full | Mọi button, mọi switch giữa 2-3 trạng thái, mọi chip |
| Card / thumbnail / preview | `rounded-2xl` | 20px | File card, modal body, surface trắng/đen độc lập |
| Hero surface, dialog container, sheet | `rounded-3xl` | 28px | Dialog gốc, sheet gốc, panel lớn |
| Input field, dropdown trigger, textarea | `rounded-xl` | 14px | Input, dropdown, dropdown content |
| Small icon button (size-7, size-8) | `rounded-full` | full | Icon-only action buttons |
| Sub-row hover container (table row, tree row) | `rounded-md` | 6px | CHỈ dùng cho row hover overlay, không phải standalone surface |
| Tag, kind badge inside card | `rounded-full` | full | TWILIGHT / DRONE / PHOTO chip |

**Cấm:**
- ❌ `rounded` / `rounded-sm` / `rounded-md` cho button hoặc card chính
- ❌ Sharp/no rounded
- ❌ `rounded-lg` cho button (đã thay bằng full)

---

## 2. Button system

Mọi button đều cao **h-8** (32px) hoặc **h-9** (36px) cho primary. Nhỏ hơn dùng **size-7**.

| Variant | Class | Background | Border | Khi dùng |
|---|---|---|---|---|
| **Primary** | `bg-foreground text-background rounded-full press` | foreground | none | Upload, Create link, Confirm, Save |
| **Secondary** | `border border-border bg-background hover:bg-accent rounded-full press` | background | border | New folder, Cancel, secondary action |
| **Ghost** | `hover:bg-accent rounded-full press text-muted-foreground hover:text-foreground` | transparent | none | Icon toggles, menu triggers |
| **Destructive** | `bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 rounded-full press` | tinted | none | Delete only |

Bắt buộc:
- Class `.press` cho mọi clickable
- `transition-colors duration-fast ease-standard` (đã có sẵn trong utility)
- Icon đứng trước label, `gap-1.5`

Cấm:
- ❌ Mix square + rounded buttons trên cùng surface
- ❌ Button không có hover state
- ❌ shadow trên button (chỉ shadow cho card)

---

## 3. Icon system — locked mapping

**Library duy nhất:** `lucide-react@1.16`. Không dùng emoji thay icon.

| Concept | Icon | Note |
|---|---|---|
| Upload file | `Upload` | |
| New folder | `FolderPlus` | |
| Folder (closed) | `Folder` | |
| Folder (open / expanded) | `FolderOpen` | |
| Share | `Share2` | KHÔNG dùng `Share` |
| Search | `Search` | |
| Close / Dismiss | `X` | |
| More menu | `MoreHorizontal` | KHÔNG dùng `MoreVertical` |
| Star (favorite) | `Star` | Fill khi active |
| Archive | `Archive` | |
| Delete / Trash | `Trash2` | KHÔNG dùng `Trash` |
| Download | `Download` | |
| Eye / View / Preview | `Eye` | |
| External link | `ExternalLink` | |
| Copy | `Copy` | |
| Grid view | `LayoutGrid` | KHÔNG dùng `Grid3x3` |
| List view | `List` | |
| Filter | `Filter` | |
| Sort | `ArrowUpDown` | |
| Calendar | `CalendarDays` | KHÔNG dùng `Calendar` (calendar = type ambiguity) |
| User | `User` | |
| Users (multi) | `Users` | |
| Camera (RAW context) | `Camera` | |
| Send (Final / delivery) | `Send` | |
| Drive / Files | `HardDrive` | |
| Image | `Image` | |
| Video | `Video` | |
| File (generic) | `File` | |
| File doc | `FileText` | |
| Drone | `Plane` | KHÔNG dùng `Helicopter` |
| Floor plan | `Box` (2D outline) | |
| 3D tour | `Box` (3D) | Cùng icon Floor plan vì abstract, dùng kindLabel để phân biệt |
| Twilight | `Sun` (set) | |
| Virtual staging | `Home` | |
| Check | `Check` | |
| Chevron right | `ChevronRight` | |
| Chevron down | `ChevronDown` | |
| Chevron up | `ChevronUp` | |
| Menu (hamburger) | `Menu` | |
| Plus | `Plus` | |
| Edit / Pen | `Pencil` | KHÔNG dùng `Edit` (deprecated) |
| Lock | `Lock` | |
| Unlock | `Unlock` | |
| Loader | `Loader2` (spin) | |
| Alert | `CircleAlert` | KHÔNG dùng `AlertCircle` (renamed v1.x) |

**Size:**
- `size-3` (12px) — chevron trong row dày, badge inline
- `size-3.5` (14px) — small button icon
- `size-4` (16px) — default
- `size-5` (20px) — emphasis (modal header, hero)
- KHÔNG mix nhiều size trong cùng cluster

**Stroke:** giữ mặc định lucide. Không override `strokeWidth`.

---

## 4. Date / time format — US

| Context | Format | Ví dụ |
|---|---|---|
| Date trên file card | `MMM D, YYYY` | "May 30, 2026" |
| Date + time | `MMM D, YYYY · h:mm A` | "May 30, 2026 · 2:30 PM" |
| Time only (cùng ngày) | `h:mm A` | "2:30 PM" |
| Date folder trong tree (RAW Shooter/Date/...) | `MMM D, YYYY` | "May 30, 2026" |
| Tooltip / detailed | `EEEE, MMM D, YYYY · h:mm A` | "Friday, May 30, 2026 · 2:30 PM" |
| Form input (date picker) | `MM / DD / YYYY` | "05 / 30 / 2026" |

**Cấm:**
- ❌ Relative time ("8 hours ago", "yesterday", "3 days ago") — không dùng cho file timestamps
- ❌ DD/MM/YYYY (EU format)
- ❌ ISO 8601 (`2026-05-30`) trong UI — chỉ trong code/API
- ❌ Mix relative + absolute trên cùng list

Helper duy nhất: `formatDateUS(iso)`, `formatDateTimeUS(iso)`, `formatTimeUS(iso)`.

---

## 5. Color tokens

Chỉ dùng semantic CSS variables:

```
bg-background / text-foreground             — page
bg-card / text-card-foreground              — card surface
bg-popover / text-popover-foreground        — overlay (popover, dropdown)
bg-sidebar / bg-sidebar-accent              — sidebar
bg-muted / text-muted-foreground            — secondary text
bg-accent / text-accent-foreground          — hover / selected
border-border                               — all borders
ring-ring                                   — focus ring
```

**Status tone (chỉ cho badge, chip):**

| Status | Background | Text | Khi dùng |
|---|---|---|---|
| Info / RAW / photo | `bg-sky-500/10` | `text-sky-400` | Photo kind |
| Video / processing | `bg-violet-500/10` | `text-violet-300` | Video kind |
| Drone | `bg-violet-500/10` | `text-violet-300` | Drone |
| Twilight / accent | `bg-blue-500/10` | `text-blue-300` | Twilight kind |
| Floor plan | `bg-amber-500/10` | `text-amber-300` | Floor plan |
| Success / done | `bg-emerald-500/10` | `text-emerald-400` | Approved, online |
| Warning | `bg-amber-500/15` | `text-amber-300` | Pending, due soon |
| Destructive | `bg-rose-500/10` | `text-rose-400` | Overdue, error |

**Cấm:**
- ❌ `bg-zinc-*` / `bg-gray-*` / `bg-stone-*` / `bg-neutral-*`
- ❌ Bg hex `bg-[#...]`
- ❌ Tone với opacity khác /10 hoặc /15 (ngoại trừ status đang highlight)

---

## 6. Spacing scale

- `gap-1` (4px) — icon liên kết với text
- `gap-1.5` (6px) — icon + label trong button
- `gap-2` (8px) — items trong row toolbar
- `gap-3` (12px) — items giữa section nhỏ
- `gap-4` (16px) — items giữa section trung
- `gap-6` (24px) — items giữa section lớn

Padding container:
- Card body: `p-2.5` đến `p-4`
- Dialog body: `p-6`
- Page main: `px-3 py-4` mobile, `px-5 py-5` desktop

---

## 7. Motion (đã có sẵn tokens)

| Use | Class |
|---|---|
| Press feedback | `.press` |
| Hover lift card | `.lift` |
| Color/bg change | `transition-colors duration-fast ease-standard` |
| Size/layout change | `transition-all duration-base ease-standard` |
| Entrance | `duration-slow ease-emphasized` |
| Joyful overshoot | `ease-spring` |

---

## 8. Layout

- Page container: `h-svh flex flex-col` (full viewport)
- Sticky header: `sticky top-0 z-30 glass`
- Sticky footer (bulk action bar): `sticky bottom-4 z-20`
- Body: `flex-1 min-h-0 overflow-y-auto scroll-smooth-y`
- Sidebar: `w-72` desktop, Sheet drawer on `<lg`

**Bắt buộc:**
- Mọi flex container có overflow → `min-h-0` hoặc `min-w-0`
- Mọi scroll area → `scroll-smooth-y` hoặc `scroll-smooth-x`
- Mọi table tràn → wrapper `overflow-x-auto`

---

## 9. Form patterns

- Input: `h-9 rounded-xl border-border bg-background px-3`
- Search: `h-8 rounded-full bg-muted/40 pl-8 pr-3`
- Select trigger: `h-9 rounded-xl`
- Switch: shadcn default (round)
- Segmented control: `rounded-full p-0.5 + items rounded-full bg-foreground active`

---

## 10. When in doubt

Mặc định:
- Bo full nếu là button hoặc pill
- Bo 2xl nếu là card hoặc dialog
- Date dùng `formatDateUS`
- Icon từ bảng §3, size-4
- Color semantic, không zinc

Nếu vẫn không chắc, hỏi user trước khi ship.
