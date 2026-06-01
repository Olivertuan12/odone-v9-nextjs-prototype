"use client";

// ============================================================================
// EditorDetailDialog — canonical per-order feedback workspace.
// ----------------------------------------------------------------------------
// Opened from Editor Queue cards. Renders one of FIVE stage-specific views
// driven by the editor state context:
//
//   pending   → BriefView         (read brief + Start editing)
//   working   → UploadView        (drop zone + Request review)
//   revision  → ReviewView        (video + feedback + Approve / Send revision)
//   deliver   → DeliverView       (final assets + Mark delivered)
//
// The legacy WorkspaceTab / ProjectChatTab / DeliveryTab live underneath as
// a "Workspace" tab cluster — used as the detail surface for the working /
// revision stage when the editor wants the full 3-pane view. The new stage
// views (Brief/Upload/Review/Deliver) are rendered as the PRIMARY entry view
// per stage.
// ============================================================================

import * as React from "react";
import {
  ArchiveIcon,
  AtSignIcon,
  BellOffIcon,
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  CloudUploadIcon,
  ClockIcon,
  CopyIcon,
  CornerUpLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FilmIcon,
  FolderIcon,
  HashIcon,
  HomeIcon,
  ImageIcon,
  LayoutGridIcon,
  LinkIcon,
  LockIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  MoreHorizontalIcon,
  MusicIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PaperclipIcon,
  PlaneIcon,
  PlayIcon,
  PlusIcon,
  QuoteIcon,
  SendIcon,
  SmilePlusIcon,
  SparklesIcon,
  UploadIcon,
  UserPlusIcon,
  UsersIcon,
  Volume2Icon,
  XIcon,
  ZapIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { mediaIcons, users, type Card as KanbanCard, type MediaType } from "@/components/editor-data";
import { SendToClientDialog } from "@/components/send-to-client-dialog";
import { useEditorState, type EditorStage, type FeedbackRow } from "@/components/editor-state";
import type { AssignSubmission } from "@/components/editor-types";
import { toast } from "sonner";

type FeedbackFilter = "all" | "undone" | "done";

export type EditorDetailStage = EditorStage;

// 3 fixed motivational quotes — picked by `card.id.length % 3` so the same
// card always shows the same quote without consuming randomness.
const QUOTES = [
  "Edit something great. Make the kitchen sing.",
  "This one's for the listing photo. Light it gently.",
  "Show the home, not the camera.",
] as const;

function quoteFor(cardId: string): string {
  return QUOTES[cardId.length % QUOTES.length];
}

export function EditorDetailDialog({
  card,
  open,
  onOpenChange,
}: {
  /** v13: the kanban card that was clicked. Drives every fact rendered in
   *  the dialog (no more hardcoded "45 Yorkshire Dr"). null while closed. */
  card: KanbanCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editor = useEditorState();
  const [activeTab, setActiveTab] = React.useState("workspace");
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [feedbackFilter, setFeedbackFilter] = React.useState<FeedbackFilter>("all");
  // `locked` was a header-driven Approve/Unlock toggle in v12; the v13 stage
  // views own approve via setStage so it's read-only here. Kept so the
  // legacy WorkspaceTab feedback panel can still gray itself out.
  const [locked] = React.useState(false);
  /** When true, force the dialog into the legacy 3-pane "Workspace" view
   *  (used by the working / revision stage entry views via an Expand button). */
  const [showWorkspace, setShowWorkspace] = React.useState(false);

  // Reset workspace toggle whenever a new card opens.
  React.useEffect(() => {
    if (open) setShowWorkspace(false);
  }, [open, card?.id]);

  // First-paint flicker per stage view. When the dialog opens or the
  // selected card changes, show a skeleton silhouette for ~220ms before
  // swapping in the real content. Makes the modal feel "loaded" rather
  // than instantly slammed in, especially on slower devices.
  const [loadingView, setLoadingView] = React.useState(false);
  React.useEffect(() => {
    if (!open || !card) return;
    setLoadingView(true);
    const t = setTimeout(() => setLoadingView(false), 220);
    return () => clearTimeout(t);
  }, [open, card?.id]);

  // Stage from context (overlay over the seed). Defaults to "working" if
  // the card has somehow not been seeded.
  const stage: EditorStage = card ? editor.getStage(card) : "working";

  if (!card) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden" showCloseButton={false}>
          {/* base-ui Dialog requires a child even when closed */}
          <span className="sr-only">No card selected</span>
        </DialogContent>
      </Dialog>
    );
  }

  // Stage-specific entry views (BriefView / UploadView / ReviewView /
  // DeliverView) get a slimmer modal. The legacy 3-pane Workspace gets the
  // wide layout.
  const useNarrow = !showWorkspace;

  // Stage display token (pill in header).
  const stageBadge = renderStageBadge(stage);

  // Order number — derived from the cardId. Stable since cardIds are static
  // (no Date.now / Math.random).
  const orderNum = `#${1000 + (card.id.length * 13) % 9999}`;

  // Brief content — prefer AssignSubmission from the editor context, fall
  // back to mock copy (`null` when nothing has been submitted yet).
  // Brief is keyed by deliverableId, which for prototype cards we derive
  // from the cardId 1:1.
  const submittedBrief = editor.getBrief(card.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "isolate flex h-[94vh] flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0",
          useNarrow
            ? "max-h-[860px] w-full max-w-[780px] sm:max-w-[780px]"
            : "max-h-[960px] w-full max-w-[1180px] sm:max-w-[1180px]",
        )}
      >
        {/* ── HEADER ── */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          {(showWorkspace || stage === "revision" || stage === "working") && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="-ml-1 text-muted-foreground"
              onClick={() => setLeftCollapsed((v) => !v)}
              title={leftCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {leftCollapsed ? (
                <PanelLeftOpenIcon className="size-4" />
              ) : (
                <PanelLeftCloseIcon className="size-4" />
              )}
            </Button>
          )}

          <div className="min-w-0 flex flex-col leading-tight">
            <h2 className="select-text truncate text-[15px] font-semibold">
              {card.title}
            </h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {card.address} · Order {orderNum}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {stageBadge}
            <Badge
              variant="outline"
              className="h-6 gap-1 rounded-md border-border bg-muted/60 px-2 text-[11px] font-semibold text-foreground"
            >
              {renderMediaIcon(card.type, "size-3 text-muted-foreground")}
              {card.type}
            </Badge>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <ClockIcon className="size-3" /> Due {card.deadline}
            </span>

            {!showWorkspace && stage !== "pending" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowWorkspace(true)}
                title="Open full workspace"
              >
                <LayoutGridIcon className="size-3.5" /> Workspace
              </Button>
            )}
            {showWorkspace && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowWorkspace(false)}
                title="Back to stage view"
              >
                <ChevronRightIcon className="size-3.5 rotate-180" /> Stage view
              </Button>
            )}

            <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-auto" />

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              title="Close"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </header>

        {/* ── STAGE BODY ── */}
        {!showWorkspace && stage === "pending" && (
          loadingView ? <BriefViewSkeleton /> : (
            <BriefView
              card={card}
              brief={submittedBrief}
              onStartEditing={() => {
                editor.setStage(card.id, "working");
                toast.success("Started editing", { description: card.title });
              }}
            />
          )
        )}

        {!showWorkspace && stage === "working" && (
          loadingView ? <UploadViewSkeleton /> : (
            <UploadView
              card={card}
              brief={submittedBrief}
              onRequestReview={() => {
                const next = editor.bumpVersion(card.id);
                editor.setStage(card.id, "revision");
                toast.success("Sent to reviewer", {
                  description: `${card.title} · v${next}`,
                });
              }}
            />
          )
        )}

        {!showWorkspace && stage === "revision" && (
          loadingView ? (
            <ReviewViewSkeleton leftCollapsed={leftCollapsed} />
          ) : (
            <ReviewView
              card={card}
              brief={submittedBrief}
              leftCollapsed={leftCollapsed}
              onApprove={() => {
                editor.setStage(card.id, "deliver");
                editor.clearFeedbackForCard(card.id);
                toast.success("Approved · sent to delivery", {
                  description: `${card.title} · VA team notified`,
                });
                onOpenChange(false);
              }}
              onSendRevision={() => {
                editor.setStage(card.id, "working");
                toast.info("Editor buzzed · revision requested", {
                  description: card.title,
                });
                onOpenChange(false);
              }}
            />
          )
        )}

        {!showWorkspace && stage === "deliver" && (
          loadingView ? <DeliverViewSkeleton /> : (
            <DeliverView
              card={card}
              onMarkDelivered={() => {
                toast.success("Marked as delivered to client", {
                  description: card.title,
                });
                onOpenChange(false);
              }}
            />
          )
        )}

        {/* ── LEGACY 3-PANE WORKSPACE — opens via the "Workspace" button ── */}
        {showWorkspace && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="relative flex flex-1 min-h-0 flex-col gap-0"
          >
            <div
              className={cn(
                "pointer-events-none absolute left-3 top-2 z-30 transition-opacity",
                leftCollapsed ? "opacity-0 pointer-events-none" : "opacity-100",
              )}
            >
              <div className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border bg-popover/95 p-1 shadow-md backdrop-blur-md">
                <TabsList variant="line" className="h-7 gap-0.5 rounded-md bg-transparent p-0">
                  <TabsTrigger
                    value="workspace"
                    className="h-7 gap-1.5 rounded-md px-2.5 data-active:bg-accent data-active:shadow-sm"
                  >
                    <LayoutGridIcon />
                    {activeTab === "workspace" && <span>Workspace</span>}
                  </TabsTrigger>
                  <TabsTrigger
                    value="chat"
                    className="h-7 gap-1.5 rounded-md px-2.5 data-active:bg-accent data-active:shadow-sm"
                  >
                    <MessagesSquareIcon />
                    {activeTab === "chat" && <span>Project Chat</span>}
                    <Badge className="ml-0.5 h-4 min-w-4 rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">
                      3
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="delivery"
                    className="h-7 gap-1.5 rounded-md px-2.5 data-active:bg-accent data-active:shadow-sm"
                  >
                    <PlaneIcon />
                    {activeTab === "delivery" && <span>Delivery &amp; Activity</span>}
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="workspace" className="flex flex-1 m-0 min-h-0">
              <WorkspaceTab
                card={card}
                brief={submittedBrief}
                leftCollapsed={leftCollapsed}
                feedbackFilter={feedbackFilter}
                onFeedbackFilterChange={setFeedbackFilter}
                locked={locked}
              />
            </TabsContent>

            <TabsContent value="chat" className="flex flex-1 m-0 min-h-0">
              <ProjectChatTab card={card} />
            </TabsContent>

            <TabsContent value="delivery" className="flex flex-1 m-0 min-h-0">
              <DeliveryTab card={card} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Stage badge ─────────────────────────────────────────────────────────────
function renderStageBadge(stage: EditorStage): React.ReactNode {
  switch (stage) {
    case "pending":
      return (
        <Badge className="h-6 gap-1 rounded-md border border-border bg-muted px-2 text-[11px] font-semibold text-foreground">
          Pending
        </Badge>
      );
    case "working":
      return (
        <Badge className="h-6 gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/15">
          Working On
        </Badge>
      );
    case "revision":
      return (
        <Badge className="h-6 gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/15">
          In Review
        </Badge>
      );
    case "deliver":
      return (
        <Badge className="h-6 gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/15">
          Deliver
        </Badge>
      );
  }
}

function renderMediaIcon(type: MediaType, className: string): React.ReactNode {
  const Icon = mediaIcons[type];
  return <Icon className={className} />;
}

// ── FLOW A: BRIEF VIEW (Pending) ────────────────────────────────────────────
// v12.3: split into 2 sub-steps so the "you got a brief → you grabbed
// the files → you're starting work" arc has a proper beat between the
// utility step and the commitment step. User feedback was that the old
// single-CTA screen felt anticlimactic.
//
//   step="download"  → brief + assets + green "Download all files" CTA
//   step="celebrate" → confetti burst + congrats line + the quote + the
//                       final "Start editing" CTA
//
// Switching is local to BriefView; the parent's `onStartEditing` only
// fires when the user clicks the celebrate-step CTA.
function BriefView({
  card,
  brief,
  onStartEditing,
}: {
  card: KanbanCard;
  brief: AssignSubmission | undefined;
  onStartEditing: () => void;
}) {
  const briefContent = resolveBrief(card, brief);
  const assets = [
    { Icon: FilmIcon, name: "Raw walkthrough", meta: "Dropbox · 2.4 GB" },
    { Icon: FolderIcon, name: "B-roll · town + beach", meta: "Drive · 1.1 GB" },
    { Icon: FileTextIcon, name: "Script.pdf", meta: "24 KB" },
    { Icon: MusicIcon, name: "Music reference", meta: "YouTube link" },
  ];

  const [step, setStep] = React.useState<"download" | "celebrate">("download");

  if (step === "celebrate") {
    return (
      <BriefCelebrateStep
        card={card}
        assetsCount={assets.length}
        onStartEditing={onStartEditing}
        onBack={() => setStep("download")}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[640px] flex-col gap-4">
          {/* Brief header — deadline + priority */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-muted-foreground">
              <ClockIcon className="size-3" /> Due {card.deadline}
            </span>
            {briefContent.length && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-muted-foreground">
                ≤ {briefContent.length}
              </span>
            )}
            {briefContent.priority && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide",
                  priorityToneFor(briefContent.priority),
                )}
              >
                <ZapIcon className="size-3" />
                {briefContent.priority}
              </span>
            )}
          </div>

          {/* Art-direction brief */}
          <section className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <MegaphoneIcon className="size-3.5" /> Brief
            </div>
            <p className="text-[13px] leading-relaxed">{briefContent.briefText}</p>
            {briefContent.note && briefContent.note.trim().length > 0 && (
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                {briefContent.note}
              </p>
            )}
          </section>

          {/* Script — collapsible */}
          {briefContent.script && briefContent.script.trim().length > 0 && (
            <CollapsibleCard
              icon={FileTextIcon}
              label="Script"
              defaultOpen
              right={
                <span className="font-mono text-[10.5px] text-muted-foreground">
                  attached
                </span>
              }
            >
              <p className="text-[12.5px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {briefContent.script}
              </p>
            </CollapsibleCard>
          )}

          {/* Music reference */}
          {briefContent.musicReference && briefContent.musicReference.trim().length > 0 && (
            <section className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                <MusicIcon className="size-3.5" /> Music reference
              </div>
              <a
                href={briefContent.musicReference}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12.5px] text-indigo-400 hover:underline"
              >
                {briefContent.musicReference}
                <ExternalLinkIcon className="size-3" />
              </a>
            </section>
          )}

          {/* Assets list with per-asset download */}
          <section className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                <FolderIcon className="size-3.5" /> Assets
                <span className="font-mono normal-case tracking-normal">
                  · {assets.length}
                </span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                3.5 GB total
              </span>
            </div>
            <ul className="space-y-1.5">
              {assets.map((a) => (
                <li
                  key={a.name}
                  className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <a.Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{a.name}</p>
                    <p className="truncate font-mono text-[10.5px] text-muted-foreground">
                      {a.meta}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      toast.success("Downloading…", { description: a.name })
                    }
                    title={`Download ${a.name}`}
                  >
                    <DownloadIcon className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Primary CTA — step 1 of 2: download the assets. The Start-editing
          commitment happens on the celebrate step that follows. */}
      <div className="shrink-0 border-t bg-background px-6 py-4">
        <div className="mx-auto max-w-[640px]">
          <Button
            size="lg"
            className="h-12 w-full gap-2 bg-emerald-500 text-base font-semibold text-black hover:bg-emerald-600"
            onClick={() => {
              toast.success(
                `Downloaded ${assets.length} files`,
                { description: card.title },
              );
              setStep("celebrate");
            }}
          >
            <DownloadIcon className="size-5" />
            Download all files
          </Button>
          <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
            Grabs the raws, brief, script &amp; music ref. Start editing after.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── FLOW A: CELEBRATE STEP (Pending → Working On) ──────────────────────────
// Confetti burst + congrats line + the motivational quote + the final
// "Start editing" CTA. Confetti pieces use stable derivative positioning
// (no Math.random / no Date.now) so the rendered layout is deterministic.
function BriefCelebrateStep({
  card,
  assetsCount,
  onStartEditing,
  onBack,
}: {
  card: KanbanCard;
  assetsCount: number;
  onStartEditing: () => void;
  onBack: () => void;
}) {
  return (
    <div className="relative flex flex-1 flex-col min-h-0">
      <ConfettiBurst seed={card.id} />

      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-10">
        <div className="mx-auto flex max-w-[520px] flex-col items-center gap-5 text-center">
          {/* Trophy disc — animate-pulse for a soft heartbeat, ping ring
              behind for the celebratory accent. */}
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/30" />
            <div className="relative grid size-20 place-items-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/40">
              <SparklesIcon className="size-9 text-emerald-300 animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-foreground">
              You got the files!
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              {assetsCount} assets queued for download · {card.title}
            </p>
          </div>

          {/* The quote — now the hero element of this step */}
          <section className="flex items-start gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.06] p-4 text-left shadow-lg">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <QuoteIcon className="size-4" />
            </div>
            <p className="text-[13px] italic leading-relaxed text-foreground/90">
              {quoteFor(card.id)}
            </p>
          </section>
        </div>
      </div>

      {/* Footer — Back to the brief OR commit to editing */}
      <div className="relative z-10 shrink-0 border-t bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[520px] items-center gap-3">
          <Button
            variant="ghost"
            size="lg"
            className="h-12 gap-1.5 px-3 text-[12px] text-muted-foreground"
            onClick={onBack}
          >
            <ChevronRightIcon className="size-4 rotate-180" />
            Back to brief
          </Button>
          <Button
            size="lg"
            className="h-12 flex-1 gap-2 bg-emerald-500 text-base font-semibold text-black hover:bg-emerald-600"
            onClick={onStartEditing}
          >
            <SparklesIcon className="size-5" />
            Start editing
          </Button>
        </div>
        <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
          Moves the project to Working On.
        </p>
      </div>
    </div>
  );
}

// 24 confetti pieces with stable derivative positions (no Math.random).
// Falls from the top of the celebrate step over ~2s, then settles. Color
// rotation matches the app's accent palette.
function ConfettiBurst({ seed }: { seed: string }) {
  // djb2-style hash so the same card.id always produces the same spread.
  const baseHash = React.useMemo(() => {
    let h = 5381;
    for (let i = 0; i < seed.length; i++) {
      h = ((h * 33) + seed.charCodeAt(i)) >>> 0;
    }
    return h;
  }, [seed]);

  const pieces = Array.from({ length: 28 }).map((_, i) => {
    const hash = (baseHash + i * 2654435761) >>> 0;
    const left = (hash % 100);
    const delay = ((hash >>> 7) % 1400);
    const duration = 1600 + ((hash >>> 14) % 800);
    const rotate = ((hash >>> 4) % 360);
    const colors = [
      "bg-emerald-400",
      "bg-indigo-400",
      "bg-amber-400",
      "bg-rose-400",
      "bg-sky-400",
      "bg-fuchsia-400",
    ];
    const color = colors[i % colors.length];
    const shape = i % 3 === 0 ? "h-2 w-3 rounded-sm" : "size-2 rounded-full";
    return { i, left, delay, duration, rotate, color, shape };
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.i}
          className={cn("absolute -top-4 animate-confetti opacity-0", p.color, p.shape)}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
          }}
        />
      ))}
    </div>
  );
}

function priorityToneFor(p: NonNullable<AssignSubmission["priority"]>): string {
  switch (p) {
    case "low":
      return "bg-sky-500/10 text-sky-300";
    case "normal":
      return "bg-muted text-muted-foreground";
    case "high":
      return "bg-amber-500/10 text-amber-300";
    case "rush":
      return "bg-rose-500/10 text-rose-300";
  }
}

// Brief resolution: prefer manager's AssignSubmission, fall back to seed mock.
type ResolvedBrief = {
  briefText: string;
  length?: string;
  script?: string;
  musicReference?: string;
  note?: string;
  priority?: NonNullable<AssignSubmission["priority"]>;
};
function resolveBrief(
  card: KanbanCard,
  sub: AssignSubmission | undefined,
): ResolvedBrief {
  if (sub) {
    return {
      briefText:
        sub.brief && sub.brief.trim().length > 0
          ? sub.brief
          : `${card.type} edit for ${card.title}. Match the existing batch style and deliver clean cuts.`,
      length: sub.length,
      script: sub.script,
      musicReference: sub.musicReference,
      note: sub.note,
      priority: sub.priority,
    };
  }
  // Fallback mock — same copy as the v12 brief panel.
  return {
    briefText:
      "Use trendy music (not cinematic). Auto caption OK — no manual. Highlight kitchen + exterior. Length ≤ 60s.",
    length: "60s",
    script:
      "Open with kitchen island. B-roll over chorus drop. End on exterior drone shot with address graphic overlay.",
    musicReference: "https://youtu.be/dQw4w9WgXcQ",
    note: "",
    priority: undefined,
  };
}

// ── FLOW B / D: UPLOAD VIEW (Working On) ────────────────────────────────────
function UploadView({
  card,
  brief,
  onRequestReview,
}: {
  card: KanbanCard;
  brief: AssignSubmission | undefined;
  onRequestReview: () => void;
}) {
  const editor = useEditorState();
  const briefContent = resolveBrief(card, brief);
  const submittedVersions = editor.getVersion(card.id);
  const feedback = editor.getFeedback(card.id);
  const hasFeedback = feedback.length > 0;

  // In-session uploads (this open of the dialog). Counter mirrors the
  // ShootUploadDialog drop-zone pattern — a ref-backed monotonic counter is
  // the safe equivalent of Date.now() / Math.random() in this prototype.
  const [sessionFiles, setSessionFiles] = React.useState<
    { id: number; name: string; size: string }[]
  >([]);
  const fileCounterRef = React.useRef(0);
  const [drag, setDrag] = React.useState(false);
  const dragCounter = React.useRef(0);
  // Top brief summary collapse — collapsed by default (per spec)
  const [briefOpen, setBriefOpen] = React.useState(false);
  // Reviewer feedback collapse — expanded on first revision loop
  const [feedbackOpen, setFeedbackOpen] = React.useState(true);

  const handleAddFile = React.useCallback(
    (n: number) => {
      const additions: typeof sessionFiles = [];
      for (let i = 0; i < n; i++) {
        fileCounterRef.current += 1;
        const idx = fileCounterRef.current;
        additions.push({
          id: idx,
          name: `${card.id}-cut-${idx}.mp4`,
          size: `${150 + idx * 7} MB`,
        });
      }
      setSessionFiles((prev) => [...prev, ...additions]);
    },
    [card.id],
  );

  const inputRef = React.useRef<HTMLInputElement>(null);

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (dragCounter.current === 0) setDrag(true);
    dragCounter.current += 1;
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDrag(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDrag(false);
    const n = e.dataTransfer?.files.length ?? 0;
    if (n > 0) handleAddFile(n);
  };

  const nextVersion = submittedVersions + 1;
  const canSubmit = sessionFiles.length > 0;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-[640px] flex-col gap-4">
          {/* Compact brief summary — collapsed by default */}
          <CollapsibleCard
            icon={MegaphoneIcon}
            label="Brief"
            defaultOpen={briefOpen}
            open={briefOpen}
            onOpenChange={setBriefOpen}
            right={
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {briefContent.length ?? "—"}
              </span>
            }
          >
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              {briefContent.briefText}
            </p>
            {briefContent.musicReference && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Music ref:{" "}
                <a
                  href={briefContent.musicReference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  {briefContent.musicReference}
                </a>
              </p>
            )}
          </CollapsibleCard>

          {/* Reviewer feedback — Flow D (only when card has been bounced
              back from Review at least once) */}
          {hasFeedback && (
            <CollapsibleCard
              icon={MessageCircleIcon}
              label="Reviewer feedback"
              defaultOpen={feedbackOpen}
              open={feedbackOpen}
              onOpenChange={setFeedbackOpen}
              right={
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] text-amber-300">
                    {feedback.length} {feedback.length === 1 ? "note" : "notes"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success("Downloading all feedback…", {
                        description: card.title,
                      });
                    }}
                  >
                    <DownloadIcon className="size-3" /> All
                  </Button>
                </div>
              }
            >
              <ul className="flex flex-col gap-1.5">
                {feedback.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/[0.04] px-2 py-1.5"
                  >
                    {row.timePin && (
                      <span className="rounded border bg-muted px-1 font-mono text-[10px] font-bold text-foreground">
                        {row.timePin}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] leading-snug">{row.body}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {row.author}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CollapsibleCard>
          )}

          {/* Version counter row */}
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px]">
            <span className="text-muted-foreground">
              Submitted versions so far
            </span>
            <span className="font-mono font-semibold">
              {submittedVersions === 0
                ? "none yet"
                : `v1${submittedVersions > 1 ? `…v${submittedVersions}` : ""}`}
            </span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            className={cn(
              "group cursor-pointer rounded-2xl border-2 border-dashed bg-background/40 px-6 py-10 text-center transition-colors",
              drag
                ? "border-foreground/50 bg-accent/40 ring-2 ring-foreground/20"
                : "border-border hover:border-foreground/30 hover:bg-accent/20",
              sessionFiles.length > 0 && "border-emerald-500/30 bg-emerald-500/[0.04]",
            )}
          >
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-foreground">
              <CloudUploadIcon className="size-5" />
            </div>
            <p className="mt-3 text-[13px] font-semibold">
              {sessionFiles.length > 0
                ? `${sessionFiles.length} file${sessionFiles.length === 1 ? "" : "s"} ready for v${nextVersion}`
                : "Drop your edit here"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Drag files in or click to pick · MP4, MOV up to 10 GB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="video/*,image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const n = e.target.files?.length ?? 0;
                if (n > 0) handleAddFile(n);
                e.target.value = "";
              }}
            />
          </div>

          {/* In-session uploaded files */}
          {sessionFiles.length > 0 && (
            <section className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  <FilmIcon className="size-3.5" /> v{nextVersion} files
                  <span className="font-mono normal-case tracking-normal">
                    · {sessionFiles.length}
                  </span>
                </div>
              </div>
              <ul className="space-y-1">
                {sessionFiles.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-2.5 rounded-md border bg-muted/30 px-2.5 py-1.5"
                  >
                    <div className="grid size-6 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
                      <FilmIcon className="size-3" />
                    </div>
                    <span className="flex-1 truncate text-[12px] font-medium">
                      {f.name}
                    </span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      {f.size}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA — prominent so editor never has to hunt for it
          (Flow D feedback addressed this explicitly). */}
      <div className="shrink-0 border-t bg-background px-6 py-4">
        <div className="mx-auto flex max-w-[640px] items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-12 flex-1 gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <PlusIcon className="size-4" /> Add more files
          </Button>
          <Button
            size="lg"
            className="h-12 flex-1 gap-2 bg-emerald-500 text-base font-semibold text-black hover:bg-emerald-600 disabled:bg-muted disabled:text-muted-foreground"
            onClick={onRequestReview}
            disabled={!canSubmit}
            title={
              canSubmit
                ? `Send v${nextVersion} for review`
                : "Add at least one file"
            }
          >
            <SendIcon className="size-5" />
            Request review · v{nextVersion}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── FLOW C: REVIEW VIEW (manager) ───────────────────────────────────────────
function ReviewView({
  card,
  brief,
  leftCollapsed,
  onApprove,
  onSendRevision,
}: {
  card: KanbanCard;
  brief: AssignSubmission | undefined;
  /** Threaded from the dialog header's Hide sidebar toggle so the manager
   *  can collapse the brief/assets pane when reviewing on a narrow screen. */
  leftCollapsed: boolean;
  onApprove: () => void;
  onSendRevision: () => void;
}) {
  const editor = useEditorState();
  const briefContent = resolveBrief(card, brief);
  const existing = editor.getFeedback(card.id);
  const version = editor.getVersion(card.id);
  const versionLabel = version > 0 ? `v${version}` : "v1";

  // Compose state
  const [draft, setDraft] = React.useState("");
  const [timePin, setTimePin] = React.useState("");
  const [feedbackFilter, setFeedbackFilter] = React.useState<FeedbackFilter>("all");
  // v12.3: hidden file input for the right-pane "Upload new version" CTA
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  // Left-pane section collapsibles
  const [briefOpen, setBriefOpen] = React.useState(true);
  const [assetsOpen, setAssetsOpen] = React.useState(true);
  const [peopleOpen, setPeopleOpen] = React.useState(true);
  const [propertyOpen, setPropertyOpen] = React.useState(true);
  // Has at least one feedback row been added IN THIS SESSION? Gates the
  // "Send revision" button per spec.
  const [sessionAddedCount, setSessionAddedCount] = React.useState(0);

  const handlePost = () => {
    const body = draft.trim();
    if (body.length === 0) return;
    editor.addFeedback(card.id, {
      author: "Kyle Anderson",
      timePin: timePin.trim() || undefined,
      body,
    });
    setDraft("");
    setTimePin("");
    setSessionAddedCount((n) => n + 1);
  };

  const canSendRevision = sessionAddedCount > 0 || existing.length > 0;

  // Feedback filtering — same model as WorkspaceTab's filter cluster. We
  // don't track per-row done status in editor-state yet, so "Undone" maps
  // to all rows and "Done" maps to none (placeholder until reviewer marks
  // resolve is wired).
  const filteredFeedback = React.useMemo(() => {
    if (feedbackFilter === "done") return [];
    return existing;
  }, [existing, feedbackFilter]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* 3-pane body — mirrors the legacy WorkspaceTab layout the user asked
          to restore (left collapsible brief/assets / center portrait 9:16
          video / right feedback panel). v12.3 width tweak: trimmed left
          to 240px and right to 300px so the center video pane gets enough
          horizontal room for the portrait 9:16 frame to read as a video
          (was getting squeezed to a vertical strip in the prior pass). */}
      <div className="flex h-full min-h-0 w-full flex-1">
        {/* LEFT — Brief / Assets / People / Property */}
        <div
          className={cn(
            "flex shrink-0 flex-col overflow-hidden bg-background transition-[width] duration-200",
            leftCollapsed
              ? "w-0 border-r-0"
              : "w-[240px] border-r border-border",
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-3 px-5 pt-5 pb-12">
              <CollapsibleSection
                icon={MegaphoneIcon}
                label="Brief"
                open={briefOpen}
                onToggle={() => setBriefOpen((v) => !v)}
                action={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CopyIcon className="size-3" />
                  </Button>
                }
              >
                <div className="rounded-lg border bg-muted/40 p-3 text-[12px] leading-relaxed text-muted-foreground">
                  {briefContent.briefText}
                </div>
                {briefContent.length && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                    {briefContent.length}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                icon={FolderIcon}
                label="Assets"
                open={assetsOpen}
                onToggle={() => setAssetsOpen((v) => !v)}
              >
                <div className="space-y-1">
                  <AssetRow
                    Icon={FilmIcon}
                    iconClass="bg-muted text-muted-foreground"
                    title={`${versionLabel} master`}
                    meta="Editor upload · 280 MB"
                  />
                  <AssetRow
                    Icon={FolderIcon}
                    iconClass="bg-muted text-muted-foreground"
                    title="Raw walkthrough"
                    meta="Dropbox · 2.4 GB"
                  />
                  <AssetRow
                    Icon={FileTextIcon}
                    iconClass="bg-muted text-muted-foreground"
                    title="Script.pdf"
                    meta="24 KB"
                  />
                  <AssetRow
                    Icon={MusicIcon}
                    iconClass="bg-muted text-muted-foreground"
                    title="Music reference"
                    meta="YouTube link"
                  />
                </div>
                {/* v12.3: Download-all CTA moved out of the section header
                    (it was visually bigger than the ASSETS label) and into
                    its natural footer position. Width-full so it acts as
                    the closing action for the list above. */}
                <Button
                  variant="outline"
                  size="sm"
                  className="press mt-2 h-7 w-full gap-1.5 rounded-md border-dashed border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    toast.success("Downloading all assets…", {
                      description: card.title,
                    })
                  }
                >
                  <DownloadIcon className="size-3.5" />
                  Download all
                </Button>
              </CollapsibleSection>

              <CollapsibleSection
                icon={UsersIcon}
                label="People"
                open={peopleOpen}
                onToggle={() => setPeopleOpen((v) => !v)}
              >
                <div className="flex flex-col gap-1.5">
                  <PersonRow initials="MA" tone="bg-muted text-foreground" name="Marry" role="Lead" />
                  <PersonRow initials="MJ" tone="bg-muted text-foreground" name="MJ" role="Support" />
                  <PersonRow initials="KY" tone="bg-muted text-foreground" name="Kyle" role="Manager" />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                icon={HomeIcon}
                label="Property"
                open={propertyOpen}
                onToggle={() => setPropertyOpen((v) => !v)}
              >
                <p className="mb-1.5 text-[11px] font-medium leading-tight">
                  {card.address}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                  <span>3 bd</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>2 ba</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>1,820 sqft</span>
                  <span className="text-muted-foreground/40">·</span>
                  <a className="cursor-pointer font-medium text-indigo-400 hover:underline">
                    Listing ↗
                  </a>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>

        {/* CENTER — Portrait 9:16 video (real estate vertical reels). The
            previous iteration added `min-w-[280px]` + `max-h-[720px]`
            which forced the frame wider than its parent and bled into
            the right Feedback panel. Reverted to the legacy
            `h-full aspect-[9/16]` pattern; `overflow-hidden` on the
            center-pane wrapper guarantees no visual bleed even if the
            computed width exceeds the panel on narrow viewports. */}
        <div className="relative flex flex-1 flex-col bg-background min-w-0 overflow-hidden">
          <div className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-3">
            <div className="group relative flex h-full aspect-[9/16] items-center justify-center overflow-hidden rounded-2xl border bg-muted shadow-2xl">
              <div className="z-20 flex size-14 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60">
                <PlayIcon className="ml-1 size-5 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 to-emerald-950 opacity-40" />

              {/* Version chip — top-left of frame */}
              <div className="absolute left-3 top-3 z-30 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                {versionLabel} preview
              </div>

              {/* Download — top-right of video frame, only on hover */}
              <button
                className="absolute right-2 top-2 z-30 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10.5px] font-medium text-white opacity-0 backdrop-blur-md transition-opacity duration-200 hover:bg-black/60 group-hover:opacity-100 focus:opacity-100"
                title="Download video"
              >
                <DownloadIcon className="size-3" />
                Download
              </button>

              {/* Scrub bar — appears on hover. Open/Resolved dots only show
                  once there's actual feedback with time pins. */}
              <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col justify-end px-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex items-center gap-3">
                  <div className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/20 transition-all hover:h-2">
                    {existing
                      .filter((row) => Boolean(row.timePin))
                      .slice(0, 4)
                      .map((row, idx) => (
                        <div
                          key={row.id}
                          className="absolute top-1/2 z-10 size-2 -translate-y-1/2 rounded-full border border-black bg-white transition-transform hover:scale-150"
                          style={{ left: `${15 + idx * 18}%` }}
                          title={row.body}
                        />
                      ))}
                    <div className="relative h-full w-[35%] rounded-full bg-white/80">
                      <div className="absolute right-0 top-1/2 size-3.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-md" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Persistent bottom controls — Play + Volume + Time inside video */}
              <div className="absolute bottom-0 left-0 right-0 z-20 flex h-10 items-center gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2">
                <button className="rounded-full p-1.5 text-white hover:bg-white/15" title="Play">
                  <PlayIcon className="size-4" />
                </button>
                <button className="rounded-full p-1.5 text-white hover:bg-white/15" title="Mute">
                  <Volume2Icon className="size-4" />
                </button>
                <span className="ml-1 font-mono text-[10.5px] tabular-nums text-white/90">
                  00:21 / 01:00
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Feedback panel (floating card, gentle border) */}
        <div className="m-2 ml-0 flex w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border bg-background min-h-0">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <MessageCircleIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-[14px] font-semibold">Feedback</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {existing.length}
              </span>
              <span className="ml-0.5 inline-flex h-5 items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/15 px-1.5 text-[10px] font-bold text-indigo-300">
                {versionLabel}
              </span>
            </div>
            {/* v12.3: single-button quick upload — sits in the header so it
                doesn't eat a row of vertical space. Triggers the hidden
                file input outside the panel. */}
            <Button
              variant="outline"
              size="sm"
              className="press h-7 shrink-0 gap-1.5 rounded-full px-2.5 text-[11px] font-medium"
              onClick={() => uploadInputRef.current?.click()}
              title="Upload new version"
            >
              <CloudUploadIcon className="size-3.5" />
              Upload
            </Button>
          </div>

          {/* v12.3: hidden file input — clicked by the small "Upload" pill
              that lives inside the Feedback header next to the version chip. */}
          <input
            ref={uploadInputRef}
            type="file"
            accept="video/*,image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const n = e.target.files?.length ?? 0;
              if (n > 0) {
                const next = editor.bumpVersion(card.id);
                toast.success(
                  `Uploaded v${next} · ${n} file${n === 1 ? "" : "s"}`,
                  {
                    description: card.title,
                  },
                );
              }
              e.target.value = "";
            }}
          />

          {/* Filter cluster — All / Undone / Done */}
          <div className="shrink-0 px-3 pb-2">
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-1">
              <FilterPill
                active={feedbackFilter === "all"}
                onClick={() => setFeedbackFilter("all")}
              >
                All{" "}
                <span className="ml-0.5 font-mono text-muted-foreground">
                  {existing.length}
                </span>
              </FilterPill>
              <FilterPill
                active={feedbackFilter === "undone"}
                onClick={() => setFeedbackFilter("undone")}
              >
                Undone{" "}
                <span className="ml-0.5 font-mono text-muted-foreground">
                  {existing.length}
                </span>
              </FilterPill>
              <FilterPill
                active={feedbackFilter === "done"}
                onClick={() => setFeedbackFilter("done")}
              >
                Done <span className="ml-0.5 font-mono text-emerald-400">0</span>
              </FilterPill>
            </div>
          </div>

          {/* Feedback rows — driven by editor-state context (not the static
              mock the legacy WorkspaceTab used). Empty-state shows the
              same dashed callout pattern. */}
          <div className="flex-1 overflow-y-auto">
            {filteredFeedback.length === 0 ? (
              <p className="mx-3 mt-1 rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-center text-[11.5px] text-muted-foreground">
                No feedback yet. Drop a note below to ask for a revision.
              </p>
            ) : (
              filteredFeedback.map((row) => (
                <FeedbackRow
                  key={row.id}
                  locked={false}
                  time={row.timePin ?? "—"}
                  author={row.author}
                  text={row.body}
                />
              ))
            )}
          </div>

          {/* Compose — pinned to the bottom of the feedback panel */}
          <div className="shrink-0 border-t bg-background px-3 py-2.5">
            <div className="rounded-lg border bg-background transition-colors focus-within:border-foreground/40">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add feedback…"
                rows={2}
                className="block w-full resize-none border-0 bg-transparent px-3 py-2 text-[12.5px] outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5">
                <input
                  value={timePin}
                  onChange={(e) => setTimePin(e.target.value)}
                  placeholder="0:32"
                  className="h-6 w-20 rounded border bg-card px-2 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-foreground/40"
                  aria-label="Time pin"
                />
                <Button
                  size="sm"
                  className="h-7 gap-1 px-2.5 text-[11px] font-semibold"
                  onClick={handlePost}
                  disabled={draft.trim().length === 0}
                >
                  <SendIcon className="size-3" /> Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions — under all three panes */}
      <div className="shrink-0 border-t bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-11 flex-1 gap-2"
            onClick={onSendRevision}
            disabled={!canSendRevision}
            title={
              canSendRevision
                ? "Send revision back to editor"
                : "Add at least one feedback note first"
            }
          >
            <CornerUpLeftIcon className="size-4" />
            Send revision + Buzz editor
          </Button>
          <Button
            size="lg"
            className="h-11 flex-1 gap-2 bg-emerald-500 text-base font-semibold text-black hover:bg-emerald-600"
            onClick={onApprove}
          >
            <CheckIcon className="size-5" /> Approve
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeedbackBubble({ row }: { row: FeedbackRow }) {
  return (
    <li className="flex items-start gap-2 rounded-md bg-muted/40 px-2 py-1.5">
      {row.timePin && (
        <span className="rounded border bg-card px-1 font-mono text-[10px] font-bold text-foreground">
          {row.timePin}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-snug">{row.body}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{row.author}</p>
      </div>
    </li>
  );
}

// ── FLOW E: DELIVER VIEW ────────────────────────────────────────────────────
function DeliverView({
  card,
  onMarkDelivered,
}: {
  card: KanbanCard;
  onMarkDelivered: () => void;
}) {
  // v12.3 redesign: each kanban card represents ONE deliverable, so the
  // deliver surface shows ONE asset. Walkthrough variants & still galleries
  // belong on the parent Order Delivery tab; here we just need: portrait
  // hero with the approved badge + a primary Download button + the admin
  // "Mark as delivered to client" footer.
  const isPhoto = card.type.toLowerCase().includes("photo");
  const fileMeta = isPhoto
    ? "JPEG · 24 MB"
    : "MP4 · 1080×1920 · 0:58 · 142 MB";
  const FileIcon = isPhoto ? ImageIcon : FilmIcon;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4">
          {/* Portrait 9:16 hero — matches the Review video orientation
              since most listings are vertical reels. */}
          <section className="group relative aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-2xl border bg-muted shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-background to-indigo-950 opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-emerald-500/90 px-3 py-1 text-[12px] font-bold text-black">
                Approved · ready
              </span>
            </div>
            {/* Hover-revealed download on the hero itself for the
                muscle-memory "preview then grab" pattern from /uploads. */}
            <button
              type="button"
              className="absolute right-2 top-2 z-30 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10.5px] font-medium text-white opacity-0 backdrop-blur-md transition-opacity duration-200 hover:bg-black/60 group-hover:opacity-100 focus:opacity-100"
              onClick={() =>
                toast.success("Downloading…", { description: card.title })
              }
              title="Download deliverable"
            >
              <DownloadIcon className="size-3" />
              Download
            </button>
          </section>

          {/* File summary row — a single deliverable, not a list. Click the
              row OR the trailing icon to download. */}
          <button
            type="button"
            onClick={() =>
              toast.success("Downloading…", { description: card.title })
            }
            className="press flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/30"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-emerald-500/10 text-emerald-300">
              <FileIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {card.title}
              </p>
              <p className="truncate font-mono text-[10.5px] text-muted-foreground">
                {fileMeta}
              </p>
            </div>
            <span
              aria-hidden
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium text-foreground"
            >
              <DownloadIcon className="size-3.5" />
              Download
            </span>
          </button>
        </div>
      </div>

      <div className="shrink-0 border-t bg-background px-6 py-4">
        <div className="mx-auto max-w-[480px]">
          <Button
            size="lg"
            className="h-12 w-full gap-2 bg-emerald-500 text-base font-semibold text-black hover:bg-emerald-600"
            onClick={onMarkDelivered}
          >
            <SendIcon className="size-5" /> Mark as delivered to client
          </Button>
          <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
            Admin only · removes from active queue and notifies the client.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── COLLAPSIBLE CARD (reusable) ─────────────────────────────────────────────
function CollapsibleCard({
  icon: Icon,
  label,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  right,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };
  return (
    <section className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <ChevronRightIcon
            className={cn(
              "size-3 transition-transform",
              open && "rotate-90",
            )}
          />
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="flex items-center gap-2 normal-case">{right}</span>
      </button>
      {open && <div className="border-t border-border px-4 py-3">{children}</div>}
    </section>
  );
}

// ── WORKSPACE TAB (legacy 3-pane) ───────────────────────────────────────────
function WorkspaceTab({
  card,
  brief,
  leftCollapsed,
  feedbackFilter,
  onFeedbackFilterChange,
  locked,
}: {
  card: KanbanCard;
  brief: AssignSubmission | undefined;
  leftCollapsed: boolean;
  feedbackFilter: FeedbackFilter;
  onFeedbackFilterChange: (f: FeedbackFilter) => void;
  locked: boolean;
}) {
  const [briefOpen, setBriefOpen] = React.useState(true);
  const [assetsOpen, setAssetsOpen] = React.useState(true);
  const [peopleOpen, setPeopleOpen] = React.useState(true);
  const [propertyOpen, setPropertyOpen] = React.useState(true);
  const briefContent = resolveBrief(card, brief);

  return (
    <div className="flex h-full w-full min-h-0 flex-1">
      {/* LEFT — Brief, Assets, People, Property */}
      <div
        className={cn(
          "flex shrink-0 flex-col overflow-hidden bg-background transition-[width] duration-200",
          leftCollapsed ? "w-0 border-r-0" : "w-[280px] border-r border-border"
        )}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 px-5 pt-14 pb-12">
            <CollapsibleSection
              icon={MegaphoneIcon}
              label="Brief"
              open={briefOpen}
              onToggle={() => setBriefOpen((v) => !v)}
              action={
                <Button variant="ghost" size="icon-sm" className="size-5" onClick={(e) => e.stopPropagation()}>
                  <CopyIcon className="size-3" />
                </Button>
              }
            >
              <div className="rounded-lg border bg-muted/40 p-3 text-[12px] leading-relaxed text-muted-foreground">
                {briefContent.briefText}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              icon={FolderIcon}
              label="Assets"
              open={assetsOpen}
              onToggle={() => setAssetsOpen((v) => !v)}
              action={
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 font-mono text-[9px]">
                    <DownloadIcon className="size-3" /> All
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="size-5">
                    <PlusIcon className="size-3.5" />
                  </Button>
                </div>
              }
            >
              <div className="space-y-1">
                <AssetRow Icon={FilmIcon}     iconClass="bg-muted text-muted-foreground" title="Raw walkthrough" meta="Dropbox · 2.4 GB" />
                <AssetRow Icon={FolderIcon}   iconClass="bg-muted text-muted-foreground" title="B-roll · town + beach" meta="Drive · 1.1 GB" />
                <AssetRow Icon={FileTextIcon} iconClass="bg-muted text-muted-foreground" title="Script.pdf"      meta="24 KB" />
                <AssetRow Icon={MusicIcon}    iconClass="bg-muted text-muted-foreground" title="Music reference" meta="YouTube link" />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              icon={UsersIcon}
              label="People"
              open={peopleOpen}
              onToggle={() => setPeopleOpen((v) => !v)}
              action={
                <Button variant="ghost" size="icon-sm" className="size-5" onClick={(e) => e.stopPropagation()}>
                  <UserPlusIcon className="size-3" />
                </Button>
              }
            >
              <div className="flex flex-col gap-1.5">
                <PersonRow initials="MA" tone="bg-muted text-foreground" name="Marry" role="Lead" />
                <PersonRow initials="MJ" tone="bg-muted text-foreground" name="MJ"    role="Support" />
                <PersonRow initials="KY" tone="bg-muted text-foreground" name="Kyle"  role="Manager" />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              icon={HomeIcon}
              label="Property"
              open={propertyOpen}
              onToggle={() => setPropertyOpen((v) => !v)}
            >
              <p className="mb-1.5 text-[11px] font-medium leading-tight">
                {card.address}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                <span>3 bd</span>
                <span className="text-muted-foreground/40">·</span>
                <span>2 ba</span>
                <span className="text-muted-foreground/40">·</span>
                <span>1,820 sqft</span>
                <span className="text-muted-foreground/40">·</span>
                <a className="cursor-pointer font-medium text-indigo-400 hover:underline">
                  Listing ↗
                </a>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* CENTER — Video (unified bg with page) */}
      <div className="relative flex flex-1 flex-col bg-background min-w-0">
        <div className="relative flex h-full min-h-0 flex-1 items-center justify-center px-4 pt-3 pb-3">
          <div className="group relative flex h-full aspect-[9/16] items-center justify-center overflow-hidden rounded-2xl border bg-muted shadow-2xl">
            <div className="z-20 flex size-14 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60">
              <PlayIcon className="ml-1 size-5 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 to-emerald-950 opacity-40" />

            {/* Download — top-right of video frame, only on hover */}
            <button
              className="absolute right-2 top-2 z-30 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10.5px] font-medium text-white opacity-0 backdrop-blur-md transition-opacity duration-200 hover:bg-black/60 group-hover:opacity-100 focus:opacity-100"
              title="Download video"
            >
              <DownloadIcon className="size-3" />
              Download
            </button>

            {/* Scrub bar — appears on hover, sits above controls */}
            <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col justify-end px-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex items-center gap-3">
                <div className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/20 transition-all hover:h-2">
                  <div className="absolute left-[45%] top-1/2 z-10 size-2 -translate-y-1/2 rounded-full border border-black bg-emerald-500 transition-transform hover:scale-150" title="Resolved" />
                  <div className="absolute left-[20%] top-1/2 z-10 size-2 -translate-y-1/2 rounded-full border border-black bg-white transition-transform hover:scale-150" title="Open" />
                  <div className="absolute left-[70%] top-1/2 z-10 size-2 -translate-y-1/2 rounded-full border border-black bg-white transition-transform hover:scale-150" title="Open" />
                  <div className="relative h-full w-[35%] rounded-full bg-white/80">
                    <div className="absolute right-0 top-1/2 size-3.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-md" />
                  </div>
                </div>
              </div>
            </div>

            {/* Persistent bottom controls — Play + Volume + Time inside video */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex h-10 items-center gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2">
              <button className="rounded-full p-1.5 text-white hover:bg-white/15" title="Play">
                <PlayIcon className="size-4" />
              </button>
              <button className="rounded-full p-1.5 text-white hover:bg-white/15" title="Mute">
                <Volume2Icon className="size-4" />
              </button>
              <span className="ml-1 font-mono text-[10.5px] tabular-nums text-white/90">
                00:21 / 01:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Feedback (subtle floating card: same bg as page, gentle border) */}
      <div className="m-2 ml-0 flex w-[340px] shrink-0 flex-col overflow-hidden rounded-xl border bg-background min-h-0">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <MessageCircleIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-[14px] font-semibold">Feedback</span>
            <span className="font-mono text-[11px] text-muted-foreground">3</span>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="ml-0.5 inline-flex h-5 items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/15 px-1.5 text-[10px] font-bold text-indigo-300 transition-colors hover:bg-indigo-500/25" />
                }
              >
                v2 <ChevronDownIcon className="size-2.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[140px]">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Versions
                </DropdownMenuLabel>
                <DropdownMenuItem>v2 (current)</DropdownMenuItem>
                <DropdownMenuItem>v1</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {locked && (
              <Badge
                variant="outline"
                className="h-5 gap-1 rounded-full border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[9px] font-semibold text-emerald-400"
              >
                <LockIcon className="size-2.5" /> Locked
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[12px] text-muted-foreground hover:text-foreground"
                  title="Export comments"
                />
              }
            >
              <DownloadIcon className="size-4" /> Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Export comments
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <FileTextIcon className="text-muted-foreground" /> Plain text (.txt)
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FilmIcon className="text-muted-foreground" /> Final Cut Pro XML (.fcpxml)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <CopyIcon className="text-muted-foreground" /> Copy to clipboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter cluster — All / Undone / Done grouped as a single pill (like Workspace tab cluster) */}
        <div className="shrink-0 px-3 pb-2">
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-1">
            <FilterPill active={feedbackFilter === "all"} onClick={() => onFeedbackFilterChange("all")}>
              All <span className="ml-0.5 font-mono text-muted-foreground">3</span>
            </FilterPill>
            <FilterPill active={feedbackFilter === "undone"} onClick={() => onFeedbackFilterChange("undone")}>
              Undone <span className="ml-0.5 font-mono text-muted-foreground">2</span>
            </FilterPill>
            <FilterPill active={feedbackFilter === "done"} onClick={() => onFeedbackFilterChange("done")}>
              Done <span className="ml-0.5 font-mono text-emerald-400">1</span>
            </FilterPill>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(feedbackFilter === "all" || feedbackFilter === "undone") && (
            <FeedbackRow
              accent
              locked={locked}
              time="0:21"
              author="2h · Kyle"
              text="Shot lacks movement. Can we speed ramp this slightly to match the beat drop?"
            />
          )}
          {(feedbackFilter === "all" || feedbackFilter === "done") && (
            <FeedbackRow
              done
              locked={locked}
              time="0:15"
              author="4h · Kyle · fixed in v2"
              text="Red WB cast on the kitchen counter."
            />
          )}
          {(feedbackFilter === "all" || feedbackFilter === "undone") && (
            <FeedbackRow
              locked={locked}
              time="0:45"
              author="3h · MJ"
              text="Client requested to replace this sky, it looks a bit blown out."
            />
          )}
        </div>

        {locked ? (
          <div className="shrink-0 border-t bg-emerald-500/5 p-3">
            <div className="flex items-start gap-2 text-[11px] text-emerald-400">
              <LockIcon className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Approved — comments are locked. Click{" "}
                <span className="font-semibold">Unlock</span> in the header to reopen.
              </p>
            </div>
          </div>
        ) : (
          <div className="shrink-0 px-3 pb-3">
            <div className="rounded-lg border bg-card transition-colors focus-within:border-foreground/40">
              <input
                type="text"
                placeholder="Add note at 00:21…"
                className="block w-full bg-transparent px-3 py-2 text-[12.5px] outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between px-1.5 pb-1.5">
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-sm" className="size-6 text-muted-foreground" title="Attach">
                    <PaperclipIcon className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="size-6 text-muted-foreground" title="Mention">
                    <AtSignIcon className="size-3.5" />
                  </Button>
                </div>
                <Button size="sm" className="h-6 gap-1 px-2 text-[11px] font-semibold">
                  <SendIcon className="size-3" /> Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PROJECT CHAT TAB ────────────────────────────────────────────────────────
function ProjectChatTab({ card }: { card: KanbanCard }) {
  const channelSlug = card.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-5 py-3">
        <HashIcon className="size-4 text-muted-foreground" />
        <span className="font-semibold">{channelSlug}</span>
        <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-auto" />
        <span className="text-xs text-muted-foreground">3 members</span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Mute">
            <BellOffIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="More">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          <DayDivider label="Yesterday" />
          <ChatMessage
            userId="KY"
            time="3:14 PM"
            text="Pulled the raw footage from Dropbox. Starting on the rough cut now — should have v1 by tomorrow."
          />
          <ChatMessage
            userId="MA"
            time="3:21 PM"
            text="Sounds good. Remember the brief asks for trendy music — not cinematic. Reference link is in Assets."
          />
          <ChatMessage
            userId="MJ"
            time="5:02 PM"
            text="Drone shots came back great. I'll edit those in once the walkthrough cut is locked."
            attachment={{ name: "drone-clip.mp4", size: "284 MB" }}
          />

          <DayDivider label="Today" />
          <ChatMessage
            userId="KY"
            time="9:48 AM"
            text="v1 uploaded. Sent for review."
            highlight
          />
          <ChatMessage
            userId="MA"
            time="11:32 AM"
            text="Reviewed v1. 3 notes added on the timeline — main one is the kitchen WB. Sending back for revision."
          />
        </div>
      </div>

      <div className="shrink-0 border-t bg-background p-3">
        <div className="rounded-lg border bg-card">
          <textarea
            placeholder={`Message #${channelSlug}`}
            rows={1}
            className="block w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between border-t px-2 py-1.5">
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Attach">
                <PaperclipIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Mention">
                <AtSignIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Emoji">
                <SmilePlusIcon className="size-4" />
              </Button>
            </div>
            <Button size="sm" className="h-7 gap-1.5 text-xs">
              <SendIcon className="size-3.5" /> Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function ChatMessage({
  userId,
  time,
  text,
  attachment,
  highlight,
}: {
  userId: string;
  time: string;
  text: string;
  attachment?: { name: string; size: string };
  highlight?: boolean;
}) {
  const u = users[userId];
  if (!u) return null;
  return (
    <div className={cn("flex gap-3", highlight && "rounded-md bg-indigo-500/5 -mx-2 px-2 py-1.5")}>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={u.image} alt={u.name} />
        <AvatarFallback className={cn("text-xs", u.tone)}>{u.initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{u.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{time}</span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed">{text}</p>
        {attachment && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
            <FilmIcon className="size-4 text-blue-400" />
            <span className="text-xs font-medium">{attachment.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {attachment.size}
            </span>
            <Button variant="ghost" size="icon-sm" className="size-6">
              <DownloadIcon className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ACTIVITY TAB ────────────────────────────────────────────────────────────
type Event = {
  id: string;
  userId?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTone: string;
  title: React.ReactNode;
  detail?: string;
  time: string;
};

const activityEvents: Event[] = [
  { id: "e7", userId: "MA", icon: MessageCircleIcon, iconTone: "bg-amber-500/15 text-amber-400",
    title: <>added 3 notes to <b>v2</b></>, detail: "Kitchen WB, sky replacement, shot pacing.", time: "11:32 AM today" },
  { id: "e6", userId: "KY", icon: SparklesIcon, iconTone: "bg-indigo-500/15 text-indigo-400",
    title: <>submitted <b>v2</b> for review</>, time: "9:48 AM today" },
  { id: "e5", userId: "MJ", icon: PaperclipIcon, iconTone: "bg-blue-500/15 text-blue-400",
    title: <>attached <b>drone-clip.mp4</b> (284 MB)</>, time: "Yesterday · 5:02 PM" },
  { id: "e4", userId: "KY", icon: CircleCheckBigIcon, iconTone: "bg-emerald-500/15 text-emerald-400",
    title: <>resolved comment <b>“Red WB cast on the kitchen counter”</b></>, time: "Yesterday · 4:14 PM" },
  { id: "e3", userId: "KY", icon: DownloadIcon, iconTone: "bg-muted text-muted-foreground",
    title: <>downloaded all <b>assets</b> (3.5 GB)</>, time: "Yesterday · 3:10 PM" },
  { id: "e2", userId: "MA", icon: UserPlusIcon, iconTone: "bg-muted text-muted-foreground",
    title: <>added <b>Kyle Norman</b> as Editor</>, time: "May 17 · 10:02 AM" },
  { id: "e1", userId: "MA", icon: PlusIcon, iconTone: "bg-muted text-muted-foreground",
    title: <>created order <b>#1024</b></>, detail: "Walkthrough · 1080×1920 · ≤ 60s · trendy music", time: "May 17 · 9:30 AM" },
];

// ── DELIVERY TAB ────────────────────────────────────────────────────────────
function DeliveryTab({ card }: { card: KanbanCard }) {
  const [sendOpen, setSendOpen] = React.useState(false);
  // Stable order # derived from card.id length (matches the header).
  const orderNum = `#${1000 + (card.id.length * 13) % 9999}`;
  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <PlaneIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Delivery</span>
          <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-auto" />
          <span className="text-xs text-muted-foreground">Order {orderNum} · $349</span>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600"
          onClick={() => setSendOpen(true)}
        >
          <SendIcon className="size-3.5" /> Send to client
        </Button>
      </div>

      <SendToClientDialog open={sendOpen} onOpenChange={setSendOpen} />

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_300px]">
          {/* LEFT — Property + Client + Order Item + Order metadata + Preflight + Archive */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <HomeIcon className="size-3 text-muted-foreground" />
                Property
              </div>
              <p className="mb-1 text-[11.5px] font-medium leading-tight">
                {card.address}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                <span>3 bd</span>
                <span className="text-muted-foreground/40">·</span>
                <span>2 ba</span>
                <span className="text-muted-foreground/40">·</span>
                <span>1,820 sqft</span>
                <span className="text-muted-foreground/40">·</span>
                <a className="cursor-pointer font-medium text-indigo-400 hover:underline">
                  Listing ↗
                </a>
              </div>
            </section>

            <section className="rounded-lg border bg-card p-4">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Client
              </h3>
              <div className="flex items-center gap-2">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-blue-500/20 text-xs text-blue-200">
                    HM
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Homes Realty</p>
                  <p className="truncate text-[10.5px] text-muted-foreground">
                    client@homes.com
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-[11px]">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-mono font-medium">+1 (904) 555-0142</dd>
                <dt className="text-muted-foreground">Brokerage</dt>
                <dd className="font-medium">Homes Realty Group</dd>
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium">May 2024</dd>
                <dt className="text-muted-foreground">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px]">repeat</Badge>
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px]">luxury</Badge>
                </dd>
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-4">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Order Item
              </h3>
              <ul className="space-y-2 text-[12px]">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold leading-tight">Walkthrough video</span>
                      <span className="font-mono text-[11px] text-foreground">$199</span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">
                      vertical + square outputs
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                      Auto captions included
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  <div className="flex flex-1 items-baseline justify-between gap-2">
                    <span className="font-semibold leading-tight">Listing photos · 12</span>
                    <span className="font-mono text-[11px] text-foreground">$99</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  <div className="flex flex-1 items-baseline justify-between gap-2">
                    <span className="font-semibold leading-tight">2D Floor Plan</span>
                    <span className="font-mono text-[11px] text-foreground">$51</span>
                  </div>
                </li>
              </ul>
              <Separator className="my-2.5" />
              <div className="flex items-baseline justify-between text-[11.5px]">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono font-semibold">$349.00</span>
              </div>
              <p className="mt-0.5 text-[10.5px] text-emerald-400">Paid · May 16</p>
            </section>

            <section className="rounded-lg border bg-card p-4">
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-muted-foreground">Order #</dt>
                <dd className="font-mono font-medium">{orderNum}</dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-medium">Form</dd>
                <dt className="text-muted-foreground">Shoot</dt>
                <dd className="font-medium">May 17 · 10:00 AM</dd>
                <dt className="text-muted-foreground">Shooter</dt>
                <dd className="font-medium">Marry Anderson</dd>
                <dt className="text-muted-foreground">Due</dt>
                <dd className="font-medium">{card.deadline}</dd>
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-4">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Preflight
              </h3>
              <ul className="space-y-1.5 text-[12px]">
                <PreflightItem ok label="All revisions resolved" />
                <PreflightItem ok label="Aspect ratio · 1080×1920" />
                <PreflightItem ok label="Duration ≤ 60s (58s)" />
                <PreflightItem ok label="Captions attached" />
                <PreflightItem ok label="Share link active" />
              </ul>
            </section>

            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <ArchiveIcon className="size-3.5" /> Archive order
            </Button>
          </aside>

          {/* CENTER — Deliverables grouped */}
          <div className="flex flex-col gap-4">
            <DeliverableGroup
              label="Photos"
              icon={CameraIcon}
              count={12}
              items={[
                {
                  id: "p1",
                  title: "Listing photos",
                  status: "ready",
                  meta: "12 shots · 24 MB · JPEG",
                },
              ]}
            />

            <DeliverableGroup
              label="2D Floor Plan"
              icon={LayoutGridIcon}
              count={1}
              items={[
                {
                  id: "f2d",
                  title: "Schematic floor plan",
                  status: "ready",
                  meta: "floorplan-2d.pdf · 1.2 MB",
                },
              ]}
            />

            <DeliverableGroup
              label="3D Floor Plan"
              icon={HomeIcon}
              count={0}
              items={[]}
              empty="Not included in this order"
            />

            <DeliverableGroup
              label="Video"
              icon={FilmIcon}
              count={2}
              items={[
                {
                  id: "v1",
                  title: "Walkthrough · vertical",
                  version: "v2",
                  status: "approved",
                  meta: "1080×1920 · 0:58 · 142 MB",
                  deliveredAt: "May 18 · 4:02 PM",
                },
                {
                  id: "v2",
                  title: "Walkthrough · square",
                  version: "v2",
                  status: "ready",
                  meta: "1080×1080 · 0:58 · 138 MB",
                },
              ]}
            />
          </div>

          {/* RIGHT — Share links + Activity log */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Share links · 1
                </h3>
                <Button variant="ghost" size="sm" className="h-6 text-[11px]">
                  <PlusIcon className="size-3" /> New link
                </Button>
              </div>
              <ShareLinkRow
                token="g7k9-x42"
                createdBy="Marry"
                createdAt="May 18"
                expiresAt="Jun 17"
                passwordProtected
                canDownload
              />
            </section>

            <section className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Activity log · {activityEvents.length}
                </h3>
                <Button variant="ghost" size="sm" className="h-6 text-[11px]">
                  <DownloadIcon className="size-3" /> Export
                </Button>
              </div>
              <ol className="relative">
                <span className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {activityEvents.map((ev) => {
                  const u = ev.userId ? users[ev.userId] : null;
                  const Icon = ev.icon;
                  return (
                    <li key={ev.id} className="relative mb-3.5 flex gap-2.5 last:mb-0">
                      <div
                        className={cn(
                          "relative z-10 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-card",
                          ev.iconTone
                        )}
                      >
                        <Icon className="size-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] leading-snug">
                          {u && <span className="font-semibold">{u.name} </span>}
                          <span className="text-muted-foreground">{ev.title}</span>
                        </div>
                        {ev.detail && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                            {ev.detail}
                          </p>
                        )}
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
                          {ev.time}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── DELIVERABLE GROUP (bullet list per kind) ────────────────────────────────
type DeliverableData = {
  id: string;
  title: string;
  version?: string;
  status: keyof typeof statusBadge;
  meta: string;
  deliveredAt?: string;
};

function DeliverableGroup({
  label,
  icon: Icon,
  count,
  items,
  empty,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  items: DeliverableData[];
  empty?: string;
}) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">· {count}</span>
      </div>
      {items.length === 0 ? (
        <p className="ml-5 text-[11px] italic text-muted-foreground/60">
          {empty ?? "—"}
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <DeliverableBullet key={it.id} item={it} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeliverableBullet({ item }: { item: DeliverableData }) {
  return (
    <li className="group/bullet flex items-start gap-2.5 rounded-md py-1.5 pr-1 transition-colors hover:bg-accent/30">
      <span
        className={cn(
          "mt-2 size-1.5 shrink-0 rounded-full",
          item.status === "approved" || item.status === "delivered" || item.status === "ready"
            ? "bg-emerald-500"
            : "bg-muted-foreground/40"
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px]">
          <span className="font-semibold">{item.title}</span>
          {item.version && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {item.version}
            </span>
          )}
          <span className="text-muted-foreground/40">·</span>
          <span
            className={cn(
              "font-mono text-[10px] font-semibold",
              item.status === "approved" || item.status === "delivered"
                ? "text-emerald-400"
                : item.status === "ready"
                ? "text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            {item.status.replace("_", " ")}
          </span>
        </div>
        <p className="truncate font-mono text-[10.5px] text-muted-foreground">
          {item.meta}
        </p>
        {item.deliveredAt && (
          <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400">
            <SendIcon className="size-2.5" /> Delivered {item.deliveredAt}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/bullet:opacity-100">
        <Button variant="ghost" size="icon-sm" className="size-6" title="Download">
          <DownloadIcon className="size-3" />
        </Button>
      </div>
    </li>
  );
}

const statusBadge: Record<string, string> = {
  not_started: "border-border bg-muted text-muted-foreground",
  in_progress: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  review:      "border-amber-500/20 bg-amber-500/10 text-amber-400",
  approved:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  ready:       "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  delivered:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

// ── SHARE LINK ──────────────────────────────────────────────────────────────
function ShareLinkRow({
  token,
  createdBy,
  createdAt,
  expiresAt,
  passwordProtected,
  canDownload,
}: {
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  passwordProtected?: boolean;
  canDownload?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const url = `https://review.odone.com/s/${token}`;
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
        <code className="flex-1 truncate font-mono text-[11px]">{url}</code>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch {}
          }}
        >
          {copied ? (
            <CheckIcon className="size-3 text-emerald-500" />
          ) : (
            <CopyIcon className="size-3" />
          )}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
        <span>By {createdBy} · {createdAt}</span>
        <span className="text-muted-foreground/40">•</span>
        <span>Expires {expiresAt}</span>
        {passwordProtected && (
          <>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-0.5">
              <LockIcon className="size-2.5" /> Password
            </span>
          </>
        )}
        {canDownload && (
          <>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-0.5">
              <DownloadIcon className="size-2.5" /> Download
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function PreflightItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CircleCheckBigIcon className="size-3.5 shrink-0 fill-emerald-500 stroke-[2.5px] text-background" />
      ) : (
        <span className="size-3.5 rounded-full border" />
      )}
      <span>{label}</span>
    </li>
  );
}

// ── SHARED PIECES ───────────────────────────────────────────────────────────
function CollapsibleSection({
  icon: Icon,
  label,
  open,
  onToggle,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className="group/cs mb-2 flex w-full items-center justify-between gap-2 rounded-md py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRightIcon
            className={cn(
              "size-3 transition-transform",
              open && "rotate-90"
            )}
          />
          <Icon className="size-3.5" />
          {label}
        </span>
        {action}
      </button>
      {open && children}
    </section>
  );
}

function AssetRow({
  Icon,
  iconClass,
  title,
  meta,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-accent">
      <div className={cn("grid size-7 shrink-0 place-items-center rounded", iconClass)}>
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-medium">{title}</div>
        <div className="text-[9px] text-muted-foreground">{meta}</div>
      </div>
      <ExternalLinkIcon className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function PersonRow({
  initials,
  tone,
  name,
  role,
}: {
  initials: string;
  tone: string;
  name: string;
  role: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-5">
        <AvatarFallback className={cn("text-[8.5px]", tone)}>{initials}</AvatarFallback>
      </Avatar>
      <span className="flex-1 text-[11px] font-medium">{name}</span>
      <span className="font-medium uppercase tracking-wider text-[9px] text-muted-foreground">
        {role}
      </span>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-6 rounded-md px-2.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function FeedbackRow({
  accent,
  done,
  locked,
  time,
  author,
  text,
}: {
  accent?: boolean;
  done?: boolean;
  locked?: boolean;
  time: string;
  author: string;
  text: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(text);

  return (
    <div
      className={cn(
        "group relative cursor-pointer px-3 py-2.5",
        accent && "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]",
        !accent && !done && "hover:bg-accent/40",
        done && "hover:bg-accent/30",
        locked && "opacity-80"
      )}
    >
      {accent && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400/80" />
      )}
      <div className="flex items-start gap-2">
        <button
          disabled={locked}
          className={cn(
            "mt-[3px] grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors",
            done
              ? "border-emerald-500 bg-emerald-500/80"
              : "border-muted-foreground/50 hover:border-emerald-500 hover:bg-emerald-500/20",
            locked && "cursor-not-allowed"
          )}
          onClick={(e) => e.stopPropagation()}
          title={done ? "Mark as undone" : "Mark as done"}
        >
          {done && <CheckIcon className="size-2.5 text-black" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                "rounded px-1 font-mono text-[10px] leading-[1.4]",
                done
                  ? "bg-muted font-medium text-muted-foreground"
                  : "border bg-muted font-bold"
              )}
            >
              {time}
            </span>
            <span
              className={cn(
                "truncate text-[10px]",
                done ? "text-muted-foreground/60" : "text-muted-foreground"
              )}
            >
              {author}
            </span>
          </div>
          {editing ? (
            <div className="mt-1 space-y-1.5" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={2}
                className="block w-full resize-none rounded border bg-background px-2 py-1.5 text-[12.5px] outline-none focus:border-foreground/40"
                autoFocus
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  className="h-6 px-2 text-[10.5px]"
                  onClick={() => setEditing(false)}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10.5px]"
                  onClick={() => {
                    setValue(text);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                "text-[12.5px] leading-snug",
                done ? "text-muted-foreground line-through" : "text-foreground"
              )}
            >
              {value}
            </p>
          )}
        </div>
        {!locked && !editing && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Reply"
              onClick={(e) => e.stopPropagation()}
            >
              <CornerUpLeftIcon className="size-3" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    onClick={(e) => e.stopPropagation()}
                    title="More"
                    className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                  />
                }
              >
                <MoreHorizontalIcon className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Stage-view skeletons. Used during the 220ms first-paint flicker when the
// dialog opens or the selected card changes. Silhouettes match the real
// view dimensions so the swap is stable, not a layout jolt.
// ════════════════════════════════════════════════════════════════════════════

function BriefViewSkeleton() {
  return (
    <div className="flex flex-1 flex-col min-h-0" aria-busy="true">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[640px] flex-col gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          {/* Hero quote silhouette */}
          <section className="rounded-xl border bg-card p-6">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </section>
          {/* 4 stacked brief card silhouettes */}
          {Array.from({ length: 4 }).map((_, i) => (
            <section key={i} className="rounded-xl border bg-card p-4">
              <Skeleton className="mb-2 h-3 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-5/6" />
            </section>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-[640px] items-center justify-end gap-2">
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function UploadViewSkeleton() {
  return (
    <div className="flex flex-1 flex-col min-h-0" aria-busy="true">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[640px] flex-col gap-4">
          {/* Brief summary silhouette */}
          <section className="rounded-xl border bg-card p-4">
            <Skeleton className="mb-2 h-3 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-2/3" />
          </section>
          {/* Drop-zone silhouette (rounded-2xl) */}
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-[640px] items-center justify-end gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function ReviewViewSkeleton({ leftCollapsed }: { leftCollapsed: boolean }) {
  return (
    <div className="flex flex-1 min-h-0" aria-busy="true">
      {/* Left pane — 240px brief stack */}
      {!leftCollapsed && (
        <aside className="hidden w-60 shrink-0 flex-col gap-3 border-r border-border bg-card/40 px-4 py-4 md:flex">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </aside>
      )}
      {/* Center — video frame */}
      <div className="flex flex-1 min-w-0 flex-col gap-3 px-4 py-4">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ml-auto h-7 w-7 rounded-full" />
        </div>
      </div>
      {/* Right — feedback rows */}
      <aside className="hidden w-72 shrink-0 flex-col gap-2 border-l border-border bg-card/40 px-4 py-4 lg:flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="ml-auto h-3 w-10" />
            </div>
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-3/4" />
          </div>
        ))}
      </aside>
    </div>
  );
}

function DeliverViewSkeleton() {
  return (
    <div className="flex flex-1 flex-col min-h-0" aria-busy="true">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[640px] flex-col gap-4">
          {/* Portrait video silhouette */}
          <div className="flex justify-center">
            <Skeleton className="aspect-[9/16] w-48 rounded-2xl" />
          </div>
          {/* 1-row deliverable */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-md" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-[640px] items-center justify-end gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>
    </div>
  );
}
