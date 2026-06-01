"use client";

// Catalog page — Services / Packages / Add-ons table view.
// Mirrors the user's existing service-pricing admin tool: each row shows a
// thumbnail, name, service-type pill, skip-folder toggle, price, add-on
// toggle, and kebab actions menu.
//
// Data lives in catalog-data.ts and will be swapped for the real sheet the
// user will share.

import * as React from "react";
import {
  Box,
  Image as ImageIcon,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search as SearchIcon,
  SearchX,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  PACKAGES,
  SERVICES,
  formatPriceCents,
  type Package,
  type Service,
  type ServiceCategory,
} from "./catalog-data";

type Tab = "services" | "packages" | "addons";

const TABS: { id: Tab; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "packages", label: "Packages" },
  { id: "addons", label: "Add-ons" },
];

const CATEGORY_TONE: Record<ServiceCategory, string> = {
  Photos: "bg-emerald-500/15 text-emerald-300",
  Video: "bg-violet-500/15 text-violet-300",
  "Floor Plan": "bg-amber-500/15 text-amber-300",
  Website: "bg-sky-500/15 text-sky-300",
};

function CategoryIcon({
  category,
  className,
}: {
  category: ServiceCategory;
  className?: string;
}) {
  switch (category) {
    case "Photos":
      return <ImageIcon className={className} />;
    case "Video":
      return <Video className={className} />;
    case "Floor Plan":
      return <LayoutGrid className={className} />;
    case "Website":
      return <Box className={className} />;
  }
}

export function CatalogPage() {
  const [tab, setTab] = React.useState<Tab>("services");
  const [query, setQuery] = React.useState("");

  const services = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [query]);

  const packages = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return PACKAGES.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [query]);

  const addons = React.useMemo(
    () => services.filter((s) => s.isAddOn),
    [services],
  );

  const counts = {
    services: services.length,
    packages: packages.length,
    addons: addons.length,
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border px-4 pt-4 pb-3 lg:px-6 lg:pt-5 lg:pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-fluid-3xl font-bold tracking-tight">
              Catalog
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              <span>{SERVICES.length} services</span>
              <span aria-hidden className="mx-1.5 text-muted-foreground/40">
                •
              </span>
              <span>{PACKAGES.length} packages</span>
              <span aria-hidden className="mx-1.5 text-muted-foreground/40">
                •
              </span>
              <span>
                {SERVICES.filter((s) => s.isAddOn).length} add-ons
              </span>
            </p>
          </div>
          <Button
            size="sm"
            onClick={() =>
              toast.info(
                tab === "packages" ? "Create new package" : "Add new service",
              )
            }
            className="press h-8 gap-1.5 rounded-full"
          >
            <Plus className="size-3.5" />
            {tab === "packages" ? "New Package" : "New Service"}
          </Button>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Catalog sections"
            className="inline-flex h-8 items-center rounded-full border border-border bg-background p-0.5"
          >
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "press inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-colors duration-fast ease-standard",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] tabular-nums",
                      active ? "bg-background/20" : "bg-muted",
                    )}
                  >
                    {counts[t.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative ml-auto w-full max-w-xs">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="h-8 rounded-full border-border bg-muted/40 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5">
        {tab === "services" && (
          <ServiceTable
            services={services.filter((s) => !s.isAddOn || true)}
            query={query}
            onClearQuery={() => setQuery("")}
          />
        )}
        {tab === "packages" && (
          <PackageTable
            packages={packages}
            query={query}
            onClearQuery={() => setQuery("")}
          />
        )}
        {tab === "addons" && (
          <ServiceTable
            services={addons}
            query={query}
            onClearQuery={() => setQuery("")}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Service table
// ============================================================================

function ServiceTable({
  services,
  query,
  onClearQuery,
}: {
  services: Service[];
  query: string;
  onClearQuery: () => void;
}) {
  if (services.length === 0) {
    return <CatalogSearchEmpty kind="services" query={query} onClear={onClearQuery} />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {services.map((s) => (
        <ServiceRow key={s.id} service={s} />
      ))}
    </ul>
  );
}

function ServiceRow({ service }: { service: Service }) {
  const [enabled, setEnabled] = React.useState(service.isAddOn);
  const [skipFolder, setSkipFolder] = React.useState(
    service.skipDeliveryFolder,
  );

  return (
    <li
      className={cn(
        "press grid grid-cols-[48px_1fr_auto_auto_auto_auto] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 transition-colors duration-fast ease-standard hover:bg-accent/30",
        "lg:grid-cols-[56px_minmax(0,1fr)_140px_160px_120px_88px_32px] lg:gap-4 lg:px-4 lg:py-3",
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg",
          CATEGORY_TONE[service.category].replace("/15", "/20"),
        )}
      >
        <CategoryIcon
          category={service.category}
          className="size-5 opacity-80"
        />
      </div>

      {/* Name */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {service.name}
        </p>
        <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground lg:hidden">
          {formatPriceCents(service.priceCents)} ·{" "}
          {service.isAddOn ? "Add-on" : "Standalone"}
        </p>
      </div>

      {/* Service type pill (lg+) */}
      <div className="hidden flex-col gap-0.5 lg:flex">
        <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
          Service Type
        </span>
        <Badge
          className={cn(
            "h-5 w-fit rounded-full border-0 px-2 text-[10.5px] font-medium",
            CATEGORY_TONE[service.category],
          )}
        >
          {service.category}
        </Badge>
      </div>

      {/* Skip delivery folder (lg+) */}
      <div className="hidden flex-col gap-0.5 lg:flex">
        <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
          Skip delivery folder
        </span>
        <button
          type="button"
          onClick={() => setSkipFolder((v) => !v)}
          className={cn(
            "press inline-flex h-5 w-fit items-center gap-1.5 rounded-full border px-2 text-[10.5px] font-medium transition-colors duration-fast ease-standard",
            skipFolder
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-border bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          {skipFolder ? "Enable" : "Disable"}
        </button>
      </div>

      {/* Price */}
      <div className="hidden flex-col gap-0.5 text-right lg:flex">
        <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
          Price
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatPriceCents(service.priceCents)}
        </span>
      </div>

      {/* Add-on toggle — v12.3: swapped the custom button for the shadcn
          Switch primitive. The hand-rolled toggle had a misaligned thumb
          (top-0.5 against a 20px track, with translate-x-4 over-shooting
          on the on-state) that read as a broken pill in dark mode. */}
      <div className="hidden flex-col items-center gap-0.5 lg:flex">
        <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
          Add-on
        </span>
        <Switch
          size="sm"
          checked={enabled}
          onCheckedChange={(v) => setEnabled(Boolean(v))}
          aria-label={`Toggle add-on for ${service.name}`}
        />
      </div>

      {/* Kebab */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Actions for ${service.name}`}
              className="press grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6}>
          <DropdownMenuItem onClick={() => toast.info(`Edit ${service.name}`)}>
            Edit service
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Duplicate service")}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => toast.warning(`Archived ${service.name}`)}
          >
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

// ============================================================================
// Package table
// ============================================================================

function PackageTable({
  packages,
  query,
  onClearQuery,
}: {
  packages: Package[];
  query: string;
  onClearQuery: () => void;
}) {
  if (packages.length === 0) {
    return <CatalogSearchEmpty kind="packages" query={query} onClear={onClearQuery} />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {packages.map((p) => (
        <PackageRow key={p.id} pkg={p} />
      ))}
    </ul>
  );
}

function CatalogSearchEmpty({
  kind,
  query,
  onClear,
}: {
  kind: "services" | "packages";
  query: string;
  onClear: () => void;
}) {
  const hasQuery = query.trim().length > 0;
  return (
    <Empty className="rounded-2xl border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX className="size-5" />
        </EmptyMedia>
        <EmptyTitle>
          {hasQuery ? `No ${kind} match "${query}"` : `No ${kind} yet`}
        </EmptyTitle>
        <EmptyDescription>
          {hasQuery
            ? "Try a shorter search term or browse another catalog tab."
            : "Add a new entry from the button above to populate this tab."}
        </EmptyDescription>
      </EmptyHeader>
      {hasQuery && (
        <EmptyContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={onClear}
          >
            Clear search
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

function PackageRow({ pkg }: { pkg: Package }) {
  return (
    <li className="grid grid-cols-[56px_minmax(0,1fr)_120px_32px] items-center gap-4 rounded-2xl border border-border bg-card px-3 py-3 transition-colors duration-fast ease-standard hover:bg-accent/30 lg:px-4">
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-foreground/10">
        <Box className="size-5 text-foreground/60" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {pkg.name}
        </p>
        {pkg.includes && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {pkg.includes}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-0.5 text-right">
        <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
          Price
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatPriceCents(pkg.priceCents)}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Actions for ${pkg.name}`}
              className="press grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6}>
          <DropdownMenuItem onClick={() => toast.info(`Edit ${pkg.name}`)}>
            Edit package
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Duplicate package")}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => toast.warning(`Archived ${pkg.name}`)}
          >
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export default CatalogPage;
