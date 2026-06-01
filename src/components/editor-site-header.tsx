"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationPopover } from "@/components/notification-popover";
import { SearchPalette } from "@/components/search-palette";
import { cn } from "@/lib/utils";

export type EditorSiteHeaderCrumb = {
  label: string;
  href?: string;
};

export type EditorSiteHeaderProps = {
  /** Breadcrumb shown after the sidebar toggle. Last crumb is foreground. */
  breadcrumb?: EditorSiteHeaderCrumb[];
};

const DEFAULT_BREADCRUMB: EditorSiteHeaderCrumb[] = [
  { label: "Workspace" },
  { label: "Editor Queue" },
];

export function EditorSiteHeader({
  breadcrumb = DEFAULT_BREADCRUMB,
}: EditorSiteHeaderProps = {}) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 shrink-0 data-vertical:self-auto"
        />
        {/* Breadcrumb gets flex-1 + min-w-0 so it shrinks before pushing the
            right-side actions (search, bell, +New Project) off-screen.
            Middle crumbs collapse into "…" below md; last crumb truncates. */}
        <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm font-medium text-muted-foreground">
          {breadcrumb.map((crumb, i) => {
            const isLast = i === breadcrumb.length - 1;
            const isFirst = i === 0;
            const isMiddle = !isFirst && !isLast;

            return (
              <React.Fragment key={`${crumb.label}-${i}`}>
                {i > 0 && (
                  <span
                    className={cn(
                      "shrink-0 text-muted-foreground/40",
                      // Hide separator before hidden middle crumbs
                      isMiddle && "hidden xl:inline",
                    )}
                    aria-hidden
                  >
                    /
                  </span>
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className={cn(
                      "press cursor-pointer truncate transition-colors duration-fast ease-standard",
                      "hover:text-foreground",
                      isMiddle && "hidden max-w-[160px] xl:inline-block",
                      isFirst && "max-w-[120px] shrink-0",
                    )}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate",
                      isLast ? "max-w-full text-foreground" : "",
                      isMiddle && "hidden max-w-[160px] xl:inline-block",
                      isFirst && "max-w-[120px] shrink-0",
                    )}
                    aria-current={isLast ? "page" : undefined}
                    title={crumb.label}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-[240px] items-center gap-2 rounded-full border border-border bg-muted/40 px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SearchIcon className="size-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </button>

          <NotificationPopover
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <BellIcon className="size-4.5" />
                <span className="sr-only">Notifications</span>
              </Button>
            }
          />
        </div>
      </div>

      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
