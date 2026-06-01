// Catalog mock data. Mirrors the structure the user's existing service-pricing
// admin tool uses. Real data will replace this once the user shares the
// canonical sheet (see Round 12 chat).

import type { DeliverableKind } from "@/components/orders/orders-data";

export type ServiceCategory = "Photos" | "Video" | "Floor Plan" | "Website";

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  /** Whether the order's delivery folder is auto-created for this service. */
  skipDeliveryFolder: boolean;
  /** Starting price in USD. "+" suffix in UI added by the renderer. */
  priceCents: number;
  /** When true, this service is purchasable as a stand-alone add-on. */
  isAddOn: boolean;
  /** Optional thumbnail URL — falls back to a tinted placeholder. */
  thumbnail?: string;
  /**
   * v12.3: bridge to the orders domain. When set, this catalog service maps
   * 1:1 to a DeliverableKind, and order-overview-tab can resolve the service
   * record from a deliverable's `kind` field. Leave undefined for services
   * that don't ship as standalone deliverables (add-on Photo extras, website
   * builds, etc.). See HANDOFF §3.k.
   */
  deliverableKind?: DeliverableKind;
};

export type Package = {
  id: string;
  name: string;
  /** Comma-separated summary of included services for the card body. */
  includes?: string;
  priceCents: number;
  thumbnail?: string;
};

export const SERVICES: Service[] = [
  {
    id: "real-estate-photos",
    name: "Real Estate Photos",
    category: "Photos",
    skipDeliveryFolder: false,
    priceCents: 18000,
    isAddOn: false,
    deliverableKind: "photo",
  },
  {
    id: "drone-photos",
    name: "Drones Photos",
    category: "Photos",
    skipDeliveryFolder: false,
    priceCents: 20000,
    isAddOn: false,
  },
  {
    id: "drone-photos-addon",
    name: "Drones Photography – Addon",
    category: "Photos",
    skipDeliveryFolder: false,
    priceCents: 7000,
    isAddOn: false,
  },
  {
    id: "real-twilights",
    name: "Real twilights",
    category: "Photos",
    skipDeliveryFolder: false,
    priceCents: 25000,
    isAddOn: false,
    deliverableKind: "twilight",
  },
  {
    id: "amenity-photos",
    name: "Amenity / Neighborhood Photos",
    category: "Photos",
    skipDeliveryFolder: false,
    priceCents: 6000,
    isAddOn: true,
  },
  {
    id: "details-shot",
    name: "Details shot",
    category: "Photos",
    skipDeliveryFolder: false,
    priceCents: 7000,
    isAddOn: true,
  },
  {
    id: "2d-floor-plans",
    name: "2D Floor Plans",
    category: "Floor Plan",
    skipDeliveryFolder: false,
    priceCents: 4000,
    isAddOn: false,
    deliverableKind: "floor_plan",
  },
  {
    id: "floor-plans-upgrade",
    name: "Floor Plans Upgrade",
    category: "Floor Plan",
    skipDeliveryFolder: true,
    priceCents: 4000,
    isAddOn: false,
    deliverableKind: "3d_tour",
  },
  {
    id: "ai-video-elements",
    name: "AI Video Elements (3-5 Scenes)",
    category: "Video",
    skipDeliveryFolder: false,
    priceCents: 20000,
    isAddOn: true,
    deliverableKind: "virtual_staging",
  },
  {
    id: "agent-on-camera",
    name: "Agent on Camera",
    category: "Video",
    skipDeliveryFolder: false,
    priceCents: 7500,
    isAddOn: true,
  },
  {
    id: "carousel-videos",
    name: "Carousel Videos",
    category: "Video",
    skipDeliveryFolder: false,
    priceCents: 10000,
    isAddOn: true,
  },
  {
    id: "drone-video",
    name: "Drone Video",
    category: "Video",
    skipDeliveryFolder: false,
    priceCents: 15000,
    isAddOn: false,
    deliverableKind: "drone",
  },
  {
    id: "lifestyle-footage",
    name: "Lifestyle Footage",
    category: "Video",
    skipDeliveryFolder: false,
    priceCents: 10000,
    isAddOn: true,
  },
  {
    id: "lifestyle-footage-x3",
    name: "Lifestyle Footage X3",
    category: "Video",
    skipDeliveryFolder: false,
    priceCents: 20000,
    isAddOn: true,
  },
  {
    id: "premium-reel-video",
    name: "Premium Reel Video",
    category: "Video",
    skipDeliveryFolder: false,
    priceCents: 48900,
    isAddOn: false,
    deliverableKind: "video",
  },
  {
    id: "standard-listing-video",
    name: "Standard Listing Video",
    category: "Video",
    skipDeliveryFolder: false,
    priceCents: 29900,
    isAddOn: false,
    deliverableKind: "walkthrough",
  },
  {
    id: "premium-property-websites",
    name: "Premium Property Websites",
    category: "Website",
    skipDeliveryFolder: false,
    priceCents: 2500,
    isAddOn: true,
  },
];

export const PACKAGES: Package[] = [
  {
    id: "flagship",
    name: "Flagship",
    includes:
      "Real Estate Photos, Drones Photos, 2D Floor Plans, Premium Property Websites, Zillow 3D Tour + Interactive Floor Plan, Real twilights, Carousel Videos, Premium Reel Video",
    priceCents: 149900,
  },
  {
    id: "premium-package",
    name: "Premium Package",
    includes:
      "Real Estate Photos, Premium Reel Video, Drones Photos, 2D Floor Plans, Premium Property Websites, Carousel Videos",
    priceCents: 81900,
  },
  {
    id: "deluxe-package",
    name: "Deluxe Package",
    includes:
      "Real Estate Photos, Drones Photos, 2D Floor Plans, Premium Property Websites",
    priceCents: 60900,
  },
  {
    id: "showcase-package",
    name: "Showcase Package",
    includes:
      "Real Estate Photos, Drones Photos, 2D Floor Plans, Zillow 3D Tour + Interactive Floor Plan, Premium Property Websites",
    priceCents: 39900,
  },
  {
    id: "essential-package",
    name: "Essential Package",
    includes:
      "Real Estate Photos, Drones Photos, 2D Floor Plans, Premium Property Websites",
    priceCents: 27900,
  },
  { id: "tier-3", name: "Tier 3", priceCents: 200000 },
  { id: "tier-2", name: "Tier 2", priceCents: 180000 },
  { id: "tier-1", name: "Tier 1", priceCents: 150000 },
];

export function formatPriceCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}+`;
}

// ============================================================================
// v12.3 — Catalog ↔ orders bridge
// ============================================================================
// Single-source lookup so order-overview-tab.tsx (and any future surface)
// resolves a deliverable's service identity from the catalog instead of a
// duplicated local map. See HANDOFF §3.k.

/** Find the canonical Service record for a given DeliverableKind, or undefined
 *  if no catalog item maps to that kind. The mapping is declared on each
 *  Service via `deliverableKind` (8 core services map 1:1; add-ons / website
 *  builds don't ship as deliverables and stay unmapped). */
export function kindToService(kind: DeliverableKind): Service | undefined {
  return SERVICES.find((s) => s.deliverableKind === kind);
}

/** Find a Service by its catalog id. Used by catalog-backed extras to render
 *  the picked service's name/price in Upload/Assign rows without re-deriving
 *  from `kind` (extras may pick add-ons that don't map to a DeliverableKind). */
export function serviceById(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}
