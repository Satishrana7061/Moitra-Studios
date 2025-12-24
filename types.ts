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
