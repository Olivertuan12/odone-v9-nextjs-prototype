"use client";

import * as React from "react";
import {
  Menu,
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  ArrowUpDown,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterTab = "all" | "recent" | "starred" | "archived";
export type TopTab = "raw" | "final";
export type ViewMode = "grid" | "list";
export type SortKey = "filename" | "date" | "size";
export type SortDir = "asc" | "desc";

export type BreadcrumbCrumb = { label: string; nodeId?: string };

export interface UploadsHeaderProps {
  title: string;
  count: number;
  breadcrumb: BreadcrumbCrumb[];
  onBreadcrumbClick: (nodeId: string | undefined) => void;
  filterTab: FilterTab;
  onFilterTabChange: (t: FilterTab) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  /** 1-5 */
  zoomLevel: number;
  onZoomChange: (n: number) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (k: SortKey, d?: SortDir) => void;
  query: string;
  onQueryChange: (s: string) => void;
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Filter pill — subtle, Apple-style
// ---------------------------------------------------------------------------

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recent" },
  { value: "starred", label: "Starred" },
  { value: "archived", label: "Archived" },
];

function FilterPill({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press h-7 gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-fast ease-standard",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            "ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums transition-colors duration-fast ease-standard",
            active
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Sort label helpers
// ---------------------------------------------------------------------------

function sortLabel(k: SortKey, d: SortDir): string {
  if (k === "filename") return d === "asc" ? "Name · A → Z" : "Name · Z → A";
  if (k === "size") return d === "asc" ? "Size · Smallest" : "Size · Largest";
  return d === "asc" ? "Date · Oldest first" : "Date · Newest first";
}

const SORT_OPTIONS: { key: SortKey; dir: SortDir; label: string }[] = [
  { key: "date", dir: "desc", label: "Date · Newest first" },
  { key: "date", dir: "asc", label: "Date · Oldest first" },
  { key: "filename", dir: "asc", label: "Name · A → Z" },
  { key: "filename", dir: "desc", label: "Name · Z → A" },
  { key: "size", dir: "desc", label: "Size · Largest" },
  { key: "size", dir: "asc", label: "Size · Smallest" },
];

// ---------------------------------------------------------------------------
// ZoomSlider — inline sub-component
// ---------------------------------------------------------------------------

function ZoomSlider({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  // Slider works in [1..5]; we clamp on emit so callers always get valid range.
  const clamped = Math.max(1, Math.min(5, Math.round(value)));
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-border bg-background/60 px-2.5 py-1 transition-colors duration-fast ease-standard hover:bg-background",
        className
      )}
      role="group"
      aria-label="Grid zoom"
    >
      <span
        aria-hidden
        className="inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground/70"
      />
      <Slider
        value={[clamped]}
        min={1}
        max={5}
        step={1}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? v[0] : v;
          if (typeof next === "number" && next !== clamped) {
            onChange(next);
          }
        }}
        aria-label="Zoom level"
        className="w-[100px]"
      />
      <span
        aria-hidden
        className="inline-block size-2.5 shrink-0 rounded-full bg-muted-foreground/70"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search field — collapsible on small screens
// ---------------------------------------------------------------------------

function SearchField({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (s: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      // Defer focus to after the input mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  return (
    <>
      {/* lg+: always-on rounded search input */}
      <div className="relative hidden lg:block">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search files"
          className="h-8 w-64 max-w-full rounded-full border-border bg-muted/40 pl-8 pr-8 text-sm placeholder:text-muted-foreground focus-visible:bg-background"
        />
        {query.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="press absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3" />
          </Button>
        )}
      </div>

      {/* <lg: icon-only trigger, expands to full-width input row */}
      <div className="lg:hidden">
        {!open ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Search"
                  onClick={() => setOpen(true)}
                  className="press size-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                />
              }
            >
              <Search className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>
        ) : (
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onBlur={() => {
                if (query.length === 0) setOpen(false);
              }}
              placeholder="Search files"
              className="h-8 w-48 rounded-full border-border bg-muted/40 pl-8 pr-8 text-sm placeholder:text-muted-foreground focus-visible:bg-background"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                onQueryChange("");
                setOpen(false);
              }}
              aria-label="Close search"
              className="press absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UploadsHeader({
  title,
  count,
  breadcrumb,
  onBreadcrumbClick,
  filterTab,
  onFilterTabChange,
  viewMode,
  onViewModeChange,
  zoomLevel,
  onZoomChange,
  sortKey,
  sortDir,
  onSortChange,
  query,
  onQueryChange,
  sidebarOpen,
  onSidebarToggle,
  className,
}: UploadsHeaderProps) {
  const currentSortLabel = sortLabel(sortKey, sortDir);

  return (
    <header
      className={cn(
        "flex w-full flex-col",
        // expose row heights as CSS vars for downstream sticky offsets
        "[--header-row-1:52px] [--header-row-2:44px]",
        className
      )}
      style={
        {
          // ensure variables are present even if Tailwind purges arbitrary classes
          ["--header-row-1" as string]: "52px",
          ["--header-row-2" as string]: "44px",
        } as React.CSSProperties
      }
    >
      {/* -------------------- Row 1 — primary controls -------------------- */}
      <div
        className="glass sticky top-0 z-30 flex h-[var(--header-row-1)] w-full items-center gap-2 border-b border-border px-3 sm:px-4"
        role="toolbar"
        aria-label="File management toolbar"
      >
        {/* Sidebar toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onSidebarToggle}
                aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                aria-pressed={sidebarOpen}
                className="press size-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              />
            }
          >
            <Menu className="size-4" />
          </TooltipTrigger>
          <TooltipContent>
            {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          </TooltipContent>
        </Tooltip>

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-5 sm:block"
        />

        {/* Breadcrumb — clickable trail */}
        <nav
          aria-label="Breadcrumb"
          className="min-w-0 flex-1 overflow-hidden"
        >
          <ol className="flex min-w-0 items-center gap-1 overflow-hidden text-sm">
            {breadcrumb.map((crumb, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <li
                  key={`${crumb.label}-${i}`}
                  className="flex min-w-0 items-center gap-1"
                >
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="px-0.5 text-xs text-muted-foreground/60"
                    >
                      /
                    </span>
                  )}
                  {isLast ? (
                    <span
                      aria-current="page"
                      className="truncate font-medium text-foreground"
                      title={crumb.label}
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBreadcrumbClick(crumb.nodeId)}
                      className="press truncate rounded-md px-1 text-muted-foreground transition-colors duration-fast ease-standard hover:text-foreground"
                      title={crumb.label}
                    >
                      {crumb.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Right cluster: just search (RAW/Final moved to tree, actions to folder row) */}
        <div className="ml-auto flex items-center gap-2">
          <SearchField query={query} onQueryChange={onQueryChange} />
        </div>
      </div>

      {/* -------------------- Row 2 — filter / sort / view -------------------- */}
      <div
        className="sticky top-[var(--header-row-1)] z-20 flex h-[var(--header-row-2)] w-full items-center gap-2 border-b border-border bg-background px-3 sm:px-4"
        role="toolbar"
        aria-label="View and sort controls"
      >
        {/* Title summary (current folder + count) — visible on lg+ for spatial anchoring */}
        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          <span
            className="max-w-[28ch] truncate text-xs font-medium text-muted-foreground"
            title={title}
          >
            {title}
          </span>
          <span className="text-xs text-muted-foreground/60" aria-hidden>
            ·
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto scroll-smooth-x">
          {FILTER_TABS.map((tab) => (
            <FilterPill
              key={tab.value}
              active={filterTab === tab.value}
              onClick={() => onFilterTabChange(tab.value)}
              badge={tab.value === "all" ? count : undefined}
            >
              {tab.label}
            </FilterPill>
          ))}
        </div>

        {/* Right cluster: sort · view · zoom */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Sort: ${currentSortLabel}`}
                  className="press h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                />
              }
            >
              <ArrowUpDown className="size-3.5 md:hidden" />
              <span className="hidden md:inline">{currentSortLabel}</span>
              <ChevronDown
                aria-hidden
                className="hidden size-3 opacity-70 md:inline"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-52">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map((opt) => {
                const active = opt.key === sortKey && opt.dir === sortDir;
                return (
                  <DropdownMenuItem
                    key={`${opt.key}-${opt.dir}`}
                    onClick={() => onSortChange(opt.key, opt.dir)}
                    aria-checked={active}
                    className={cn(active && "bg-accent text-accent-foreground")}
                  >
                    <span className="flex-1">{opt.label}</span>
                    {active && (
                      <Check className="size-3.5 text-foreground" aria-hidden />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          {/* View mode toggle */}
          <ToggleGroup
            multiple={false}
            value={[viewMode]}
            onValueChange={(v) => {
              const next = v[0] as ViewMode | undefined;
              if (next && next !== viewMode) onViewModeChange(next);
            }}
            spacing={0}
            variant="outline"
            className="h-7 rounded-full bg-background"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Grid view"
              className="size-7 px-1.5 !rounded-l-full !rounded-r-none"
            >
              <LayoutGrid className="size-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="List view"
              className="size-7 px-1.5 !rounded-r-full !rounded-l-none"
            >
              <List className="size-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Zoom slider — grid only, hidden on small screens to avoid clutter */}
          {viewMode === "grid" && (
            <div className="ml-1 hidden md:block">
              <ZoomSlider value={zoomLevel} onChange={onZoomChange} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default UploadsHeader;
