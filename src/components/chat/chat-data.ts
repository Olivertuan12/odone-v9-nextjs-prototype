// ============================================================================
// Odone — Chat page mock data
// ----------------------------------------------------------------------------
// Single source of truth for the /chat route. The Direct Messages and Project
// Channels lists were lifted out of `editor-sidebar.tsx` and copied verbatim,
// then enriched with:
//
//   - DM.role           — tagged on each teammate (Editor / Manager / Shooter / VA)
//   - Channel.topic     — short address-style topic strings
//   - Channel.memberCount
//   - buildThread(id)   — deterministic ChatMessage[] per conversation
//
// CONVENTIONS (strict — HANDOFF.md §8, HANDOFF-v12.2 §0/§3.d):
//   - NO Date.now / new Date / Math.random anywhere. Timestamps are literal
//     strings ("10:42 AM", "Yesterday · 4:18 PM"). Message ids are stable
//     `${conversationId}-${n}` so React keys never drift between renders.
//   - All authoring users come from the existing `users` record in
//     editor-data.tsx (Marry / RienzZzy / MJ / Kyle). The DM list itself adds
//     a few extras (Sara, Alex, Devon, Priya, Noah) that are not in `users`
//     because they only exist as DM peers, not as editors on a card. Those
//     extras carry their own initials + tone inline.
//   - "you" is Oliver Tuan (`OLIVER`). Every thread alternates between the
//     peer and Oliver so the conversation reads naturally.
//
// When the real backend lands: replace DM_LIST / CHANNEL_LIST with hooks
// (`useDms()`, `useChannels()`, `useThread(id)`) returning the same shapes.
// ============================================================================

export type DM = {
  /** URL slug — used as the `?to=` value. Lowercase of the display name. */
  id: string;
  name: string;
  avatar: string;
  initials: string;
  /** Tailwind class soup, dark-mode safe (mirrors `users[i].tone`). */
  initialsTone: string;
  status: "online" | "idle";
  unread?: number;
  hasMention?: boolean;
  role: string;
};

export type Channel = {
  /** URL slug — used as the `?ch=` value. Matches the existing sidebar slugs. */
  id: string;
  name: string;
  topic?: string;
  unread?: number;
  hasMention?: boolean;
  memberCount: number;
};

export type ChatMessage = {
  /** Stable across renders: `${conversationId}-${index}`. */
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorTone: string;
  body: string;
  /**
   * Literal string. NEVER derived from Date.now / new Date — keeps the mock
   * deterministic and Workflow-safe (see HANDOFF-v12.2 §3.d).
   */
  sentAt: string;
  /** When true, the renderer collapses the author header (Slack-style stack). */
  compact?: boolean;
};

// ============================================================================
// "You" identity. Mirrors the OLIVER constant pattern used elsewhere
// (chat-dialog.tsx / order-chat-tab.tsx). When real auth lands, swap for the
// session user.
// ============================================================================
const OLIVER = {
  id: "oliver",
  name: "Oliver Tuan",
  initials: "OT",
  tone: "bg-emerald-500/20 text-emerald-200",
};

// ============================================================================
// DM_LIST — 9 teammates, verbatim from the old sidebar block.
// Roles tagged per the v12.4 spec (Kyle=Editor, RienzZzy=Manager, MJ=Shooter,
// Sara=Editor, Alex=VA, Devon=Editor, Marry=Editor, Priya=VA, Noah=Editor).
// ============================================================================
export const DM_LIST: DM[] = [
  {
    id: "kyle",
    name: "Kyle",
    avatar: "https://i.pravatar.cc/150?u=kyle",
    initials: "KY",
    initialsTone: "bg-indigo-500/20 text-indigo-200",
    status: "online",
    hasMention: true,
    role: "Editor",
  },
  {
    id: "rienzzzy",
    name: "RienzZzy",
    avatar: "https://i.pravatar.cc/150?u=rienz",
    initials: "RZ",
    initialsTone: "bg-rose-500/20 text-rose-200",
    status: "online",
    unread: 2,
    role: "Manager",
  },
  {
    id: "mj",
    name: "MJ",
    avatar: "https://i.pravatar.cc/150?u=mj",
    initials: "MJ",
    initialsTone: "bg-amber-500/20 text-amber-200",
    status: "idle",
    role: "Shooter",
  },
  {
    id: "sara",
    name: "Sara",
    avatar: "https://i.pravatar.cc/150?u=sara",
    initials: "SR",
    initialsTone: "bg-fuchsia-500/20 text-fuchsia-200",
    status: "online",
    role: "Editor",
  },
  {
    id: "alex",
    name: "Alex",
    avatar: "https://i.pravatar.cc/150?u=alex",
    initials: "AX",
    initialsTone: "bg-sky-500/20 text-sky-200",
    status: "idle",
    unread: 1,
    role: "VA",
  },
  {
    id: "devon",
    name: "Devon",
    avatar: "https://i.pravatar.cc/150?u=devon",
    initials: "DV",
    initialsTone: "bg-violet-500/20 text-violet-200",
    status: "online",
    role: "Editor",
  },
  {
    id: "marry",
    name: "Marry",
    avatar: "https://i.pravatar.cc/150?u=marry",
    initials: "MA",
    initialsTone: "bg-emerald-500/20 text-emerald-200",
    status: "online",
    role: "Editor",
  },
  {
    id: "priya",
    name: "Priya",
    avatar: "https://i.pravatar.cc/150?u=priya",
    initials: "PR",
    initialsTone: "bg-teal-500/20 text-teal-200",
    status: "idle",
    role: "VA",
  },
  {
    id: "noah",
    name: "Noah",
    avatar: "https://i.pravatar.cc/150?u=noah",
    initials: "NO",
    initialsTone: "bg-orange-500/20 text-orange-200",
    status: "online",
    hasMention: true,
    role: "Editor",
  },
];

// ============================================================================
// CHANNEL_LIST — 7 channels, verbatim from the old sidebar block. Topics +
// member counts added so the conversation header has something to render.
// ============================================================================
export const CHANNEL_LIST: Channel[] = [
  {
    id: "45-yorkshire-dr",
    name: "45-yorkshire-dr",
    topic: "Walkthrough · St. Augustine, FL",
    hasMention: true,
    memberCount: 6,
  },
  {
    id: "13364-beach-blvd",
    name: "13364-beach-blvd",
    topic: "Walkthrough · Jacksonville, FL",
    memberCount: 5,
  },
  {
    id: "245-ocean-blvd",
    name: "245-ocean-blvd",
    topic: "Walkthrough · Jacksonville Beach, FL",
    unread: 5,
    memberCount: 7,
  },
  {
    id: "1245-river-rd",
    name: "1245-river-rd",
    topic: "Drone + Photo · Palatka, FL",
    memberCount: 4,
  },
  {
    id: "88-cypress",
    name: "88-cypress",
    topic: "Drone · St. Johns, FL",
    unread: 1,
    memberCount: 4,
  },
  {
    id: "33-marina-ave",
    name: "33-marina-ave",
    topic: "Twilights · Vilano Beach, FL",
    memberCount: 5,
  },
  {
    id: "77-harbor-pt",
    name: "77-harbor-pt",
    topic: "Photo · Ponte Vedra Beach, FL",
    memberCount: 3,
  },
];

// ============================================================================
// Mock thread generator. Each conversation gets a hand-authored sequence of
// turns (alternating peer / Oliver) — realistic to the Odone domain (cuts,
// briefs, drone, kitchen WB, delivery windows). Length: 6–14 messages.
//
// `compact` flag lets the renderer fold consecutive same-author messages into
// one stack, mirroring Slack's grouped-message look.
// ============================================================================
type Turn = {
  /** "you" | the DM id | a channel author key from CHANNEL_AUTHORS. */
  who: string;
  body: string;
  sentAt: string;
};

// Per-channel author pool. Keeps the same 4 voices (Marry / RienzZzy / MJ /
// Kyle) showing up so the threads feel like one team and not 7 separate
// universes.
const CHANNEL_AUTHORS: Record<
  string,
  { id: string; name: string; initials: string; tone: string }
> = {
  marry: { id: "marry", name: "Marry", initials: "MA", tone: "bg-emerald-500/20 text-emerald-200" },
  rienz: { id: "rienzzzy", name: "RienzZzy", initials: "RZ", tone: "bg-rose-500/20 text-rose-200" },
  mj: { id: "mj", name: "MJ", initials: "MJ", tone: "bg-amber-500/20 text-amber-200" },
  kyle: { id: "kyle", name: "Kyle", initials: "KY", tone: "bg-indigo-500/20 text-indigo-200" },
  you: { id: OLIVER.id, name: OLIVER.name, initials: OLIVER.initials, tone: OLIVER.tone },
};

// ----------------------------------------------------------------------------
// DM thread scripts. Keys MUST match DM_LIST ids.
// ----------------------------------------------------------------------------
const DM_THREADS: Record<string, Turn[]> = {
  kyle: [
    { who: "kyle", body: "Yo, when's the 245 Ocean Blvd cut due?", sentAt: "Yesterday · 4:18 PM" },
    { who: "you", body: "Tomorrow EOD. RienzZzy is on v2.", sentAt: "Yesterday · 4:21 PM" },
    { who: "kyle", body: "Cool. Pulling the brief now.", sentAt: "Yesterday · 4:22 PM" },
    { who: "kyle", body: "Drone tracks look a little soft on the establishing — want me to redo those?", sentAt: "Yesterday · 4:23 PM" },
    { who: "you", body: "Yeah, if you've got time. The west-side pass especially.", sentAt: "Yesterday · 4:30 PM" },
    { who: "kyle", body: "On it. Pushing the new exports tonight.", sentAt: "Yesterday · 4:31 PM" },
    { who: "kyle", body: "@oliver heads up — I'll need the revised brief by 10am or this slips.", sentAt: "10:02 AM" },
    { who: "you", body: "Brief is locked. Check the Workspace tab.", sentAt: "10:08 AM" },
  ],
  rienzzzy: [
    { who: "rienzzzy", body: "Morning — 88 Cypress drone is in review.", sentAt: "9:14 AM" },
    { who: "rienzzzy", body: "Two notes from the client, both color-related.", sentAt: "9:14 AM" },
    { who: "you", body: "Forward me the notes?", sentAt: "9:18 AM" },
    { who: "rienzzzy", body: "Just dropped them in #88-cypress.", sentAt: "9:21 AM" },
    { who: "rienzzzy", body: "Need a fast turn — they want v3 by 3pm.", sentAt: "9:22 AM" },
    { who: "you", body: "Got it. Will assign to Marry.", sentAt: "9:25 AM" },
  ],
  mj: [
    { who: "mj", body: "Wrapped the 33 Marina shoot. Uploading raws now.", sentAt: "Yesterday · 6:02 PM" },
    { who: "you", body: "Nice. How were the twilights?", sentAt: "Yesterday · 6:10 PM" },
    { who: "mj", body: "Sky was perfect for about 12 minutes. Got the windows lit too.", sentAt: "Yesterday · 6:11 PM" },
    { who: "mj", body: "Twilight folder has 38 frames, drone has 22 clips.", sentAt: "Yesterday · 6:14 PM" },
    { who: "you", body: "Solid. Confirm the upload when it finishes so it kicks to editing.", sentAt: "Yesterday · 6:18 PM" },
    { who: "mj", body: "Will do. ETA 20 min on the upload.", sentAt: "Yesterday · 6:19 PM" },
  ],
  sara: [
    { who: "sara", body: "Quick question on the 12 Pine St brief —", sentAt: "11:42 AM" },
    { who: "sara", body: "client wants the audio bed swapped on v3. The one tagged 'soft acoustic'.", sentAt: "11:42 AM" },
    { who: "you", body: "Yep, swap is approved. Use the b-roll cue at 0:48 too.", sentAt: "11:49 AM" },
    { who: "sara", body: "Got it. Pushing v3 in ~2 hours.", sentAt: "11:50 AM" },
    { who: "sara", body: "Also — do we have a vertical reel ask on this one?", sentAt: "11:51 AM" },
    { who: "you", body: "Not yet. They might add it later — focus on the 16:9.", sentAt: "11:54 AM" },
  ],
  alex: [
    { who: "alex", body: "Order intake from a new agent at Coldwell — 14 photos, single twilight.", sentAt: "10:08 AM" },
    { who: "you", body: "Got an address?", sentAt: "10:11 AM" },
    { who: "alex", body: "1245 River Rd. They want a quote before booking.", sentAt: "10:12 AM" },
    { who: "alex", body: "I drafted a reply with our standard photo pricing — want me to send?", sentAt: "10:14 AM" },
    { who: "you", body: "Send it. Add the twilight upsell.", sentAt: "10:18 AM" },
    { who: "alex", body: "Done. Will loop you in when they respond.", sentAt: "10:19 AM" },
  ],
  devon: [
    { who: "devon", body: "Pushed 100 Sunset Pl v2 to client review.", sentAt: "8:48 AM" },
    { who: "devon", body: "Bumped the kitchen WB and warmed the master bath by ~150K.", sentAt: "8:48 AM" },
    { who: "you", body: "Saw it. Looks great. Sending to delivery in a few.", sentAt: "9:02 AM" },
    { who: "devon", body: "Ack. Let me know if they want anything else.", sentAt: "9:04 AM" },
  ],
  marry: [
    { who: "marry", body: "45 Yorkshire is rendering — final pass in ~15.", sentAt: "12:31 PM" },
    { who: "you", body: "Cool. Did the dawn timelapse make the cut?", sentAt: "12:34 PM" },
    { who: "marry", body: "Yep, 4 seconds at the open. Feels cinematic.", sentAt: "12:34 PM" },
    { who: "marry", body: "Want me to mirror it in 1:1 for IG?", sentAt: "12:36 PM" },
    { who: "you", body: "Yes please. Add it to deliverables on the order.", sentAt: "12:38 PM" },
    { who: "marry", body: "On it.", sentAt: "12:38 PM" },
    { who: "marry", body: "Render's done — uploading now.", sentAt: "1:02 PM" },
  ],
  priya: [
    { who: "priya", body: "Updated the 77 Harbor Pt brief with the seller bio.", sentAt: "Yesterday · 2:14 PM" },
    { who: "priya", body: "Also pulled MLS comps for the email blurb.", sentAt: "Yesterday · 2:14 PM" },
    { who: "you", body: "Perfect. Add the comps to the share link's notes block.", sentAt: "Yesterday · 2:20 PM" },
    { who: "priya", body: "Done. Anything else on this order?", sentAt: "Yesterday · 2:22 PM" },
    { who: "you", body: "Nope — we're set. Thanks Priya.", sentAt: "Yesterday · 2:24 PM" },
  ],
  noah: [
    { who: "noah", body: "@oliver flagging 5577 Magnolia — it's overdue by 2h.", sentAt: "8:02 AM" },
    { who: "you", body: "Who's on it?", sentAt: "8:05 AM" },
    { who: "noah", body: "RienzZzy. He's stuck on the floor-plan SVG export.", sentAt: "8:06 AM" },
    { who: "you", body: "Loop me into the channel — I'll unblock him.", sentAt: "8:08 AM" },
    { who: "noah", body: "Done. Also the client emailed asking about delivery — I'll buy us until EOD.", sentAt: "8:09 AM" },
    { who: "you", body: "Great. Thanks Noah.", sentAt: "8:10 AM" },
  ],
};

// ----------------------------------------------------------------------------
// Channel thread scripts. Keys MUST match CHANNEL_LIST ids.
// ----------------------------------------------------------------------------
const CHANNEL_THREADS: Record<string, Turn[]> = {
  "45-yorkshire-dr": [
    { who: "marry", body: "Brief is locked, raws uploaded.", sentAt: "Yesterday · 9:02 AM" },
    { who: "rienz", body: "On v1 — rough cut by 4pm.", sentAt: "Yesterday · 9:14 AM" },
    { who: "kyle", body: "Drone establisher is a little shaky around the pool — restabilizing.", sentAt: "Yesterday · 11:48 AM" },
    { who: "you", body: "Sounds good. Once v1's up I'll do a feedback pass.", sentAt: "Yesterday · 12:01 PM" },
    { who: "rienz", body: "v1 up. Link in deliverables.", sentAt: "Yesterday · 4:12 PM" },
    { who: "you", body: "Notes left at 0:14 / 0:48 / 1:22.", sentAt: "Yesterday · 5:30 PM" },
    { who: "marry", body: "Approved on v3 — sending to delivery.", sentAt: "10:42 AM" },
    { who: "kyle", body: "Nice. Client will love it.", sentAt: "10:43 AM" },
  ],
  "13364-beach-blvd": [
    { who: "mj", body: "Shoot moved to Thursday — owner's repainting.", sentAt: "Yesterday · 3:08 PM" },
    { who: "you", body: "Ack. Updating the order.", sentAt: "Yesterday · 3:10 PM" },
    { who: "marry", body: "I'll hold the editing slot for Friday AM then.", sentAt: "Yesterday · 3:12 PM" },
    { who: "kyle", body: "Same. Brief is good either way.", sentAt: "Yesterday · 3:14 PM" },
    { who: "mj", body: "Thanks team.", sentAt: "Yesterday · 3:15 PM" },
    { who: "you", body: "All good. New scheduled date: Thursday 11am.", sentAt: "Yesterday · 3:18 PM" },
  ],
  "245-ocean-blvd": [
    { who: "rienz", body: "v2 has the new music bed. Walkthrough is tight.", sentAt: "9:31 AM" },
    { who: "marry", body: "Drone intro feels much better than v1.", sentAt: "9:34 AM" },
    { who: "kyle", body: "Kitchen WB is still a touch cool — pushing back.", sentAt: "9:40 AM" },
    { who: "rienz", body: "Agreed. Warming by 0.3 stops, re-export by lunch.", sentAt: "9:42 AM" },
    { who: "you", body: "Also flag the sunset cutaway at 1:08 — it's a half-frame off.", sentAt: "9:48 AM" },
    { who: "rienz", body: "Got it. Will fix.", sentAt: "9:49 AM" },
    { who: "kyle", body: "v3 looking good. I'll do the client review at 3pm.", sentAt: "2:42 PM" },
  ],
  "1245-river-rd": [
    { who: "mj", body: "Drone window is golden — 6:42pm tonight.", sentAt: "10:12 AM" },
    { who: "you", body: "Are the permits cleared?", sentAt: "10:14 AM" },
    { who: "mj", body: "Yep, county confirmed yesterday.", sentAt: "10:15 AM" },
    { who: "marry", body: "I'll start the brief while you're flying.", sentAt: "10:18 AM" },
    { who: "mj", body: "Perfect. Will upload tonight by 9.", sentAt: "10:19 AM" },
  ],
  "88-cypress": [
    { who: "rienz", body: "Client wants the master suite WB warmer — pushed back twice now.", sentAt: "8:48 AM" },
    { who: "marry", body: "Sending a paint-chip reference. Should land it in one pass.", sentAt: "8:50 AM" },
    { who: "you", body: "Ack. Cap at v4 — any more revs and we surface it.", sentAt: "8:52 AM" },
    { who: "kyle", body: "Going through the suite notes now.", sentAt: "8:54 AM" },
    { who: "rienz", body: "v4 up. Way closer. Sending the diff.", sentAt: "12:31 PM" },
    { who: "marry", body: "Looks good to me — sending to delivery.", sentAt: "12:42 PM" },
  ],
  "33-marina-ave": [
    { who: "mj", body: "Twilight tonight — sunset at 7:48pm.", sentAt: "1:08 PM" },
    { who: "marry", body: "Lights in the master and the deck?", sentAt: "1:10 PM" },
    { who: "mj", body: "Yes — plus the pool. Owner will be on-site.", sentAt: "1:11 PM" },
    { who: "you", body: "Brief includes a hero exterior — make that the 7:55 frame if you can.", sentAt: "1:15 PM" },
    { who: "mj", body: "Got it. Will line it up.", sentAt: "1:16 PM" },
    { who: "kyle", body: "Send me the raws when uploaded — I'll color match the dusk pass.", sentAt: "1:18 PM" },
    { who: "mj", body: "Wrapped. Uploading now.", sentAt: "8:14 PM" },
  ],
  "77-harbor-pt": [
    { who: "marry", body: "Photos delivered — 32 final selects.", sentAt: "Yesterday · 11:42 AM" },
    { who: "you", body: "Client signed off?", sentAt: "Yesterday · 11:48 AM" },
    { who: "marry", body: "Approved without revisions. Rare day.", sentAt: "Yesterday · 11:49 AM" },
    { who: "kyle", body: "Marking the order delivered.", sentAt: "Yesterday · 11:52 AM" },
    { who: "you", body: "Nice work everyone.", sentAt: "Yesterday · 11:55 AM" },
  ],
};

// ============================================================================
// Public thread builder. Resolves the Turn[] script for the given
// conversation id, materializes it into ChatMessage[], and stamps a `compact`
// flag on consecutive same-author turns so the renderer can stack them.
// ============================================================================
function resolveAuthor(who: string, peerDmId: string | null): {
  id: string;
  name: string;
  initials: string;
  tone: string;
} {
  if (who === "you") return CHANNEL_AUTHORS.you;
  if (CHANNEL_AUTHORS[who]) return CHANNEL_AUTHORS[who];
  // DM peer — look it up by id in DM_LIST.
  const dm = DM_LIST.find((d) => d.id === (peerDmId ?? who));
  if (dm) {
    return {
      id: dm.id,
      name: dm.name,
      initials: dm.initials,
      tone: dm.initialsTone,
    };
  }
  return {
    id: who,
    name: who,
    initials: who.slice(0, 2).toUpperCase(),
    tone: "bg-muted text-muted-foreground",
  };
}

function materialize(
  conversationId: string,
  script: Turn[],
  peerDmId: string | null,
): ChatMessage[] {
  return script.map((turn, idx) => {
    const author = resolveAuthor(turn.who, peerDmId);
    const prev = script[idx - 1];
    const compact = !!prev && prev.who === turn.who;
    return {
      id: `${conversationId}-${idx}`,
      authorId: author.id,
      authorName: author.name,
      authorInitials: author.initials,
      authorTone: author.tone,
      body: turn.body,
      sentAt: turn.sentAt,
      compact,
    };
  });
}

/**
 * Resolves a thread for any DM or Channel id.
 * Returns [] if the id is unknown (caller renders the empty state).
 */
export function getThread(kind: "dm" | "channel", id: string): ChatMessage[] {
  if (kind === "dm") {
    const script = DM_THREADS[id];
    if (!script) return [];
    return materialize(`dm-${id}`, script, id);
  }
  const script = CHANNEL_THREADS[id];
  if (!script) return [];
  return materialize(`ch-${id}`, script, null);
}

// ============================================================================
// Helpers exposed to chat-page so it can stamp Oliver's outgoing messages
// without re-importing the constant.
// ============================================================================
export const ME = {
  id: OLIVER.id,
  name: OLIVER.name,
  initials: OLIVER.initials,
  tone: OLIVER.tone,
};
