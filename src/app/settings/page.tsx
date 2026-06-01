"use client";

// ============================================================================
// Odone — /settings index
// ----------------------------------------------------------------------------
// /settings has no content of its own — it deep-links into Profile. We can't
// use the server `redirect()` from a "use client" module, so we issue a
// client replace() on mount and render a lightweight placeholder for the few
// frames before the navigation lands.
// ============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";

export default function SettingsIndexPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/settings/profile");
  }, [router]);

  return (
    <div
      className="flex h-full min-h-0 items-center justify-center text-fluid-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      Opening Profile…
    </div>
  );
}
