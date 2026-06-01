"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  EyeIcon,
  HardDriveIcon,
  LayoutGridIcon,
  LogOutIcon,
  MessagesSquareIcon,
  PackageIcon,
  TagIcon,
  Settings2Icon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { MOCK_USERS, useCurrentUser, type UserRole } from "@/hooks/use-current-user";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { MembersDialog } from "@/components/members-dialog";

// v12.4: Direct Messages and Project Channels have been lifted out of this
// sidebar into a dedicated /chat page. The DM/Channel data now lives in
// `@/components/chat/chat-data`; the modal hosts (NewDmDialog, NewChannelDialog,
// ChatDialog) are mounted by the chat page itself. This file owns workspace
// nav + the Admin collapsible (Members + Catalog) and nothing else.

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  editor: "Editor",
  shooter: "Shooter",
  va: "VA",
};

// Curated personas the role-switcher offers. Order = manager > editor > shooter > admin
// so the switcher mirrors the new daily-flow priority.
const PERSONA_OPTIONS = [
  { key: "kyle_m", label: "Kyle Norman", role: "manager" as const },
  { key: "rienz",  label: "RienzZzy",    role: "editor" as const },
  { key: "marry",  label: "Marry Anderson", role: "editor" as const },
  { key: "kyle",   label: "Kyle Anderson", role: "shooter" as const },
  { key: "sara",   label: "Sara Chen",   role: "shooter" as const },
  { key: "admin",  label: "Oliver Tuan", role: "admin" as const },
];

export function EditorSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const currentUser = useCurrentUser();
  // For role-switcher: deterministic avatar seed per mock user (no Math.random).
  const avatarSeed = currentUser.id.toLowerCase();
  const roleLabel = ROLE_LABEL[currentUser.role];

  const [membersOpen, setMembersOpen] = React.useState(false);
  // v12.3: Admin section is collapsible (default open). Houses Members +
  // Catalog so the primary Workspace nav stays focused on day-to-day work.
  const [adminOpen, setAdminOpen] = React.useState(true);

  type WorkspaceItem = {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    href?: string;
    onClick?: () => void;
  };

  // v12.4: + Chat after Editor Queue. Order tracks daily-use frequency —
  // Orders (ops hub), Calendar (planning), Files, Editor Queue, Chat.
  const workspaceItems: WorkspaceItem[] = [
    { title: "Orders", icon: PackageIcon, href: "/orders" },
    { title: "Calendar", icon: CalendarDaysIcon, href: "/calendar" },
    { title: "Files", icon: HardDriveIcon, href: "/uploads" },
    { title: "Jobs", icon: ClipboardListIcon, count: 4, href: "/jobs" },
    { title: "Chat", icon: MessagesSquareIcon, href: "/chat" },
  ];

  // v12.3: Admin items split out of Workspace into a collapsible group.
  const adminItems: WorkspaceItem[] = [
    { title: "Members", icon: UsersIcon, onClick: () => setMembersOpen(true) },
    { title: "Catalog", icon: TagIcon, href: "/catalog" },
  ];

  const isItemActive = (item: WorkspaceItem) => {
    if (!item.href) return false;
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <>
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader className="gap-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5! gap-2">
                <div className="size-6 rounded-md bg-foreground text-background grid place-items-center font-bold text-xs">
                  O
                </div>
                <span className="text-sm font-semibold">Odone v8</span>
                <Badge variant="outline" className="ml-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0">
                  STAREP
                </Badge>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Sidebar search removed — duplicate of top-bar ⌘K palette.
              Workspace search lives in EditorSiteHeader. */}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspaceItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isItemActive(item)}
                      onClick={item.onClick}
                      render={item.href ? <Link href={item.href} /> : undefined}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.count != null && (
                      <SidebarMenuBadge className="font-mono">{item.count}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* v12.3: Admin section — collapsible, no "+" affordance (items
              are fixed). Houses Members + Catalog so day-to-day Workspace
              nav stays focused. */}
          <CollapsibleSection
            label="Admin"
            open={adminOpen}
            onToggle={() => setAdminOpen((v) => !v)}
          >
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isItemActive(item)}
                    onClick={item.onClick}
                    render={item.href ? <Link href={item.href} /> : undefined}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSection>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg" tooltip={currentUser.name}>
                      <div className="relative">
                        <Avatar className="size-7">
                          <AvatarImage
                            src={`https://i.pravatar.cc/150?u=${avatarSeed}`}
                            alt={currentUser.name}
                          />
                          <AvatarFallback className="text-xs bg-emerald-500/20 text-emerald-200">
                            {currentUser.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 border-2 border-sidebar rounded-full bg-emerald-500" />
                      </div>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate text-sm font-semibold">{currentUser.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
                      </div>
                      <Settings2Icon className="size-4 text-muted-foreground" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent
                  side="top"
                  align="end"
                  sideOffset={8}
                  className="w-56"
                >
                  <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                    <UserIcon /> View profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <SettingsIcon /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <EyeIcon /> View as…
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      {PERSONA_OPTIONS.map((p) => {
                        const active = MOCK_USERS[p.key]?.id === currentUser.id;
                        return (
                          <DropdownMenuItem
                            key={p.key}
                            onClick={() => {
                              // Reload with ?as= so useCurrentUser picks it up
                              window.location.href = `/?as=${p.key}`;
                            }}
                          >
                            {active ? <CheckIcon /> : <span className="size-3.5" />}
                            <span className="flex-1">{p.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {ROLE_LABEL[p.role]}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => toast.info("Signed out")}
                  >
                    <LogOutIcon /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <MembersDialog open={membersOpen} onOpenChange={setMembersOpen} />
    </>
  );
}

function CollapsibleSection({
  label,
  open,
  onToggle,
  onAdd,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  /** Omit to hide the "+" button (used by sections that aren't user-extensible — e.g. Admin nav). */
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between pr-1 group/section">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 flex-1 min-w-0 hover:text-sidebar-foreground transition-colors text-left"
        >
          <ChevronRightIcon
            className={cn(
              "size-3 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="truncate">{label}</span>
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add to ${label}`}
            className="grid place-items-center size-5 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors"
          >
            <span className="text-base leading-none">+</span>
          </button>
        )}
      </SidebarGroupLabel>
      {open && (
        <SidebarGroupContent>
          <div className="max-h-[200px] overflow-y-auto">{children}</div>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}
