import { CameraIcon, FilmIcon, PlaneIcon } from "lucide-react";

export type EditorSpecialty = "video" | "photo" | "both";

export type User = {
  id: string;
  name: string;
  role: string;
  image: string;
  initials: string;
  tone: string;
  /** Editor specialty — drives which jobs get suggested to whom in the
   *  Assign dialog. Manager and other roles leave this undefined. */
  specialty?: EditorSpecialty;
};

export const users: Record<string, User> = {
  MA: { id: "MA", name: "Marry Anderson", role: "Lead Editor",   image: "https://i.pravatar.cc/150?u=marry", initials: "MA", tone: "bg-emerald-500/20 text-emerald-200", specialty: "photo" },
  RZ: { id: "RZ", name: "RienzZzy",       role: "Senior Editor", image: "https://i.pravatar.cc/150?u=rienz", initials: "RZ", tone: "bg-rose-500/20 text-rose-200",       specialty: "video" },
  MJ: { id: "MJ", name: "MJ Pereira",     role: "Support",       image: "https://i.pravatar.cc/150?u=mj",    initials: "MJ", tone: "bg-amber-500/20 text-amber-200",     specialty: "both" },
  VE: { id: "VE", name: "Vendor Editor (Ext)", role: "Vendor",  image: "https://i.pravatar.cc/150?u=vendor", initials: "VE", tone: "bg-purple-500/20 text-purple-200", specialty: "both" },
  KY: { id: "KY", name: "Kyle Norman",    role: "Manager",       image: "https://i.pravatar.cc/150?u=kyle",  initials: "KY", tone: "bg-indigo-500/20 text-indigo-200" },
};

// Group video-ish vs photo-ish item kinds for editor suggestion in AssignDialog.
export const VIDEO_KINDS = new Set(["video", "carousel", "3d_tour"]);
export const PHOTO_KINDS = new Set(["photo", "drone", "floor_plan", "twilight", "virtual_staging"]);

export type Tone = "neutral" | "blue" | "amber" | "emerald" | "rose";

export type MediaType = "Walkthrough" | "Drone" | "Photo";

export const mediaIcons: Record<MediaType, React.ComponentType<{ className?: string }>> = {
  Walkthrough: FilmIcon,
  Drone: PlaneIcon,
  Photo: CameraIcon,
};

export type StatusKind = "in-process" | "done" | "overdue";

export type Card = {
  id: string;
  title: string;
  address: string;
  type: MediaType;
  version?: string;
  status: { label: string; tone: Tone; kind?: StatusKind };
  deadline: string;
  editTime?: string;
  notes?: { current: number; total: number };
  assignees: string[];
  tone: Tone;
  pulse?: boolean;
  dimmed?: boolean;
  overdue?: boolean;
};

export type Column = {
  key: string;
  title: string;
  tone: Tone;
  count: number;
  cards: Card[];
  showAdd?: boolean;
  emptyAdd?: boolean;
};

export const columns: Column[] = [
  {
    key: "pending",
    title: "Pending",
    tone: "neutral",
    count: 2,
    showAdd: true,
    emptyAdd: true,
    cards: [
      { id: "yorkshire",  title: "45 Yorkshire Dr",   address: "St. Augustine, FL 32092",       type: "Walkthrough",                status: { label: "Pending", tone: "neutral" }, deadline: "May 19", assignees: ["MA"], tone: "neutral" },
      { id: "lighthouse", title: "200 Lighthouse Cir", address: "Vilano Beach, FL 32084",       type: "Walkthrough",                status: { label: "Pending", tone: "neutral" }, deadline: "May 20", assignees: ["RZ"], tone: "neutral" },
    ],
  },
  {
    key: "working",
    title: "Working On",
    tone: "blue",
    count: 2,
    cards: [
      { id: "beach-blvd", title: "13364 Beach Blvd", address: "Jacksonville, FL 32224", type: "Walkthrough", version: "v1", status: { label: "Editing", tone: "blue" }, deadline: "May 19", editTime: "14h", assignees: ["RZ", "MJ"], tone: "blue" },
      { id: "coastal",    title: "88 Coastal Way",   address: "St. Johns, FL 32259",     type: "Drone",        version: "v1", status: { label: "Editing", tone: "blue" }, deadline: "May 21", editTime: "6h",  assignees: ["MJ"],       tone: "blue" },
    ],
  },
  {
    key: "revision",
    title: "Revision",
    tone: "amber",
    count: 3,
    cards: [
      { id: "ocean",    title: "245 Ocean Blvd",    address: "Jacksonville Beach, FL 32250", type: "Walkthrough", version: "v2", status: { label: "In Review",      tone: "amber" }, deadline: "May 19", notes: { current: 0, total: 3 }, assignees: ["RZ"], tone: "amber", pulse: true },
      { id: "pine",     title: "12 Pine St",        address: "Palm Coast, FL 32137",         type: "Walkthrough", version: "v3", status: { label: "Revising",       tone: "amber" }, deadline: "May 20", notes: { current: 2, total: 6 }, assignees: ["MA"], tone: "amber" },
      { id: "magnolia", title: "5577 Magnolia Ln",  address: "Saint Augustine, FL 32084",    type: "Walkthrough", version: "v4", status: { label: "+2h overdue",    tone: "rose", kind: "overdue"  }, deadline: "May 18", assignees: ["RZ"], tone: "rose", overdue: true },
    ],
  },
  {
    key: "deliver",
    title: "Deliver",
    tone: "emerald",
    count: 2,
    cards: [
      { id: "sunset", title: "100 Sunset Pl", address: "Ponte Vedra Beach, FL 32082", type: "Walkthrough", version: "v2", status: { label: "Ready to send", tone: "emerald" }, deadline: "Today",  assignees: ["MJ"], tone: "emerald" },
      { id: "park",   title: "800 Park Ave",  address: "Jacksonville, FL 32209",     type: "Walkthrough", version: "v1", status: { label: "Sent 2d ago",   tone: "neutral", kind: "done" }, deadline: "May 17", assignees: ["MA"], tone: "neutral", dimmed: true },
    ],
  },
];

// Shared style tokens
export const toneDot: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
};

export const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  blue: "text-blue-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
};

export const toneCountBg: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  blue: "bg-blue-500/10 text-blue-400",
  amber: "bg-amber-500/10 text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
  rose: "bg-rose-500/10 text-rose-400",
};

export const toneAccent: Record<Tone, string> = {
  neutral: "",
  blue: "border-blue-500/20 hover:border-blue-500/40",
  amber: "border-amber-500/20 hover:border-amber-500/40",
  emerald: "border-emerald-500/20 hover:border-emerald-500/40",
  rose: "border-rose-500/30 hover:border-rose-500/50 bg-rose-950/10",
};

export const badgeTone: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};
