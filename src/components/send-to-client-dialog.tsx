"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LinkIcon,
  LockIcon,
  MailIcon,
  RefreshCwIcon,
  SendIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export function SendToClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sendEmail, setSendEmail] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const shareUrl = "https://review.odone.com/s/g7k9-x42";

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">Deliver to client</DialogTitle>
          <DialogDescription className="text-xs">
            Send the final files to Homes Realty
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 pb-4">
          {/* a. Email delivery card */}
          <section className="rounded-lg border bg-card p-3">
            <label className="flex items-start gap-2.5">
              <Checkbox
                checked={sendEmail}
                onCheckedChange={(v) => setSendEmail(v === true)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <MailIcon className="size-3.5 text-muted-foreground" />
                  Send notification email
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Notify the client with a link and message.
                </p>
              </div>
            </label>

            {sendEmail && (
              <div className="mt-3 space-y-2.5 border-t pt-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">To</Label>
                  <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className="h-5 gap-1 rounded-full px-1.5 text-[10.5px]"
                    >
                      client@homes.com
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        title="Remove"
                      >
                        <XIcon className="size-2.5" />
                      </button>
                    </Badge>
                    <input
                      type="text"
                      placeholder="Add recipient…"
                      className="flex-1 min-w-[80px] bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Subject
                  </Label>
                  <Input
                    defaultValue="Your project is ready — 45 Yorkshire Dr"
                    className="h-8 text-[12.5px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Message
                  </Label>
                  <Textarea
                    rows={4}
                    defaultValue={`Hi Homes Realty team,\n\nYour project for 45 Yorkshire Dr is ready. You can preview and download the final files using the secure link below.\n\nThanks for working with Odone!`}
                    className="text-[12.5px] leading-relaxed"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                  >
                    Customize template
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* b. Share link card */}
          <section className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <LinkIcon className="size-3.5 text-muted-foreground" />
              Share link
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
              <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <code className="flex-1 truncate font-mono text-[11px]">
                {shareUrl}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={copyShareUrl}
                title="Copy link"
              >
                {copied ? (
                  <CheckIcon className="size-3 text-emerald-500" />
                ) : (
                  <CopyIcon className="size-3" />
                )}
              </Button>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <span>Expires Jun 17</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-0.5">
                <LockIcon className="size-2.5" /> Password protected
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-0.5">
                <DownloadIcon className="size-2.5" /> Download allowed
              </span>
            </p>
            <div className="mt-2.5 flex">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-[11px]"
              >
                <RefreshCwIcon className="size-3" /> Generate new link
              </Button>
            </div>
          </section>

          {/* c. Direct download card */}
          <section className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <DownloadIcon className="size-3.5 text-muted-foreground" />
              Direct download
            </div>
            <Button className="mt-2 w-full gap-2" size="default">
              <DownloadIcon className="size-4" />
              Download all files (282 MB)
            </Button>
            <ul className="mt-3 space-y-1.5 text-[11px]">
              <DownloadItem
                title="Listing photos"
                meta="12 files · 24 MB"
              />
              <DownloadItem
                title="Schematic floor plan"
                meta="1 file · 1.2 MB"
              />
              <DownloadItem
                title="Walkthrough · vertical"
                meta="142 MB"
              />
              <DownloadItem
                title="Walkthrough · square"
                meta="138 MB"
              />
            </ul>
            <Separator className="my-2" />
            <div className="flex items-baseline justify-between text-[11.5px]">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono font-semibold">282 MB · 15 files</span>
            </div>
          </section>

          {/* d. External order page */}
          <section className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
              Sync to external
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Push delivery to a connected platform.
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              <ExternalButton label="HD Photo Hub" />
              <ExternalButton label="Tonomo" />
              <ExternalButton label="Photello" />
            </div>
          </section>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={() => {
              onOpenChange(false);
              toast.success("Delivered to client", {
                description: "Homes Realty has been notified — share link active.",
              });
            }}
          >
            <SendIcon className="size-3.5" /> Send delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DownloadItem({ title, meta }: { title: string; meta: string }) {
  return (
    <li className="flex items-start justify-between gap-2">
      <span className="font-medium">{title}</span>
      <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
        {meta}
      </span>
    </li>
  );
}

function ExternalButton({ label }: { label: string }) {
  return (
    <a
      href="#"
      className="inline-flex flex-col items-center justify-center gap-1 rounded-md border bg-background px-2 py-2 text-[11px] font-medium transition-colors hover:bg-accent"
    >
      <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </a>
  );
}
