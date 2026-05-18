export enum SectionId {
  HOME = 'home',
  GAMES = 'games',
  ADVISOR = 'advisor',
  ABOUT = 'about',
  CONTACT = 'contact',
  PRIVACY = 'privacy'
}

export interface Game {
  id: string;
  title: string;
  tagline: string;
  description: string;
  imageUrl: string;
  status: 'Live' | 'In Development' | 'Concept';
  playStoreLink?: string;
  appStoreLink?: string;
  tags: string[];
  trailerUrl?: string;
  highlights?: string[];
  releaseWindow?: string;
}

export interface ContactFormState {
  name: string;
  email: string;
  message: string;
}

export interface AdvisorMessage {
  role: 'user' | 'advisor';
  text: string;
}

export type PromiseStatus = 'Fulfilled' | 'Partially Fulfilled' | 'Not Fulfilled' | 'In Progress' | 'Unclear';

export interface ManifestoPromise {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string;
  source_manifesto_year: number;
  category: string;
  status: PromiseStatus;
  verdict_summary: string;
  reel_link?: string;
  announced_date?: string;
  announced_situation?: string;
  fulfilled_details?: string;
  unfulfilled_details?: string;
  published: boolean;
  slug: string;
}

export type EvidenceSourceType = 'Official' | 'Independent Tracker' | 'News Media' | 'Fact Check';

export interface PromiseEvidence {
  id: string;
  created_at: string;
  promise_id: string;
  title: string;
  url: string;
  source_type: EvidenceSourceType;
  date_published?: string;
}
