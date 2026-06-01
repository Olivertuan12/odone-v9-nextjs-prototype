"use client";

import * as React from "react";
import {
  Image as ImageIcon,
  Video,
  Plane,
  Box,
  Sun,
  Home,
  File as FileIcon,
  FolderPlus,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  categoryIcons,
  type CategoryKind,
} from "@/components/uploads/uploads-data";

// ---------------------------------------------------------------------------
// Static catalog — order + labels for the 8 category folders
// ---------------------------------------------------------------------------

type CategoryOption = {
  kind: CategoryKind;
  label: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { kind: "photo", label: "Photo" },
  { kind: "video", label: "Video" },
  { kind: "drone", label: "Drone" },
  { kind: "floor-plan", label: "Floor Plan" },
  { kind: "twilight", label: "Twilight" },
  { kind: "3d-tour", label: "3D Tour" },
  { kind: "virtual-staging", label: "Virtual Staging" },
  { kind: "other", label: "Other" },
];

// Map the lucide icon name (string in `categoryIcons`) to a real component.
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  Image: ImageIcon,
  Video,
  Plane,
  Box,
  Sun,
  Home,
  File: FileIcon,
};

function iconFor(kind: CategoryKind): React.ComponentType<{ className?: string }> {
  const name = categoryIcons[kind];
  return ICON_COMPONENTS[name] ?? FileIcon;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type NewFolderDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId?: string;
  existingCategoryKinds?: CategoryKind[];
  onCreate: (kinds: CategoryKind[]) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewFolderDialog({
  open,
  onOpenChange,
  orderId,
  existingCategoryKinds,
  onCreate,
}: NewFolderDialogProps) {
  const existing = React.useMemo(
    () => new Set<CategoryKind>(existingCategoryKinds ?? []),
    [existingCategoryKinds],
  );

  const [selected, setSelected] = React.useState<Set<CategoryKind>>(new Set());

  // Reset the selection whenever the dialog opens or the existing set changes.
  React.useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, existingCategoryKinds]);

  function toggle(kind: CategoryKind) {
    if (existing.has(kind)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleCreate() {
    if (selected.size === 0) return;
    const kinds = CATEGORY_OPTIONS
      .map((o) => o.kind)
      .filter((k) => selected.has(k));
    onCreate(kinds);
    toast.success(
      kinds.length === 1
        ? `Added "${CATEGORY_OPTIONS.find((o) => o.kind === kinds[0])?.label}" folder`
        : `Added ${kinds.length} folders`,
    );
    onOpenChange(false);
  }

  const count = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-lg sm:max-w-lg gap-0 p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-foreground">
              <FolderPlus className="size-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-fluid-base font-semibold text-foreground">
                Add folders
              </DialogTitle>
              <DialogDescription className="text-fluid-xs text-muted-foreground">
                Choose category types to add
                {orderId ? " to this order" : ""}.
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="press shrink-0 -mr-1 -mt-1 rounded-full text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Category grid */}
        <div className="px-6">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {CATEGORY_OPTIONS.map((opt) => {
              const Icon = iconFor(opt.kind);
              const isExisting = existing.has(opt.kind);
              const isSelected = selected.has(opt.kind);

              const card = (
                <button
                  type="button"
                  onClick={() => toggle(opt.kind)}
                  disabled={isExisting}
                  aria-pressed={isSelected}
                  aria-disabled={isExisting}
                  className={cn(
                    "press group relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-all duration-fast ease-standard",
                    "hover:bg-accent/60",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected &&
                      "border-transparent bg-accent ring-2 ring-ring shadow-soft",
                    isExisting &&
                      "cursor-not-allowed opacity-40 hover:bg-card",
                  )}
                >
                  {/* Selected check badge */}
                  {isSelected && (
                    <span
                      className={cn(
                        "absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-foreground text-background",
                        "animate-in fade-in-0 zoom-in-75 duration-fast ease-spring",
                      )}
                      aria-hidden
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}

                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors duration-fast",
                      isSelected && "bg-background text-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>

                  <span
                    className={cn(
                      "text-fluid-xs font-medium text-foreground/90",
                      isSelected && "text-foreground",
                    )}
                  >
                    {opt.label}
                  </span>
                </button>
              );

              if (isExisting) {
                return (
                  <Tooltip key={opt.kind}>
                    <TooltipTrigger
                      render={
                        <span className="block cursor-not-allowed">{card}</span>
                      }
                    />
                    <TooltipContent>Already exists</TooltipContent>
                  </Tooltip>
                );
              }

              return <React.Fragment key={opt.kind}>{card}</React.Fragment>;
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 pt-5">
          <p className="text-fluid-xs text-muted-foreground">
            {count === 0
              ? "Select one or more"
              : `${count} selected`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="press rounded-full px-4"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={count === 0}
              onClick={handleCreate}
              className={cn(
                "press rounded-full px-4 transition-all duration-base ease-emphasized",
                count > 0 && "shadow-soft",
              )}
            >
              {count > 0
                ? `Add ${count} folder${count === 1 ? "" : "s"}`
                : "Add folders"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewFolderDialog;
