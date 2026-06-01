"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  ChevronLeftIcon,
  HashIcon,
  InboxIcon,
  LayersIcon,
  MoreHorizontalIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileHeader({
  title,
  subtitle,
  back,
  onBack,
  right,
  variant = "default",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  variant?: "default" | "overlay";
}) {
  return (
    <header
      className={cn(
        "relative z-30 flex h-12 shrink-0 items-center gap-1.5 px-2.5",
        variant === "default" && "border-b border-border bg-background",
        variant === "overlay" && "bg-gradient-to-b from-black/70 via-black/30 to-transparent",
      )}
    >
      {back ? (
        onBack ? (
          <button
            onClick={onBack}
            className="-ml-1 grid size-8 place-items-center rounded-full text-foreground active:bg-accent"
            aria-label="Back"
          >
            <ChevronLeftIcon className="size-[18px]" />
          </button>
        ) : (
          <Link
            href="/mobile"
            className="-ml-1 grid size-8 place-items-center rounded-full text-foreground active:bg-accent"
            aria-label="Back"
          >
            <ChevronLeftIcon className="size-[18px]" />
          </Link>
        )
      ) : null}

      <div className="min-w-0 flex-1 leading-[1.15]">
        <div className="truncate text-[14px] font-semibold">{title}</div>
        {subtitle && (
          <div className="truncate text-[10.5px] text-muted-foreground">{subtitle}</div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0">{right}</div>
    </header>
  );
}

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  badge?: number;
};

const tabs: Tab[] = [
  { href: "/mobile", label: "Queue", icon: LayersIcon, exact: true },
  { href: "/mobile/inbox", label: "Inbox", icon: InboxIcon, badge: 3 },
  { href: "/mobile/activity", label: "Activity", icon: BellIcon },
  { href: "/mobile/me", label: "Me", icon: UserIcon },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="z-30 shrink-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="grid grid-cols-4">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground active:text-foreground",
              )}
            >
              <div className="relative">
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {t.badge ? (
                  <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-rose-500 px-1 text-[8.5px] font-bold leading-none text-white">
                    {t.badge}
                  </span>
                ) : null}
              </div>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileHeaderIconButton({
  children,
  badge,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { badge?: number | string }) {
  return (
    <button
      {...props}
      className="relative grid size-8 place-items-center rounded-full text-foreground active:bg-accent"
    >
      {children}
      {badge != null && (
        <span className="absolute right-0.5 top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-rose-500 px-1 text-[8.5px] font-bold leading-none text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export { HashIcon, MoreHorizontalIcon };
