"use client";

// ============================================================================
// EditorStateProvider — single source of truth for the editor workflow loop
// (Pending → Working On → Review → Deliver) shared across THREE surfaces:
//   1. Editor Queue kanban (`editor-kanban.tsx`)
//   2. Order Detail pipeline (`order-overview-tab.tsx` → EditingStep/RevisionStep)
//   3. Order Delivery tab (`order-delivery-tab.tsx`)
//
// ----------------------------------------------------------------------------
// Contract (do not break without updating BOTH this file AND HANDOFF):
//
//   Stage overrides:
//     stageById: Record<cardId, EditorStage>   — overrides the seed column key.
//                                                Cards default to their seed
//                                                column (`pending`, `working`,
//                                                `revision`, `deliver`); the
//                                                overlay lets the UI move them
//                                                without mutating editor-data.
//     setStage(cardId, stage)                   — kanban moves + flow CTAs call.
//     getStage(card)                            — returns override OR seed.
//
//   Versions (Working On uploads):
//     versions: Record<cardId, number>          — n submitted versions (v1,v2…)
//     bumpVersion(cardId): number               — returns the NEW version number.
//
//   Reviewer feedback (per card):
//     feedback: Record<cardId, FeedbackRow[]>   — accumulated review notes.
//     addFeedback(cardId, row)
//     clearFeedback(cardId)                     — called when a fresh upload
//                                                 happens; previous comments
//                                                 stay visible but flag as
//                                                 "addressed in v{n}".
//
//   Brief content (manager's AssignSubmission):
//     briefs: Record<deliverableId, AssignSubmission>
//     setBrief(deliverableId, sub)              — AssignConfirmDialog.onConfirm
//                                                 mirror — called from order
//                                                 overview when the manager
//                                                 submits the Assign wizard.
//
// State is intentionally process-local (React state). No persistence — this
// is a prototype. When wiring real data, swap each Record<…, …> for a hook.
//
// Why a context (not Zustand/Redux):
//   - Scope is small (4 Record<id, T>).
//   - Avoids prop-drilling through kanban → card → detail dialog → review view.
//   - Order detail surfaces (different route) can mount the same provider and
//     observe the same state because all routes are inside the SidebarProvider
//     in `src/app/layout.tsx`. We mount EditorStateProvider once at the layout
//     root so all routes share one instance.
// ============================================================================

import * as React from "react";

import { columns, type Card } from "@/components/editor-data";
import type { AssignSubmission } from "@/components/editor-types";

// ── Stage type ──────────────────────────────────────────────────────────────
export type EditorStage = "pending" | "working" | "revision" | "deliver";

// ── Feedback row (manager → editor) ─────────────────────────────────────────
export type FeedbackRow = {
  id: string;
  /** Author of the note (manager). Free-text so we don't depend on auth wiring. */
  author: string;
  /** Time-pin into the cut, e.g. "0:21". Optional. */
  timePin?: string;
  body: string;
  /** Stable monotonic id-counter slot — used for keys, never displayed. */
  seq: number;
};

// ── Map from seed columns ───────────────────────────────────────────────────
/** Map a card id to the column it lives in in the seed (`editor-data.tsx`). */
const SEED_STAGE_BY_CARD_ID: Record<string, EditorStage> = (() => {
  const map: Record<string, EditorStage> = {};
  for (const col of columns) {
    for (const card of col.cards) {
      map[card.id] = col.key as EditorStage;
    }
  }
  return map;
})();

// ── Context shape ───────────────────────────────────────────────────────────
type EditorStateContextValue = {
  // stages
  getStage: (card: Pick<Card, "id">) => EditorStage;
  setStage: (cardId: string, stage: EditorStage) => void;
  /** All cards in a column key — combines seed + overrides. Used by kanban
   *  so a card moved via setStage shows up in the new column without us
   *  mutating editor-data. */
  cardsByStage: Record<EditorStage, Card[]>;

  // versions
  getVersion: (cardId: string) => number;
  bumpVersion: (cardId: string) => number;

  // feedback
  getFeedback: (cardId: string) => FeedbackRow[];
  addFeedback: (cardId: string, row: Omit<FeedbackRow, "id" | "seq">) => void;
  clearFeedbackForCard: (cardId: string) => void;

  // brief — keyed by deliverableId (NOT cardId — they're disjoint id spaces)
  getBrief: (deliverableId: string) => AssignSubmission | undefined;
  setBrief: (deliverableId: string, sub: AssignSubmission) => void;

  // ─── Order Detail bridge ──────────────────────────────────────────────
  /** Per-order: which kanban cardId maps to which order deliverableId.
   *  Set by the assign flow when the manager picks an editor for a
   *  deliverable. Read by the order detail page to mirror the kanban's
   *  editor sub-state into EditingStep / RevisionStep. */
  getCardForDeliverable: (deliverableId: string) => string | undefined;
  bindCardToDeliverable: (deliverableId: string, cardId: string) => void;
};

const EditorStateContext = React.createContext<EditorStateContextValue | null>(
  null,
);

// ── Provider ────────────────────────────────────────────────────────────────
export function EditorStateProvider({ children }: { children: React.ReactNode }) {
  // Stage overrides — only entries that have moved away from their seed column.
  const [stageOverrides, setStageOverrides] = React.useState<
    Record<string, EditorStage>
  >({});

  // Version count (number of submitted uploads per card). Defaults to 0; the
  // first upload bumps to 1 (so the editor sees "v1" submitted).
  const [versionMap, setVersionMap] = React.useState<Record<string, number>>({});

  // Per-card accumulating feedback rows.
  const [feedbackMap, setFeedbackMap] = React.useState<
    Record<string, FeedbackRow[]>
  >({});

  // Per-deliverable AssignSubmission (the canonical brief).
  const [briefMap, setBriefMap] = React.useState<Record<string, AssignSubmission>>(
    {},
  );

  // Per-deliverable → kanban cardId. Mirrors the manager's assignment so the
  // Order Detail pipeline can read the kanban's live stage for a deliverable.
  const [deliverableToCard, setDeliverableToCard] = React.useState<
    Record<string, string>
  >({});

  // Monotonic seq counter for feedback rows. Ref keeps it stable across
  // renders without consuming Date.now / Math.random.
  const feedbackSeqRef = React.useRef(0);

  // ── getters ───────────────────────────────────────────────────────────
  const getStage = React.useCallback(
    (card: Pick<Card, "id">): EditorStage =>
      stageOverrides[card.id] ?? SEED_STAGE_BY_CARD_ID[card.id] ?? "pending",
    [stageOverrides],
  );

  const setStage = React.useCallback((cardId: string, stage: EditorStage) => {
    setStageOverrides((prev) => ({ ...prev, [cardId]: stage }));
  }, []);

  const getVersion = React.useCallback(
    (cardId: string): number => versionMap[cardId] ?? 0,
    [versionMap],
  );

  const bumpVersion = React.useCallback((cardId: string): number => {
    let next = 0;
    setVersionMap((prev) => {
      next = (prev[cardId] ?? 0) + 1;
      return { ...prev, [cardId]: next };
    });
    return next;
  }, []);

  const getFeedback = React.useCallback(
    (cardId: string): FeedbackRow[] => feedbackMap[cardId] ?? [],
    [feedbackMap],
  );

  const addFeedback = React.useCallback(
    (cardId: string, row: Omit<FeedbackRow, "id" | "seq">) => {
      feedbackSeqRef.current += 1;
      const seq = feedbackSeqRef.current;
      setFeedbackMap((prev) => {
        const existing = prev[cardId] ?? [];
        const full: FeedbackRow = { ...row, id: `fb-${cardId}-${seq}`, seq };
        return { ...prev, [cardId]: [...existing, full] };
      });
    },
    [],
  );

  const clearFeedbackForCard = React.useCallback((cardId: string) => {
    setFeedbackMap((prev) => {
      if (!prev[cardId]) return prev;
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  }, []);

  const getBrief = React.useCallback(
    (deliverableId: string): AssignSubmission | undefined =>
      briefMap[deliverableId],
    [briefMap],
  );

  const setBrief = React.useCallback(
    (deliverableId: string, sub: AssignSubmission) => {
      setBriefMap((prev) => ({ ...prev, [deliverableId]: sub }));
    },
    [],
  );

  const getCardForDeliverable = React.useCallback(
    (deliverableId: string): string | undefined => deliverableToCard[deliverableId],
    [deliverableToCard],
  );

  const bindCardToDeliverable = React.useCallback(
    (deliverableId: string, cardId: string) => {
      setDeliverableToCard((prev) => ({ ...prev, [deliverableId]: cardId }));
    },
    [],
  );

  // Compose cards-by-stage from seed + overrides.
  const cardsByStage = React.useMemo<Record<EditorStage, Card[]>>(() => {
    const result: Record<EditorStage, Card[]> = {
      pending: [],
      working: [],
      revision: [],
      deliver: [],
    };
    for (const col of columns) {
      for (const card of col.cards) {
        const stage = stageOverrides[card.id] ?? (col.key as EditorStage);
        result[stage].push(card);
      }
    }
    return result;
  }, [stageOverrides]);

  const value = React.useMemo<EditorStateContextValue>(
    () => ({
      getStage,
      setStage,
      cardsByStage,
      getVersion,
      bumpVersion,
      getFeedback,
      addFeedback,
      clearFeedbackForCard,
      getBrief,
      setBrief,
      getCardForDeliverable,
      bindCardToDeliverable,
    }),
    [
      getStage,
      setStage,
      cardsByStage,
      getVersion,
      bumpVersion,
      getFeedback,
      addFeedback,
      clearFeedbackForCard,
      getBrief,
      setBrief,
      getCardForDeliverable,
      bindCardToDeliverable,
    ],
  );

  return (
    <EditorStateContext.Provider value={value}>
      {children}
    </EditorStateContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useEditorState(): EditorStateContextValue {
  const ctx = React.useContext(EditorStateContext);
  if (!ctx) {
    // Safe stub — return a noop implementation so components that mount
    // outside the provider (none today, but the order detail page lives
    // outside `/` and re-mounts the provider) don't crash. The fallback
    // reads only the seed; mutations are no-ops.
    const fallback: EditorStateContextValue = {
      getStage: (card) => SEED_STAGE_BY_CARD_ID[card.id] ?? "pending",
      setStage: () => {},
      cardsByStage: {
        pending: columns.find((c) => c.key === "pending")?.cards ?? [],
        working: columns.find((c) => c.key === "working")?.cards ?? [],
        revision: columns.find((c) => c.key === "revision")?.cards ?? [],
        deliver: columns.find((c) => c.key === "deliver")?.cards ?? [],
      },
      getVersion: () => 0,
      bumpVersion: () => 1,
      getFeedback: () => [],
      addFeedback: () => {},
      clearFeedbackForCard: () => {},
      getBrief: () => undefined,
      setBrief: () => {},
      getCardForDeliverable: () => undefined,
      bindCardToDeliverable: () => {},
    };
    return fallback;
  }
  return ctx;
}
