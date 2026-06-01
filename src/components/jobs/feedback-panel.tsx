"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CornerUpLeftIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PlayIcon,
  SendIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { users } from "@/components/editor-data";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  uploadItemVersion,
  type FeedbackEntry,
  type ItemFile,
  type ItemVersion,
} from "@/components/jobs/jobs-data";

type Tab = "all" | "undone" | "done";

export type FeedbackPanelProps = {
  version: ItemVersion;
  selectedFile?: ItemFile;
  onSelectFile?: (fileId: string | undefined) => void;
  onSeekTimestamp?: (sec: number) => void;
  /** Item kind drives the Upload accept attribute */
  uploadAccept?: string;
  uploadMultiple?: boolean;
  nextVersionNumber?: number;
  itemId?: string;
  onUploadSuccess?: (newV: ItemVersion) => void;
};

type ReplyState = { parentId: string; body: string };

export function FeedbackPanel({
  version,
  selectedFile,
  onSelectFile,
  onSeekTimestamp,
  uploadAccept = "*/*",
  uploadMultiple = false,
  nextVersionNumber,
  itemId,
  onUploadSuccess,
}: FeedbackPanelProps) {
  const viewer = useCurrentUser();
  const [tab, setTab] = React.useState<Tab>("all");
  const [draft, setDraft] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [localFeedback, setLocalFeedback] = React.useState<FeedbackEntry[]>([]);
  const [resolved, setResolved] = React.useState<Set<string>>(new Set());
  const [deleted, setDeleted] = React.useState<Set<string>>(new Set());
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [reply, setReply] = React.useState<ReplyState | null>(null);

  React.useEffect(() => {
    // Reset everything when version changes
    setDraft("");
    setPin("");
    setLocalFeedback([]);
    setResolved(new Set());
    setDeleted(new Set());
    setEdits({});
    setReply(null);
  }, [version.id]);

  // Compute display rows (original + local), apply edits, drop deleted.
  const all = React.useMemo(() => {
    const merged = [...version.feedback, ...localFeedback];
    return merged
      .filter((f) => !deleted.has(f.id))
      .map((f) => {
        const body = edits[f.id] ?? f.body;
        const status = resolved.has(f.id)
          ? "resolved"
          : f.status === "resolved" && !resolved.has(f.id)
            ? "resolved"
            : "open";
        // If user manually un-resolved a resolved one, that's open
        const isResolved = resolved.has(f.id) || (f.status === "resolved" && !manuallyOpened(f.id, edits, deleted));
        return { ...f, body, status: isResolved ? ("resolved" as const) : ("open" as const) };
        // unused branches above for type narrow; status simply driven by resolved set XOR f.status
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version.feedback, localFeedback, resolved, deleted, edits]);

  // We don't truly support "un-resolve" of seed data here — keep impl simple.

  const undoneAll = all.filter((f) => f.status === "open");
  const doneAll = all.filter((f) => f.status === "resolved");

  const visible = React.useMemo(() => {
    let pool = all;
    if (tab === "undone") pool = undoneAll;
    else if (tab === "done") pool = doneAll;
    if (selectedFile) {
      // selected-file chip: when active, narrow further to that file
      pool = pool.filter((f) => f.fileId === selectedFile.id);
    }
    return pool;
  }, [tab, all, undoneAll, doneAll, selectedFile]);

  const openCount = undoneAll.length;
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  const onUploadPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const n = nextVersionNumber ?? version.number + 1;

    if (itemId) {
      const newV = uploadItemVersion(itemId, files.length, viewer.id);
      if (newV && onUploadSuccess) {
        onUploadSuccess(newV);
      }
    }

    toast.success(`Uploaded v${n} (mock)`, {
      description: `${files.length} ${files.length === 1 ? "file" : "files"} staged. Status updated to Awaiting Review. Manager notified.`,
    });
    e.target.value = "";
  };

  const post = React.useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    const id = `local-${version.id}-${localFeedback.length}`;
    const timestampSec = parseTimestamp(pin);
    setLocalFeedback((prev) => [
      ...prev,
      {
        id,
        fileId: selectedFile ? selectedFile.id : undefined,
        authorId: "KY",
        body,
        timestampSec: timestampSec ?? undefined,
        status: "open",
        createdAt: "just now",
      },
    ]);
    setDraft("");
    setPin("");
  }, [draft, pin, version.id, localFeedback.length, selectedFile]);

  const postReply = React.useCallback(
    (parent: FeedbackEntry) => {
      const body = reply?.body.trim();
      if (!body || !reply || reply.parentId !== parent.id) return;
      const id = `local-${version.id}-${localFeedback.length}-reply`;
      setLocalFeedback((prev) => [
        ...prev,
        {
          id,
          fileId: parent.fileId,
          authorId: "KY",
          body,
          timestampSec: parent.timestampSec,
          status: "open",
          createdAt: "just now",
        },
      ]);
      setReply(null);
    },
    [reply, version.id, localFeedback.length],
  );

  const isManager = viewer.role === "manager" || viewer.role === "admin";
  const isEditor = viewer.role === "editor";

  const downloadReport = () => {
    if (all.length === 0) {
      toast.error("No feedback comments to download.");
      return;
    }
    const text = all
      .map(
        (f, i) =>
          `${i + 1}. [v${version.number}] [${f.status.toUpperCase()}] ${
            f.timestampSec != null ? `[${fmtTimestamp(f.timestampSec)}] ` : ""
          }${f.body}`
      )
      .join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `feedback_report_v${version.number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Feedback report downloaded successfully!");
  };

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l bg-muted/15">
      {/* header — matches old ReviewView: Feedback + count + v badge + Upload */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-semibold text-foreground">Feedback</h2>
          <span className="font-mono text-[11px] text-muted-foreground">{all.length}</span>
          <span className="ml-0.5 inline-flex h-5 items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/15 px-1.5 text-[10px] font-bold text-indigo-300">
            v{version.number}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <input
            ref={uploadInputRef}
            type="file"
            multiple={uploadMultiple}
            accept={uploadAccept}
            onChange={onUploadPick}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            title="Upload new version"
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            <UploadIcon className="size-3" />
            Upload
          </button>
          <button
            type="button"
            onClick={downloadReport}
            title="Download all feedback"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <DownloadIcon className="size-3" />
          </button>
        </div>
      </div>

      {isManager && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 text-[9.5px] text-amber-200 leading-normal font-medium">
          Autosaving feedback... Comments compiled and sent on close or after 10m.
        </div>
      )}

      {isEditor && (
        <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-3 py-1.5 text-[9.5px] text-indigo-200 leading-normal font-medium">
          Address each feedback item. Check Done directly on the list as you work.
        </div>
      )}

      {/* tabs — All / Undone / Done (match old ReviewView) */}
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <FeedbackTab
          label="All"
          count={all.length}
          active={tab === "all"}
          onClick={() => setTab("all")}
        />
        <FeedbackTab
          label="Undone"
          count={undoneAll.length}
          active={tab === "undone"}
          accent="amber"
          onClick={() => setTab("undone")}
        />
        <FeedbackTab
          label="Done"
          count={doneAll.length}
          active={tab === "done"}
          accent="emerald"
          onClick={() => setTab("done")}
        />
      </div>

      {/* Selected-file anchor strip (shown only when a file is focused) */}
      {selectedFile && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5 text-[10.5px] text-muted-foreground">
          <span className="font-mono text-foreground">{selectedFile.filename}</span>
          <span>· filtered</span>
          <button
            type="button"
            onClick={() => onSelectFile?.(undefined)}
            className="ml-auto text-muted-foreground underline-offset-2 hover:underline"
          >
            clear
          </button>
        </div>
      )}

      {/* feedback list */}
      <div className="flex-1 overflow-auto px-3 py-3">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            {tab === "done"
              ? "No resolved comments yet."
              : tab === "undone"
                ? selectedFile
                  ? `No open comments on ${selectedFile.filename}.`
                  : "All caught up — nothing open."
                : selectedFile
                  ? `No comments on ${selectedFile.filename} yet.`
                  : "No feedback yet. Drop a note below to ask for a revision."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((f) => (
              <FeedbackRow
                key={f.id}
                f={f}
                editingBody={f.id in edits ? edits[f.id] : undefined}
                isEditing={false}
                onToggleResolved={() => {
                  setResolved((prev) => {
                    const next = new Set(prev);
                    next.has(f.id) ? next.delete(f.id) : next.add(f.id);
                    return next;
                  });
                }}
                onStartEdit={(initial) => setEdits((p) => ({ ...p, [f.id]: initial }))}
                onChangeEdit={(v) => setEdits((p) => ({ ...p, [f.id]: v }))}
                onSaveEdit={() => {
                  // edits map already holds the new body — keep it
                  toast.success("Comment updated (mock)");
                }}
                onCancelEdit={() =>
                  setEdits((p) => {
                    const n = { ...p };
                    delete n[f.id];
                    return n;
                  })
                }
                onDelete={() => {
                  setDeleted((p) => new Set(p).add(f.id));
                  toast.info("Comment deleted (mock)");
                }}
                onReply={() => setReply({ parentId: f.id, body: "" })}
                replyState={reply?.parentId === f.id ? reply : null}
                onChangeReply={(v) => setReply((r) => (r ? { ...r, body: v } : r))}
                onPostReply={() => postReply(f)}
                onCancelReply={() => setReply(null)}
                onSeek={onSeekTimestamp}
                onSelectFile={onSelectFile}
              />
            ))}
          </ul>
        )}
      </div>

      <Separator />

      {/* composer */}
      <div className="flex flex-col gap-2 px-3 py-3">
        {/* Pin + body */}
        <div className="flex items-start gap-1.5">
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="0:00"
            className="w-14 shrink-0 rounded-md border border-border bg-muted/40 px-1.5 py-2 text-center font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:outline-none"
            title="Timestamp pin (mm:ss)"
          />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                post();
              }
            }}
            placeholder={
              selectedFile
                ? "Comment on this file…"
                : "Add a comment for the whole version…"
            }
            rows={2}
            className="flex-1 resize-none rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">⌘↵ to send</span>
          <button
            type="button"
            onClick={post}
            disabled={!draft.trim()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              draft.trim()
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            <SendIcon className="size-3" />
            Post
          </button>
        </div>
      </div>
    </aside>
  );
}

function FeedbackTab({
  label,
  count,
  active,
  accent,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  accent?: "amber" | "emerald";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
          active
            ? "bg-background/20 text-background"
            : accent === "amber"
              ? "bg-amber-500/15 text-amber-300"
              : accent === "emerald"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-muted text-muted-foreground/80",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FeedbackRow({
  f,
  editingBody,
  isEditing,
  onToggleResolved,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReply,
  replyState,
  onChangeReply,
  onPostReply,
  onCancelReply,
  onSeek,
  onSelectFile,
}: {
  f: FeedbackEntry;
  editingBody: string | undefined;
  isEditing: boolean;
  onToggleResolved: () => void;
  onStartEdit: (initial: string) => void;
  onChangeEdit: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  replyState: ReplyState | null;
  onChangeReply: (v: string) => void;
  onPostReply: () => void;
  onCancelReply: () => void;
  onSeek?: (sec: number) => void;
  onSelectFile?: (id: string | undefined) => void;
}) {
  const author = users[f.authorId];
  const editing = editingBody !== undefined;
  const isResolved = f.status === "resolved";

  return (
    <li
      className={cn(
        "group rounded-lg border bg-card/60 px-3 py-2",
        isResolved ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-border",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Resolve toggle */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5 min-w-[32px]">
          <button
            type="button"
            onClick={onToggleResolved}
            title={isResolved ? "Mark as open" : "Mark as resolved"}
            className={cn(
              "grid size-4 place-items-center rounded-full border transition-colors cursor-pointer",
              isResolved
                ? "border-emerald-500 bg-emerald-500/80"
                : "border-muted-foreground/50 hover:border-emerald-500 hover:bg-emerald-500/20",
            )}
          >
            {isResolved && <CheckIcon className="size-2.5 text-black" />}
          </button>
          <span className="text-[8px] font-bold text-muted-foreground tracking-tight select-none">
            {isResolved ? "DONE" : "TODO"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Author row */}
          <div className="flex items-center gap-2">
            {author && (
              <Avatar className="size-5">
                <AvatarImage src={author.image} alt={author.name} />
                <AvatarFallback className={author.tone}>{author.initials}</AvatarFallback>
              </Avatar>
            )}
            <span
              className={cn(
                "text-xs font-medium",
                isResolved ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {author?.name ?? f.authorId}
            </span>
            <span className="text-[10px] text-muted-foreground">{f.createdAt}</span>
          </div>

          {/* Anchor chips */}
          {(f.fileId || f.timestampSec != null) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {f.timestampSec != null && (
                <button
                  type="button"
                  onClick={() => onSeek?.(f.timestampSec!)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PlayIcon className="size-2.5" />
                  {fmtTimestamp(f.timestampSec)}
                </button>
              )}
              {f.fileId && (
                <button
                  type="button"
                  onClick={() => onSelectFile?.(f.fileId)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  attached file
                </button>
              )}
            </div>
          )}

          {/* Body / edit mode */}
          {editing ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <textarea
                value={editingBody ?? f.body}
                onChange={(e) => onChangeEdit(e.target.value)}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground focus:border-foreground/40 focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={onSaveEdit}
                  className="h-6 px-2 text-[10.5px]"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancelEdit}
                  className="h-6 px-2 text-[10.5px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                "mt-1.5 text-xs leading-relaxed",
                isResolved ? "text-muted-foreground line-through" : "text-foreground/90",
              )}
            >
              {f.body}
            </p>
          )}

          {/* Inline reply composer */}
          {replyState && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-border bg-muted/30 p-2">
              <textarea
                value={replyState.body}
                onChange={(e) => onChangeReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onPostReply();
                  }
                }}
                placeholder={`Reply to ${author?.name ?? f.authorId}…`}
                rows={2}
                autoFocus
                className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[11.5px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  disabled={!replyState.body.trim()}
                  onClick={onPostReply}
                  className="h-6 px-2 text-[10.5px]"
                >
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancelReply}
                  className="h-6 px-2 text-[10.5px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hover affordances */}
        {!editing && !replyState && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={onReply}
              title="Reply"
              className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <CornerUpLeftIcon className="size-3" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    title="More"
                    className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                  />
                }
              >
                <MoreHorizontalIcon className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuItem onClick={() => onStartEdit(f.body)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2Icon className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </li>
  );
}

function fmtTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseTimestamp(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  // Accept "12", "0:12", "1:23", "01:23"
  const parts = t.split(":");
  if (parts.length === 1) {
    const n = Number(parts[0]);
    return Number.isFinite(n) ? n : null;
  }
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const sec = Number(parts[1]);
    if (Number.isFinite(m) && Number.isFinite(sec)) return m * 60 + sec;
  }
  return null;
}

// no-op helper retained for future stable narrowing of manual-unresolve
function manuallyOpened(
  _id: string,
  _edits: Record<string, string>,
  _deleted: Set<string>,
): boolean {
  return false;
}
