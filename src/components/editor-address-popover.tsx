"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, MapPinIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function AddressPopover({
  address,
  title,
}: {
  address: string;
  title: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const full = `${title}, ${address}`;

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="grid size-4 shrink-0 place-items-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
      >
        <MapPinIcon className="size-3" />
        <span className="sr-only">Show address</span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto min-w-[240px] p-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium leading-tight">{title}</p>
            <p className="text-[11px] text-muted-foreground">{address}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(full);
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
            <span className="sr-only">Copy address</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
