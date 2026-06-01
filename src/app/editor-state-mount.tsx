"use client";

// Layout-level mount of EditorStateProvider. Keeps src/app/layout.tsx a server
// component while still letting any route (the `/` queue, `/orders/[id]`, …)
// share one provider instance. See editor-state.tsx for the contract.

import { EditorStateProvider } from "@/components/editor-state";

export function EditorStateMount({ children }: { children: React.ReactNode }) {
  return <EditorStateProvider>{children}</EditorStateProvider>;
}
