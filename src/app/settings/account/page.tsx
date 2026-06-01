"use client";

// ============================================================================
// Odone — /settings/account
// ----------------------------------------------------------------------------
// Security pane: password change, 2FA toggle, active sessions list, sign-out-
// everywhere, and a danger zone for delete-account. All actions are mocked
// via sonner toasts — this is a preview, no real auth wiring.
// ============================================================================

import * as React from "react";
import {
  CheckCircle2Icon,
  GlobeIcon,
  LaptopIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type Session = {
  id: string;
  device: string;
  detail: string;
  lastSeen: string;
  current?: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

const SESSIONS: Session[] = [
  {
    id: "this",
    device: "MacBook Pro 14” — Chrome",
    detail: "San Francisco, CA · this device",
    lastSeen: "Active now",
    current: true,
    icon: LaptopIcon,
  },
  {
    id: "ios",
    device: "iPhone 15 — Odone iOS app",
    detail: "Los Angeles, CA · 192.168.1.42",
    lastSeen: "2 days ago",
    icon: SmartphoneIcon,
  },
  {
    id: "old",
    device: "Chrome — Windows 11",
    detail: "Manila, PH · last used 05/12/2026",
    lastSeen: "19 days ago",
    icon: GlobeIcon,
  },
];

export default function AccountSettingsPage() {
  const [twoFactorOn, setTwoFactorOn] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const canSave =
    current.length >= 6 && next.length >= 8 && next === confirm;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsSection
        title="Change password"
        description="Use 8+ characters. We recommend a passphrase you don't reuse elsewhere."
      >
        <div className="divide-y divide-border">
          <SettingsRow label="Current password" htmlFor="acct-current">
            <Input
              id="acct-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="sm:max-w-sm"
            />
          </SettingsRow>
          <SettingsRow label="New password" htmlFor="acct-new">
            <Input
              id="acct-new"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="sm:max-w-sm"
            />
          </SettingsRow>
          <SettingsRow label="Confirm new password" htmlFor="acct-confirm">
            <Input
              id="acct-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="sm:max-w-sm"
              aria-invalid={
                confirm.length > 0 && confirm !== next ? true : undefined
              }
            />
          </SettingsRow>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            disabled={!canSave}
            onClick={() => {
              setCurrent("");
              setNext("");
              setConfirm("");
              toast.success("Password updated");
            }}
          >
            Update password
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Two-factor authentication"
        description="Adds a one-time code to every sign-in on a new device."
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={
                "grid size-9 shrink-0 place-items-center rounded-full " +
                (twoFactorOn
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-muted text-muted-foreground")
              }
            >
              {twoFactorOn ? (
                <ShieldCheckIcon className="size-4" />
              ) : (
                <ShieldAlertIcon className="size-4" />
              )}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-fluid-sm font-medium text-foreground">
                Authenticator app
              </span>
              <span className="text-fluid-xs text-muted-foreground">
                {twoFactorOn
                  ? "Enabled — codes from your authenticator are required."
                  : "Off — your account is protected by password only."}
              </span>
            </div>
          </div>
          <Switch
            checked={twoFactorOn}
            onCheckedChange={(v) => {
              setTwoFactorOn(v);
              setShowQr(v);
              toast.info(v ? "2FA enabled (mock)" : "2FA disabled (mock)");
            }}
          />
        </div>

        {!twoFactorOn && (
          <div className="mt-4 flex justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowQr(true);
                toast.info("Scan the QR with your authenticator");
              }}
            >
              Set up authenticator app
            </Button>
          </div>
        )}

        {showQr && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
            <div className="grid size-32 shrink-0 place-items-center rounded-md bg-foreground/5">
              <div
                className="grid size-24 place-items-center rounded-sm bg-foreground text-background"
                aria-hidden
              >
                <span className="font-mono text-[10px]">QR PLACEHOLDER</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-fluid-sm font-medium text-foreground">
                Scan with Authy / 1Password / Google Authenticator
              </span>
              <span className="text-fluid-xs text-muted-foreground">
                Then enter the 6-digit code to confirm. Save the recovery key
                in a password manager — it's the only way back in if you lose
                your device.
              </span>
              <code className="mt-1 inline-block rounded bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
                otpauth://totp/Odone:olivertuan198@gmail.com
              </code>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Active sessions"
        description="Devices currently signed in to your Odone account."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Signed out of all other devices")}
          >
            Sign out everywhere
          </Button>
        }
      >
        <ul className="flex flex-col divide-y divide-border">
          {SESSIONS.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <s.icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-fluid-sm font-medium text-foreground">
                      {s.device}
                    </span>
                    {s.current && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-medium uppercase tracking-wide text-emerald-300"
                      >
                        This device
                      </Badge>
                    )}
                  </div>
                  <span className="truncate text-fluid-xs text-muted-foreground">
                    {s.detail}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-fluid-xs text-muted-foreground sm:inline">
                  {s.lastSeen}
                </span>
                {!s.current ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toast.success(`Revoked session on ${s.device}`)
                    }
                  >
                    Revoke
                  </Button>
                ) : (
                  <CheckCircle2Icon className="size-4 text-emerald-400" />
                )}
              </div>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection
        title="Danger zone"
        description="Permanently delete your account and all data we have on you."
        className="border-rose-500/30"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-fluid-sm font-medium text-foreground">
              Delete account
            </span>
            <span className="text-fluid-xs text-muted-foreground">
              Removes orders you own, share links you created, and your editor
              pool assignments. This cannot be undone.
            </span>
          </div>
          <Button
            variant="outline"
            className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
            onClick={() => toast.error("Confirm via the email we just sent")}
          >
            <Trash2Icon className="size-4" />
            Delete my account
          </Button>
        </div>
        <Separator className="my-4" />
        <p className="text-fluid-xs text-muted-foreground">
          You can also{" "}
          <button
            type="button"
            onClick={() => toast.info("Data export queued")}
            className="text-foreground underline-offset-2 hover:underline"
          >
            export your data
          </button>{" "}
          first — we'll email you a download link.
        </p>
      </SettingsSection>
    </div>
  );
}
