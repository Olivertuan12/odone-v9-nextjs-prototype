"use client";

// ============================================================================
// Odone — Settings sidenav
// ----------------------------------------------------------------------------
// Left rail of the /settings shell. Renders 4 grouped sections with lucide
// icons; active link uses bg-accent / text-foreground per semantic tokens.
// Admin-only links get a small "Admin only" pill. Active match uses the
// pathname segment (exact or prefix) so deep links stay highlighted.
// ============================================================================

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  BookTemplateIcon,
  BuildingIcon,
  CreditCardIcon,
  FileClockIcon,
  LinkIcon,
  PaintbrushIcon,
  PlugIcon,
  ScrollTextIcon,
  ShieldIcon,
  Share2Icon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export const SETTINGS_NAV: NavGroup[] = [
  {
    label: "Account",
    items: [
      { href: "/settings/profile", label: "Profile", icon: UserIcon },
      { href: "/settings/account", label: "Account", icon: ShieldIcon },
      { href: "/settings/notifications", label: "Notifications", icon: BellIcon },
      { href: "/settings/appearance", label: "Appearance", icon: PaintbrushIcon },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/workspace", label: "General", icon: BuildingIcon, adminOnly: true },
      { href: "/settings/roles", label: "Roles & Permissions", icon: UserCogIcon, adminOnly: true },
      { href: "/settings/billing", label: "Billing", icon: CreditCardIcon, adminOnly: true },
      { href: "/settings/audit", label: "Audit log", icon: FileClockIcon, adminOnly: true },
    ],
  },
  {
    label: "Production",
    items: [
      { href: "/settings/templates", label: "Brief templates", icon: BookTemplateIcon },
      { href: "/settings/editors", label: "Editor pool", icon: UsersIcon, adminOnly: true },
      { href: "/settings/sharing", label: "Sharing", icon: Share2Icon },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/settings/integrations", label: "Integrations", icon: PlugIcon },
    ],
  },
];

/** Flattened title + description lookup for the right-pane header. */
export const SETTINGS_PAGE_META: Record<
  string,
  { title: string; description: string }
> = {
  "/settings/profile": {
    title: "Profile",
    description: "How you appear to the rest of the workspace.",
  },
  "/settings/account": {
    title: "Account & security",
    description: "Password, two-factor, and active sessions.",
  },
  "/settings/notifications": {
    title: "Notifications",
    description: "Choose where you get notified — and when to stay quiet.",
  },
  "/settings/appearance": {
    title: "Appearance",
    description: "Theme, density, and accent color for your account.",
  },
  "/settings/workspace": {
    title: "Workspace",
    description: "Workspace identity, brand color, and locale defaults.",
  },
  "/settings/roles": {
    title: "Roles & Permissions",
    description: "What each role can see and do across Odone.",
  },
  "/settings/billing": {
    title: "Billing",
    description: "Plan, seats, invoices, and payment method.",
  },
  "/settings/audit": {
    title: "Audit log",
    description: "Recent admin actions across the workspace.",
  },
  "/settings/templates": {
    title: "Brief templates",
    description: "Reusable briefs for photo / video shoots and vendor handoff.",
  },
  "/settings/editors": {
    title: "Editor pool",
    description: "In-house editors and the external vendors you partner with.",
  },
  "/settings/sharing": {
    title: "Sharing & client delivery",
    description: "Default share link rules and the brand your clients see.",
  },
  "/settings/integrations": {
    title: "Integrations",
    description: "Connect Odone to the tools you already use.",
  },
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function SettingsNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Settings"
      className="flex h-full w-full flex-col gap-5 p-4 lg:p-5"
    >
      {SETTINGS_NAV.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </div>
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-1.5 text-fluid-sm transition-colors duration-fast ease-standard",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.adminOnly && (
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
                          active
                            ? "border-foreground/20 text-muted-foreground"
                            : "border-border text-muted-foreground/80",
                        )}
                      >
                        Admin
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
