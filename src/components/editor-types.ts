// Shared types between Editor Queue and Orders surfaces. Lives here (not in
// `orders-data.ts` or `editor-data.tsx`) so neither has to depend on the
// other. Both surfaces — `editor-state.tsx`, `order-overview-tab.tsx` — import
// from here.

import type { DeliverableKind } from "@/components/orders/orders-data";

// Editor-side: who a deliverable is assigned to. Matches the shape used in
// `order-overview-tab.tsx` (kept structurally identical so assignments can
// be passed through without conversion).
export type Assignee = { type: "in_house" | "vendor"; name: string };

// The payload the manager submits via AssignConfirmDialog at the end of the
// 4-step Assign wizard. Mirrors what `order-overview-tab.tsx` writes into the
// editor state context so that downstream surfaces (Editor Detail dialog,
// Brief view, Upload view) can render the canonical brief.
export type AssignSubmission = {
  assignee: Assignee;
  note: string;
  // video-only fields — undefined for non-video deliverables
  brief?: string;
  length?: string;
  script?: string;
  musicReference?: string;
  // schedule
  deadline?: string;
  priority?: "low" | "normal" | "high" | "rush";
  revisions?: number;
  musicLicenseConfirmed?: boolean;
  captionsRequested?: boolean;
  // The deliverable kind this brief is for. Lets the editor view choose the
  // right shape (video brief vs photo brief).
  kind?: DeliverableKind;
};
