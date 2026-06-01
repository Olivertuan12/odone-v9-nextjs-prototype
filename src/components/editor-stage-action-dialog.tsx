"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CircleCheckBigIcon,
  CloudUploadIcon,
  DownloadIcon,
  FileTextIcon,
  FilmIcon,
  FolderIcon,
  MusicIcon,
  SendIcon,
  UploadIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { users, type Card } from "@/components/editor-data";

export type StageAction = "download" | "upload" | "send";

export function EditorStageActionDialog({
  card,
  action,
  open,
  onOpenChange,
}: {
  card: Card | null;
  action: StageAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!card || !action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-4">
        {action === "download" && (
          <DownloadView
            card={card}
            onClose={() => {
              onOpenChange(false);
              toast.success(`Downloading ${card.title}`, {
                description: "3.5 GB · 4 files. Project moves to Working On after download.",
              });
            }}
          />
        )}
        {action === "upload" && (
          <UploadView
            card={card}
            onClose={() => {
              onOpenChange(false);
              const next = card.version
                ? `v${parseInt(card.version.replace("v", ""), 10) + 1}`
                : "v1";
              toast.success(`${next} submitted for review`, {
                description: `${card.title} is now In Review.`,
              });
            }}
          />
        )}
        {action === "send" && (
          <SendView
            card={card}
            onClose={() => {
              onOpenChange(false);
              toast.success(`${card.title} sent to client`, {
                description: "Final delivery — share link active.",
              });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── DOWNLOAD VIEW (Pending) ────────────────────────────────────────────────
function DownloadView({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <DownloadIcon className="size-4 text-muted-foreground" />
          Start editing
        </DialogTitle>
        <DialogDescription>
          Download all assets for this order to begin editing.
        </DialogDescription>
      </DialogHeader>

      <OrderInfo card={card} />

      <div className="rounded-lg border bg-muted/40 p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Assets ({assets.length})
        </p>
        <ul className="space-y-1.5">
          {assets.map((a) => (
            <li
              key={a.name}
              className="flex items-center gap-2.5 text-[12px]"
            >
              <div className={cn("grid size-6 place-items-center rounded", a.tone)}>
                <a.Icon className="size-3" />
              </div>
              <span className="flex-1 truncate font-medium">{a.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {a.size}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button size="lg" className="w-full gap-2" onClick={onClose}>
        <DownloadIcon className="size-4" />
        Download all (3.5 GB)
      </Button>
    </>
  );
}

const assets = [
  { name: "Raw walkthrough", size: "2.4 GB", Icon: FilmIcon,     tone: "bg-blue-500/10 text-blue-400" },
  { name: "B-roll · town + beach", size: "1.1 GB", Icon: FolderIcon, tone: "bg-emerald-500/10 text-emerald-400" },
  { name: "Script.pdf",      size: "24 KB", Icon: FileTextIcon, tone: "bg-rose-500/10 text-rose-400" },
  { name: "Music reference", size: "link",  Icon: MusicIcon,    tone: "bg-amber-500/10 text-amber-400" },
];

// ─── UPLOAD VIEW (Working On) ───────────────────────────────────────────────
function UploadView({ card, onClose }: { card: Card; onClose: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const nextVersion = card.version
    ? `v${parseInt(card.version.replace("v", ""), 10) + 1}`
    : "v1";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UploadIcon className="size-4 text-muted-foreground" />
          Upload new version
        </DialogTitle>
        <DialogDescription>
          Submit edit as <span className="font-semibold text-foreground">{nextVersion}</span> for review.
        </DialogDescription>
      </DialogHeader>

      <OrderInfo card={card} />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors",
          file
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-border hover:border-foreground/30 hover:bg-accent/30"
        )}
      >
        {file ? (
          <>
            <CircleCheckBigIcon className="size-7 fill-emerald-500 stroke-[2.5px] text-background" />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </>
        ) : (
          <>
            <CloudUploadIcon className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">Click to choose file</p>
            <p className="text-[11px] text-muted-foreground">
              MP4, MOV up to 10 GB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </button>

      <Button
        size="lg"
        className="w-full gap-2"
        disabled={!file}
        onClick={onClose}
      >
        <UploadIcon className="size-4" />
        Submit {nextVersion} for review
      </Button>
    </>
  );
}

// ─── SEND VIEW (Deliver) ────────────────────────────────────────────────────
function SendView({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <SendIcon className="size-4 text-muted-foreground" />
          Send to client
        </DialogTitle>
        <DialogDescription>
          Final version will be delivered to the client and marked as sent.
        </DialogDescription>
      </DialogHeader>

      <OrderInfo card={card} />

      <div className="rounded-lg border bg-muted/40 p-3 text-[12px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
            Final delivery
          </span>
          <span className="font-mono text-[10px] text-emerald-400">
            {card.version} · final
          </span>
        </div>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckIcon className="size-3 text-emerald-500" />
            All revisions resolved
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="size-3 text-emerald-500" />
            Final cut approved by editor
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="size-3 text-emerald-500" />
            Delivery formats prepared (MP4 · 1080×1920)
          </li>
        </ul>
      </div>

      <Button
        size="lg"
        className="w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-600"
        onClick={onClose}
      >
        <SendIcon className="size-4" />
        Send to client
      </Button>
    </>
  );
}

// ─── SHARED ─────────────────────────────────────────────────────────────────
function OrderInfo({ card }: { card: Card }) {
  const lead = users[card.assignees[0]];

  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      {lead && (
        <Avatar className="size-9">
          <AvatarImage src={lead.image} alt={lead.name} />
          <AvatarFallback className={cn("text-xs", lead.tone)}>
            {lead.initials}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">
          {card.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {card.address}
        </p>
      </div>
      <Separator orientation="vertical" className="h-8 data-vertical:self-auto" />
      <div className="text-right">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">
          Due
        </p>
        <p className="font-mono text-xs font-semibold">{card.deadline}</p>
      </div>
    </div>
  );
}
