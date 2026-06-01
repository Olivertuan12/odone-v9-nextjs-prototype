"use client";

import { AlertCircleIcon, CircleCheckBigIcon, LoaderIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Card } from "@/components/editor-data";

export function StatusPill({ status }: { status: Card["status"] }) {
  const kind = status.kind ?? "in-process";

  return (
    <Badge
      variant="outline"
      className="h-6 gap-1.5 rounded-full border-border bg-transparent px-2 py-0 text-[11px] font-medium text-foreground"
    >
      {kind === "done" && (
        <CircleCheckBigIcon
          className={cn(
            "size-3.5 fill-emerald-500 stroke-[2.5px] text-background"
          )}
        />
      )}
      {kind === "overdue" && (
        <AlertCircleIcon className="size-3.5 text-rose-500" />
      )}
      {kind === "in-process" && (
        <LoaderIcon className="size-3.5 text-muted-foreground" />
      )}
      {status.label}
    </Badge>
  );
}
