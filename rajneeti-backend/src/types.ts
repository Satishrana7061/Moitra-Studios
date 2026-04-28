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
  hindi_content: string; // Hindi translation for news anchor voiceover
  mainPhrase: string;
  shareUrl: string;
  createdAt: string; // ISO timestamp
};
