"use client";

// ============================================================================
// Odone — /settings/editors
// ----------------------------------------------------------------------------
// Two columns:
//   - In-house editors (Sara / Kyle / MJ) with avatar, current load, and
//     specialty chips
//   - Vendors (Tonomo / HD Photo Hub / Fotello) with rate + specialties +
//     contact email
// Both halves get an Add CTA at the top. Admin-only page.
// ============================================================================

import * as React from "react";
import {
  CircleCheckIcon,
  ExternalLinkIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { SettingsSection } from "@/components/settings/settings-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InHouseEditor = {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  tone: string;
  load: number; // active deliverables
  capacity: number;
  status: "available" | "busy" | "off";
  specialties: string[];
};

type Vendor = {
  id: string;
  name: string;
  logoChar: string;
  tone: string;
  email: string;
  rate: string;
  turnaround: string;
  specialties: string[];
};

const EDITORS: InHouseEditor[] = [
  {
    id: "sara",
    name: "Sara Chen",
    avatar: "https://i.pravatar.cc/200?u=sara",
    initials: "SC",
    tone: "bg-fuchsia-500/20 text-fuchsia-200",
    load: 6,
    capacity: 8,
    status: "available",
    specialties: ["Photos", "Twilight", "HDR retouch"],
  },
  {
    id: "kyle",
    name: "Kyle Anderson",
    avatar: "https://i.pravatar.cc/200?u=kyle",
    initials: "KY",
    tone: "bg-indigo-500/20 text-indigo-200",
    load: 9,
    capacity: 10,
    status: "busy",
    specialties: ["Walkthrough", "Premium Reel", "Drone"],
  },
  {
    id: "mj",
    name: "MJ Rivera",
    avatar: "https://i.pravatar.cc/200?u=mj",
    initials: "MJ",
    tone: "bg-amber-500/20 text-amber-200",
    load: 4,
    capacity: 8,
    status: "available",
    specialties: ["Photos", "Floor plans", "Virtual staging"],
  },
];

const VENDORS: Vendor[] = [
  {
    id: "tonomo",
    name: "Tonomo Edit",
    logoChar: "T",
    tone: "bg-emerald-500/15 text-emerald-300",
    email: "studio@tonomo.co",
    rate: "$95 / order",
    turnaround: "24-36h",
    specialties: ["Photo retouch", "HDR", "Twilight"],
  },
  {
    id: "hdphoto",
    name: "HD Photo Hub",
    logoChar: "H",
    tone: "bg-sky-500/15 text-sky-300",
    email: "team@hdphotohub.com",
    rate: "$120 / order",
    turnaround: "Same day",
    specialties: ["Photos", "Floor plans", "Virtual staging"],
  },
  {
    id: "fotello",
    name: "Fotello Studio",
    logoChar: "F",
    tone: "bg-violet-500/15 text-violet-300",
    email: "ops@fotello.io",
    rate: "$140 / reel",
    turnaround: "48h",
    specialties: ["Video reels", "Drone", "Color grading"],
  },
];

function statusBadge(status: InHouseEditor["status"]) {
  if (status === "available") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      >
        Available
      </Badge>
    );
  }
  if (status === "busy") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 bg-amber-500/10 text-amber-300"
      >
        At capacity
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-border bg-muted/40 text-muted-foreground"
    >
      Off this week
    </Badge>
  );
}

export default function EditorPoolSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsSection
          title="In-house editors"
          description="Your salaried team. Load is current active deliverables."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Invite an editor (mock)")}
            >
              <UserPlusIcon className="size-3.5" />
              Add editor
            </Button>
          }
        >
          <ul className="flex flex-col divide-y divide-border">
            {EDITORS.map((e) => {
              const pct = Math.min(100, Math.round((e.load / e.capacity) * 100));
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={e.avatar} alt={e.name} />
                      <AvatarFallback className={"text-xs " + e.tone}>
                        {e.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-fluid-sm font-medium text-foreground">
                          {e.name}
                        </span>
                        {statusBadge(e.status)}
                      </div>
                      <span className="text-fluid-xs text-muted-foreground">
                        {e.load} active · {e.capacity} max
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontalIcon />
                            <span className="sr-only">Actions</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toast.info(`Editing ${e.name}`)}
                        >
                          <PencilIcon /> Edit profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.info("Capacity updated")}
                        >
                          <CircleCheckIcon /> Set capacity…
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => toast.error("Removed from pool")}
                        >
                          <Trash2Icon /> Remove from pool
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div
                    className="relative h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      className={
                        "absolute inset-y-0 left-0 rounded-full " +
                        (pct >= 90 ? "bg-amber-500" : "bg-emerald-500")
                      }
                      style={{ width: pct + "%" }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {e.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </SettingsSection>

        <SettingsSection
          title="Vendors"
          description="External partners we hand off to when in-house is at capacity."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Add a vendor (mock)")}
            >
              <PlusIcon className="size-3.5" />
              Add vendor
            </Button>
          }
        >
          <ul className="flex flex-col divide-y divide-border">
            {VENDORS.map((v) => (
              <li
                key={v.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "grid size-10 shrink-0 place-items-center rounded-lg font-bold " +
                      v.tone
                    }
                  >
                    {v.logoChar}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-fluid-sm font-medium text-foreground">
                      {v.name}
                    </span>
                    <a
                      href={`mailto:${v.email}`}
                      className="inline-flex items-center gap-1 text-fluid-xs text-muted-foreground hover:text-foreground"
                    >
                      <MailIcon className="size-3" />
                      {v.email}
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open vendor portal"
                    onClick={() => toast.info(`Opening ${v.name} portal`)}
                  >
                    <ExternalLinkIcon className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-fluid-xs">
                  <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Rate
                    </div>
                    <div className="text-fluid-sm font-medium text-foreground">
                      {v.rate}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Turnaround
                    </div>
                    <div className="text-fluid-sm font-medium text-foreground">
                      {v.turnaround}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {v.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </SettingsSection>
      </div>
    </div>
  );
}
