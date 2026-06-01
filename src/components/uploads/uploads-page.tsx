"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Upload,
  FolderPlus,
  Share2,
  Menu,
  LayoutGrid,
  Rows3,
  Check,
  ArrowDownWideNarrow,
  MoreHorizontal,
  ArrowLeft,
  Image as ImageIcon,
  Download,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  tree as fullTree,
  files as allFiles,
  formatBytes,
  formatDateDMY,
  type TreeNode,
  type UnifiedFile,
  type ViewMode,
  type SortKey,
  type SortDir,
  type FilterTab,
  type TopTab,
} from "@/components/uploads/uploads-data";
import {
  findOrderById,
  type Order,
} from "@/components/orders/orders-data";
// v12.3: ShooterConfirmUploadDialog removed — confirm is now in the unified
// ShootUploadDialog footer, which MyShootsView mounts directly. See HANDOFF §3.l.

import { TreeSidebar } from "@/components/uploads/tree-sidebar";
import { FileGrid } from "@/components/uploads/file-grid";
import { FileList, type FileListAction } from "@/components/uploads/file-list";
import { BulkActionsBar } from "@/components/uploads/bulk-actions-bar";
import { FilePreviewModal } from "@/components/uploads/file-preview-modal";
import { FolderShareDialog } from "@/components/uploads/folder-share-dialog";
import { NewFolderDialog } from "@/components/uploads/new-folder-dialog";
import { MyShootsView } from "@/components/uploads/my-shoots-view";

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

type NodeWithPath = { node: TreeNode; path: TreeNode[] };

function findNodePath(
  root: TreeNode,
  id: string,
  trail: TreeNode[] = [],
): NodeWithPath | null {
  const next = [...trail, root];
  if (root.id === id) return { node: root, path: next };
  for (const child of root.children ?? []) {
    const hit = findNodePath(child, id, next);
    if (hit) return hit;
  }
  return null;
}

function findFirstOrderNode(
  root: TreeNode,
  orderId: string,
): NodeWithPath | null {
  type Frame = { node: TreeNode; path: TreeNode[] };
  // v12.2: prefer the RAW subtree first. The delivery branch is shallower
  // (client → order vs shooter → date → order), so a naive BFS reaches
  // delivery/order-X before raw/.../order-X and lands the user on Final
  // when they meant RAW (the canonical entry from an order detail's
  // "View all in Files" CTA).
  const sections = root.children ?? [];
  const rawFirst = [
    ...sections.filter((s) => s.id === "raw"),
    ...sections.filter((s) => s.id === "delivery"),
    ...sections.filter((s) => s.id !== "raw" && s.id !== "delivery"),
  ];
  for (const section of rawFirst) {
    const queue: Frame[] = [{ node: section, path: [root, section] }];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.node.type === "order" && cur.node.id.includes(orderId)) {
        return { node: cur.node, path: cur.path };
      }
      for (const child of cur.node.children ?? []) {
        queue.push({ node: child, path: [...cur.path, child] });
      }
    }
  }
  return null;
}

function activeSectionFromPath(path: TreeNode[]): TopTab {
  for (const n of path) {
    if (n.id === "raw") return "raw";
    if (n.id === "delivery") return "final";
  }
  return "raw";
}

type ActiveScope = {
  section: "raw" | "delivery" | "root";
  shooterId?: string;
  orderId?: string;
  date?: string;
  client?: string;
  categoryLabel?: string;
};

function scopeFromNode(node: TreeNode | null): ActiveScope {
  if (!node || node.id === "root") return { section: "root" };
  const id = node.id;
  if (id.startsWith("raw/")) {
    const rest = id.slice("raw/".length);
    const parts = rest.split("/");
    const scope: ActiveScope = { section: "raw" };
    if (parts[0]) scope.shooterId = parts[0];
    if (parts[1]) scope.date = parts[1];
    if (parts[2]) scope.orderId = parts[2];
    if (parts[3] && parts[3].startsWith("cat:")) {
      scope.categoryLabel = parts[3].slice("cat:".length);
    }
    return scope;
  }
  if (id.startsWith("delivery/")) {
    const rest = id.slice("delivery/".length);
    const parts = rest.split("/");
    const scope: ActiveScope = { section: "delivery" };
    if (parts[0]) scope.client = parts[0];
    if (parts[1]) scope.orderId = parts[1];
    if (parts[2] && parts[2].startsWith("cat:")) {
      scope.categoryLabel = parts[2].slice("cat:".length);
    }
    return scope;
  }
  if (id === "raw") return { section: "raw" };
  if (id === "delivery") return { section: "delivery" };
  return { section: "root" };
}

function kindLabelMatchesSlug(label: string, slug: string): boolean {
  const normalized = label.toLowerCase().replace(/\s+/g, "-");
  return normalized === slug;
}

function filterFiles(
  files: UnifiedFile[],
  scope: ActiveScope,
  filterTab: FilterTab,
  query: string,
): UnifiedFile[] {
  const q = query.trim().toLowerCase();
  return files.filter((f) => {
    if (scope.shooterId && f.shooterId !== scope.shooterId) return false;
    if (scope.orderId && f.orderId !== scope.orderId) return false;
    if (scope.categoryLabel) {
      if (!kindLabelMatchesSlug(f.kindLabel, scope.categoryLabel)) return false;
    }
    if (filterTab === "starred" && !f.starred) return false;
    if (filterTab === "archived" && !f.archived) return false;
    if (filterTab === "recent") {
      const ageDays =
        (Date.now() - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 7) return false;
    }
    if (filterTab !== "archived" && f.archived) return false;
    if (q) {
      // v12.2: include DD/MM/YYYY date + an ISO yyyy-mm-dd fragment so
      // users can type "30/05" or "2026-05" and find files by date.
      const dmy = formatDateDMY(f.created_at);
      const iso = new Date(f.created_at).toISOString().slice(0, 10);
      const haystack =
        `${f.filename} ${f.shooterName} ${f.orderLabel} ${f.kindLabel} ${dmy} ${iso}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function sortFiles(
  files: UnifiedFile[],
  sortKey: SortKey,
  sortDir: SortDir,
): UnifiedFile[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...files].sort((a, b) => {
    switch (sortKey) {
      case "filename":
        return a.filename.localeCompare(b.filename) * dir;
      case "size":
        return (a.byte_size - b.byte_size) * dir;
      case "kind":
        return a.kindLabel.localeCompare(b.kindLabel) * dir;
      case "shooter":
        return a.shooterName.localeCompare(b.shooterName) * dir;
      case "order":
        return a.orderLabel.localeCompare(b.orderLabel) * dir;
      case "date":
      default:
        return (
          (new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()) *
          dir
        );
    }
  });
}

function treeForTopTab(root: TreeNode, top: TopTab): TreeNode {
  const sectionId = top === "raw" ? "raw" : "delivery";
  const section = (root.children ?? []).find((n) => n.id === sectionId);
  if (!section) return root;
  return { ...root, children: [section] };
}

// v12: project-scoped pruning. When the page is opened from an order
// ("View all in Files" / "Open files"), the sidebar should ONLY show that
// order's folders — not the global cross-project tree. Walks the tree and
// keeps every branch that leads to a node containing the target orderId,
// dropping anything else.
function pruneTreeToOrder(node: TreeNode, orderId: string): TreeNode | null {
  if (node.type === "order" && node.id.includes(orderId)) {
    return node;
  }
  const pruned = (node.children ?? [])
    .map((child) => pruneTreeToOrder(child, orderId))
    .filter((c): c is TreeNode => c !== null);
  if (pruned.length > 0) {
    return { ...node, children: pruned };
  }
  return null;
}

function lastActivityFor(files: UnifiedFile[]): string | null {
  if (files.length === 0) return null;
  const latest = files.reduce((acc, f) =>
    new Date(f.created_at).getTime() > new Date(acc.created_at).getTime()
      ? f
      : acc,
  );
  return formatDateDMY(latest.created_at);
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

const SORT_OPTIONS: { key: SortKey; dir: SortDir; label: string }[] = [
  { key: "date", dir: "desc", label: "Date · Newest first" },
  { key: "date", dir: "asc", label: "Date · Oldest first" },
  { key: "filename", dir: "asc", label: "Name · A → Z" },
  { key: "filename", dir: "desc", label: "Name · Z → A" },
  { key: "size", dir: "desc", label: "Size · Largest first" },
  { key: "size", dir: "asc", label: "Size · Smallest first" },
  { key: "kind", dir: "asc", label: "Type · A → Z" },
  { key: "shooter", dir: "asc", label: "Shooter · A → Z" },
  { key: "order", dir: "asc", label: "Order · A → Z" },
];

function sortLabel(k: SortKey, d: SortDir): string {
  return (
    SORT_OPTIONS.find((o) => o.key === k && o.dir === d)?.label ?? "Sort"
  );
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

// v11: Archived moved out of the primary tab row — user feedback was that
// the tab strip felt crowded and Archive is rarely the active filter. It now
// lives behind a "Show archived" toggle in the sort/Options dropdown.
const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recent" },
  { value: "starred", label: "Starred" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// Orders use the "ord-…" prefix, but the uploads tree + file rows store
// the same project under "order-…". When we scope the page from an order
// detail, normalize to the suffix so includes() matches both shapes.
function projectKeyFromOrderId(orderId: string | null): string | null {
  if (!orderId) return null;
  return orderId.replace(/^ord-/, "");
}

export function UploadsPage() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams?.get("orderId") ?? null;
  const projectKey = React.useMemo(
    () => projectKeyFromOrderId(initialOrderId),
    [initialOrderId],
  );

  // v11: when ?orderId= is set we landed here from an Order Detail page.
  // Surface a Back-to-Order strip so users aren't stranded inside the file
  // tree without a way home. The order display number (#1044) is more
  // recognisable than the raw slug.
  const orderContext = React.useMemo(
    () => (initialOrderId ? findOrderById(initialOrderId) : null),
    [initialOrderId],
  );

  const [activeNodeId, setActiveNodeId] = React.useState<string>("root");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [zoomLevel, setZoomLevel] = React.useState(3);
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [filterTab, setFilterTab] = React.useState<FilterTab>("all");
  const [topTab, setTopTab] = React.useState<TopTab>("raw");
  const [query, setQuery] = React.useState("");

  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const [previewItem, setPreviewItem] = React.useState<UnifiedFile | null>(null);
  const [shareNode, setShareNode] = React.useState<TreeNode | null>(null);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  // v12.3: confirmShoot state removed — confirm now lives inside the
  // unified ShootUploadDialog footer, which MyShootsView mounts itself.

  // v12.2: drag overlay state — replaces the permanent UploadDropZone box.
  // A drag counter handles nested drag events that would otherwise flicker
  // the overlay every time the cursor crosses a child element.
  const dragCounter = React.useRef(0);
  const [dragActive, setDragActive] = React.useState(false);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dragCounter.current === 0) setDragActive(true);
    dragCounter.current += 1;
  }, []);

  const handleDragLeave = React.useCallback(() => {
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragActive(false);
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    const fileCount = e.dataTransfer?.files.length ?? 0;
    if (fileCount > 0) {
      toast.success(
        fileCount === 1 ? "Uploading 1 file…" : `Uploading ${fileCount} files…`,
      );
    }
  }, []);

  // On mount, honour ?orderId= by jumping to that order's tree node.
  React.useEffect(() => {
    if (!projectKey) return;
    const hit = findFirstOrderNode(fullTree, projectKey);
    if (hit) {
      setActiveNodeId(hit.node.id);
      setTopTab(activeSectionFromPath(hit.path));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  const nodePath = React.useMemo(
    () => findNodePath(fullTree, activeNodeId),
    [activeNodeId],
  );
  const activeNode = nodePath?.node ?? fullTree;

  const visibleTree = React.useMemo(() => {
    const sectioned = treeForTopTab(fullTree, topTab);
    if (projectKey) {
      return pruneTreeToOrder(sectioned, projectKey) ?? sectioned;
    }
    return sectioned;
  }, [topTab, projectKey]);
  const scope = React.useMemo(() => scopeFromNode(activeNode), [activeNode]);

  const visibleFiles = React.useMemo(() => {
    let baseFiles =
      scope.section === "root"
        ? allFiles.filter((f) =>
            topTab === "raw"
              ? f.shooterId !== "shooter-sara"
              : f.shooterId === "shooter-sara",
          )
        : allFiles;
    if (projectKey) {
      baseFiles = baseFiles.filter((f) => f.orderId.includes(projectKey));
    }
    const filtered = filterFiles(baseFiles, scope, filterTab, query);
    return sortFiles(filtered, sortKey, sortDir);
  }, [scope, filterTab, query, sortKey, sortDir, topTab, projectKey]);

  // Page-level stats for the H1 subtitle (Editor-Queue parity).
  const totalBytes = React.useMemo(
    () => visibleFiles.reduce((acc, f) => acc + f.byte_size, 0),
    [visibleFiles],
  );
  const lastUpdated = React.useMemo(
    () => lastActivityFor(visibleFiles),
    [visibleFiles],
  );

  // Derive the H1 from the active node. At root, use "All files" so the
  // header is always anchored on something meaningful. The Shoots tab uses
  // its own title since it's not file-tree scoped.
  const pageTitle =
    topTab === "shoots"
      ? "Today"
      : activeNode.id === "root"
        ? "All files"
        : activeNode.label;

  // Counts for filter pills
  const counts = React.useMemo(() => {
    let sectionFiltered =
      scope.section === "root"
        ? allFiles.filter((f) =>
            topTab === "raw"
              ? f.shooterId !== "shooter-sara"
              : f.shooterId === "shooter-sara",
          )
        : allFiles;
    if (projectKey) {
      sectionFiltered = sectionFiltered.filter((f) =>
        f.orderId.includes(projectKey),
      );
    }
    return {
      all: filterFiles(sectionFiltered, scope, "all", query).length,
      recent: filterFiles(sectionFiltered, scope, "recent", query).length,
      starred: filterFiles(sectionFiltered, scope, "starred", query).length,
      archived: filterFiles(sectionFiltered, scope, "archived", query).length,
    };
  }, [scope, query, topTab, projectKey]);

  // ----- Handlers --------------------------------------------------------

  const handleSelectNode = React.useCallback((node: TreeNode) => {
    setActiveNodeId(node.id);
    setSelectedIds(new Set());
    setMobileSidebarOpen(false);
  }, []);

  const handleTopTabChange = React.useCallback((next: TopTab) => {
    setTopTab(next);
    setActiveNodeId(next === "raw" ? "raw" : "delivery");
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSortChange = React.useCallback((k: SortKey, d?: SortDir) => {
    setSortKey(k);
    if (d) setSortDir(d);
  }, []);

  const handleOpenPreviewById = React.useCallback(
    (id: string) => {
      const f = visibleFiles.find((x) => x.id === id);
      if (f) setPreviewItem(f);
    },
    [visibleFiles],
  );

  const handleOpenPreviewByFile = React.useCallback((file: UnifiedFile) => {
    setPreviewItem(file);
  }, []);

  const handleChangePreviewFile = React.useCallback(
    (id: string) => {
      const f = visibleFiles.find((x) => x.id === id);
      if (f) setPreviewItem(f);
    },
    [visibleFiles],
  );

  const handleGridAction = React.useCallback(
    (action: string, id: string) => {
      const f = visibleFiles.find((x) => x.id === id);
      if (!f) return;
      switch (action) {
        case "download":
          toast.success(`Downloading ${f.filename}`);
          break;
        case "copy-url":
          toast.success("Link copied");
          break;
        case "open-external":
          toast.info(`Opening ${f.filename}`);
          break;
        case "star":
          toast.success(f.starred ? "Removed from starred" : "Added to starred");
          break;
        case "archive":
          toast.success(f.archived ? "Unarchived" : "Archived");
          break;
        case "delete":
          toast.error(`Deleted ${f.filename}`);
          break;
        default:
          break;
      }
    },
    [visibleFiles],
  );

  const handleListAction = React.useCallback(
    (_action: FileListAction, _file: UnifiedFile) => {
      // FileList already toasts internally — nothing extra to do.
    },
    [],
  );

  const handleUpload = React.useCallback(() => {
    if (scope.section === "root") {
      toast.info("Pick a category folder to upload into");
      return;
    }
    if (!scope.categoryLabel) {
      toast.info("Open a category folder to upload");
      return;
    }
    toast.info("Drop files in the upload area below");
  }, [scope]);

  const handleNewFolder = React.useCallback(() => {
    setNewFolderOpen(true);
  }, []);

  const handleShare = React.useCallback(() => {
    setShareNode(activeNode);
  }, [activeNode]);

  const handleClearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDownload = React.useCallback(() => {
    toast.success(`Downloading ${selectedIds.size} files`);
  }, [selectedIds.size]);

  const handleBulkShare = React.useCallback(() => {
    setShareNode(activeNode);
  }, [activeNode]);

  const handleBulkMove = React.useCallback(() => {
    toast.info("Move dialog coming soon");
  }, []);

  const handleBulkArchive = React.useCallback(() => {
    toast.success(`Archived ${selectedIds.size} files`);
    setSelectedIds(new Set());
  }, [selectedIds.size]);

  const handleBulkDelete = React.useCallback(() => {
    toast.error(`Deleted ${selectedIds.size} files`);
    setSelectedIds(new Set());
  }, [selectedIds.size]);

  const handleSidebarToggle = React.useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarOpen((v) => !v);
    }
  }, []);

  // ---------- Render --------------------------------------------------------

  const sidebarTree = visibleTree;
  const currentSortLabel = sortLabel(sortKey, sortDir);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Body: tree sidebar | main content */}
      <div className="flex min-h-0 flex-1">
        {/* Desktop tree sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 border-r border-border bg-card/30",
            "transition-[width] duration-base ease-emphasized",
            "lg:block",
            sidebarOpen ? "lg:w-72" : "lg:w-0 lg:overflow-hidden",
          )}
        >
          {sidebarOpen && (
            <TreeSidebar
              tree={sidebarTree}
              activeNodeId={activeNodeId}
              onSelectNode={handleSelectNode}
              topTab={topTab}
              onTopTabChange={handleTopTabChange}
              query={query}
              onQueryChange={setQuery}
              searchPlaceholder={`Search in ${pageTitle.toLowerCase()}…`}
              className="h-full"
            />
          )}
        </aside>

        {/* Mobile/Tablet tree sidebar — Sheet */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[300px] gap-0 border-r border-border bg-card p-0"
          >
            <TreeSidebar
              tree={sidebarTree}
              activeNodeId={activeNodeId}
              onSelectNode={handleSelectNode}
              topTab={topTab}
              onTopTabChange={handleTopTabChange}
              query={query}
              onQueryChange={setQuery}
              searchPlaceholder={`Search in ${pageTitle.toLowerCase()}…`}
              className="h-full"
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {/* v11: Back-to-Order strip — only when arrived from an Order Detail
              (?orderId=…). Sits above the page header so it reads as a
              breadcrumb-style "you're inside this order" affordance. */}
          {orderContext && (
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2 lg:px-6">
              <Link
                href={`/orders/${orderContext.id}?from=files`}
                className="press inline-flex h-8 items-center gap-1.5 -ml-2 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back to Order #{orderContext.display_number}
              </Link>
              <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
                {orderContext.property_address}
              </span>
            </div>
          )}

          {/* ── Editor-Queue-style page header ──────────────────── */}
          <div className="flex flex-col gap-3 border-b border-border px-4 pt-4 pb-3 lg:px-6 lg:pt-5 lg:pb-4">
            {/* Title row: H1 + stats (left) · action buttons (right) */}
            <div className="flex items-end justify-between gap-4">
              <div className="flex min-w-0 items-start gap-2">
                {/* Tree sidebar toggle — only when desktop sidebar is closed
                    OR when on tablet/mobile. Hidden on lg+ when open. */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleSidebarToggle}
                        aria-label={
                          sidebarOpen ? "Hide folder tree" : "Show folder tree"
                        }
                        className={cn(
                          "press mt-1 size-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground",
                          "lg:" +
                            (sidebarOpen
                              ? "hidden"
                              : "inline-flex"),
                        )}
                      />
                    }
                  >
                    <Menu className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {sidebarOpen ? "Hide folder tree" : "Show folder tree"}
                  </TooltipContent>
                </Tooltip>

                <div className="min-w-0">
                  <h1
                    className="truncate text-fluid-3xl font-bold tracking-tight"
                    title={pageTitle}
                  >
                    {pageTitle}
                  </h1>
                  {/* v12.2: stats subtitle restored under the H1. User
                      asked for a clear 2-tier title block (H1 + subtitle)
                      so the controls row below isn't crowded with stats.
                      Hidden on the Shoots tab where files aren't the
                      primary unit of measure. */}
                  {topTab !== "shoots" && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-muted-foreground tabular-nums">
                    <span>
                      {visibleFiles.length}{" "}
                      {visibleFiles.length === 1 ? "file" : "files"}
                    </span>
                    {totalBytes > 0 && (
                      <>
                        <span aria-hidden className="text-muted-foreground/40">
                          •
                        </span>
                        <span>{formatBytes(totalBytes)}</span>
                      </>
                    )}
                    {lastUpdated && (
                      <>
                        <span aria-hidden className="text-muted-foreground/40">
                          •
                        </span>
                        <span>Updated {lastUpdated}</span>
                      </>
                    )}
                  </p>
                  )}
                </div>
              </div>

              {/* v12.2: action cluster — Download is now the primary
                  (folder-level zip is the common ask), Share + Upload
                  collapse to icon-only ghost buttons. */}
              <div className="flex shrink-0 items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={handleShare}
                        aria-label="Share folder"
                        className="press size-8 rounded-full"
                      />
                    }
                  >
                    <Share2 className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Share folder…</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={handleUpload}
                        aria-label="Upload files"
                        className="press size-8 rounded-full"
                      />
                    }
                  >
                    <Upload className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Upload files</TooltipContent>
                </Tooltip>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    toast.success(
                      `Downloading ${visibleFiles.length} files…`,
                    )
                  }
                  disabled={visibleFiles.length === 0}
                  className="press lift h-8 gap-1.5 rounded-full px-4"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="More folder actions"
                        className="press size-8 rounded-full"
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="min-w-44"
                  >
                    <DropdownMenuItem onClick={handleNewFolder}>
                      <FolderPlus className="size-4" />
                      New folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* v12.2: controls row — filter pills (left) ··· zoom + view +
                sort (right). Stats moved back up into the H1 subtitle so
                this row stays focused on controls only. Hidden on the
                Shoots tab (no file filters apply there). */}
            {topTab !== "shoots" && (
            <div className="flex min-w-0 items-center gap-2">
              {FILTER_TABS.map((tab) => {
                const active = tab.value === filterTab;
                const badge =
                  tab.value === "all"
                    ? counts.all
                    : tab.value === "recent"
                      ? counts.recent
                      : tab.value === "starred"
                        ? counts.starred
                        : counts.archived;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterTab(tab.value)}
                    className={cn(
                      "press inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors duration-fast ease-standard",
                      active
                        ? "bg-foreground text-background shadow-sm"
                        : "border border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                    {badge > 0 && (
                      <span
                        className={cn(
                          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                          active
                            ? "bg-background/15 text-background"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* v12.2: view controls promoted from the footer to the top
                  filter row so sort, view, and zoom all sit together above
                  the grid. Order: zoom → view → sort. */}
              <div className="ml-auto flex items-center gap-2">
                {viewMode === "grid" && (
                  <div className="hidden items-center gap-2 sm:flex">
                    <ImageIcon
                      aria-hidden
                      className="size-3 shrink-0 text-muted-foreground/60"
                    />
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[zoomLevel]}
                      onValueChange={(v) => {
                        // v can be either a single number or an array; the
                        // earlier `v[0]` check failed for the number form
                        // and silently dropped drag updates.
                        const n = Array.isArray(v) ? v[0] : v;
                        if (typeof n === "number") setZoomLevel(n);
                      }}
                      aria-label={`Zoom level (${zoomLevel} of 5)`}
                      className="w-28 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted-foreground/20 [&_[data-slot=slider-range]]:bg-foreground [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-foreground [&_[data-slot=slider-thumb]]:bg-background [&_[data-slot=slider-thumb]]:shadow-sm"
                    />
                    <ImageIcon
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted-foreground/60"
                    />
                  </div>
                )}

                <ToggleGroup
                  multiple={false}
                  value={[viewMode]}
                  onValueChange={(v) => {
                    const next = v[0] as ViewMode | undefined;
                    if (next && next !== viewMode) setViewMode(next);
                  }}
                  spacing={0}
                  variant="outline"
                  className="h-7 rounded-full bg-background"
                >
                  <ToggleGroupItem
                    value="grid"
                    aria-label="Gallery view"
                    className="size-7 px-1.5 !rounded-l-full !rounded-r-none"
                  >
                    <LayoutGrid className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="list"
                    aria-label="List view"
                    className="size-7 px-1.5 !rounded-r-full !rounded-l-none"
                  >
                    <Rows3 className="size-3.5" />
                  </ToggleGroupItem>
                </ToggleGroup>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="press size-7 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={`Sort: ${currentSortLabel}`}
                      />
                    }
                  >
                    <ArrowDownWideNarrow className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="min-w-52"
                  >
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Sort by
                    </div>
                    <DropdownMenuSeparator />
                    {SORT_OPTIONS.map((opt) => {
                      const active =
                        opt.key === sortKey && opt.dir === sortDir;
                      return (
                        <DropdownMenuItem
                          key={`${opt.key}-${opt.dir}`}
                          onClick={() => handleSortChange(opt.key, opt.dir)}
                          aria-checked={active}
                          className={cn(
                            active && "bg-accent text-accent-foreground",
                          )}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {active && (
                            <Check
                              className="size-3.5 text-foreground"
                              aria-hidden
                            />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        setFilterTab(filterTab === "archived" ? "all" : "archived")
                      }
                    >
                      <span className="flex-1">
                        {filterTab === "archived"
                          ? "Hide archived"
                          : `Show archived${counts.archived > 0 ? ` (${counts.archived})` : ""}`}
                      </span>
                      {filterTab === "archived" && (
                        <Check
                          className="size-3.5 text-foreground"
                          aria-hidden
                        />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            )}
          </div>

          {/* v12.2: content area — drop overlay activates on drag-over,
              files fill the remaining height inside a single rounded card
              that owns the vertical scroll. No fixed bottom padding so the
              card extends all the way to the BulkActionsBar zone. */}
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-4 lg:px-6 lg:pb-4 lg:pt-5">
            {/* v12.2: content shell — drag handlers live here so the
                whole content area accepts drops. List view ships its own
                header+card internally (header outside, body card below).
                Grid view uses a simple flex column with its own scroll. */}
            <div
              className={cn(
                "relative flex min-h-0 flex-1 flex-col",
                dragActive &&
                  "ring-2 ring-foreground/40 ring-offset-2 ring-offset-background rounded-2xl",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {topTab === "shoots" ? (
                <MyShootsView />
              ) : viewMode === "grid" ? (
                <div className="flex-1 min-h-0 overflow-auto scroll-smooth-y">
                  <FileGrid
                    files={visibleFiles}
                    selectedIds={selectedIds}
                    zoomLevel={zoomLevel}
                    onToggleSelect={handleToggleSelect}
                    onOpenPreview={handleOpenPreviewById}
                    onAction={handleGridAction}
                  />
                  {selectedIds.size > 0 && <div aria-hidden className="h-24" />}
                </div>
              ) : (
                <FileList
                  files={visibleFiles}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onOpenPreview={handleOpenPreviewByFile}
                  onAction={handleListAction}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSortChange={handleSortChange}
                />
              )}

              {/* v12.2: drag overlay — only visible while user is dragging
                  files over the content area. Replaces the always-on drop
                  zone. */}
              {dragActive && (
                <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-foreground/40 bg-card/80 px-8 py-6 text-foreground">
                    <Upload className="size-7" />
                    <div className="text-sm font-semibold">
                      Drop files to upload
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Photos, videos, floor plans up to 5 GB
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* v12.2: bulk bar absolute (not sticky) so it doesn't reserve
              layout height when hidden. Floats over the card bottom on
              demand. main is `relative` so this anchors correctly. */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex w-full max-w-[640px] -translate-x-1/2 justify-center px-4">
            <BulkActionsBar
              count={selectedIds.size}
              onClear={handleClearSelection}
              onDownload={handleBulkDownload}
              onShare={handleBulkShare}
              onMove={handleBulkMove}
              onArchive={handleBulkArchive}
              onDelete={handleBulkDelete}
            />
          </div>

        </main>
      </div>

      {/* ── Overlays ────────────────────────────────────────── */}
      <FilePreviewModal
        open={previewItem !== null}
        onOpenChange={(v) => {
          if (!v) setPreviewItem(null);
        }}
        file={previewItem}
        files={visibleFiles}
        onChangeFile={handleChangePreviewFile}
      />

      <FolderShareDialog
        open={shareNode !== null}
        onOpenChange={(v) => {
          if (!v) setShareNode(null);
        }}
        node={shareNode}
      />

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        orderId={scope.orderId}
        existingCategoryKinds={[]}
        onCreate={(kinds) => {
          toast.success(
            kinds.length === 1
              ? "Folder added"
              : `${kinds.length} folders added`,
          );
        }}
      />

      {/* v12.3: Shoots-tab confirm dialog removed — confirm now lives in
          the unified ShootUploadDialog footer (mounted by MyShootsView). */}
    </div>
  );
}

export default UploadsPage;
