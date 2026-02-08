// src/types.ts
export type RawNewsItem = {
  title: string;
  link: string;
  description: string;
  source: string;
};

export type RajneetiEvent = {
  id: string;
  stateCode: string;
  stateName: string;
  politicianName: string;
  partyName: string;
  delta: number; // -5 to +5
  sentiment: "positive" | "negative" | "neutral";
  summary: string;
  shareUrl: string;
};
