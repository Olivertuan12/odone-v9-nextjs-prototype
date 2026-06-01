"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Video,
  Plane,
  Sun,
  Box,
  Home,
  File as FileIcon,
  User,
  Calendar,
  Building2,
  Share2,
  Camera,
  Send,
  Search as SearchIcon,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { TreeNode, TopTab } from "@/components/uploads/uploads-data";

// ---------------------------------------------------------------------------
// Icon resolution: TreeNode.icon is a string name from uploads-data. Map it
// to a lucide component. Fall back to Folder.
// ---------------------------------------------------------------------------

const ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Folder,
  FolderOpen,
  Image: ImageIcon,
  Video,
  Plane,
  Sun,
  Box,
  Home,
  File: FileIcon,
  User,
  Calendar,
  Building2,
  Share2,
};

function getIcon(
  name: string | undefined,
  fallback: React.ComponentType<{ className?: string; size?: number }> = Folder,
) {
  if (!name) return fallback;
  return ICONS[name] ?? fallback;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasChildren(node: TreeNode): boolean {
  return Array.isArray(node.children) && node.children.length > 0;
}

/** Compute the default-expanded set: top-level sections + first shooter. */
function computeInitialExpanded(tree: TreeNode): Set<string> {
  const out = new Set<string>();
  const sections = tree.children ?? [];
  for (const section of sections) {
    out.add(section.id); // RAW + Delivery
    if (section.id === "raw") {
      const firstShooter = section.children?.[0];
      if (firstShooter) out.add(firstShooter.id);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

type RowProps = {
  node: TreeNode;
  depth: number;
  expanded: boolean;
  active: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onSelect: () => void;
};

function Row({
  node,
  depth,
  expanded,
  active,
  hasChildren: rowHasChildren,
  onToggle,
  onSelect,
}: RowProps) {
  const isSection = node.type === "section";
  const Icon = getIcon(
    node.icon,
    rowHasChildren && expanded ? FolderOpen : Folder,
  );

  // depth: 0 = section row, 1+ = nested. Indent by depth.
  const indentPx = 4 + depth * 12;

  return (
    <div
      role="treeitem"
      aria-expanded={rowHasChildren ? expanded : undefined}
      aria-selected={active}
      tabIndex={0}
      onClick={() => {
        onSelect();
        if (rowHasChildren && !expanded) onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
          if (rowHasChildren && !expanded) onToggle();
        } else if (e.key === "ArrowRight" && rowHasChildren && !expanded) {
          e.preventDefault();
          onToggle();
        } else if (e.key === "ArrowLeft" && rowHasChildren && expanded) {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{ paddingLeft: indentPx }}
      className={cn(
        "group relative press flex h-8 cursor-pointer items-center gap-1.5 rounded-md pr-2 transition-colors duration-fast ease-standard",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
      title={node.label}
    >
      {/* Active indicator bar */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-px rounded-full bg-foreground/70"
        />
      )}

      {/* Chevron toggle */}
      {rowHasChildren ? (
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="grid size-4 shrink-0 place-items-center rounded text-muted-foreground transition-transform duration-fast ease-standard hover:text-foreground"
        >
          <ChevronRight
            size={12}
            className={cn(
              "transition-transform duration-fast ease-standard",
              expanded && "rotate-90",
            )}
          />
        </button>
      ) : (
        <span aria-hidden className="size-4 shrink-0" />
      )}

      {/* Icon */}
      <span
        className={cn(
          "shrink-0 transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground/80 group-hover:text-foreground",
        )}
      >
        <Icon size={isSection ? 12 : 13} />
      </span>

      {/* Label */}
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          isSection
            ? "text-[10px] font-bold uppercase tracking-wider"
            : "text-[13px] font-medium",
        )}
      >
        {node.label}
      </span>

      {/* Count badge */}
      {typeof node.count === "number" && node.count > 0 && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {node.count}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recursive branch with grid-rows smooth collapse
// ---------------------------------------------------------------------------

type BranchProps = {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  activeNodeId: string;
  onToggle: (id: string) => void;
  onSelectNode: (node: TreeNode) => void;
};

function Branch({
  node,
  depth,
  expanded,
  activeNodeId,
  onToggle,
  onSelectNode,
}: BranchProps) {
  const isOpen = expanded.has(node.id);
  const children = node.children ?? [];
  const childCount = children.length;

  return (
    <div>
      <Row
        node={node}
        depth={depth}
        expanded={isOpen}
        active={activeNodeId === node.id}
        hasChildren={childCount > 0}
        onToggle={() => onToggle(node.id)}
        onSelect={() => onSelectNode(node)}
      />

      {/* Smooth expand/collapse — CSS grid-rows trick */}
      {childCount > 0 && (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-base ease-standard",
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-0.5 pt-0.5">
              {children.map((child) => (
                <Branch
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  expanded={expanded}
                  activeNodeId={activeNodeId}
                  onToggle={onToggle}
                  onSelectNode={onSelectNode}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export type TreeSidebarProps = {
  tree: TreeNode;
  activeNodeId: string;
  onSelectNode: (node: TreeNode) => void;
  /** Top-level section toggle (RAW vs Final) lives in the tree header */
  topTab?: TopTab;
  onTopTabChange?: (t: TopTab) => void;
  /** Optional in-folder search — when both provided, renders an input
      above the RAW/Final toggle so search is anchored with folder context. */
  query?: string;
  onQueryChange?: (q: string) => void;
  searchPlaceholder?: string;
  collapsedOnMobile?: boolean;
  className?: string;
};

// ---------------------------------------------------------------------------
// Section toggle — icon-led segmented control at the very top of the tree.
// User feedback: RAW vs Final feel like two big folders → put the toggle here
// instead of crowding the global header.
// ---------------------------------------------------------------------------

function SectionToggle({
  value,
  onChange,
}: {
  value: TopTab;
  onChange: (t: TopTab) => void;
}) {
  const items: { value: TopTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "shoots", label: "Today", Icon: Calendar },
    { value: "raw", label: "RAW", Icon: Camera },
    { value: "final", label: "Final", Icon: Send },
  ];
  return (
    <div
      role="tablist"
      aria-label="Section"
      className="press flex h-9 w-full items-center gap-0.5 rounded-full border border-border bg-background/60 p-0.5"
    >
      {items.map(({ value: v, label, Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => !active && onChange(v)}
            className={cn(
              "flex h-full flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-all duration-base ease-standard",
              active
                ? "bg-foreground text-background shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TreeSidebar({
  tree,
  activeNodeId,
  onSelectNode,
  topTab,
  onTopTabChange,
  query,
  onQueryChange,
  searchPlaceholder = "Search files…",
  collapsedOnMobile = false,
  className,
}: TreeSidebarProps) {
  // Default-expanded set — computed once from the tree shape.
  const initialExpanded = useMemo(() => computeInitialExpanded(tree), [tree]);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  const handleToggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // When SectionToggle owns the RAW/Final split, hide the top-level section
  // chrome from the tree itself — the toggle replaces it. Walk into the only
  // visible section's children to keep the rest of the tree intact.
  const sections = tree.children ?? [];
  const showToggle = topTab !== undefined && onTopTabChange !== undefined;
  const showSearch = query !== undefined && onQueryChange !== undefined;
  const renderedNodes = showToggle && sections.length === 1
    ? sections[0].children ?? []
    : sections;

  return (
    <nav
      role="tree"
      aria-label="File browser"
      className={cn(
        "scroll-smooth-y flex h-full w-full flex-col overflow-hidden",
        collapsedOnMobile && "hidden md:flex",
        className,
      )}
    >
      {/* v10 order: RAW/Final toggle FIRST, search BELOW it.
          User feedback: search should anchor under the section toggle, and
          the dividers above/below the toggle were visual noise — removed. */}
      {showToggle && (
        <div className="sticky top-0 z-20 flex shrink-0 items-center bg-background/80 px-3 pt-3 backdrop-blur-md">
          <SectionToggle
            value={topTab as TopTab}
            onChange={onTopTabChange as (t: TopTab) => void}
          />
        </div>
      )}

      {showSearch && (
        <div
          className={cn(
            "sticky z-10 shrink-0 bg-background/80 px-3 pb-2.5 pt-2 backdrop-blur-md",
            showToggle ? "top-[60px]" : "top-0",
          )}
        >
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query as string}
              onChange={(e) => (onQueryChange as (q: string) => void)(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 rounded-full border-border bg-muted/40 pl-8 pr-8 text-xs placeholder:text-muted-foreground focus-visible:bg-background"
              aria-label="Search files in this folder"
            />
            {(query as string).length > 0 && (
              <button
                type="button"
                onClick={() => (onQueryChange as (q: string) => void)("")}
                aria-label="Clear search"
                className="press absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {renderedNodes.map((node, idx) => (
          <div key={node.id} className={cn(idx > 0 && "mt-1")}>
            <Branch
              node={node}
              depth={0}
              expanded={expanded}
              activeNodeId={activeNodeId}
              onToggle={handleToggle}
              onSelectNode={onSelectNode}
            />
          </div>
        ))}

        {renderedNodes.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No folders yet.
          </div>
        )}
      </div>
    </nav>
  );
}

export default TreeSidebar;
