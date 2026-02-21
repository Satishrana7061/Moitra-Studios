export type RajneetiEvent = {
  id: string;
  stateCode: string;          // e.g. "MH", "UP"
  stateName: string;          // "Maharashtra"
  politicianName: string;     // display name
  partyName: string;          // "Congress", etc.
  delta: number;              // +4, -2 etc
  sentiment: "positive" | "negative" | "neutral";
  avatarColor: string;        // Tailwind color like "bg-emerald-500"
  score: number;              // +2050 style
  statusLabel: string;        // "poll", "election board"
  summary: string;            // 2–3 lines
  mainPhrase: string;         // 3-5 words
  shareUrl: string;           // placeholder
};
