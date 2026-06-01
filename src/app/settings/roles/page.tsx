"use client";

// ============================================================================
// Odone — /settings/roles
// ----------------------------------------------------------------------------
// 5-column × 14-row capability matrix grouped by area (Orders / Deliverables
// / Catalog / Members / Billing / Workspace). Admin column is always green ✓
// and locked; Manager/Shooter/Editor/VA cells are togglable switches. Custom
// roles teaser at the bottom for "later".
// ============================================================================

import * as React from "react";
import { CheckIcon, MinusIcon, ShieldIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Role = "admin" | "manager" | "shooter" | "editor" | "va";
const ROLES: { id: Role; label: string; tone: string }[] = [
  { id: "admin", label: "Admin", tone: "text-emerald-300" },
  { id: "manager", label: "Manager", tone: "text-sky-300" },
  { id: "shooter", label: "Shooter", tone: "text-violet-300" },
  { id: "editor", label: "Editor", tone: "text-amber-300" },
  { id: "va", label: "VA", tone: "text-rose-300" },
];

type Capability = {
  key: string;
  label: string;
  defaults: Record<Role, boolean>;
};

type Group = {
  label: string;
  items: Capability[];
};

const GROUPS: Group[] = [
  {
    label: "Orders",
    items: [
      {
        key: "orders.view",
        label: "View orders",
        defaults: { admin: true, manager: true, shooter: true, editor: true, va: true },
      },
      {
        key: "orders.create",
        label: "Create orders",
        defaults: { admin: true, manager: true, shooter: false, editor: false, va: true },
      },
      {
        key: "orders.edit",
        label: "Edit order details",
        defaults: { admin: true, manager: true, shooter: false, editor: false, va: false },
      },
      {
        key: "orders.delete",
        label: "Delete orders",
        defaults: { admin: true, manager: false, shooter: false, editor: false, va: false },
      },
    ],
  },
  {
    label: "Deliverables",
    items: [
      {
        key: "deliv.assign",
        label: "Assign editors",
        defaults: { admin: true, manager: true, shooter: false, editor: false, va: false },
      },
      {
        key: "deliv.upload",
        label: "Upload raw / versions",
        defaults: { admin: true, manager: true, shooter: true, editor: true, va: false },
      },
      {
        key: "deliv.review",
        label: "Review & approve",
        defaults: { admin: true, manager: true, shooter: false, editor: false, va: false },
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        key: "catalog.view",
        label: "View catalog",
        defaults: { admin: true, manager: true, shooter: true, editor: true, va: true },
      },
      {
        key: "catalog.manage",
        label: "Manage services & pricing",
        defaults: { admin: true, manager: false, shooter: false, editor: false, va: false },
      },
    ],
  },
  {
    label: "Members",
    items: [
      {
        key: "members.view",
        label: "View members",
        defaults: { admin: true, manager: true, shooter: true, editor: true, va: true },
      },
      {
        key: "members.invite",
        label: "Invite people",
        defaults: { admin: true, manager: true, shooter: false, editor: false, va: false },
      },
      {
        key: "members.remove",
        label: "Remove members",
        defaults: { admin: true, manager: false, shooter: false, editor: false, va: false },
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        key: "billing.view",
        label: "View invoices & plan",
        defaults: { admin: true, manager: true, shooter: false, editor: false, va: false },
      },
      {
        key: "billing.manage",
        label: "Manage payment & plan",
        defaults: { admin: true, manager: false, shooter: false, editor: false, va: false },
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        key: "ws.settings",
        label: "Workspace settings",
        defaults: { admin: true, manager: false, shooter: false, editor: false, va: false },
      },
    ],
  },
];

export default function RolesSettingsPage() {
  const [matrix, setMatrix] = React.useState<
    Record<string, Record<Role, boolean>>
  >(() => {
    const acc: Record<string, Record<Role, boolean>> = {};
    GROUPS.forEach((g) =>
      g.items.forEach((cap) => {
        acc[cap.key] = { ...cap.defaults };
      }),
    );
    return acc;
  });

  const toggle = (capKey: string, role: Role) => {
    if (role === "admin") return; // locked
    setMatrix((prev) => ({
      ...prev,
      [capKey]: { ...prev[capKey]!, [role]: !prev[capKey]![role] },
    }));
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <SettingsSection
        title="Permissions"
        description="Admin row is always on — at least one Admin must retain full access. Toggle the other roles to match your team's policy."
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const acc: Record<string, Record<Role, boolean>> = {};
              GROUPS.forEach((g) =>
                g.items.forEach((cap) => {
                  acc[cap.key] = { ...cap.defaults };
                }),
              );
              setMatrix(acc);
              toast.info("Permissions reset to defaults");
            }}
          >
            Reset to defaults
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <div
            className="min-w-[640px]"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 1fr) repeat(5, 96px)",
              alignItems: "center",
            }}
          >
            {/* Header row */}
            <div className="pb-3 text-fluid-xs font-medium uppercase tracking-wide text-muted-foreground">
              Capability
            </div>
            {ROLES.map((r) => (
              <div
                key={r.id}
                className="flex flex-col items-center gap-1 pb-3 text-center"
              >
                <span
                  className={
                    "text-fluid-xs font-medium uppercase tracking-wide " +
                    r.tone
                  }
                >
                  {r.label}
                </span>
              </div>
            ))}

            {GROUPS.map((group) => (
              <React.Fragment key={group.label}>
                <div
                  className="col-span-6 mt-2 mb-1 flex items-center gap-2 border-t border-border pt-3 text-fluid-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {group.label}
                </div>
                {group.items.map((cap) => (
                  <React.Fragment key={cap.key}>
                    <div className="py-2 text-fluid-sm text-foreground">
                      {cap.label}
                    </div>
                    {ROLES.map((r) => {
                      const on = matrix[cap.key]![r.id];
                      if (r.id === "admin") {
                        return (
                          <div
                            key={r.id}
                            className="flex items-center justify-center py-2"
                            aria-label="Always on for Admin"
                          >
                            <span className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                              <CheckIcon className="size-3.5" />
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-center py-2"
                        >
                          {on ? (
                            <Switch
                              checked
                              onCheckedChange={() => toggle(cap.key, r.id)}
                              aria-label={`${cap.label} for ${r.label}`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggle(cap.key, r.id)}
                              className="grid size-6 place-items-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                              aria-label={`Enable ${cap.label} for ${r.label}`}
                            >
                              <MinusIcon className="size-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Custom roles"
        description="Mix and match capabilities into a named role — e.g. 'Senior shooter' with review access."
        actions={
          <Badge variant="outline" className="text-fluid-xs">
            Coming soon
          </Badge>
        }
      >
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <ShieldIcon className="size-5" />
          </span>
          <p className="max-w-md text-fluid-sm text-foreground">
            Define your own roles with any combination of the capabilities
            above.
          </p>
          <p className="max-w-md text-fluid-xs text-muted-foreground">
            Available on the Pro+ plan once Phase 3 ships. For now, the 5
            preset roles above cover the production flow.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="opacity-60"
          >
            <PlusIcon className="size-3.5" />
            Create custom role
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
