"use client";

import * as React from "react";
import {
  X as XIcon,
  Copy,
  Check,
  Share2,
  Lock,
  Clock,
  ShieldCheck,
  Eye,
  MessageSquare,
  Pencil,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TreeNode } from "@/components/uploads/uploads-data";
import { formatBytes, shooters, orders } from "@/components/uploads/uploads-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FolderShareDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  node: TreeNode | null;
};

type Permission = "view" | "comment" | "edit";
type Expiry = "never" | "24h" | "7d" | "30d";
type Step = "configure" | "success";

const PERMISSION_LABEL: Record<Permission, string> = {
  view: "View only",
  comment: "Can comment",
  edit: "Can edit",
};

const EXPIRY_LABEL: Record<Expiry, string> = {
  never: "No expiry",
  "24h": "Expires in 24 hours",
  "7d": "Expires in 7 days",
  "30d": "Expires in 30 days",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function generateLink(nodeId: string): string {
  const base = nodeId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "abc123";
  const suffix = Math.random().toString(36).slice(2, 10);
  return `https://odone.app/f/${base}${suffix}`;
}

function nodeKindSubtitle(node: TreeNode | null): string | null {
  if (!node) return null;
  const parts: string[] = [];
  if (typeof node.count === "number" && node.count > 0) {
    parts.push(`${node.count} item${node.count === 1 ? "" : "s"}`);
  }
  if (typeof node.bytes === "number" && node.bytes > 0) {
    parts.push(formatBytes(node.bytes));
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FolderShareDialog({
  open,
  onOpenChange,
  node,
}: FolderShareDialogProps) {
  const [step, setStep] = React.useState<Step>("configure");
  const [emails, setEmails] = React.useState<string[]>([]);
  const [emailDraft, setEmailDraft] = React.useState("");
  const [permission, setPermission] = React.useState<Permission>("view");
  const [expiry, setExpiry] = React.useState<Expiry>("7d");
  const [passwordOn, setPasswordOn] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [downloadOn, setDownloadOn] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [link, setLink] = React.useState<string>("");

  // Reset everything when dialog closes; generate a fresh link when opening.
  React.useEffect(() => {
    if (open && node) {
      setLink(generateLink(node.id));
      setCopied(false);
      setStep("configure");
    }
    if (!open) {
      setEmails([]);
      setEmailDraft("");
      setPermission("view");
      setExpiry("7d");
      setPasswordOn(false);
      setPassword("");
      setDownloadOn(true);
      setCopied(false);
      setStep("configure");
    }
  }, [open, node]);

  // Quick-add suggestions: 3 shooters + 3 clients. Surfaced as a compact
  // single-line "Suggested" row to keep the dialog tight.
  const quickAdd = React.useMemo(() => {
    const shooterChips = shooters.slice(0, 3).map((s) => ({
      label: s.name.split(" ")[0],
      email: `${s.id.replace("shooter-", "")}@odone.app`,
    }));
    const clientSet = new Set(orders.map((o) => o.client));
    const clientChips = Array.from(clientSet)
      .slice(0, 3)
      .map((c) => ({
        label: c,
        email: `${c.toLowerCase().replace(/\s+/g, ".")}@client.com`,
      }));
    return [...shooterChips, ...clientChips];
  }, []);

  function addEmail(raw: string) {
    const value = raw.trim().replace(/[,;]+$/, "");
    if (!value) return;
    if (!isValidEmail(value)) {
      toast.error("Not a valid email");
      return;
    }
    if (emails.includes(value)) {
      toast.info("Already added");
      return;
    }
    setEmails((prev) => [...prev, value]);
    setEmailDraft("");
  }

  function removeEmail(value: string) {
    setEmails((prev) => prev.filter((e) => e !== value));
  }

  function onEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(emailDraft);
    } else if (e.key === "Backspace" && !emailDraft && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed");
    }
  }

  function onCreate() {
    if (passwordOn && password.length < 4) {
      toast.error("Password too short");
      return;
    }
    // Move to the success step instead of toasting + closing — the user
    // wanted the link to be a separate moment, not buried in the form.
    setStep("success");
  }

  const subtitle = nodeKindSubtitle(node);
  const folderLabel = node?.label ?? "Folder";

  // Summary chips shown on the success step
  const summary = [
    PERMISSION_LABEL[permission],
    EXPIRY_LABEL[expiry],
    emails.length > 0
      ? `${emails.length} ${emails.length === 1 ? "recipient" : "recipients"}`
      : "Anyone with the link",
    ...(passwordOn ? ["Password set"] : []),
    ...(!downloadOn ? ["Download disabled"] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-w-md gap-0 overflow-hidden p-0 rounded-2xl",
          "data-open:duration-base data-open:ease-spring",
          "data-closed:duration-fast data-closed:ease-standard",
          "shadow-modal"
        )}
      >
        {/* v12.2: header now matches the ShooterConfirmUploadDialog style —
            simple border-b, no glass, no border ring. Subtitle suppressed
            when empty so we don't render "· Empty folder" awkwardly. */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm font-semibold">
              {step === "success" ? "Link ready" : "Share folder"}
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-xs text-muted-foreground">
              <span className="text-foreground" title={folderLabel}>
                {folderLabel}
              </span>
              {subtitle && (
                <>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  <span>{subtitle}</span>
                </>
              )}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              "press grid size-7 shrink-0 place-items-center rounded-full",
              "text-muted-foreground hover:bg-accent hover:text-foreground",
              "transition-colors duration-fast ease-standard"
            )}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {step === "configure" ? (
          <ConfigureStep
            emails={emails}
            emailDraft={emailDraft}
            setEmailDraft={setEmailDraft}
            onEmailKeyDown={onEmailKeyDown}
            removeEmail={removeEmail}
            addEmail={addEmail}
            quickAdd={quickAdd}
            permission={permission}
            setPermission={setPermission}
            expiry={expiry}
            setExpiry={setExpiry}
            passwordOn={passwordOn}
            setPasswordOn={setPasswordOn}
            password={password}
            setPassword={setPassword}
            downloadOn={downloadOn}
            setDownloadOn={setDownloadOn}
          />
        ) : (
          <SuccessStep
            link={link}
            copied={copied}
            copyLink={copyLink}
            summary={summary}
          />
        )}

        {/* Footer — actions change per step */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3 rounded-b-2xl">
          {step === "configure" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="press h-8 rounded-full px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onCreate}
                className="press lift h-8 gap-1.5 rounded-full px-4"
              >
                <Share2 className="size-3.5" />
                Create link
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("configure")}
                className="press h-8 gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Edit settings
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="press lift h-8 rounded-full px-5"
              >
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Configure
// ---------------------------------------------------------------------------

function ConfigureStep({
  emails,
  emailDraft,
  setEmailDraft,
  onEmailKeyDown,
  removeEmail,
  addEmail,
  quickAdd,
  permission,
  setPermission,
  expiry,
  setExpiry,
  passwordOn,
  setPasswordOn,
  password,
  setPassword,
  downloadOn,
  setDownloadOn,
}: {
  emails: string[];
  emailDraft: string;
  setEmailDraft: (v: string) => void;
  onEmailKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  removeEmail: (v: string) => void;
  addEmail: (v: string) => void;
  quickAdd: { label: string; email: string }[];
  permission: Permission;
  setPermission: (p: Permission) => void;
  expiry: Expiry;
  setExpiry: (e: Expiry) => void;
  passwordOn: boolean;
  setPasswordOn: (v: boolean) => void;
  password: string;
  setPassword: (v: string) => void;
  downloadOn: boolean;
  setDownloadOn: (v: boolean) => void;
}) {
  return (
    <div className="max-h-[70vh] space-y-5 overflow-y-auto scroll-smooth-y px-5 py-5">
      {/* Recipients */}
      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="share-recipients"
            className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Share with
          </label>
          {emails.length > 0 && (
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
              {emails.length} added
            </span>
          )}
        </div>
        <div
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-2.5 py-2",
            "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
            "transition-colors duration-fast ease-standard"
          )}
        >
          {emails.map((email) => (
            <span
              key={email}
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-fluid-2xs",
                "text-foreground stagger-fade"
              )}
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="press grid size-3.5 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${email}`}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <input
            id="share-recipients"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            onKeyDown={onEmailKeyDown}
            onBlur={() => emailDraft.trim() && addEmail(emailDraft)}
            placeholder={
              emails.length === 0 ? "Add people by email…" : "Add more…"
            }
            className={cn(
              "h-6 min-w-[8rem] flex-1 bg-transparent text-sm text-foreground outline-none",
              "placeholder:text-muted-foreground"
            )}
          />
        </div>

        {/* Suggested chips — only when no emails added yet */}
        {emails.length === 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested
            </span>
            {quickAdd.slice(0, 4).map((q) => (
              <button
                key={q.email}
                type="button"
                onClick={() => addEmail(q.email)}
                className={cn(
                  "press inline-flex h-6 items-center rounded-full border border-border px-2.5 text-[11px]",
                  "text-muted-foreground hover:border-foreground/30 hover:bg-accent hover:text-foreground",
                  "transition-colors duration-fast ease-standard"
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Permission — segmented pill */}
      <section className="space-y-2.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Permission
        </label>
        <ToggleGroup
          value={[permission]}
          onValueChange={(v) => {
            const val = v[0];
            if (val) setPermission(val as Permission);
          }}
          spacing={0}
          variant="outline"
          size="sm"
          className="w-full rounded-full bg-background"
        >
          <ToggleGroupItem
            value="view"
            aria-label="View only"
            className="flex-1 gap-1.5 !rounded-l-full !rounded-r-none"
          >
            <Eye className="size-3.5" />
            View only
          </ToggleGroupItem>
          <ToggleGroupItem
            value="comment"
            aria-label="Can comment"
            className="flex-1 gap-1.5 !rounded-none"
          >
            <MessageSquare className="size-3.5" />
            Comment
          </ToggleGroupItem>
          <ToggleGroupItem
            value="edit"
            aria-label="Can edit"
            className="flex-1 gap-1.5 !rounded-r-full !rounded-l-none"
          >
            <Pencil className="size-3.5" />
            Can edit
          </ToggleGroupItem>
        </ToggleGroup>
      </section>

      {/* Settings — grouped card, 3 rows; password input only when toggled on */}
      <section className="space-y-2.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </label>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {/* Expiry */}
          <SettingsRow
            icon={Clock}
            label="Link expires"
          >
            <Select
              value={expiry}
              onValueChange={(v) => setExpiry(v as Expiry)}
            >
              <SelectTrigger size="sm" className="min-w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          {/* Password */}
          <div>
            <SettingsRow
              icon={Lock}
              label="Require password"
            >
              <Switch
                checked={passwordOn}
                onCheckedChange={setPasswordOn}
              />
            </SettingsRow>
            {passwordOn && (
              <div className="stagger-fade px-4 pb-3">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a password (min 4 chars)"
                  autoComplete="new-password"
                  className="h-9 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Download */}
          <SettingsRow
            icon={ShieldCheck}
            label="Allow download"
          >
            <Switch checked={downloadOn} onCheckedChange={setDownloadOn} />
          </SettingsRow>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Success / link ready
// ---------------------------------------------------------------------------

function SuccessStep({
  link,
  copied,
  copyLink,
  summary,
}: {
  link: string;
  copied: boolean;
  copyLink: () => void;
  summary: string[];
}) {
  return (
    <div className="space-y-5 px-5 py-6">
      {/* Big visible link box */}
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border border-input bg-muted/40 pl-4",
          "transition-colors duration-fast ease-standard",
          "dark:bg-input/30",
          "stagger-fade"
        )}
      >
        <Input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "h-10 flex-1 border-0 bg-transparent font-mono text-fluid-xs text-foreground",
            "focus-visible:ring-0 focus-visible:border-transparent",
            "dark:bg-transparent"
          )}
        />
        <Button
          type="button"
          size="sm"
          onClick={copyLink}
          className={cn(
            "press lift mr-1 h-8 gap-1.5 rounded-full px-4 transition-all duration-fast ease-standard",
            copied && "bg-emerald-500 text-white hover:bg-emerald-500"
          )}
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy link
            </>
          )}
        </Button>
      </div>

      {/* Summary chips — compact, one row wrap */}
      <div className="flex flex-wrap items-center gap-1.5">
        {summary.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-fluid-2xs text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsRow — compact label + control row inside the Settings card
// ---------------------------------------------------------------------------

function SettingsRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex items-center gap-2.5 text-xs font-medium text-foreground">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </span>
      <span className="shrink-0">{children}</span>
    </div>
  );
}

export default FolderShareDialog;
