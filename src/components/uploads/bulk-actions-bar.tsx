"use client";

import {
  Share2,
  Download,
  FolderPlus,
  Archive,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type BulkActionsBarProps = {
  count: number;
  onClear: () => void;
  onDownload: () => void;
  onShare: () => void;
  onMove: () => void;
  onArchive: () => void;
  onDelete: () => void;
  className?: string;
};

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
};

function ActionButton({ icon, label, onClick, tone = "default" }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            className={cn(
              "press h-9 gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-fast ease-standard",
              tone === "danger"
                ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                : "text-foreground hover:bg-accent"
            )}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </Button>
        }
      />
      <TooltipContent className="sm:hidden">{label}</TooltipContent>
    </Tooltip>
  );
}

export function BulkActionsBar({
  count,
  onClear,
  onDownload,
  onShare,
  onMove,
  onArchive,
  onDelete,
  className,
}: BulkActionsBarProps) {
  const visible = count > 0;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      aria-hidden={!visible}
      className={cn(
        "pointer-events-none flex w-full justify-center transition-all duration-slow ease-spring",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-10 opacity-0",
        className
      )}
    >
      <div
        className={cn(
          "glass-strong shadow-modal hairline pointer-events-auto flex items-center gap-1 rounded-full px-3 py-2",
          !visible && "pointer-events-none"
        )}
      >
        <span
          className="ml-1 inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold tabular-nums text-background"
          aria-live="polite"
        >
          {count} selected
        </span>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <ActionButton
          icon={<Share2 className="size-4" />}
          label="Share"
          onClick={onShare}
        />
        <ActionButton
          icon={<Download className="size-4" />}
          label="Download"
          onClick={onDownload}
        />
        <ActionButton
          icon={<FolderPlus className="size-4" />}
          label="Move"
          onClick={onMove}
        />
        <ActionButton
          icon={<Archive className="size-4" />}
          label="Archive"
          onClick={onArchive}
        />
        <ActionButton
          icon={<Trash2 className="size-4" />}
          label="Delete"
          onClick={onDelete}
          tone="danger"
        />

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClear}
                aria-label="Clear selection"
                className="press size-9 rounded-full text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            }
          />
          <TooltipContent>Clear selection</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
