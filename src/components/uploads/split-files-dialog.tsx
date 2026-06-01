"use client";

// ============================================================================
// SplitFilesDialog — opens when a shooter dumps a card's worth of files onto
// the My Shoots background (i.e. not over a single card). Lets them split
// each file across multiple shoots before commit.
//
// V1 scope: list each file with a destination dropdown. Pre-fill heuristic
// uses file lastModified ∈ shoot time window. Submit calls onConfirm with
// { [orderId]: File[] }; the parent handles toasts + state.
// ============================================================================

import * as React from "react";
import { ChevronDown, FileText, Image, Video, Wand2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Order } from "@/components/orders/orders-data";
import { formatBytes } from "@/components/uploads/uploads-data";

export type SplitFilesDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  files: File[];
  shoots: Order[];
  onConfirm: (assignments: Record<string, File[]>) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function suggestOrderId(file: File, shoots: Order[]): string | null {
  if (shoots.length === 0) return null;
  const mtime = file.lastModified;
  if (!mtime) return shoots[0].id;
  // Prefer the shoot whose scheduled window contains the file mtime;
  // otherwise the closest shoot by start time.
  const containing = shoots.find((s) => {
    const start = new Date(s.scheduled_at).getTime();
    const end = new Date(s.scheduled_end).getTime();
    return mtime >= start && mtime <= end;
  });
  if (containing) return containing.id;
  return shoots
    .map((s) => ({
      id: s.id,
      dist: Math.abs(new Date(s.scheduled_at).getTime() - mtime),
    }))
    .sort((a, b) => a.dist - b.dist)[0].id;
}

function iconFor(file: File): React.ReactNode {
  if (file.type.startsWith("image/"))
    return <Image className="size-4 text-muted-foreground" />;
  if (file.type.startsWith("video/"))
    return <Video className="size-4 text-muted-foreground" />;
  return <FileText className="size-4 text-muted-foreground" />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SplitFilesDialog({
  open,
  onOpenChange,
  files,
  shoots,
  onConfirm,
}: SplitFilesDialogProps) {
  // Map: file index → orderId
  const [assignments, setAssignments] = React.useState<Record<number, string>>(
    {},
  );

  // Re-pre-fill suggestions whenever the file list changes (new drop).
  React.useEffect(() => {
    if (!open) return;
    const next: Record<number, string> = {};
    files.forEach((f, i) => {
      const sid = suggestOrderId(f, shoots);
      if (sid) next[i] = sid;
    });
    setAssignments(next);
  }, [open, files, shoots]);

  const totalAssigned = Object.keys(assignments).length;
  const unassigned = files.length - totalAssigned;

  function setAssignment(idx: number, orderId: string) {
    setAssignments((prev) => ({ ...prev, [idx]: orderId }));
  }

  function autoFillAll() {
    const next: Record<number, string> = {};
    files.forEach((f, i) => {
      const sid = suggestOrderId(f, shoots);
      if (sid) next[i] = sid;
    });
    setAssignments(next);
  }

  function submit() {
    const grouped: Record<string, File[]> = {};
    files.forEach((f, i) => {
      const orderId = assignments[i];
      if (!orderId) return;
      grouped[orderId] = grouped[orderId] ?? [];
      grouped[orderId].push(f);
    });
    onConfirm(grouped);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-sm font-semibold">
              Split files across shoots
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
              {files.length} file{files.length === 1 ? "" : "s"} · pick a shoot
              for each, or auto-match by capture time
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

        {/* Auto-fill banner */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-5 py-2 text-xs">
          <span className="text-muted-foreground">
            {totalAssigned === files.length
              ? "All files assigned"
              : `${unassigned} unassigned`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={autoFillAll}
            className="press h-7 gap-1 rounded-full px-2.5 text-[11px]"
          >
            <Wand2 className="size-3" />
            Auto-match by time
          </Button>
        </div>

        {/* File list */}
        <div className="max-h-[55vh] overflow-y-auto px-5 py-3">
          <ul className="flex flex-col gap-1.5">
            {files.map((file, idx) => {
              const orderId = assignments[idx];
              const matched = orderId
                ? shoots.find((s) => s.id === orderId)
                : null;
              return (
                <li
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {iconFor(file)}
                    <div className="min-w-0">
                      <div
                        className="truncate text-xs font-medium text-foreground"
                        title={file.name}
                      >
                        {file.name}
                      </div>
                      <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {formatBytes(file.size)}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "press h-7 max-w-[180px] gap-1 rounded-full px-2.5 text-[11px]",
                            !matched && "border-amber-500/30 text-amber-300",
                          )}
                        />
                      }
                    >
                      <span className="truncate">
                        {matched
                          ? matched.property_address.split(",")[0]
                          : "Pick shoot"}
                      </span>
                      <ChevronDown className="size-3 shrink-0 opacity-70" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={6}
                      className="min-w-56"
                    >
                      {shoots.map((s) => (
                        <DropdownMenuItem
                          key={s.id}
                          onClick={() => setAssignment(idx, s.id)}
                          className={cn(
                            orderId === s.id &&
                              "bg-accent text-accent-foreground",
                          )}
                        >
                          <span className="truncate">
                            {s.property_address.split(",")[0]}
                          </span>
                          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                            #{s.display_number}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-full px-3 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={totalAssigned === 0}
            onClick={submit}
            className="press h-8 gap-1.5 rounded-full px-3 text-xs"
          >
            Upload {totalAssigned} file{totalAssigned === 1 ? "" : "s"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SplitFilesDialog;
