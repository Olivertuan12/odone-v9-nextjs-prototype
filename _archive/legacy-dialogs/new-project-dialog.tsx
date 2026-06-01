"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  CircleCheckBigIcon,
  CloudUploadIcon,
  SendIcon,
  FileTextIcon,
  FilmIcon,
  LinkIcon,
  MapPinIcon,
  PlaneIcon,
  SearchIcon,
  SparklesIcon,
  MegaphoneIcon,
  ClockIcon,
  MusicIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── DATA ────────────────────────────────────────────────────────────────────
type Source = "event" | "manual";
type VideoKind = "premium" | "walkthrough" | "cinematic";
type AssetKind = "photo" | "video" | "drone" | "other";

type CalendarEvent = {
  id: string;
  date: string;
  time: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
};

// Events that haven't been turned into orders yet
const eventsWithoutOrders: CalendarEvent[] = [
  { id: "evt1", date: "May 21", time: "9:00 AM",  address: "88 Coastal Way",     city: "St. Johns", state: "FL",  zip: "32259", clientName: "Coastal Realty",   clientEmail: "ops@coastal-realty.com", clientPhone: "+1 (904) 555-0188" },
  { id: "evt2", date: "May 22", time: "11:30 AM", address: "1245 River Rd",      city: "Jacksonville", state: "FL", zip: "32207", clientName: "Beachside Group", clientEmail: "team@beachside.co",      clientPhone: "+1 (904) 555-0245" },
  { id: "evt3", date: "May 23", time: "2:00 PM",  address: "33 Marina Ave",      city: "Ponte Vedra Beach", state: "FL", zip: "32082", clientName: "Homes Realty",  clientEmail: "client@homes.com",       clientPhone: "+1 (904) 555-0142" },
  { id: "evt4", date: "May 24", time: "10:00 AM", address: "77 Harbor Point",    city: "Jacksonville Beach", state: "FL", zip: "32250", clientName: "Tide Realty", clientEmail: "hello@tide-realty.com",  clientPhone: "+1 (904) 555-0301" },
  { id: "evt5", date: "May 25", time: "8:30 AM",  address: "501 Magnolia Ave",   city: "St. Augustine", state: "FL", zip: "32084", clientName: "Pine Group",    clientEmail: "ops@pinegroup.realestate", clientPhone: "+1 (904) 555-0414" },
];

const videoKinds: { id: VideoKind; label: string; desc: string; price: string }[] = [
  { id: "walkthrough", label: "Walkthrough", desc: "Standard property walkthrough", price: "$249" },
  { id: "premium",     label: "Premium",     desc: "Walkthrough + drone + b-roll",  price: "$499" },
  { id: "cinematic",   label: "Cinematic",   desc: "Story-driven cinematic edit",   price: "$799" },
];

type Reference = {
  id: string;
  method: "link" | "file";
  kind: AssetKind;
  name: string;
  // For link: the URL. For file: the File name.
  value: string;
  fileSize?: number;
};

type FormData = {
  source: Source | null;
  eventId: string | null;
  address: string;
  videoKind: VideoKind | null;
  shootDate: string;
  /** v12: art-direction Brief — shown in editor's AwaitingUploadView header card. */
  notes: string;
  /** v12: optional music reference link (YouTube / Spotify) editors can preview. */
  musicReference: string;
  script: string;
  useReference: boolean;
  references: Reference[];
  editorId: string | null;
  vendorEmail: string;
  pickedEvent: CalendarEvent | null;
};

const today = () => new Date().toISOString().slice(0, 10);

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const initialData = (): FormData => ({
  source: null,
  eventId: null,
  address: "",
  videoKind: "walkthrough",
  shootDate: today(),
  notes: "",
  musicReference: "",
  script: "",
  useReference: false,
  references: [],
  editorId: null,
  vendorEmail: "",
  pickedEvent: null,
});

// ── DIALOG ──────────────────────────────────────────────────────────────────
export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState<FormData>(initialData);

  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(0);
        setData(initialData());
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const pickEvent = (evt: CalendarEvent) => {
    setData((d) => ({
      ...d,
      eventId: evt.id,
      pickedEvent: evt,
      address: `${evt.address}, ${evt.city}, ${evt.state} ${evt.zip}`,
    }));
  };

  // v12: split the old "Extras" step into "Brief" (art direction — what the
  // editor reads in their first-glance view) and "Script" (the actual
  // voiceover / scene breakdown). Mirrors what an editor sees inside
  // EditorDetailDialog → AwaitingUploadView so the manager submits exactly
  // the fields the editor will be looking for.
  const steps = ["Source", "Details", "Brief", "Script", "Files", "Confirm"];

  const canContinue = (() => {
    if (step === 0) {
      if (!data.source) return false;
      if (data.source === "event" && !data.eventId) return false;
      return true;
    }
    if (step === 1) return !!(data.address && data.videoKind && data.shootDate);
    return true;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] max-h-[820px] w-full max-w-[560px] flex-col gap-0 overflow-hidden p-0 sm:h-[92vh] sm:max-w-[560px] sm:rounded-2xl"
      >
        {/* ── TOP CHROME: Back/Cancel · Title · Close ── */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-4">
          {step > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ArrowLeftIcon className="size-3.5" /> Back
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}

          <h2 className="text-[17px] font-semibold">New project</h2>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            title="Close"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {/* ── COMPACT STEP INDICATOR — only current expanded with label, others as small dots ── */}
        <div className="flex shrink-0 items-center justify-center gap-2 pt-5 pb-4">
          {steps.map((label, i) => {
            const isCurrent = i === step;
            const isPast = i < step;
            return (
              <React.Fragment key={label}>
                {isCurrent ? (
                  // Current step: expanded pill with label
                  <div className="inline-flex h-7 items-center gap-2 rounded-full bg-foreground px-3 text-background">
                    <span className="grid size-4 place-items-center rounded-full bg-background/15 text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                ) : (
                  // Other steps: small dot only
                  <div
                    className={cn(
                      "grid size-2 place-items-center rounded-full transition-colors",
                      isPast ? "bg-foreground" : "bg-muted-foreground/30"
                    )}
                    title={`${i + 1}. ${label}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── BODY (centered, max-w container) ── */}
        <div className="flex-1 overflow-y-auto border-t px-5 py-6 sm:px-10">
          <div className="mx-auto max-w-[520px]">
            {step === 0 && (
              <SourceStep
                source={data.source}
                eventId={data.eventId}
                onSourceChange={(s) => update("source", s)}
                onPickEvent={pickEvent}
              />
            )}
            {step === 1 && <DetailsStep data={data} update={update} />}
            {step === 2 && <BriefStep data={data} update={update} />}
            {step === 3 && <ExtrasStep data={data} update={update} />}
            {step === 4 && <FilesStep data={data} update={update} />}
            {step === 5 && <ConfirmStep data={data} update={update} />}
          </div>
        </div>

        {/* ── FOOTER: only Continue (or Create + Duplicate on confirm) centered ── */}
        <footer className="flex shrink-0 items-center justify-center gap-2 border-t bg-background px-5 py-4">
          {step < steps.length - 1 ? (
            <Button
              size="lg"
              className="min-w-[220px] gap-1.5"
              disabled={!canContinue}
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            >
              Continue
              <ArrowRightIcon className="size-4" />
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                className="gap-1.5"
                disabled={!isValidEmail(data.vendorEmail)}
                title={
                  !isValidEmail(data.vendorEmail)
                    ? "Enter vendor email to send"
                    : "Generates link + sends to external vendor"
                }
                onClick={() => {
                  onOpenChange(false);
                  toast.success("Sent to vendor", {
                    description: `Private link emailed to ${data.vendorEmail}.`,
                  });
                }}
              >
                <SendIcon className="size-4" />
                Send to vendor
              </Button>
              <Button
                size="lg"
                className="min-w-[220px] gap-1.5 bg-emerald-500 text-black hover:bg-emerald-600 disabled:bg-emerald-500/30 disabled:text-black/40"
                disabled={!data.editorId}
                title={!data.editorId ? "Assign an internal editor first" : "Create project"}
                onClick={() => {
                  const ed = editors.find((e) => e.id === data.editorId);
                  onOpenChange(false);
                  toast.success("Project created", {
                    description: `${data.address || "New order"} assigned to ${ed?.name ?? "team"}.`,
                  });
                }}
              >
                <CheckIcon className="size-4" /> Create Project
              </Button>
            </>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}

// ── STEP 1: SOURCE ──────────────────────────────────────────────────────────
function SourceStep({
  source,
  eventId,
  onSourceChange,
  onPickEvent,
}: {
  source: Source | null;
  eventId: string | null;
  onSourceChange: (s: Source) => void;
  onPickEvent: (e: CalendarEvent) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eventsWithoutOrders;
    return eventsWithoutOrders.filter(
      (e) =>
        e.address.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.clientName.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h3 className="text-lg font-semibold">How do you want to start?</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Pick a calendar event without an order yet, or create from scratch.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SourceCard
          icon={CalendarIcon}
          label="From calendar event"
          desc="Use an event that hasn't been turned into an order yet."
          active={source === "event"}
          onClick={() => onSourceChange("event")}
        />
        <SourceCard
          icon={SparklesIcon}
          label="Start from scratch"
          desc="Type the address manually."
          active={source === "manual"}
          onClick={() => onSourceChange("manual")}
        />
      </div>

      {source === "event" && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by address, city, or client…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Events without an order · {filtered.length}
          </p>
          <div className="flex max-h-[260px] flex-col gap-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-[11px] italic text-muted-foreground">
                No matching events
              </p>
            ) : (
              filtered.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => onPickEvent(evt)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-accent/40",
                    eventId === evt.id && "border-foreground ring-1 ring-foreground"
                  )}
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <CalendarIcon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{evt.address}</p>
                    <p className="truncate text-[10.5px] text-muted-foreground">
                      {evt.clientName} · {evt.date} · {evt.time}
                    </p>
                  </div>
                  {eventId === evt.id && (
                    <CircleCheckBigIcon className="size-4 shrink-0 fill-emerald-500 stroke-[2.5px] text-background" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SourceCard({
  icon: Icon,
  label,
  desc,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/40",
        active && "border-foreground ring-1 ring-foreground"
      )}
    >
      <Icon className="size-5 text-muted-foreground" />
      <div>
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

// ── STEP 2: DETAILS — minimal: Address + Video + Shoot date ─────────────────
type Updater = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

function DetailsStep({ data, update }: { data: FormData; update: Updater }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Event summary if picked */}
      {data.pickedEvent && (
        <div className="rounded-lg border bg-muted/40 p-3 text-[11.5px]">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <CalendarIcon className="size-3" /> From calendar event
          </div>
          <p className="font-semibold">{data.pickedEvent.address}</p>
          <p className="text-muted-foreground">
            {data.pickedEvent.clientName} · {data.pickedEvent.clientPhone}
            {" · "}
            {data.pickedEvent.date} {data.pickedEvent.time}
          </p>
        </div>
      )}

      <Section icon={MapPinIcon} title="Address">
        <Input
          autoFocus={!data.pickedEvent}
          placeholder="123 Ocean Blvd, Jacksonville, FL 32224"
          value={data.address}
          onChange={(e) => update("address", e.target.value)}
          className="h-10 text-[13px]"
        />
      </Section>

      <Section icon={FilmIcon} title="Video">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {videoKinds.map((k) => (
            <button
              key={k.id}
              onClick={() => update("videoKind", k.id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-accent/40",
                data.videoKind === k.id && "border-foreground ring-1 ring-foreground"
              )}
            >
              <span className="text-[12.5px] font-semibold capitalize">{k.label}</span>
              <span className="text-[10.5px] text-muted-foreground">{k.desc}</span>
              <span className="mt-0.5 font-mono text-[10.5px] font-bold">{k.price}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section icon={CalendarIcon} title="Shoot date">
        <Input
          type="date"
          value={data.shootDate}
          onChange={(e) => update("shootDate", e.target.value)}
          className="h-10 text-[13px]"
        />
        <p className="text-[10.5px] text-muted-foreground">
          Defaults to today. Delivery time uses your workspace setting.
        </p>
      </Section>
    </div>
  );
}

// ── STEP 3: BRIEF — art direction the editor reads first ──────────────────
// Captures what the editor sees in EditorDetailDialog → AwaitingUploadView's
// "Brief" card. Splits the old "Extras" → "Brief" + "Script" so the manager
// is forced to think about style/length/highlights separately from the
// actual script lines.
const BRIEF_PRESETS = [
  "Trendy music (not cinematic)",
  "Auto captions OK — no manual",
  "Highlight kitchen + exterior",
  "Soft, calm vibe",
  "Drone reveal at the end",
] as const;

const LENGTH_PRESETS = ["30s", "60s", "90s", "120s"] as const;

function BriefStep({ data, update }: { data: FormData; update: Updater }) {
  const togglePreset = (text: string) => {
    const current = data.notes ?? "";
    if (current.includes(text)) {
      // Remove it (and any leading punctuation/space we might have added)
      const next = current
        .replace(new RegExp(`\\s*[.·•]?\\s*${escapeRegExp(text)}\\s*`, "g"), " ")
        .replace(/\s+/g, " ")
        .trim();
      update("notes", next);
    } else {
      const sep = current.trim() ? " · " : "";
      update("notes", `${current.trim()}${sep}${text}`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Section icon={MegaphoneIcon} title="Art direction">
        <Textarea
          autoFocus
          placeholder="What should the editor know first? Music style · highlights · vibe…"
          value={data.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="min-h-[120px] text-[12.5px]"
        />
        <p className="text-[10.5px] text-muted-foreground">
          This shows up in the editor's first-glance Brief card.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {BRIEF_PRESETS.map((preset) => {
            const active = data.notes?.includes(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => togglePreset(preset)}
                className={cn(
                  "inline-flex h-6 items-center rounded-full border px-2 text-[10.5px] font-medium transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
              >
                {active ? "✓ " : "+ "}
                {preset}
              </button>
            );
          })}
        </div>
      </Section>

      <Section icon={ClockIcon} title="Length target">
        <div className="flex flex-wrap gap-1.5">
          {LENGTH_PRESETS.map((preset) => {
            const active = data.notes?.includes(`Length ≤ ${preset}`);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => togglePreset(`Length ≤ ${preset}`)}
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
      </Section>

      <Section icon={MusicIcon} title="Music reference (optional)">
        <Input
          placeholder="YouTube / Spotify / SoundCloud link — for editors to match the vibe"
          value={data.musicReference ?? ""}
          onChange={(e) => update("musicReference", e.target.value)}
          className="h-10 text-[13px]"
        />
      </Section>
    </div>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── STEP 4: SCRIPT — Script + reference toggle ──────────────────────────────
function ExtrasStep({ data, update }: { data: FormData; update: Updater }) {
  return (
    <div className="flex flex-col gap-4">
      <Section icon={FileTextIcon} title="Script">
        <Textarea
          placeholder="Voiceover lines, scene breakdown, or captions…"
          value={data.script}
          onChange={(e) => update("script", e.target.value)}
          className="min-h-[140px] text-[12.5px]"
        />
      </Section>

      <Section icon={SparklesIcon} title="Client reference">
        <label className="flex items-start gap-2 rounded-lg border bg-card p-3 cursor-pointer transition-colors hover:bg-accent/30">
          <Checkbox
            id="useReference"
            name="useReference"
            checked={data.useReference}
            onCheckedChange={(c) => update("useReference", c === true)}
            className="mt-0.5"
          />
          <span className="flex-1 text-[12.5px] leading-snug">
            <span className="font-medium">Pull reference from past projects</span>
            <span className="block text-[10.5px] text-muted-foreground">
              Apply style, music, and color preferences from this client's prior orders.
            </span>
          </span>
        </label>
      </Section>
    </div>
  );
}

// ── STEP 4: FILES — Asset kind + Link / File toggle ─────────────────────────
const assetKinds: {
  id: AssetKind;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: { active: string; idle: string };
}[] = [
  { id: "photo", label: "Photo", icon: CameraIcon,
    tone: {
      active: "border-rose-500/60 bg-rose-500/15 text-rose-300",
      idle: "hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-300",
    },
  },
  { id: "video", label: "Video", icon: FilmIcon,
    tone: {
      active: "border-blue-500/60 bg-blue-500/15 text-blue-300",
      idle: "hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-300",
    },
  },
  { id: "drone", label: "Drone", icon: PlaneIcon,
    tone: {
      active: "border-indigo-500/60 bg-indigo-500/15 text-indigo-300",
      idle: "hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-indigo-300",
    },
  },
  { id: "other", label: "Other", icon: FileTextIcon,
    tone: {
      active: "border-amber-500/60 bg-amber-500/15 text-amber-300",
      idle: "hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-300",
    },
  },
];

function detectProvider(url: string): string | null {
  const u = url.trim().toLowerCase();
  if (!u) return null;
  if (u.includes("dropbox.com")) return "Dropbox";
  if (u.includes("drive.google.com") || u.includes("docs.google.com")) return "Drive";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (/^https?:\/\//.test(u)) return "Generic";
  return null;
}

function FilesStep({ data, update }: { data: FormData; update: Updater }) {
  // Inline-add state: which method, current kind, current value, file
  const [adding, setAdding] = React.useState<"link" | "file" | null>(null);
  const [draftKind, setDraftKind] = React.useState<AssetKind>("video");
  const [draftName, setDraftName] = React.useState("");
  const [draftLink, setDraftLink] = React.useState("");
  const [draftFile, setDraftFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetDraft = () => {
    setDraftKind("video");
    setDraftName("");
    setDraftLink("");
    setDraftFile(null);
    setAdding(null);
  };

  const saveDraft = () => {
    if (adding === "link" && draftLink) {
      update("references", [
        ...data.references,
        {
          id: `r${Date.now()}`,
          method: "link",
          kind: draftKind,
          name: draftName || draftLink,
          value: draftLink,
        },
      ]);
      resetDraft();
    } else if (adding === "file" && draftFile) {
      update("references", [
        ...data.references,
        {
          id: `r${Date.now()}`,
          method: "file",
          kind: draftKind,
          name: draftName || draftFile.name,
          value: draftFile.name,
          fileSize: draftFile.size,
        },
      ]);
      resetDraft();
    }
  };

  const removeRef = (id: string) => {
    update(
      "references",
      data.references.filter((r) => r.id !== id)
    );
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setDraftFile(f);
  };

  const provider = detectProvider(draftLink);

  return (
    <div className="flex flex-col gap-4">
      <Section icon={CloudUploadIcon} title="Reference assets (optional)">
        {/* Existing references list */}
        {data.references.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {data.references.map((r) => {
              const k = assetKinds.find((x) => x.id === r.kind)!;
              const KIcon = k.icon;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5"
                >
                  <KIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="inline-flex items-center rounded-full border bg-muted px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </span>
                  {r.method === "link" ? (
                    <LinkIcon className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <CloudUploadIcon className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium" title={r.name}>
                      {r.name}
                    </p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground" title={r.value}>
                      {r.value}
                    </p>
                  </div>
                  {r.fileSize !== undefined && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {(r.fileSize / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRef(r.id)}
                    className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Remove"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add picker — Link or File */}
        {adding === null ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdding("link")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent/30 hover:text-foreground"
            >
              <LinkIcon className="size-3.5" /> Add link
            </button>
            <button
              type="button"
              onClick={() => setAdding("file")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent/30 hover:text-foreground"
            >
              <CloudUploadIcon className="size-3.5" /> Add file
            </button>
          </div>
        ) : (
          // Inline draft form — centered, bigger color chips, name field, only X to cancel
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {adding === "link" ? "New link" : "New file"}
              </span>
              <button
                type="button"
                onClick={resetDraft}
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Cancel"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>

            {/* Kind chips — bigger + colored when active */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-medium text-muted-foreground">What kind?</p>
              <div className="grid grid-cols-4 gap-2">
                {assetKinds.map((k) => {
                  const Icon = k.icon;
                  const active = draftKind === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setDraftKind(k.id)}
                      className={cn(
                        "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-background text-[11.5px] font-medium transition-colors",
                        active ? k.tone.active : cn("text-muted-foreground", k.tone.idle)
                      )}
                    >
                      <Icon className="size-5" />
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name field — describe the asset */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">
                Name <span className="font-normal text-muted-foreground/60">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Kitchen reference reel"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="h-9 text-[13px]"
              />
            </div>

            {/* Value: URL or file */}
            {adding === "link" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">URL</label>
                <InputGroup>
                  <InputGroupAddon>
                    <LinkIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    autoFocus
                    placeholder="Paste a Dropbox / Drive / YouTube URL…"
                    value={draftLink}
                    onChange={(e) => setDraftLink(e.target.value)}
                  />
                  {draftLink && (
                    <InputGroupAddon align="inline-end">
                      {provider ? (
                        <span className="inline-flex h-5 items-center rounded-full border bg-card px-1.5 text-[10px] font-semibold">
                          {provider}
                        </span>
                      ) : (
                        <InputGroupButton size="xs">Test</InputGroupButton>
                      )}
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <p className="text-[10.5px] text-muted-foreground">
                  Make sure the link is shareable — viewers shouldn&apos;t need to request access.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">File</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed py-5 transition-colors",
                    dragging
                      ? "border-foreground/40 bg-accent/40"
                      : draftFile
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border hover:border-foreground/30 hover:bg-accent/30"
                  )}
                >
                  {draftFile ? (
                    <>
                      <CircleCheckBigIcon className="size-5 fill-emerald-500 stroke-[2.5px] text-background" />
                      <p className="text-[12.5px] font-medium">{draftFile.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {(draftFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <CloudUploadIcon className="size-5 text-muted-foreground" />
                      <p className="text-[12.5px] font-medium">
                        {dragging ? "Drop file here" : "Drop a file or click to browse"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Any size, any format</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setDraftFile(e.target.files?.[0] ?? null)}
                  />
                </button>
              </div>
            )}

            {/* Single primary action — no Cancel (use X above) */}
            <Button
              size="default"
              className="w-full"
              disabled={adding === "link" ? !draftLink : !draftFile}
              onClick={saveDraft}
            >
              Add to references
            </Button>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── STEP 5: CONFIRM ─────────────────────────────────────────────────────────
// Mock editors (matching the users in editor-data)
const editors = [
  { id: "MA", name: "Marry Anderson", role: "Lead Editor" },
  { id: "RZ", name: "RienzZzy",       role: "Senior Editor" },
  { id: "MJ", name: "MJ Pereira",     role: "Support" },
  { id: "KY", name: "Kyle Norman",    role: "Manager" },
];

function ConfirmStep({ data, update }: { data: FormData; update: Updater }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Review and create</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Check the details below, then create the project.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <dl className="grid grid-cols-1 gap-y-3 text-[12.5px] sm:grid-cols-[100px_1fr] sm:gap-x-4 sm:gap-y-2">
          <SummaryRow
            label="Source"
            value={
              data.source === "event"
                ? "Calendar event"
                : data.source === "manual"
                ? "Manual entry"
                : "—"
            }
          />
          <SummaryRow label="Address" value={data.address || "—"} />
          <SummaryRow
            label="Video"
            value={videoKinds.find((v) => v.id === data.videoKind)?.label ?? "—"}
          />
          <SummaryRow label="Shoot" value={data.shootDate || "—"} />
          {data.pickedEvent && (
            <SummaryRow
              label="Client"
              value={data.pickedEvent.clientName}
              sub={data.pickedEvent.clientPhone}
            />
          )}
          <SummaryRow
            label="Script"
            value={data.script ? `${data.script.slice(0, 60)}${data.script.length > 60 ? "…" : ""}` : "—"}
          />
          <SummaryRow
            label="Reference"
            value={data.useReference ? "Pull from past projects" : "—"}
          />
          <SummaryRow
            label="Files"
            value={
              data.references.length
                ? `${data.references.length} ${data.references.length === 1 ? "item" : "items"}`
                : "—"
            }
            sub={
              data.references.length
                ? data.references
                    .map((r) =>
                      `${assetKinds.find((k) => k.id === r.kind)?.label} · ${
                        r.method === "link" ? r.value : r.value
                      }`
                    )
                    .slice(0, 3)
                    .join("\n") + (data.references.length > 3 ? `\n+${data.references.length - 3} more` : "")
                : undefined
            }
          />
        </dl>
      </div>

      {/* Assign internal editor */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
          Assign to internal editor
        </h4>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Pick a teammate to take this order. Required to create the project.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {editors.map((ed) => {
            const active = data.editorId === ed.id;
            return (
              <button
                key={ed.id}
                type="button"
                onClick={() => update("editorId", active ? null : ed.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-left transition-colors hover:bg-accent/40",
                  active && "border-foreground ring-1 ring-foreground"
                )}
              >
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold">
                  {ed.id}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold">{ed.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{ed.role}</p>
                </div>
                {active && (
                  <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Send to external vendor */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
          Send to external vendor
        </h4>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Outsource this order — generates a private link the external editor
          can use to access assets and submit work back.
        </p>
        <Input
          type="email"
          placeholder="vendor@example.com"
          value={data.vendorEmail}
          onChange={(e) => update("vendorEmail", e.target.value)}
          className="h-9 text-[12.5px]"
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Due date is auto-set to 24h after shoot using your workspace setting.
      </p>
    </div>
  );
}

// ── HELPERS ─────────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </div>
      {children}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <>
      <dt className="text-[10.5px] uppercase tracking-wider text-muted-foreground sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0">
        <p className="break-words font-medium">{value}</p>
        {sub && <p className="text-[10.5px] text-muted-foreground">{sub}</p>}
      </dd>
    </>
  );
}
