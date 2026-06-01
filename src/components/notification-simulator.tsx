"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AtSignIcon,
  CircleCheckBigIcon,
  MessageCircleIcon,
  SendIcon,
} from "lucide-react";

import { users } from "@/components/editor-data";

type MockNotif = {
  kind: "comment" | "mention" | "approval" | "delivery";
  userId: keyof typeof users;
  title: string;
  snippet: string;
};

const MOCK_NOTIFS: MockNotif[] = [
  {
    kind: "comment",
    userId: "KY",
    title: "Kyle commented on 45 Yorkshire Dr v2",
    snippet: "Please brighten the kitchen shots — exposure feels flat.",
  },
  {
    kind: "mention",
    userId: "MA",
    title: "Marry mentioned you in 13364 Beach Blvd",
    snippet: "@you can you take a look at the drone clip before delivery?",
  },
  {
    kind: "approval",
    userId: "KY",
    title: "Kyle approved 100 Sunset Pl v2",
    snippet: "Cleared for delivery — final cut signed off by the client.",
  },
  {
    kind: "delivery",
    userId: "MJ",
    title: "MJ delivered 800 Park Ave to client",
    snippet: "Sent final assets to Sarah at Coastline Realty.",
  },
  {
    kind: "comment",
    userId: "RZ",
    title: "RienzZzy left 3 notes on 245 Ocean Blvd",
    snippet: "Color pass + cut tightening notes attached to v1.",
  },
];

const ICON_MAP = {
  comment: MessageCircleIcon,
  mention: AtSignIcon,
  approval: CircleCheckBigIcon,
  delivery: SendIcon,
} as const;

// v12: simulator disabled. Sonner + Turbopack had a race condition where
// repeated toasts during HMR triggered NotFoundError on insertBefore.
// Re-enable behind an env flag if demo theatre is needed.
export function NotificationSimulator() {
  return null;
}
