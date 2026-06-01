"use client";

// Mock current-user hook for the prototype. Reads ?as= from the URL so design
// review can flip between roles without a real auth layer:
//   /calendar         → defaults to admin (Oliver Tuan)
//   /calendar?as=kyle → shooter (Kyle Anderson, locked to own events)
//   /calendar?as=sara → shooter (Sara Chen)
//
// Important: the `?as=` read happens AFTER mount via useEffect so SSR and the
// first client render agree (both see admin). Reading useSearchParams during
// render would cause a hydration mismatch — SSR has no params, client has
// `?as=kyle` — and React would hang trying to reconcile, keeping the parent
// Suspense boundary in its fallback state.
//
// When wired to Supabase, swap this for a real session lookup. The returned
// shape stays the same so CalendarPage doesn't change.

import * as React from "react";

export type UserRole = "admin" | "manager" | "editor" | "shooter" | "va";

export type CurrentUser = {
  id: string;
  name: string;
  initials: string;
  role: UserRole;
};

// Mock user pool the prototype switches between via ?as= URL param.
// Adds manager + editor entries so `/` can route by role and each role's
// home (Jobs board for manager, item-level Jobs for editor, Calendar for
// shooter) is reachable without backend wiring.
export const MOCK_USERS: Record<string, CurrentUser> = {
  admin:    { id: "admin",  name: "Oliver Tuan",   initials: "OT", role: "admin" },
  kyle_m:   { id: "KY",     name: "Kyle Norman",   initials: "KY", role: "manager" },
  marry:    { id: "MA",     name: "Marry Anderson",initials: "MA", role: "editor" },
  rienz:    { id: "RZ",     name: "RienzZzy",      initials: "RZ", role: "editor" },
  mj_e:     { id: "MJ",     name: "MJ Pereira",    initials: "MJ", role: "editor" },
  // Shooters (kept stable for existing /calendar shooter gate).
  kyle:     { id: "kyle",   name: "Kyle Anderson", initials: "KA", role: "shooter" },
  mj:       { id: "mj",     name: "MJ Rivera",     initials: "MR", role: "shooter" },
  sara:     { id: "sara",   name: "Sara Chen",     initials: "SC", role: "shooter" },
  dana:     { id: "dana",   name: "Dana Park",     initials: "DP", role: "shooter" },
};

// Admin === manager for permissions + landing route. Admin can still hit
// any URL directly but the home redirect lands them on the manager hub.
export const ROLE_HOME_ROUTE: Record<UserRole, string> = {
  admin:   "/jobs",
  manager: "/jobs",
  editor:  "/jobs",
  shooter: "/calendar",
  va:      "/jobs",
};

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = React.useState<CurrentUser>(MOCK_USERS.admin);

  React.useEffect(() => {
    const asParam = new URLSearchParams(window.location.search).get("as");
    if (asParam && MOCK_USERS[asParam]) {
      setUser(MOCK_USERS[asParam]);
    }
  }, []);

  return user;
}
