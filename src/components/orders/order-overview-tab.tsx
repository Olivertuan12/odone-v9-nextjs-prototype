"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

// ============================================================================
// Order Overview tab — left: project items + property + customer notes
//                     right: client card + booking details + raw uploads
// ----------------------------------------------------------------------------
// Reference: Odone-v8-main/src/pages/OrderDetail.tsx (Overview tab section).
// DESIGN.md compliance:
//   §1 cards rounded-2xl, pills rounded-full
//   §3 icons from lucide-react locked map
//   §4 dates via formatDateUS / formatTimeRange
//   §5 status tone classes /10 + /15 only
// ============================================================================

import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  Camera,
  ChevronRight,
  CircleCheck,
  Clock,
  Copy,
  ExternalLink,
  HardDrive,
  Home,
  Image as ImageIcon,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Music,
  Phone,
  Plane,
  Send,
  Sparkles,
  Sun,
  Truck,
  Upload as UploadIcon,
  User,
  UserPlus,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  deliverableStatusLabel,
  deliverableStatusTone,
  derivePipelineStatus,
  formatBytes,
  formatCurrency,
  formatDateUS,
  formatTimeRange,
  formatTimeUS,
  kindIcon,
  type Deliverable,
  type DeliverableKind,
  type DeliverableStatus,
  type FormSource,
  type Order,
  type OrderStatus,
} from "./orders-data";
import {
  kindToService,
  serviceById,
  SERVICES,
  type Service,
  type ServiceCategory,
} from "@/components/catalog/catalog-data";
import { AssignJobDialog } from "@/components/jobs/assign-job-dialog";
import { EditorDetailDialog } from "@/components/editor-detail-dialog";
import { ShootUploadDialog } from "@/components/uploads/shoot-upload-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEditorState } from "@/components/editor-state";
import type { AssignSubmission as SharedAssignSubmission } from "@/components/editor-types";
import { Eye, MessageSquare } from "lucide-react";

// ============================================================================
// Local helpers
// ============================================================================

/**
 * Map kindIcon() string to the actual lucide component. Keep this local so
 * the data module stays icon-free (it's importable from server-only contexts
 * later when we wire Supabase).
 */
function KindIcon({ kind, className }: { kind: DeliverableKind; className?: string }) {
  const name = kindIcon(kind);
  switch (name) {
    case "Video":
      return <Video className={className} />;
    case "Image":
      return <ImageIcon className={className} />;
    case "Plane":
      return <Plane className={className} />;
    case "Box":
      return <Box className={className} />;
    case "Sun":
      return <Sun className={className} />;
    case "Home":
      return <Home className={className} />;
    default:
      return <Camera className={className} />;
  }
}

function formSourceLabel(s: FormSource): string {
  switch (s) {
    case "intake_form":
      return "Intake form";
    case "calendar":
      return "Calendar booking";
    case "walk_in":
      return "Walk-in";
  }
}

function durationLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "—";
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins - hours * 60;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/**
 * Derive line-items from the order's deliverables. v8 doesn't expose a single
 * "order_items" table on the client — items are inferred from deliverables +
 * the catalog. For mock parity we render one row per deliverable.
 */
type OverviewItem = {
  id: string;
  kind: DeliverableKind;
  title: string;
  quantity: number;
  price_cents: number;
  is_addon: boolean;
};

/** Catalog-friendly service name for a deliverable. Falls back to the raw
 *  `kind` string if the kind isn't mapped to a catalog Service. v12.3: this
 *  delegates to the catalog (single source of truth) — there used to be a
 *  duplicate `KIND_TO_CATALOG` map here that drifted from catalog-data.ts. */
function serviceNameFor(kind: DeliverableKind): string {
  return kindToService(kind)?.name ?? kind;
}

/** v12.3: every surface that lists a deliverable (Upload rows, Assign rows,
 *  Items popup, ...) must show the *same* text so the manager can reason
 *  about "which item is which" across steps. Resolution order:
 *    1) catalog-backed extras → `serviceById(d.serviceId).name`
 *    2) custom extras (id `extra-…`, no serviceId) → `d.kindLabel` (manager-typed)
 *    3) standard order items → `serviceNameFor(d.kind)` (catalog via kind)
 *  See HANDOFF §3.h. */
function deliverableDisplayName(d: {
  id: string;
  kind: DeliverableKind;
  kindLabel: string;
  serviceId?: string;
}): string {
  if (d.serviceId) {
    const svc = serviceById(d.serviceId);
    if (svc) return svc.name;
  }
  if (d.id.startsWith("extra-")) return d.kindLabel;
  return serviceNameFor(d.kind);
}

function buildOverviewItems(order: Order): OverviewItem[] {
  return order.deliverables.map((d) => {
    // v12.3: branch on serviceId first so catalog-picked extras show their
    // chosen service (name/price/addon). Custom extras (no serviceId, id
    // prefix `extra-`) carry the manager-typed name in `kindLabel` and have
    // no catalog price. Standard order items fall through to kindToService.
    const svc: Service | undefined = d.serviceId
      ? serviceById(d.serviceId)
      : kindToService(d.kind);
    const isCustomExtra = !svc && d.id.startsWith("extra-");
    return {
      id: d.id,
      kind: d.kind,
      title: svc?.name ?? (isCustomExtra ? d.kindLabel : d.kind),
      quantity: 1,
      price_cents: svc?.priceCents ?? 0,
      is_addon: svc?.isAddOn ?? false,
    };
  });
}

function splitItems(items: OverviewItem[]): { video: OverviewItem[]; photo: OverviewItem[] } {
  const videoKinds = new Set<DeliverableKind>(["video", "walkthrough", "drone", "3d_tour"]);
  return {
    video: items.filter((i) => videoKinds.has(i.kind)),
    photo: items.filter((i) => !videoKinds.has(i.kind)),
  };
}

// ============================================================================
// Component
// ============================================================================

export function OrderOverviewTab({
  order: orderProp,
  onPipelineStatusChange,
}: {
  order: Order;
  /** v12.3: lets the host page mirror the live pipeline status in the
   *  detail header badge. Fires whenever upload-confirm / assignment
   *  state changes. */
  onPipelineStatusChange?: (status: OrderStatus) => void;
}) {
  // v12.3: manager-added "extra items" live here in local state so they
  // propagate to BOTH the Upload step rows and the Assign step rows — the
  // single source of truth keeps Upload ↔ Assign content in lockstep
  // (otherwise files uploaded against an extra item wouldn't show up in the
  // Upload list, defeating the parity the user asked for).
  const [extraDeliverables, setExtraDeliverables] = React.useState<Deliverable[]>([]);
  const extraIdCounter = React.useRef(0);
  const handleAddExtra = React.useCallback(
    (payload: AddExtraPayload) => {
      const id = `extra-${++extraIdCounter.current}`;
      // v12.3: two extra modes share the same Deliverable shape but differ
      // in source-of-truth — catalog extras carry `serviceId` so display
      // name/price come from the canonical Service record; custom extras
      // are reference material (no editing required, no serviceId).
      const base = {
        id,
        order_id: orderProp.id,
        status: "not_started" as const,
        assigned_editor_id: null,
        assigned_editor_name: null,
        current_version_id: null,
        delivered_at: null,
        versions: [],
        comments: [],
        primary_thumbnail: "",
      };
      let next: Deliverable;
      if (payload.mode === "catalog") {
        const svc = payload.service;
        next = {
          ...base,
          kind:
            svc.deliverableKind ??
            ASSIGN_GROUP_DEFAULT_KIND[categoryToGroup(svc.category)],
          kindLabel: svc.name,
          title: svc.name,
          description: "",
          serviceId: svc.id,
          requiresEditing: true,
        };
      } else {
        next = {
          ...base,
          kind: ASSIGN_GROUP_DEFAULT_KIND[payload.group],
          kindLabel: payload.name,
          title: payload.name,
          description: payload.note ?? "",
          requiresEditing: false,
        };
      }
      setExtraDeliverables((prev) => [...prev, next]);
      if (payload.mode === "catalog") {
        toast.success(`Added "${payload.service.name}"`, {
          description: "Visible in Upload and Assign — assign an editor next.",
        });
      } else {
        toast.success(`Added reference "${payload.name}"`, {
          description: "Visible in Upload and Assign — no editor needed.",
        });
      }
    },
    [orderProp.id],
  );

  // Effective order = order props + locally-added extras. Used everywhere
  // we used to read `order.deliverables`, so derivations (assignedCount,
  // assignDone, ...) include the extras automatically.
  const order = React.useMemo<Order>(
    () => ({ ...orderProp, deliverables: [...orderProp.deliverables, ...extraDeliverables] }),
    [orderProp, extraDeliverables],
  );

  const items = buildOverviewItems(order);
  const { video: videoItems, photo: photoItems } = splitItems(items);
  const totalItems = items.length;

  // v11: role gating + workflow state. Editor doesn't see this page's pipeline
  // (their entry point is Editor Queue); manager / admin drive the steps.
  const currentUser = useCurrentUser();
  const isEditor = currentUser.role === "editor";
  const isShooter = currentUser.role === "shooter";
  const canManage = currentUser.role === "admin" || currentUser.role === "manager";

  // Pipeline state derived from order data.
  // v12: 5-step model. Each step's "done" condition feeds the activeStep
  // calculation, and we only render steps up to + including activeStep so the
  // future never previews into the past.
  // Step 1 (Upload) — shooter has uploaded raws AND confirmed.
  // v12.2: explicit confirm step. Files uploaded ≠ Upload done; the shooter
  // (or admin) must click Confirm to lock the batch and progress to Assign.
  // `localShooterConfirmed` lets the dialog flip the pipeline in this
  // prototype without mutating order data.
  const [localShooterConfirmed, setLocalShooterConfirmed] =
    React.useState(false);
  // v12.3: in-session per-deliverable file counts the shooter has dropped
  // via the unified ShootUploadDialog. Owned here (not inside UploadStep)
  // because the dialog itself is mounted from UploadStep but its state
  // must survive step collapse/re-expand. See HANDOFF §3.l.
  const [uploadCounts, setUploadCounts] = React.useState<Record<string, number>>({});
  // v12.3: track which deliverables have been assigned an editor in this
  // session (the seed data has assigned_editor_name pre-filled on some;
  // this overlay captures user clicks in AssignRow / AssignGroupBlock so
  // the badge advances after Assign step completes).
  const [sessionAssignments, setSessionAssignments] = React.useState<
    Record<string, boolean>
  >({});
  const handleAssignmentChange = React.useCallback(
    (deliverableId: string, hasAssignee: boolean) => {
      setSessionAssignments((prev) => ({ ...prev, [deliverableId]: hasAssignee }));
    },
    [],
  );
  const handleUploadBumped = React.useCallback(
    (deliverableId: string, fileCount: number) => {
      setUploadCounts((prev) => ({
        ...prev,
        [deliverableId]: (prev[deliverableId] ?? 0) + fileCount,
      }));
    },
    [],
  );
  const filesPresent = order.raw_summary.count > 0;
  const uploadDone =
    Boolean(order.raw_complete_at) || localShooterConfirmed;
  // v12.3: pipeline gates only consider items that actually need editing.
  // Custom reference extras (voiceover scripts, brand assets, look books…)
  // carry `requiresEditing: false` and are excluded from Assign/Editing/
  // Revision gates so they never freeze the pipeline. Catalog-backed extras
  // and standard deliverables default to requiresEditing=true.
  // See HANDOFF §3.i.
  const editableDeliverables = order.deliverables.filter(
    (d) => d.requiresEditing !== false,
  );
  // Step 2 (Assign) — every editable deliverable has someone (in-house or vendor).
  // v12.3: also count session-level assignments (set by AssignRow clicks)
  // so the gate flips immediately when the manager finishes assigning.
  const assignedCount = editableDeliverables.filter(
    (d) =>
      Boolean(d.assigned_editor_name) ||
      Boolean(sessionAssignments[d.id]),
  ).length;
  const assignDone =
    editableDeliverables.length > 0 &&
    assignedCount === editableDeliverables.length;
  // Step 3 (Editing) — every editable deliverable has at least entered
  // review/in_revision (meaning the first cut shipped to review).
  const editingStarted = editableDeliverables.some(
    (d) =>
      d.status === "review" ||
      d.status === "approved" ||
      d.status === "delivered",
  );
  const editingDone =
    editableDeliverables.length > 0 &&
    editableDeliverables.every(
      (d) =>
        d.status === "review" ||
        d.status === "approved" ||
        d.status === "delivered",
    );
  // Step 4 (Revision) — every editable deliverable past in_revision (approved/delivered).
  const finalCount = editableDeliverables.filter(
    (d) => d.status === "approved" || d.status === "delivered",
  ).length;
  const revisionDone =
    editableDeliverables.length > 0 &&
    finalCount === editableDeliverables.length;
  // Step 5 (Approve / deliver) — order.delivered_at exists.
  const approveDone = Boolean(order.delivered_at);

  // v12.3: push the derived status up to the page so the header badge
  // mirrors the pipeline. Runs whenever a gate input changes.
  React.useEffect(() => {
    if (!onPipelineStatusChange) return;
    const next = derivePipelineStatus(order, {
      confirmed: localShooterConfirmed,
      extraAssignments: sessionAssignments,
    });
    onPipelineStatusChange(next);
  }, [
    onPipelineStatusChange,
    order,
    localShooterConfirmed,
    sessionAssignments,
  ]);

  const activeStep: 1 | 2 | 3 | 4 | 5 = !uploadDone
    ? 1
    : !assignDone
      ? 2
      : !editingDone
        ? 3
        : !revisionDone
          ? 4
          : 5;
  const TOTAL_STEPS = 5;

  // v12: Review modal hydration. Three entry points all share the SAME
  // surface (OrderReviewTab inside DeliverableReviewModal):
  //   1) Pipeline Editing/Revision step → openReview(deliverableId)
  //   2) URL ?review=<deliverableId> on landing (from Editor Queue cards or
  //      direct deep-link) — modal auto-opens on mount
  //   3) Future: from Files page (preview action) → /orders/:id?review=...
  // This is the unification with Editor Queue's old WorkspaceTab — there is
  // no longer a second "feedback" view; everything funnels here.
  const searchParams = useSearchParams();
  const reviewParam = searchParams?.get("review") ?? null;

  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewDeliverableId, setReviewDeliverableId] = React.useState<
    string | undefined
  >(undefined);

  // Auto-open the modal once when arriving with ?review=<id>. The param can
  // be "first" as a sugar (open whatever deliverable is most relevant) or a
  // specific deliverable id.
  const reviewHydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (reviewHydratedRef.current || !reviewParam) return;
    reviewHydratedRef.current = true;
    const target =
      reviewParam === "first"
        ? (order.deliverables.find((d) => d.status === "review") ??
            order.deliverables[0])
        : order.deliverables.find((d) => d.id === reviewParam);
    if (target) {
      setReviewDeliverableId(target.id);
      setReviewOpen(true);
    }
  }, [reviewParam, order.deliverables]);

  const openReview = (deliverableId: string) => {
    setReviewDeliverableId(deliverableId);
    setReviewOpen(true);
  };

  const tier = order.client_name.toLowerCase().startsWith("acme") || order.client_company?.toLowerCase().startsWith("acme")
    ? "VIP"
    : "Standard";

  const mapsUrl =
    order.property_lat != null && order.property_lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${order.property_lat},${order.property_lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.property_address)}`;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[3fr_2fr] lg:gap-6 lg:px-6 lg:py-5">
      {/* ============================================================== */}
      {/* LEFT — production pipeline, property, raw uploads (v11)          */}
      {/* ============================================================== */}
      <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
        {/* v11: Production pipeline replaces flat "Project items" list.
            Shows the 3 big steps of the workflow with role-aware actions.
            Editors don't see this — their entry point is Editor Queue. */}
        {isEditor ? (
          <EditorBanner orderId={order.id} order={order} />
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="text-fluid-lg font-semibold tracking-tight">
                  Production pipeline
                </h2>
                <Badge
                  variant="secondary"
                  className="rounded-full bg-muted px-2.5 py-0.5 text-fluid-xs font-medium text-muted-foreground"
                >
                  Step {activeStep} of {TOTAL_STEPS}
                </Badge>
              </div>
              {/* v12: replaced native <details> with DropdownMenu so the
                  popup floats above the right column instead of overlapping
                  it. align="end" keeps the popup anchored to the trigger. */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`Show project items (${totalItems})`}
                      className="press inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-fast ease-standard"
                    />
                  }
                >
                  <ChevronRight className="size-2.5" />
                  Items ({totalItems})
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="w-72 rounded-xl p-3"
                >
                  <div className="flex flex-col gap-3">
                    {videoItems.length > 0 && (
                      <ItemGroup heading="Video & motion" items={videoItems} />
                    )}
                    {photoItems.length > 0 && (
                      <ItemGroup heading="Photo & 2D" items={photoItems} />
                    )}
                    <div className="flex items-center justify-between border-t border-border pt-2 text-fluid-xs">
                      <span className="text-muted-foreground">Order value</span>
                      <span className="font-semibold">
                        {formatCurrency(order.order_value_cents)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            {/* v12: only show steps reached (done + active). Future steps
                are hidden until the previous step completes. */}
            <ol className="flex flex-col gap-3">
              <PipelineStep
                number={1}
                label="Upload"
                actor="Shooter"
                actorName={order.shooter_name}
                state={uploadDone ? "done" : "active"}
                last={activeStep === 1}
                summary={
                  uploadDone
                    ? `${order.raw_summary.count} raw · ${formatBytes(order.raw_summary.bytes)}`
                    : filesPresent
                      ? `${order.raw_summary.count} raw · awaiting confirm`
                      : "Awaiting upload"
                }
              >
                <UploadStep
                  order={order}
                  uploadDone={uploadDone}
                  filesPresent={filesPresent}
                  canConfirm={isShooter || canManage}
                  uploadCounts={uploadCounts}
                  onUpload={handleUploadBumped}
                  onShooterConfirmed={() => setLocalShooterConfirmed(true)}
                />
              </PipelineStep>

              {activeStep >= 2 && (
                <PipelineStep
                  number={2}
                  label="Assign"
                  actor="Manager"
                  actorName={canManage ? currentUser.name : undefined}
                  state={assignDone ? "done" : "active"}
                  last={activeStep === 2}
                  summary={`${assignedCount}/${editableDeliverables.length} assigned`}
                >
                  <AssignStep
                    order={order}
                    canManage={canManage}
                    onAddExtra={handleAddExtra}
                    onAssignmentChange={handleAssignmentChange}
                  />
                </PipelineStep>
              )}

              {activeStep >= 3 && (
                <PipelineStep
                  number={3}
                  label="Editing"
                  actor="Editor"
                  state={editingDone ? "done" : "active"}
                  last={activeStep === 3}
                  summary={
                    editingDone ? "All cuts shipped" : "In editor queue"
                  }
                >
                  <EditingStep
                    order={order}
                    onOpenReview={openReview}
                  />
                </PipelineStep>
              )}

              {activeStep >= 4 && (
                <PipelineStep
                  number={4}
                  label="Revision"
                  actor="Manager"
                  state={revisionDone ? "done" : "active"}
                  last={activeStep === 4}
                  summary={
                    revisionDone
                      ? "Resolved"
                      : `${editableDeliverables.filter((d) => d.status === "review").length} pending`
                  }
                >
                  <RevisionStep order={order} onOpenReview={openReview} />
                </PipelineStep>
              )}

              {activeStep >= 5 && (
                <PipelineStep
                  number={5}
                  label="Approve & deliver"
                  actor="Manager"
                  state={approveDone ? "done" : "active"}
                  last
                  summary={
                    approveDone
                      ? `Delivered ${formatDateUS(order.delivered_at ?? order.scheduled_at)}`
                      : "Ready"
                  }
                >
                  <ApproveStep
                    order={order}
                    approveDone={approveDone}
                    canManage={canManage}
                  />
                </PipelineStep>
              )}
            </ol>
          </section>
        )}

        {/* v12: Property + Raw uploads moved out.
            - Property → right column (compact card next to Booking details).
            - Raw uploads → merged INTO the Upload pipeline step (single
              source of truth for raw files). */}
      </div>

      {/* ============================================================== */}
      {/* RIGHT — client + booking + raw uploads                          */}
      {/* ============================================================== */}
      <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:gap-3 lg:self-start">
        {/* --- Client card (v11: compacted padding + denser layout) --- */}
        <section className="rounded-2xl border border-border bg-card p-3">
          <header className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Client
            </span>
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full px-2.5 py-0.5 text-fluid-xs font-medium",
                tier === "VIP"
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tier}
            </Badge>
          </header>

          <div className="flex items-start gap-2.5">
            <Avatar className="size-8 shrink-0">
              <AvatarImage
                src={`https://i.pravatar.cc/150?u=${encodeURIComponent(order.client_email)}`}
                alt={order.client_name}
              />
              <AvatarFallback className="bg-muted text-[10px]">
                {order.client_name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-fluid-xs font-semibold">{order.client_name}</span>
              {order.client_company && (
                <span className="truncate text-[10px] text-muted-foreground">
                  {order.client_company}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
            <a
              href={`mailto:${order.client_email}`}
              className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
            >
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{order.client_email}</span>
            </a>
            {order.client_phone && (
              <a
                href={`tel:${order.client_phone}`}
                className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
              >
                <Phone className="size-3 shrink-0" />
                <span className="truncate">{order.client_phone}</span>
              </a>
            )}
          </div>
        </section>

        {/* --- Booking details card (v11: compact) --- */}
        <section className="rounded-2xl border border-border bg-card p-3">
          <header className="mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Booking details
            </span>
          </header>

          <dl className="flex flex-col gap-1.5">
            <BookingRow
              icon={<CalendarDays className="size-3.5" />}
              label="Scheduled"
              value={
                <span className="text-fluid-xs font-medium">
                  {formatDateUS(order.scheduled_at)}
                  <span className="text-muted-foreground"> · {formatTimeUS(order.scheduled_at)}</span>
                </span>
              }
            />
            <BookingRow
              icon={<Clock className="size-3.5" />}
              label="Duration"
              value={
                <span className="text-fluid-xs">
                  {durationLabel(order.scheduled_at, order.scheduled_end)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatTimeRange(order.scheduled_at, order.scheduled_end)}
                  </span>
                </span>
              }
            />
            <BookingRow
              icon={<User className="size-3.5" />}
              label="Source"
              value={
                <span className="text-fluid-xs">
                  {formSourceLabel(order.form_source)}
                  {order.source_order_id && (
                    <span className="text-muted-foreground"> · {order.source_order_id}</span>
                  )}
                </span>
              }
            />
            <BookingRow
              icon={<Camera className="size-3.5" />}
              label="Shooter"
              value={
                <span className="flex items-center gap-1.5 text-fluid-xs">
                  <Avatar className="size-4">
                    <AvatarImage
                      src={`https://i.pravatar.cc/150?u=${order.assigned_shooter}`}
                      alt={order.shooter_name}
                    />
                    <AvatarFallback className="bg-muted text-[10px]">
                      {order.shooter_initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{order.shooter_name}</span>
                </span>
              }
            />
            {order.google_calendar_link && (
              <BookingRow
                icon={<ExternalLink className="size-3.5" />}
                label="Calendar"
                value={
                  <a
                    href={order.google_calendar_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fluid-xs text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard inline-flex items-center gap-1"
                  >
                    Open event
                    <ExternalLink className="size-3" />
                  </a>
                }
              />
            )}
          </dl>
        </section>

        {/* --- Property (v12: moved from left column, compacted) --- */}
        <section className="rounded-2xl border border-border bg-card p-3">
          <header className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Property
            </h3>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-fast ease-standard"
            >
              <ExternalLink className="size-2.5" />
              Maps
            </a>
          </header>
          <p className="text-[12px] font-semibold leading-tight">
            {order.property_address}
          </p>
          {order.property_sqft != null && (
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">
              {order.property_sqft.toLocaleString("en-US")} sqft
            </p>
          )}
          <div className="relative mt-2 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-muted">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_60%)]" />
            <MapPin className="size-4 text-muted-foreground" />
          </div>
        </section>

        {/* --- Customer notes (v11: swapped from left column) --- */}
        {order.customer_notes && order.customer_notes.trim().length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-2 text-fluid-xs font-medium uppercase tracking-wide text-muted-foreground">
              Customer notes
            </h3>
            <p className="text-fluid-xs leading-relaxed text-foreground/85 whitespace-pre-wrap">
              {order.customer_notes}
            </p>
          </section>
        )}
      </aside>

      {/* v13: canonical review surface — EditorDetailDialog now reads the
          clicked card's fields (no more hardcoded 45 Yorkshire Dr). We
          synthesize a card shape from the active deliverable so the dialog
          can render the same review/feedback UI from the order side. */}
      <EditorDetailDialog
        card={
          reviewDeliverableId
            ? (() => {
                const d = order.deliverables.find(
                  (x) => x.id === reviewDeliverableId,
                );
                if (!d) return null;
                return {
                  id: d.id,
                  title: order.property_address,
                  address: `${order.client_name} · ${deliverableDisplayName(d)}`,
                  type:
                    d.kind === "walkthrough" || d.kind === "video"
                      ? ("Walkthrough" as const)
                      : d.kind === "drone"
                        ? ("Drone" as const)
                        : ("Photo" as const),
                  status: { label: "In Review", tone: "amber" as const },
                  deadline: formatDateUS(order.scheduled_at),
                  assignees: [],
                  tone: "amber" as const,
                };
              })()
            : null
        }
        open={reviewOpen}
        onOpenChange={(v) => {
          setReviewOpen(v);
          if (!v) setReviewDeliverableId(undefined);
        }}
      />
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ItemGroup({ heading, items }: { heading: string; items: OverviewItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-fluid-xs font-medium uppercase tracking-wide text-muted-foreground">
        {heading}
      </h4>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent transition-colors duration-fast ease-standard"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <KindIcon kind={item.kind} className="size-4" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate text-fluid-sm">{item.title}</span>
              <Badge
                variant="secondary"
                className="shrink-0 rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
              >
                ×{item.quantity}
              </Badge>
              {item.is_addon && (
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0 text-[10px] font-medium text-amber-300"
                >
                  Add-on
                </Badge>
              )}
            </div>
            <span className="shrink-0 text-fluid-sm font-medium tabular-nums">
              {formatCurrency(item.price_cents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookingRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </dt>
      <dd className="min-w-0 max-w-[65%] text-right text-[11px] leading-tight">
        {value}
      </dd>
    </div>
  );
}

// ============================================================================
// v11: Production pipeline subcomponents
// ============================================================================

type StepState = "done" | "active" | "pending";

function PipelineStep({
  number,
  label,
  actor,
  actorName,
  state,
  last,
  summary,
  children,
}: {
  number: 1 | 2 | 3 | 4 | 5;
  label: string;
  actor: "Shooter" | "Manager" | "Editor";
  actorName?: string;
  state: StepState;
  last?: boolean;
  /** Compact one-line summary shown when the step is collapsed. */
  summary?: React.ReactNode;
  children?: React.ReactNode;
}) {
  // v12: each step is collapsible. Done steps default to collapsed so the
  // page reads as "you're here, the past is folded away"; the active step
  // is open by default. Users can toggle either via the chevron / header.
  const [open, setOpen] = React.useState(state !== "done");
  // If state flips from active → done (e.g. after assigning the last
  // deliverable) we auto-collapse to keep the focus on the next step.
  const lastStateRef = React.useRef(state);
  React.useEffect(() => {
    if (lastStateRef.current !== "done" && state === "done") setOpen(false);
    lastStateRef.current = state;
  }, [state]);

  const toggle = React.useCallback(() => setOpen((v) => !v), []);

  return (
    <li className="relative flex gap-3">
      {/* Left rail: numbered bubble + connector line */}
      <div className="flex shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          className={cn(
            "press relative z-10 grid size-7 place-items-center rounded-full text-[11px] font-semibold ring-2 ring-card transition-colors",
            state === "done"
              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              : state === "active"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground",
          )}
        >
          {state === "done" ? <CircleCheck className="size-4" /> : number}
        </button>
        {!last && (
          <span aria-hidden className="mt-0.5 w-px flex-1 bg-border" />
        )}
      </div>

      {/* Content */}
      <div className={cn("min-w-0 flex-1", !last && "pb-3")}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="press group/step -mx-1 flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent/30"
        >
          <h3
            className={cn(
              "text-sm font-semibold tracking-tight",
              state === "pending" && "text-muted-foreground",
            )}
          >
            {label}
          </h3>
          {/* v12: actor pill + name removed per user feedback. Step ownership
              isn't 1 person — many people can assign / edit. Show progress
              summary always so the row stays informative even when expanded. */}
          {summary && (
            <span className="ml-auto truncate text-[11px] text-muted-foreground">
              {summary}
            </span>
          )}
          <ChevronRight
            aria-hidden
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform duration-fast ease-standard",
              open && "rotate-90",
              summary ? "ml-1.5" : "ml-auto",
            )}
          />
        </button>
        {open && <div className="mt-1.5">{children}</div>}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// UploadStep (v12.3) — uses the unified ShootUploadDialog for both the
// "drop files" and "confirm batch" interactions. Replaces the previous
// inline per-deliverable rows + separate ShooterConfirmUploadDialog.
//
// State flow (mock):
//   1) Files absent → "Awaiting shooter upload" + "Open upload" / "Nudge"
//   2) Files present, not confirmed → "X raw · Y bytes" + "Open upload"
//      (clicking opens dialog; dialog's footer Confirm flips the pipeline)
//   3) Confirmed → "X raw · Y bytes · Confirmed" pill + "Open upload"
//      stays accessible so the user can re-open the dialog to drop more
//
// See HANDOFF §3.l for the dialog contract.
// ---------------------------------------------------------------------------
function UploadStep({
  order,
  uploadDone,
  filesPresent,
  canConfirm,
  uploadCounts,
  onUpload,
  onShooterConfirmed,
}: {
  order: Order;
  uploadDone: boolean;
  filesPresent: boolean;
  canConfirm: boolean;
  uploadCounts: Record<string, number>;
  onUpload: (deliverableId: string, fileCount: number) => void;
  onShooterConfirmed: () => void;
}) {
  const [uploadOpen, setUploadOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11.5px] text-foreground/85">
          <UploadIcon className="size-3 text-muted-foreground" />
          {filesPresent ? (
            <span className="tabular-nums">
              {order.raw_summary.count} raw file
              {order.raw_summary.count === 1 ? "" : "s"} ·{" "}
              {formatBytes(order.raw_summary.bytes)}
            </span>
          ) : (
            <span>
              Awaiting shooter upload · {formatDateUS(order.scheduled_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {uploadDone && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              <CircleCheck className="size-3" /> Confirmed
            </span>
          )}
          {canConfirm && (
            <Button
              size="sm"
              variant={uploadDone ? "outline" : "default"}
              onClick={() => setUploadOpen(true)}
              className="press h-7 gap-1.5 rounded-full text-[11px]"
            >
              <UploadIcon className="size-3" />
              {uploadDone ? "Open upload" : "Open upload"}
            </Button>
          )}
          {!filesPresent && canConfirm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast.info("Reminder sent to shooter", {
                  description: order.shooter_name,
                })
              }
              className="press h-7 gap-1.5 rounded-full text-[11px]"
            >
              <Send className="size-3" /> Nudge
            </Button>
          )}
        </div>
      </div>

      <Link
        href={`/uploads?orderId=${order.id}&from=order`}
        className="press inline-flex h-7 w-fit items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:bg-muted hover:text-foreground"
      >
        View all in Files
        <ChevronRight className="size-3" />
      </Link>

      <ShootUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        shoot={order}
        uploadCounts={uploadCounts}
        onUpload={onUpload}
        confirmed={uploadDone}
        onConfirmed={() => {
          onShooterConfirmed();
          toast.success("Upload confirmed", {
            description: "Project moves to Assign · editor will be notified.",
          });
        }}
      />
    </div>
  );
}

// Mock vendor list — would come from settings table in production.
const VENDORS = [
  { id: "tonomo", name: "Tonomo Edit" },
  { id: "hd-photo-hub", name: "HD Photo Hub" },
  { id: "fotello", name: "Fotello Studio" },
];

// Mock in-house editors — would come from members table with role=editor.
const IN_HOUSE_EDITORS = [
  { id: "sara", name: "Sara Chen", initials: "SC" },
  { id: "kyle", name: "Kyle Anderson", initials: "KA" },
  { id: "mj", name: "MJ Rivera", initials: "MR" },
];

// v12: assignees for the "Other" bucket — broader pool than editors. VA team
// + managers + shooters can pick these up since 3D Zillow / floor plans are
// simpler tasks. Would come from members table with role IN (va, manager,
// shooter) in production.
const OTHER_ASSIGNEES = [
  { id: "priya", name: "Priya Sun", initials: "PS", role: "VA" as const },
  { id: "noah", name: "Noah Lin", initials: "NL", role: "VA" as const },
  { id: "oliver", name: "Oliver Tuan", initials: "OT", role: "Manager" as const },
  { id: "dana", name: "Dana Park", initials: "DP", role: "Shooter" as const },
];

// v12: assignment groups — Photos, Video, Aerial, Floor plans, Staging.
// Mirrors the Delivery tab grouping so users see consistent buckets.
type AssignGroup = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  kinds: ReadonlyArray<DeliverableKind>;
  // Mock "last-batch" memory: previous editor name used for this kind. In
  // production this would query past orders. Keeps the demo demonstrable.
  lastBatch?: { name: string; initials: string };
};

// v12.1: 3 buckets — Photos, Video, Other. "Other" holds simpler tasks
// (3D Zillow, floor plans, virtual staging) that can be handled by VA /
// manager / shooter, not just editors.
type AssignGroupKey = "photos" | "video" | "other";

// v12.3: map each assign group → the DeliverableKind we instantiate for a
// manager-added extra item. Used by both the catalog picker (when the picked
// Service has no `deliverableKind`) and the Custom-reference tab.
const ASSIGN_GROUP_DEFAULT_KIND: Record<AssignGroupKey, DeliverableKind> = {
  photos: "photo",
  video: "video",
  other: "floor_plan",
};

// v12.3: bridge catalog ServiceCategory → AssignGroupKey so a catalog pick
// lands in the right Assign bucket even when the Service has no
// `deliverableKind` (e.g. add-ons / Website builds). Photos/Video map 1:1;
// Floor Plan and Website fall into the "Other" bucket since they're handled
// by the broader VA/Manager/Shooter pool.
function categoryToGroup(category: ServiceCategory): AssignGroupKey {
  switch (category) {
    case "Photos":
      return "photos";
    case "Video":
      return "video";
    case "Floor Plan":
    case "Website":
      return "other";
  }
}

/** v12.3: payload accepted by `handleAddExtra`. Two modes share the Deliverable
 *  shape but resolve display name / pipeline behavior differently — see
 *  HANDOFF §3.i. */
type AddExtraPayload =
  | { mode: "catalog"; service: Service }
  | { mode: "custom"; name: string; group: AssignGroupKey; note?: string };

const ASSIGN_GROUPS: ReadonlyArray<AssignGroup & { groupKey: AssignGroupKey }> = [
  {
    key: "photos",
    groupKey: "photos",
    label: "Photos",
    Icon: ImageIcon,
    kinds: ["photo", "twilight", "drone"],
    lastBatch: { name: "Sara Chen", initials: "SC" },
  },
  {
    key: "video",
    groupKey: "video",
    label: "Video",
    Icon: Video,
    kinds: ["video", "walkthrough"],
    lastBatch: { name: "Kyle Anderson", initials: "KA" },
  },
  {
    key: "other",
    groupKey: "other",
    label: "Other",
    Icon: Box,
    kinds: ["floor_plan", "3d_tour", "virtual_staging"],
    lastBatch: { name: "Priya Sun", initials: "PS" },
  },
];

function AssignStep({
  order,
  canManage,
  onAddExtra,
  onAssignmentChange,
}: {
  order: Order;
  canManage: boolean;
  /** v12.3: lets the manager append "extra items" to send the editor —
   *  catalog services NOT already in the order, OR custom reference
   *  material (script, brand assets…). The host (OrderOverview) owns the
   *  state so the extras propagate into the Upload step too — keeps
   *  Upload ↔ Assign content in lockstep. */
  onAddExtra: (item: AddExtraPayload) => void;
  /** v12.3: fired whenever a deliverable's assignment toggles on/off so
   *  the host page can advance the badge from "Uploaded" to "In production". */
  onAssignmentChange?: (deliverableId: string, hasAssignee: boolean) => void;
}) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [batchAssignOpen, setBatchAssignOpen] = React.useState(false);

  // Group deliverables by kind into the visible groups.
  const grouped = ASSIGN_GROUPS.map((g) => ({
    group: g,
    items: order.deliverables.filter((d) => g.kinds.includes(d.kind)),
  })).filter(({ items }) => items.length > 0);

  // v12.3: services already in the order — pass to the catalog picker so
  // it can grey out / mark them as "Already added". Matches by serviceId
  // first (catalog-backed extras) and falls back to kind (legacy seeds).
  const orderServiceIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const d of order.deliverables) {
      if (d.serviceId) ids.add(d.serviceId);
      else {
        const svc = kindToService(d.kind);
        if (svc) ids.add(svc.id);
      }
    }
    return ids;
  }, [order.deliverables]);

  return (
    <div className="flex flex-col gap-2">
      {/* v12.3: extras CTA pinned at the top so the manager can attach
          additional material (voiceover script, reference look, brand
          assets...) to send the editor. Lives ABOVE the groups so it's
          discoverable without scrolling. */}
      {canManage && (
        <div className="flex flex-col gap-2">
          {/* Batch-assign CTA — primary path now: one editor, multi-checked
              items, one click. Replaces 30+ per-row dropdowns for the
              common case. AssignJobDialog handles the rest. */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-foreground/15 bg-foreground/[0.04] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-foreground">
                Send to editor as a Job
              </p>
              <p className="text-[10.5px] text-muted-foreground">
                Batch the deliverables, pick one editor, attach the brief.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setBatchAssignOpen(true)}
              className="press h-7 shrink-0 gap-1 rounded-full px-3 text-[11px] font-semibold"
            >
              <UserPlus className="size-3" />
              Assign as Job
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] text-muted-foreground">
              Or attach a reference / extra catalog service — shows up in Upload too.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="press h-7 shrink-0 gap-1 rounded-full px-2.5 text-[11px]"
            >
              <UserPlus className="size-3" />
              Add item
            </Button>
          </div>
        </div>
      )}

      {order.deliverables.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[11.5px] text-muted-foreground">
          No deliverables to assign yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {grouped.map(({ group, items }) => (
            <AssignGroupBlock
              key={group.key}
              group={group}
              items={items}
              canManage={canManage}
              onAssignmentChange={onAssignmentChange}
            />
          ))}
        </div>
      )}

      <AddOrderItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        alreadyInOrder={orderServiceIds}
        onSubmit={(payload) => {
          onAddExtra(payload);
          setAddOpen(false);
        }}
      />

      <AssignJobDialog
        open={batchAssignOpen}
        onOpenChange={setBatchAssignOpen}
        initialOrder={{
          id: order.id,
          // Use just the street portion as title — full address fills the
          // address line below.
          title: order.property_address.split(",")[0].trim(),
          address: order.property_address,
          rawReady: true,
          candidates: order.deliverables.map((d) => ({
            key: d.id,
            title: d.title,
            // Order deliverable kinds use the same lowercase enum as Item kinds.
            kind: d.kind as never,
          })),
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddOrderItemDialog — v12.3
// ---------------------------------------------------------------------------
// Two tabs, single dialog:
//   1. "From catalog" — primary path. Manager picks a catalog Service NOT
//      already in the order. The picked Service supplies name, kind, price.
//      Submitted as { mode: "catalog", service }. requiresEditing=true.
//   2. "Custom reference" — fallback for material that isn't a catalog item
//      (voiceover script, brand guidelines, reference look). Free-text name
//      + group + optional note. Submitted as { mode: "custom", ... }.
//      requiresEditing=false → pipeline gates skip it so the manager can
//      attach reference mid-project without freezing Editing/Revision.
// Editor assignment happens AFTER submit via the normal AssignRow flow —
// per user spec: "chọn editor, sau đó cho tôi edit nữa" → create now,
// assign next. See HANDOFF §3.i and §3.k.
// ---------------------------------------------------------------------------
type AddItemTab = "catalog" | "custom";

function AddOrderItemDialog({
  open,
  onOpenChange,
  alreadyInOrder,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Service ids already present in the order. Catalog picker marks these
   *  as "Already added" and disables their click target. */
  alreadyInOrder: Set<string>;
  onSubmit: (payload: AddExtraPayload) => void;
}) {
  const [tab, setTab] = React.useState<AddItemTab>("catalog");
  // Catalog-tab state
  const [search, setSearch] = React.useState("");
  const [pickedServiceId, setPickedServiceId] = React.useState<string | null>(null);
  // Custom-tab state
  const [name, setName] = React.useState("");
  const [group, setGroup] = React.useState<AssignGroupKey>("other");
  const [note, setNote] = React.useState("");

  // Reset state when reopened so stale drafts don't survive across opens.
  React.useEffect(() => {
    if (open) {
      setTab("catalog");
      setSearch("");
      setPickedServiceId(null);
      setName("");
      setGroup("other");
      setNote("");
    }
  }, [open]);

  // Group catalog services by ServiceCategory, optionally filtered by search.
  const groupedServices = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? SERVICES.filter((s) => s.name.toLowerCase().includes(q))
      : SERVICES;
    const byCategory = new Map<ServiceCategory, Service[]>();
    for (const s of filtered) {
      const arr = byCategory.get(s.category) ?? [];
      arr.push(s);
      byCategory.set(s.category, arr);
    }
    const order: ServiceCategory[] = ["Photos", "Video", "Floor Plan", "Website"];
    return order
      .map((cat) => ({ category: cat, items: byCategory.get(cat) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [search]);

  const pickedService =
    pickedServiceId !== null
      ? SERVICES.find((s) => s.id === pickedServiceId)
      : undefined;

  const canSubmit =
    tab === "catalog"
      ? Boolean(pickedService) && !alreadyInOrder.has(pickedService!.id)
      : name.trim().length > 0;

  const handleSubmit = () => {
    if (tab === "catalog" && pickedService) {
      onSubmit({ mode: "catalog", service: pickedService });
    } else if (tab === "custom") {
      onSubmit({
        mode: "custom",
        name: name.trim(),
        group,
        note: note.trim() || undefined,
      });
    }
  };

  const groupOptions: {
    value: AssignGroupKey;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { value: "photos", label: "Photos", Icon: ImageIcon },
    { value: "video", label: "Video", Icon: Video },
    { value: "other", label: "Other", Icon: Box },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(95vw,620px)] max-w-none gap-0 p-0 sm:max-w-none"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-sm font-semibold">
              Add extra item
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[11.5px] text-muted-foreground">
              Pick another catalog service, or add custom reference material the
              editor will need.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="size-7 shrink-0 rounded-full"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 border-b border-border px-5 py-2">
          {(
            [
              { id: "catalog" as const, label: "From catalog", Icon: Box },
              { id: "custom" as const, label: "Custom reference", Icon: Megaphone },
            ] satisfies {
              id: AddItemTab;
              label: string;
              Icon: React.ComponentType<{ className?: string }>;
            }[]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "press inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <t.Icon className="size-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-5 py-4">
          {tab === "catalog" && (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services…"
                className="h-9 text-xs"
                autoFocus
              />
              {groupedServices.length === 0 ? (
                <p className="rounded-md bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  No catalog services match “{search}”.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {groupedServices.map(({ category, items }) => (
                    <section key={category} className="flex flex-col gap-1">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {category}
                      </h4>
                      <ul className="flex flex-col gap-1">
                        {items.map((svc) => {
                          const taken = alreadyInOrder.has(svc.id);
                          const picked = pickedServiceId === svc.id;
                          return (
                            <li key={svc.id}>
                              <button
                                type="button"
                                disabled={taken}
                                onClick={() => setPickedServiceId(svc.id)}
                                className={cn(
                                  "press flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                                  picked
                                    ? "border-foreground/40 bg-accent/60"
                                    : taken
                                      ? "border-border/60 bg-muted/20 opacity-50 cursor-not-allowed"
                                      : "border-border hover:bg-accent/30",
                                )}
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span
                                    className={cn(
                                      "grid size-7 shrink-0 place-items-center rounded-md",
                                      picked
                                        ? "bg-foreground/10 text-foreground"
                                        : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {svc.deliverableKind ? (
                                      <KindIcon
                                        kind={svc.deliverableKind}
                                        className="size-3.5"
                                      />
                                    ) : (
                                      <Sparkles className="size-3.5" />
                                    )}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate text-[12px] font-semibold text-foreground">
                                        {svc.name}
                                      </span>
                                      {svc.isAddOn && (
                                        <Badge
                                          variant="secondary"
                                          className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-amber-300"
                                        >
                                          Add-on
                                        </Badge>
                                      )}
                                      {taken && (
                                        <Badge
                                          variant="secondary"
                                          className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-emerald-300"
                                        >
                                          Already added
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                                      {formatCurrency(svc.priceCents)}
                                    </div>
                                  </div>
                                </div>
                                {picked && (
                                  <CircleCheck className="size-4 shrink-0 text-emerald-400" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "custom" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="extra-item-name"
                  className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Reference name
                </label>
                <Input
                  id="extra-item-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Voiceover script · Brand guidelines · Reference look"
                  className="h-9 text-xs"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Where it belongs
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {groupOptions.map((g) => {
                    const active = group === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGroup(g.value)}
                        className={cn(
                          "press flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11.5px] font-medium transition-colors",
                          active
                            ? "border-foreground/30 bg-accent/60 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <g.Icon className="size-3.5" />
                        {g.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/80">
                  Reference material — no editor needed, won't block the
                  pipeline.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="extra-item-note"
                  className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Note for editor (optional)
                </label>
                <Textarea
                  id="extra-item-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What is this? Where should the editor use it?"
                  rows={3}
                  className="text-xs"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <span className="text-[10.5px] text-muted-foreground">
            {tab === "catalog" && pickedService
              ? `Adds ${pickedService.name} to this order.`
              : tab === "custom"
                ? "Reference items don't need an editor."
                : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="press h-8 rounded-full px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="press h-8 gap-1.5 rounded-full px-3 text-xs"
            >
              <UserPlus className="size-3" />
              Add to order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// v12: assignments are arrays so a deliverable can have a primary editor
// + co-editors (user feedback: "assign cùng cái đơn đó cho người khác").
// Empty array = unassigned. First element is primary; the rest are co-eds.
type Assignee = { type: "in_house" | "vendor"; name: string };

function AssignGroupBlock({
  group,
  items,
  canManage,
  onAssignmentChange,
}: {
  group: AssignGroup;
  items: Deliverable[];
  canManage: boolean;
  /** v12.3: bubbles up to OrderOverview so the page header badge can
   *  advance from "Uploaded" → "In production" the moment every item is
   *  assigned. Fired for every per-deliverable transition (assigned <→>
   *  unassigned). */
  onAssignmentChange?: (deliverableId: string, hasAssignee: boolean) => void;
}) {
  const [assignments, setAssignments] = React.useState<
    Record<string, Assignee[]>
  >(() => {
    const initial: Record<string, Assignee[]> = {};
    for (const d of items) {
      initial[d.id] = d.assigned_editor_name
        ? [{ type: "in_house", name: d.assigned_editor_name }]
        : [];
    }
    return initial;
  });

  const assignedHere = items.filter(
    (d) => (assignments[d.id]?.length ?? 0) > 0,
  ).length;
  const allAssigned = assignedHere === items.length;

  // v12.3: seed parent with any pre-assigned items so the derived status
  // accounts for them on first render.
  React.useEffect(() => {
    if (!onAssignmentChange) return;
    for (const d of items) {
      if (d.assigned_editor_name) onAssignmentChange(d.id, true);
    }
    // intentionally only run on mount per group of items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBulk = React.useCallback(
    (type: "in_house" | "vendor", name: string) => {
      const next: typeof assignments = { ...assignments };
      for (const d of items) next[d.id] = [{ type, name }];
      setAssignments(next);
      if (onAssignmentChange) {
        for (const d of items) onAssignmentChange(d.id, true);
      }
      toast.success(`All ${group.label.toLowerCase()} → ${name}`, {
        description: `${items.length} deliverables assigned in one click`,
      });
    },
    [assignments, items, group.label, onAssignmentChange],
  );

  const handleClearAll = React.useCallback(() => {
    const next: typeof assignments = { ...assignments };
    for (const d of items) next[d.id] = [];
    setAssignments(next);
    if (onAssignmentChange) {
      for (const d of items) onAssignmentChange(d.id, false);
    }
    toast.info(`Cleared ${group.label.toLowerCase()} assignments`);
  }, [assignments, items, group.label, onAssignmentChange]);

  const handleRow = React.useCallback(
    (id: string, value: Assignee[]) => {
      setAssignments((prev) => ({ ...prev, [id]: value }));
      if (onAssignmentChange) onAssignmentChange(id, value.length > 0);
    },
    [onAssignmentChange],
  );

  return (
    <div className="rounded-lg border border-border bg-muted/15 px-2.5 py-2">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <group.Icon className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
            {group.label}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            · {assignedHere}/{items.length}
          </span>
          {allAssigned && (
            <CircleCheck
              aria-hidden
              className="size-3 text-emerald-400"
            />
          )}
        </div>
        {/* v12: once everyone in this bucket is assigned, lock the bulk
            controls. The brief has already been sent; to change editor the
            manager must create a new order from "+ New Project". */}
        {canManage && allAssigned && (
          <span
            className="inline-flex h-6 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-300"
            title="Locked — create a new order to re-assign"
          >
            <Lock className="size-2.5" /> Locked
          </span>
        )}
        {canManage && !allAssigned && (
          <div className="flex items-center gap-1">
            {/* Quick repeat: previous editor for this kind, one click. */}
            {group.lastBatch && (
              <button
                type="button"
                onClick={() =>
                  handleBulk("in_house", group.lastBatch!.name)
                }
                title={`Assign all to ${group.lastBatch.name} (same as last batch)`}
                className="press inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-fast ease-standard"
              >
                <Avatar className="size-3.5">
                  <AvatarFallback className="text-[7px]">
                    {group.lastBatch.initials}
                  </AvatarFallback>
                </Avatar>
                Repeat
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Assign all ${group.label.toLowerCase()}`}
                    className="press inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-fast ease-standard"
                  />
                }
              >
                Assign all
                <ArrowRight className="size-2.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="w-52 rounded-xl"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Users className="-mt-px mr-1 inline size-3" /> In-house
                  </DropdownMenuLabel>
                  {IN_HOUSE_EDITORS.map((e) => (
                    <DropdownMenuItem
                      key={e.id}
                      onClick={() => handleBulk("in_house", e.name)}
                    >
                      <Avatar className="size-4">
                        <AvatarFallback className="text-[8px]">
                          {e.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{e.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Truck className="-mt-px mr-1 inline size-3" /> Vendor
                  </DropdownMenuLabel>
                  {VENDORS.map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => handleBulk("vendor", v.name)}
                    >
                      <Truck className="size-3.5 text-amber-400" />
                      <span className="flex-1">{v.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                {assignedHere > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleClearAll}
                    >
                      Clear group
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>
      <ul className="mt-1 flex flex-col">
        {items.map((d) => (
          <AssignRow
            key={d.id}
            deliverable={d}
            canManage={canManage}
            pool={group.key === "other" ? "other" : "editor"}
            value={assignments[d.id]}
            onChange={(v) => handleRow(d.id, v)}
          />
        ))}
      </ul>
    </div>
  );
}

function AssignRow({
  deliverable,
  canManage,
  pool = "editor",
  value,
  onChange,
}: {
  deliverable: Deliverable;
  canManage: boolean;
  pool?: "editor" | "other";
  value: Assignee[];
  onChange: (v: Assignee[]) => void;
}) {
  const hasAny = value.length > 0;
  // v13: mirror the AssignSubmission into the editor state context so that
  // the Editor Detail dialog can render the brief verbatim. Both deliverable
  // id and kanban card id are surfaced as a "deliverable id" key here for
  // the prototype — see editor-state.tsx for the full contract.
  const editor = useEditorState();

  // v12.1: confirm-modal flow — picking from the dropdown stages a pending
  // assignee, opens AssignConfirmDialog; submit there actually commits the
  // assignment + stores the submission payload for read-back.
  const [pending, setPending] = React.useState<Assignee | null>(null);
  const [submission, setSubmission] = React.useState<AssignSubmission | null>(
    null,
  );

  const assign = (next: Assignee) => onChange([next]); // replaces primary
  const addCoEditor = (next: Assignee) => onChange([...value, next]);
  const removeAt = (idx: number) =>
    onChange(value.filter((_, i) => i !== idx));

  return (
    <li className="-mx-1 flex items-center gap-2 rounded-md px-1 py-1 transition-colors duration-fast ease-standard hover:bg-accent/40">
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          hasAny ? "bg-emerald-400" : "bg-muted-foreground/40",
        )}
      />
      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">
        {deliverableDisplayName(deliverable)}
      </span>

      {hasAny ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {value.map((a, i) =>
            a.type === "in_house" ? (
              <span
                key={i}
                className="group/chip inline-flex items-center gap-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]"
              >
                <Avatar className="size-3.5">
                  <AvatarFallback className="text-[7px]">
                    {a.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-foreground/85">{a.name}</span>
                {canManage && i > 0 && (
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label={`Remove ${a.name}`}
                    className="press -mr-0.5 grid size-3 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <XCircle className="size-2.5" />
                  </button>
                )}
              </span>
            ) : (
              <span
                key={i}
                className="group/chip inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
              >
                <Truck className="size-2.5" />
                {a.name}
                {canManage && i > 0 && (
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label={`Remove ${a.name}`}
                    className="press -mr-0.5 grid size-3 place-items-center rounded-full hover:text-amber-100"
                  >
                    <XCircle className="size-2.5" />
                  </button>
                )}
              </span>
            ),
          )}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground/70">Unassigned</span>
      )}

      {/* v12: when assigned, show lock (primary is locked) + "+" to add a
          co-editor / backup. To change primary → create a new order. */}
      {hasAny && (
        <>
          <Lock
            aria-hidden
            className="size-3 shrink-0 text-muted-foreground/50"
          />
          {canManage && (
            <AssignDropdown
              triggerLabel={`Add co-editor to ${deliverableDisplayName(deliverable)}`}
              triggerIcon={<UserPlus className="size-3" />}
              onPickInHouse={(e) => {
                addCoEditor({ type: "in_house", name: e.name });
                toast.success(`Added co-editor ${e.name}`, {
                  description: deliverableDisplayName(deliverable),
                });
              }}
              onPickVendor={(v) => {
                addCoEditor({ type: "vendor", name: v.name });
                toast.success(`Added vendor ${v.name}`, {
                  description: deliverableDisplayName(deliverable),
                });
              }}
            />
          )}
        </>
      )}
      {canManage && !hasAny && (
        <AssignDropdown
          triggerLabel={`Assign ${deliverableDisplayName(deliverable)}`}
          triggerIcon={<ArrowRight className="size-3" />}
          pool={pool}
          onPickInHouse={(e) =>
            setPending({ type: "in_house", name: e.name })
          }
          onPickVendor={(v) =>
            setPending({ type: "vendor", name: v.name })
          }
        />
      )}
      {/* v12.1: confirm dialog — only renders when user has picked someone
          from the dropdown but hasn't submitted the brief yet. */}
      <AssignConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => {
          if (!o) setPending(null);
        }}
        serviceName={deliverableDisplayName(deliverable)}
        kind={deliverable.kind}
        assignee={pending ?? { type: "in_house", name: "" }}
        onConfirm={(s) => {
          assign(s.assignee);
          setSubmission(s);
          setPending(null);
          // v13: write the brief into the editor state context. Same key on
          // both sides (deliverable.id). The context's getBrief() falls back
          // to mock copy when nothing has been submitted, so Editor Queue
          // cards that were NOT routed through this flow still render.
          editor.setBrief(deliverable.id, {
            ...s,
            kind: deliverable.kind,
          } satisfies SharedAssignSubmission);
          toast.success(`Sent to ${s.assignee.name}`, {
            description: deliverableDisplayName(deliverable),
          });
        }}
      />
    </li>
  );
}

// v12: small reusable dropdown — same in-house / vendor picker, used for both
// primary assignment and adding co-editors.
function AssignDropdown({
  triggerLabel,
  triggerIcon,
  pool = "editor",
  onPickInHouse,
  onPickVendor,
}: {
  triggerLabel: string;
  triggerIcon: React.ReactNode;
  /** "editor" = Photos/Video (in-house editors + vendors).
   *  "other"  = Other bucket (broader pool: VA + Manager + Shooter). */
  pool?: "editor" | "other";
  onPickInHouse: (e: { id: string; name: string; initials: string }) => void;
  onPickVendor: (v: { id: string; name: string }) => void;
}) {
  const inHouseList = pool === "other" ? OTHER_ASSIGNEES : IN_HOUSE_EDITORS;
  const inHouseLabel = pool === "other" ? "Team" : "In-house";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={triggerLabel}
            title={triggerLabel}
            className="press grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          />
        }
      >
        {triggerIcon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-52 rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            <Users className="-mt-px mr-1 inline size-3" /> {inHouseLabel}
          </DropdownMenuLabel>
          {inHouseList.map((e) => (
            <DropdownMenuItem key={e.id} onClick={() => onPickInHouse(e)}>
              <Avatar className="size-4">
                <AvatarFallback className="text-[8px]">
                  {e.initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1">{e.name}</span>
              {"role" in e && (
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  {(e as any).role}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            <Truck className="-mt-px mr-1 inline size-3" /> Vendor
          </DropdownMenuLabel>
          {VENDORS.map((v) => (
            <DropdownMenuItem key={v.id} onClick={() => onPickVendor(v)}>
              <Truck className="size-3.5 text-amber-400" />
              <span className="flex-1">{v.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// v12.3: redesigned EditingStep. Two distinct cards (Photos, Video) side by
// side on desktop, stacked on mobile. Each card lists its deliverables with
// per-row name + assignee + status chip + Open. Reference items
// (`requiresEditing: false`) are excluded — they have nothing to review.
// Empty buckets render a placeholder so the photo/video split stays visible.
function EditingStep({
  order,
  onOpenReview,
}: {
  order: Order;
  onOpenReview: (deliverableId: string) => void;
}) {
  const { photos, videos } = React.useMemo(() => {
    const photoKinds = new Set<string>(["photo", "twilight", "drone", "floor_plan", "3d_tour"]);
    const videoKinds = new Set<string>(["video", "walkthrough", "virtual_staging"]);
    const editable = order.deliverables.filter(
      (d) => d.requiresEditing !== false,
    );
    return {
      photos: editable.filter((d) => photoKinds.has(d.kind)),
      videos: editable.filter((d) => videoKinds.has(d.kind)),
    };
  }, [order.deliverables]);

  if (photos.length === 0 && videos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[11.5px] text-muted-foreground">
        No deliverables yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <EditingBucketCard
        label="Photos"
        Icon={ImageIcon}
        accent="sky"
        items={photos}
        onOpenReview={onOpenReview}
      />
      <EditingBucketCard
        label="Video"
        Icon={Video}
        accent="violet"
        items={videos}
        onOpenReview={onOpenReview}
      />
    </div>
  );
}

// v12.3: per-bucket card. Header has icon + label + worst-state chip + "Open"
// jump to the row that needs attention first. Body lists each deliverable
// with its assignee and status chip. Empty bucket renders a placeholder
// instead of collapsing — the photo/video split stays visible.
function EditingBucketCard({
  label,
  Icon,
  accent,
  items,
  onOpenReview,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: "sky" | "violet";
  items: Deliverable[];
  onOpenReview: (deliverableId: string) => void;
}) {
  const headerTone =
    accent === "sky"
      ? "bg-sky-500/10 text-sky-300"
      : "bg-violet-500/10 text-violet-300";
  const focus =
    items.find((d) => d.status === "review") ??
    items.find((d) => d.status === "in_progress") ??
    items[0];
  const state = bucketState(items);
  return (
    <section className="flex flex-col gap-1.5 rounded-xl border border-border bg-background/40 p-2.5">
      <header className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-md",
            headerTone,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold uppercase tracking-wide text-foreground/90">
          {label}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {items.length > 0 ? `${items.length} item${items.length === 1 ? "" : "s"}` : ""}
        </span>
        {items.length > 0 && (
          <StatChip tone={state.tone} label={state.label} />
        )}
        {focus && (
          <button
            type="button"
            onClick={() => onOpenReview(focus.id)}
            aria-label={`Open ${label} review`}
            title={`Open ${label}`}
            className="press grid size-6 shrink-0 place-items-center rounded-md bg-foreground text-background transition-colors duration-fast ease-standard hover:bg-foreground/90"
          >
            <ExternalLink className="size-3" />
          </button>
        )}
      </header>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/10 px-2 py-1.5 text-[10.5px] text-muted-foreground">
          No {label.toLowerCase()} items in this order.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((d) => (
            <EditingDeliverableRow
              key={d.id}
              deliverable={d}
              onOpen={() => onOpenReview(d.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// v12.3: row inside an EditingBucketCard. Compact — icon + label + assignee
// + status chip + open button.
// v13: overlays the editor sub-state from the EditorState context — when the
// editor kanban moves this deliverable through Pending → Working On → Review
// → Deliver, this row reflects the change (waiting / in editing / in review
// / approved). Falls back to the seed `deliverable.status` when nothing has
// been pushed from the editor side.
function EditingDeliverableRow({
  deliverable,
  onOpen,
}: {
  deliverable: Deliverable;
  onOpen: () => void;
}) {
  const editor = useEditorState();
  const overrideStage = editor.getStage({ id: deliverable.id });
  // Only treat the override as authoritative when the kanban actually moved
  // this id (i.e. it's not the default seed). If the deliverable.id was
  // never written to the override map, getStage returns "pending" — we
  // detect that by checking the brief OR a non-default version count.
  const hasOverride =
    editor.getVersion(deliverable.id) > 0 ||
    editor.getBrief(deliverable.id) !== undefined;
  const assignee = deliverable.assigned_editor_name;
  const status: DeliverableStatus = hasOverride
    ? stageToDeliverableStatus(overrideStage)
    : deliverable.status;
  const tone =
    status === "not_started"
      ? "bg-muted text-muted-foreground"
      : status === "in_progress"
        ? "bg-amber-500/15 text-amber-300"
        : status === "review"
          ? "bg-violet-500/15 text-violet-300"
          : "bg-emerald-500/15 text-emerald-300";
  const statusText = deliverableStatusLabel(status).toLowerCase();
  return (
    <li className="flex items-center gap-2 rounded-md bg-card/60 px-2 py-1.5">
      <KindIcon
        kind={deliverable.kind}
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[11.5px] font-medium text-foreground">
          {deliverableDisplayName(deliverable)}
        </span>
        <span className="truncate text-[10px] text-muted-foreground">
          {assignee ? (
            <>
              <span className="text-foreground/70">{assignee}</span>
            </>
          ) : (
            "Unassigned"
          )}
        </span>
      </div>
      <StatChip tone={tone} label={statusText} />
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${deliverableDisplayName(deliverable)}`}
        className="press grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ExternalLink className="size-3" />
      </button>
    </li>
  );
}

// Per-bucket status summary used by EditingStep. Picks the worst state in
// the bucket so the user sees what still needs work. v12.3: aligned to the
// real `DeliverableStatus` union (the prior version checked "editing" and
// "in_revision" which aren't in the type — dead branches).
// v13: map editor sub-state (Pending → Working On → Review → Deliver) onto
// the order-side DeliverableStatus union. Used by EditingDeliverableRow when
// the editor kanban has moved a deliverable through the workflow loop.
function stageToDeliverableStatus(
  stage: "pending" | "working" | "revision" | "deliver",
): DeliverableStatus {
  switch (stage) {
    case "pending":
      return "not_started";
    case "working":
      return "in_progress";
    case "revision":
      return "review";
    case "deliver":
      return "approved";
  }
}

function bucketState(items: Deliverable[]): { tone: string; label: string } {
  if (items.length === 0) return { tone: "bg-muted text-muted-foreground", label: "—" };
  const has = (status: DeliverableStatus) => items.some((d) => d.status === status);
  if (has("not_started"))
    return { tone: "bg-muted text-muted-foreground", label: "waiting" };
  if (has("in_progress"))
    return { tone: "bg-amber-500/15 text-amber-300", label: "in editing" };
  if (has("review"))
    return { tone: "bg-violet-500/15 text-violet-300", label: "in review" };
  if (has("approved") && !items.every((d) => d.status === "delivered"))
    return { tone: "bg-emerald-500/15 text-emerald-300", label: "approved" };
  return { tone: "bg-emerald-500/15 text-emerald-300", label: "done" };
}

// Step 4 — Revision back-and-forth between client and editor.
// v13: surfaces the live feedback-row count from the EditorState context per
// deliverable so the manager sees "3 notes pending" while the editor's
// working on revisions.
function RevisionStep({
  order,
  onOpenReview,
}: {
  order: Order;
  onOpenReview: (deliverableId: string) => void;
}) {
  // v12.3: skip reference items — they don't go through revision.
  const editor = useEditorState();
  const editable = order.deliverables.filter(
    (d) => d.requiresEditing !== false,
  );
  const pending = editable.filter((d) => d.status === "review");
  // v13: total in-flight feedback notes across this order's deliverables.
  const totalFeedback = editable.reduce(
    (acc, d) => acc + editor.getFeedback(d.id).length,
    0,
  );
  const focus = pending[0] ?? editable.find((d) => d.status === "review");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {pending.length > 0 ? (
          <StatChip
            tone="bg-amber-500/15 text-amber-300"
            label={`${pending.length} awaiting revision`}
          />
        ) : (
          <StatChip
            tone="bg-emerald-500/15 text-emerald-300"
            label="All revisions resolved"
          />
        )}
        {totalFeedback > 0 && (
          <StatChip
            tone="bg-violet-500/15 text-violet-300"
            label={`${totalFeedback} feedback note${totalFeedback === 1 ? "" : "s"}`}
          />
        )}
      </div>
      {focus && (
        <button
          type="button"
          onClick={() => onOpenReview(focus.id)}
          className="press inline-flex h-7 w-fit items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:bg-muted hover:text-foreground"
        >
          Open feedback · {focus.title}
          <ArrowRight className="size-3" />
        </button>
      )}
    </div>
  );
}

// Step 5 — Approve & deliver to client (creates share link, sends email).
// v12: polished done + active states. Done = celebrated card with delivered
// date + share link. Active = primary CTA matching the Editing step's
// "Open" tile style.
function ApproveStep({
  order,
  approveDone,
  canManage,
}: {
  order: Order;
  approveDone: boolean;
  canManage: boolean;
}) {
  const shareToken = React.useMemo(
    () => `${order.id.slice(0, 4)}-${order.display_number.toString(16)}`,
    [order.id, order.display_number],
  );

  if (approveDone) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
          <CircleCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-foreground">
            Delivered to {order.client_name}
          </p>
          <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
            <Send aria-hidden className="-mt-0.5 mr-1 inline size-2.5" />
            {formatDateUS(order.delivered_at ?? order.scheduled_at)}
            <span aria-hidden className="mx-1.5 text-muted-foreground/40">·</span>
            review.odone.com/s/{shareToken}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1.5">
          <Send className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-foreground">
            Ready to send to {order.client_name}
          </span>
          <StatChip
            tone="bg-emerald-500/15 text-emerald-300"
            label="ready"
          />
        </div>
        <p className="px-1 text-[10.5px] text-muted-foreground">
          Creates a share link · sends email · marks order delivered
        </p>
      </div>
      {canManage && (
        <button
          type="button"
          onClick={() =>
            toast.success(`Sent final assets to ${order.client_name}`, {
              description: order.client_email,
            })
          }
          aria-label="Send to client"
          className="press lift grid size-[60px] shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white transition-colors duration-fast ease-standard hover:bg-emerald-600"
        >
          <span className="flex flex-col items-center gap-0.5">
            <Send className="size-4" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">
              Send
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function StatChip({ tone, label }: { tone: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {label}
    </span>
  );
}

// Editor-role view — they don't manage the pipeline; just link to their queue.
function EditorBanner({
  orderId,
  order,
}: {
  orderId: string;
  order: Order;
}) {
  const ready = order.deliverables.filter(
    (d) => d.assigned_editor_id !== null,
  ).length;
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
          <Eye className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-fluid-base font-semibold">Editor view</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            You pick up briefs and upload edits in Editor Queue.{" "}
            {ready > 0
              ? `${ready} item${ready === 1 ? "" : "s"} ready for you on this order.`
              : "No assignments yet."}
          </p>
        </div>
      </div>
      <Link
        href={`/?orderId=${orderId}&from=order`}
        className="press mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background hover:bg-foreground/90"
      >
        Open Editor Queue
        <ArrowRight className="size-3.5" />
      </Link>
    </section>
  );
}

// ============================================================================
// AssignConfirmDialog — kind-aware submit form before assignment goes through
// ----------------------------------------------------------------------------
// The parent (AssignRow / AssignGroupBlock) picks the editor first, then opens
// this dialog so the manager can attach a brief before the toast fires.
//
// Two flavors:
//   • photos / floor_plan / 3d_tour / twilight / drone / virtual_staging
//     (and any other non-video kind) — single note textarea + 3 preset chips
//   • video / walkthrough — richer brief mirroring NewProjectDialog's
//     BriefStep (art direction + presets, length pill, script, music ref)
//
// Visual language deliberately matches BriefStep so the user sees one
// consistent design across the New Project wizard and per-deliverable assigns.
// ============================================================================

export type AssignSubmission = {
  assignee: Assignee;
  note: string;
  // video-only fields — undefined for the simpler Photos / Other flavor
  brief?: string;
  length?: string;
  script?: string;
  musicReference?: string;
  // v12.2: schedule fields — captured in the wizard Step 3
  deadline?: string;
  priority?: "low" | "normal" | "high" | "rush";
  revisions?: number;
  /** Editor confirms client approved music license — videos only */
  musicLicenseConfirmed?: boolean;
  /** Editor commits to delivering captions in-platform — videos only */
  captionsRequested?: boolean;
};

// v12.2: editor pool for the wizard Step 1. Includes a mocked current-load
// snapshot so the manager can see who's busy. In production this would be
// derived from the editors' active assignments.
const EDITOR_POOL_WITH_LOAD: Array<{
  type: "in_house" | "vendor";
  name: string;
  initials: string;
  load: number;
  specialty: ReadonlyArray<DeliverableKind>;
  rate?: string;
}> = [
  {
    type: "in_house",
    name: "Sara Chen",
    initials: "SC",
    load: 3,
    specialty: ["photo", "twilight", "virtual_staging"],
  },
  {
    type: "in_house",
    name: "Kyle Anderson",
    initials: "KA",
    load: 5,
    specialty: ["video", "walkthrough", "drone"],
  },
  {
    type: "in_house",
    name: "MJ Rivera",
    initials: "MR",
    load: 2,
    specialty: ["photo", "floor_plan"],
  },
  {
    type: "vendor",
    name: "Tonomo Edit",
    initials: "TE",
    load: 0,
    specialty: ["video", "walkthrough"],
    rate: "$120 / video",
  },
  {
    type: "vendor",
    name: "HD Photo Hub",
    initials: "HD",
    load: 0,
    specialty: ["photo", "twilight"],
    rate: "$3 / image",
  },
  {
    type: "vendor",
    name: "Fotello Studio",
    initials: "FS",
    load: 0,
    specialty: ["3d_tour", "floor_plan"],
    rate: "$80 / unit",
  },
];

type AssignWizardStep = 1 | 2 | 3 | 4;
const WIZARD_STEPS: { id: AssignWizardStep; label: string }[] = [
  { id: 1, label: "Editor" },
  { id: 2, label: "Brief" },
  { id: 3, label: "Schedule" },
  { id: 4, label: "Review" },
];

const PRIORITY_OPTIONS: {
  value: NonNullable<AssignSubmission["priority"]>;
  label: string;
  tone: string;
}[] = [
  { value: "low", label: "Low", tone: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20" },
  { value: "normal", label: "Normal", tone: "bg-muted text-muted-foreground ring-1 ring-border" },
  { value: "high", label: "High", tone: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20" },
  { value: "rush", label: "Rush", tone: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20" },
];

// Preset chips for the simple Photos/Other note field — short, action-y.
const ASSIGN_NOTE_PRESETS = [
  "Match style from last batch",
  "Auto-tune to brand colors",
  "Tight crop on hero",
] as const;

// Preset chips for the Video art-direction textarea — mirrors BRIEF_PRESETS
// from new-project-dialog.tsx so editors see the same vocabulary.
const ASSIGN_BRIEF_PRESETS = [
  "Trendy music (not cinematic)",
  "Auto captions OK — no manual",
  "Highlight kitchen + exterior",
  "Soft, calm vibe",
  "Drone reveal at the end",
] as const;

const ASSIGN_LENGTH_PRESETS = ["30s", "60s", "90s", "120s"] as const;

// Video kinds get the richer form. Everything else gets the simple flavor.
function isVideoKind(kind: DeliverableKind): boolean {
  return kind === "video" || kind === "walkthrough";
}

// v12.2: vendor tokenized access link. Real impl mints a JWT on the server
// scoped to (vendor_id, project_id, deliverable_kind). For the prototype we
// derive a stable mock so the same vendor+service shows the same URL across
// re-renders (without consuming any randomness — Math.random() / Date.now()
// throw in the harness's workflow runner).
function vendorAccessLink(vendorName: string, serviceName: string): string {
  const slug = `${vendorName}-${serviceName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const token = Array.from(slug)
    .reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381)
    .toString(36);
  return `https://odone.app/queue/${slug}-${token}`;
}

// Build the plain-text payload the manager copies to email/DM the vendor.
function buildVendorClipboard(params: {
  link: string;
  email: string;
  assigneeName: string;
  serviceName: string;
  deadline?: string;
  priority?: NonNullable<AssignSubmission["priority"]>;
  isVideo: boolean;
  brief?: string;
  length?: string;
  script?: string;
  musicReference?: string;
  note?: string;
}): string {
  const lines: string[] = [];
  lines.push(`Hi ${params.assigneeName.split(" ")[0]},`);
  lines.push("");
  lines.push(
    `New ${params.serviceName} job for you. Files + brief are inside Odone:`,
  );
  lines.push(params.link);
  lines.push("");
  lines.push("Quick summary:");
  if (params.deadline) lines.push(`• Deadline: ${params.deadline}`);
  if (params.priority) lines.push(`• Priority: ${params.priority}`);
  if (params.isVideo) {
    if (params.length) lines.push(`• Length: ≤ ${params.length}`);
    if (params.brief) lines.push(`• Brief: ${params.brief}`);
    if (params.script) lines.push(`• Script: ${params.script}`);
    if (params.musicReference)
      lines.push(`• Music reference: ${params.musicReference}`);
  }
  if (params.note) lines.push(`• Notes: ${params.note}`);
  lines.push("");
  lines.push("Reply here if anything's unclear before you start. Thanks!");
  if (params.email) {
    lines.push("");
    lines.push(`(Sending to ${params.email})`);
  }
  return lines.join("\n");
}

function AssignConfirmDialog({
  open,
  onOpenChange,
  serviceName,
  kind,
  assignee,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  kind: DeliverableKind;
  assignee: Assignee;
  onConfirm: (s: AssignSubmission) => void;
}) {
  const isVideo = isVideoKind(kind);

  // v12.2: this dialog is now a 4-step wizard mirroring NewProjectDialog
  // density: Editor → Brief → Schedule → Review. The parent still picks an
  // initial editor (Step 1 is pre-filled), but the manager can change it
  // before continuing.
  const [step, setStep] = React.useState<AssignWizardStep>(1);
  const [currentAssignee, setCurrentAssignee] = React.useState<Assignee>(assignee);

  // Brief form state
  const [note, setNote] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [length, setLength] = React.useState<string>("");
  const [script, setScript] = React.useState("");
  const [musicReference, setMusicReference] = React.useState("");

  // Schedule form state
  const defaultDeadline = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }, []);
  const [deadline, setDeadline] = React.useState<string>(defaultDeadline);
  const [priority, setPriority] = React.useState<
    NonNullable<AssignSubmission["priority"]>
  >("normal");
  // v12.2: vendor email captured at Review when assignee is a vendor.
  // Manager still copies the brief manually; this just helps pre-fill the
  // email field when they paste.
  const [vendorEmail, setVendorEmail] = React.useState<string>("");
  const [copied, setCopied] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setCurrentAssignee(assignee);
      setNote("");
      setBrief("");
      setLength("");
      setScript("");
      setMusicReference("");
      setDeadline(defaultDeadline);
      setPriority("normal");
      setVendorEmail("");
      setCopied(false);
    }
  }, [open, assignee, defaultDeadline]);

  const toggleNotePreset = (text: string) => {
    setNote((prev) => togglePresetIn(prev, text));
  };
  const toggleBriefPreset = (text: string) => {
    setBrief((prev) => togglePresetIn(prev, text));
  };

  const handleSubmit = () => {
    const payload: AssignSubmission = {
      assignee: currentAssignee,
      note,
      deadline,
      priority,
      ...(isVideo
        ? {
            brief,
            length: length || undefined,
            script,
            musicReference,
          }
        : {}),
    };
    onConfirm(payload);
    onOpenChange(false);
  };

  const assigneeInitials = currentAssignee.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  // Step-1 helper: rank editors by specialty match for this kind.
  const rankedEditors = React.useMemo(() => {
    return [...EDITOR_POOL_WITH_LOAD].sort((a, b) => {
      const aMatch = a.specialty.includes(kind) ? 1 : 0;
      const bMatch = b.specialty.includes(kind) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return a.load - b.load;
    });
  }, [kind]);

  const canGoNext = step === 1 ? Boolean(currentAssignee.name) : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(95vw,640px)] max-w-none gap-0 p-0 rounded-2xl sm:max-w-none"
      >
        {/* Header — title + step pill + close. Subtitle hosts the live
            assignee chip + the deliverable pill so context follows the
            wizard through every step. */}
        <header className="flex items-start gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[12.5px] font-semibold leading-tight text-foreground">
              Assign editor — Step {step} of {WIZARD_STEPS.length}
            </DialogTitle>
            <DialogDescription className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
              {currentAssignee.type === "in_house" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] text-foreground/85">
                  <Avatar className="size-3.5">
                    <AvatarFallback className="text-[7px]">
                      {assigneeInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{currentAssignee.name}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-300">
                  <Truck className="size-2.5" />
                  {currentAssignee.name}
                </span>
              )}
              <span aria-hidden>·</span>
              <span className="inline-flex items-center rounded-full border border-border bg-card px-1.5 py-0.5 text-[10.5px] font-medium text-foreground">
                {serviceName}
              </span>
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="press -mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </header>

        {/* Stepper rail — clickable to jump backwards but not forward
            so the manager doesn't skip required questions. */}
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
          {WIZARD_STEPS.map((s, idx) => {
            const completed = step > s.id;
            const active = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.id < step) setStep(s.id);
                  }}
                  className={cn(
                    "press inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[10.5px] font-semibold transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : completed
                        ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                        : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full text-[9px]",
                      active
                        ? "bg-background/20"
                        : completed
                          ? "bg-emerald-500/30"
                          : "bg-muted",
                    )}
                  >
                    {completed ? <CircleCheck className="size-3" /> : s.id}
                  </span>
                  {s.label}
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="h-px w-3 shrink-0 bg-border"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body — swaps per step */}
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-4 py-4">
          {step === 1 && (
            <>
              <DialogSection icon={Users} title="Choose editor">
                <ul className="flex flex-col gap-1.5">
                  {rankedEditors.map((e) => {
                    const isPicked =
                      currentAssignee.name === e.name &&
                      currentAssignee.type === e.type;
                    const matched = e.specialty.includes(kind);
                    return (
                      <li key={`${e.type}-${e.name}`}>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentAssignee({ type: e.type, name: e.name })
                          }
                          className={cn(
                            "press flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                            isPicked
                              ? "border-foreground/40 bg-accent/50"
                              : "border-border hover:bg-accent/30",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Avatar size="sm">
                              <AvatarFallback>{e.initials}</AvatarFallback>
                            </Avatar>
                            <span className="flex min-w-0 flex-col items-start text-left">
                              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                                {e.name}
                                {e.type === "vendor" && (
                                  <Truck className="size-3 text-amber-300" />
                                )}
                              </span>
                              <span className="text-[10.5px] text-muted-foreground">
                                {matched ? "Specialty match · " : "Generalist · "}
                                {e.load > 0
                                  ? `${e.load} active`
                                  : "Available now"}
                                {e.rate ? ` · ${e.rate}` : ""}
                              </span>
                            </span>
                          </span>
                          {isPicked && (
                            <CircleCheck className="size-4 shrink-0 text-emerald-400" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </DialogSection>
            </>
          )}
          {step === 2 && (isVideo ? (
            <>
              <DialogSection icon={Megaphone} title="Art direction">
                <Textarea
                  autoFocus
                  placeholder="What should the editor know first? Music style · highlights · vibe…"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  className="min-h-[100px] text-[12.5px]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ASSIGN_BRIEF_PRESETS.map((preset) => {
                    const active = brief.includes(preset);
                    return (
                      <PresetChip
                        key={preset}
                        active={active}
                        onClick={() => toggleBriefPreset(preset)}
                        label={preset}
                      />
                    );
                  })}
                </div>
              </DialogSection>

              <DialogSection icon={Clock} title="Length target">
                <div className="flex flex-wrap gap-1.5">
                  {ASSIGN_LENGTH_PRESETS.map((preset) => {
                    const active = length === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLength(active ? "" : preset)}
                        className={cn(
                          "press inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold tabular-nums transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-foreground hover:border-foreground/40",
                        )}
                      >
                        ≤ {preset}
                      </button>
                    );
                  })}
                </div>
              </DialogSection>

              <DialogSection icon={MessageSquare} title="Script">
                <Textarea
                  placeholder="Voiceover lines, scene breakdown, or captions…"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="min-h-[90px] text-[12.5px]"
                />
              </DialogSection>

              <DialogSection icon={Music} title="Music reference">
                <Input
                  placeholder="YouTube / Spotify / SoundCloud link"
                  value={musicReference}
                  onChange={(e) => setMusicReference(e.target.value)}
                  className="h-9 text-[12.5px]"
                />
              </DialogSection>

              <DialogSection icon={MessageSquare} title="Note for editor (optional)">
                <Textarea
                  placeholder="Anything else the editor should see first…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[60px] text-[12.5px]"
                />
              </DialogSection>
            </>
          ) : (
            <DialogSection icon={MessageSquare} title="Note for editor (optional)">
              <Textarea
                autoFocus
                placeholder="Anything the editor should know about this batch?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[100px] text-[12.5px]"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ASSIGN_NOTE_PRESETS.map((preset) => {
                  const active = note.includes(preset);
                  return (
                    <PresetChip
                      key={preset}
                      active={active}
                      onClick={() => toggleNotePreset(preset)}
                      label={preset}
                    />
                  );
                })}
              </div>
            </DialogSection>
          ))}

          {step === 3 && (
            <>
              <DialogSection icon={CalendarDays} title="Deadline">
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-9 text-[12.5px]"
                />
              </DialogSection>

              <DialogSection icon={Clock} title="Priority">
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = priority === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={cn(
                          "press inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-semibold transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-foreground hover:border-foreground/40",
                        )}
                      >
                        <span
                          className={cn(
                            "mr-1.5 inline-block size-2 rounded-full",
                            active ? "bg-background" : p.tone.split(" ")[0],
                          )}
                          aria-hidden
                        />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </DialogSection>

            </>
          )}

          {step === 4 && (
            <>
              <DialogSection icon={CircleCheck} title="Review & send">
                <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 text-[12px]">
                  <ReviewLine
                    label="Editor"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar className="size-4">
                          <AvatarFallback className="text-[8px]">
                            {assigneeInitials}
                          </AvatarFallback>
                        </Avatar>
                        {currentAssignee.name}
                        {currentAssignee.type === "vendor" && (
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
                            <Truck className="size-2.5" /> Vendor
                          </span>
                        )}
                      </span>
                    }
                  />
                  <ReviewLine label="Deliverable" value={serviceName} />
                  <ReviewLine label="Deadline" value={deadline || "—"} />
                  <ReviewLine
                    label="Priority"
                    value={
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          PRIORITY_OPTIONS.find((p) => p.value === priority)
                            ?.tone,
                        )}
                      >
                        {
                          PRIORITY_OPTIONS.find((p) => p.value === priority)
                            ?.label
                        }
                      </span>
                    }
                  />
                  {isVideo && (
                    <>
                      {length && <ReviewLine label="Length" value={`≤ ${length}`} />}
                      {brief && (
                        <ReviewLine label="Brief" value={brief} truncate />
                      )}
                      {script && (
                        <ReviewLine label="Script" value={script} truncate />
                      )}
                      {musicReference && (
                        <ReviewLine
                          label="Music ref"
                          value={musicReference}
                          truncate
                        />
                      )}
                    </>
                  )}
                  {note && <ReviewLine label="Note" value={note} truncate />}
                </div>

                {/* v12.2: vendor-only block — vendors don't have Odone
                    accounts, so we mint a tokenized access link + offer
                    Copy so the manager can paste the brief into their
                    email / DM tool. Email field is optional pre-fill. */}
                {currentAssignee.type === "vendor" && (
                  <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-3">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-300">
                      <Truck className="size-3" />
                      Vendor handoff
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="vendor-link"
                        className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Editor Queue access link
                      </label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          id="vendor-link"
                          readOnly
                          value={vendorAccessLink(
                            currentAssignee.name,
                            serviceName,
                          )}
                          onFocus={(e) => e.currentTarget.select()}
                          className="h-9 flex-1 font-mono text-[11px]"
                        />
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">
                        Only this token unlocks the project's Editor Queue for
                        this vendor. Anyone else gets a 404.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="vendor-email"
                        className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Vendor email (optional)
                      </label>
                      <Input
                        id="vendor-email"
                        type="email"
                        value={vendorEmail}
                        onChange={(e) => setVendorEmail(e.target.value)}
                        placeholder="hello@vendor.studio"
                        className="h-9 text-[12.5px]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        const text = buildVendorClipboard({
                          link: vendorAccessLink(
                            currentAssignee.name,
                            serviceName,
                          ),
                          email: vendorEmail,
                          assigneeName: currentAssignee.name,
                          serviceName,
                          deadline,
                          priority,
                          isVideo,
                          brief,
                          length,
                          script,
                          musicReference,
                          note,
                        });
                        try {
                          await navigator.clipboard.writeText(text);
                          setCopied(true);
                          toast.success("Copied brief for vendor");
                          window.setTimeout(() => setCopied(false), 2000);
                        } catch {
                          toast.error("Copy failed");
                        }
                      }}
                      className={cn(
                        "press inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                        copied
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
                      )}
                    >
                      {copied ? (
                        <>
                          <CircleCheck className="size-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copy brief + link
                        </>
                      )}
                    </button>
                  </div>
                )}

                <p className="mt-2 rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  {currentAssignee.type === "in_house"
                    ? "Editor will receive a notification + this brief. You can re-open the assignment from the pipeline if anything changes."
                    : "Vendor doesn't have an Odone account — copy the brief above and paste it into your email or DM tool, then hit Send to lock the assignment on our side."}
                </p>
              </DialogSection>
            </>
          )}
        </div>

        {/* Footer — Back / Cancel / Next or Send */}
        <footer className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3 rounded-b-2xl">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="press inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as AssignWizardStep)}
                className="press inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-accent"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
            )}
            {step < WIZARD_STEPS.length ? (
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setStep((s) => (s + 1) as AssignWizardStep)}
                className="press lift inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[12px] font-semibold text-background hover:bg-foreground/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="press lift inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[12px] font-semibold text-background hover:bg-foreground/90 transition-colors"
              >
                <Send className="size-3.5" />
                Send to {firstNameOf(currentAssignee.name)}
              </button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

// Tiny helper for the Review step — label + value, optionally truncated.
function ReviewLine({
  label,
  value,
  truncate,
}: {
  label: string;
  value: React.ReactNode;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-right text-[12px] text-foreground",
          truncate && "line-clamp-2 max-w-[280px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// Tiny section wrapper — mirrors BriefStep's `Section` so the visual rhythm
// (icon + title above field) stays identical to the New Project wizard.
function DialogSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3 text-muted-foreground" />
        {title}
      </div>
      {children}
    </section>
  );
}

// Shared preset-chip — matches BriefStep's chip exactly (h-6, rounded-full,
// text-[10.5px], active = bg-foreground text-background).
function PresetChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2 text-[10.5px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {active ? "✓ " : "+ "}
      {label}
    </button>
  );
}

// v12.3: ShooterConfirmUploadDialog was removed — the unified
// ShootUploadDialog now hosts both drop zones and the Confirm CTA in its
// footer (when `onConfirmed` is supplied). See HANDOFF §3.l.

// Append / remove a preset string inside a freeform note buffer. Mirrors the
// pattern in BriefStep so the toggle UX feels identical.
function togglePresetIn(buffer: string, text: string): string {
  if (buffer.includes(text)) {
    return buffer
      .replace(
        new RegExp(`\\s*[.·•]?\\s*${escapeRegExpLocal(text)}\\s*`, "g"),
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();
  }
  const sep = buffer.trim() ? " · " : "";
  return `${buffer.trim()}${sep}${text}`;
}

function escapeRegExpLocal(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstNameOf(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

// Re-export so callers in this file (and the parent wiring `AssignDropdown`)
// can compose the dialog without duplicating the type.
export { AssignConfirmDialog };
