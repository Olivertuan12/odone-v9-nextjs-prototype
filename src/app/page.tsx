"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { EditorDetailDialog } from "@/components/editor-detail-dialog";
import { EditorKanban } from "@/components/editor-kanban";
import { EditorSidebar } from "@/components/editor-sidebar";
import { EditorSiteHeader } from "@/components/editor-site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { Card } from "@/components/editor-data";
import { ROLE_HOME_ROUTE, useCurrentUser } from "@/hooks/use-current-user";

// `/` is role-routed:
//   - manager / editor / va → /jobs
//   - shooter               → /calendar
//   - admin                 → stays here (legacy Editor Queue kanban, kept as admin overview)
//
// Redirect runs after mount so SSR + first paint agree on the admin view
// (matches the pattern in useCurrentUser).
import { Suspense } from "react";

function RoleRoutedHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();
  const [openCard, setOpenCard] = React.useState<Card | null>(null);

  React.useEffect(() => {
    const target = ROLE_HOME_ROUTE[currentUser.role];
    if (!target || target === "/") return;
    // Preserve ?as= so the redirected page sees the same persona.
    const asParam = searchParams.get("as");
    const dest = asParam ? `${target}?as=${asParam}` : target;
    router.replace(dest);
  }, [currentUser.role, router, searchParams]);

  // Admin (and the brief moment before redirect for other roles) sees the
  // legacy Editor Queue kanban as a workspace-wide overview.
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <EditorSidebar variant="inset" />
      <SidebarInset>
        <EditorSiteHeader />
        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
          <EditorKanban onOpenCard={(card) => setOpenCard(card)} />
        </div>
      </SidebarInset>

      <EditorDetailDialog
        card={openCard}
        open={openCard !== null}
        onOpenChange={(open) => {
          if (!open) setOpenCard(null);
        }}
      />
    </SidebarProvider>
  );
}

export default function RoleRoutedHome() {
  return (
    <Suspense fallback={null}>
      <RoleRoutedHomeContent />
    </Suspense>
  );
}
