
import { Game } from './types';

export const NAV_LINKS = [
  { label: 'Home', href: '#home', page: 'home' },
  { label: 'Games', href: '#games', page: 'home' },
  { label: 'Advisor', href: '#advisor', page: 'home' },
  { label: 'About', href: '#about', page: 'home' },
  { label: 'Contact', href: '#contact', page: 'home' },
];

export const GAMES_DATA: Game[] = [
  {
    id: 'rajneeti',
    title: 'Rajneeti: Grand Strategy',
    tagline: 'Master the Art of Indian Politics',
    description: 'Navigate the treacherous waters of political strategy. Build alliances, manage resources, and outwit opponents to claim the ultimate seat of power in this deep, turn-based strategy simulation.',
    imageUrl: 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?q=80&w=2574&auto=format&fit=crop',
    status: 'Live',
    playStoreLink: 'https://play.google.com',
    tags: ['Strategy', 'Simulation', 'Politics'],
    highlights: [
      'Deep 4X-style political simulation tailored for 10 minute sessions',
      'Faction AI that reacts to your media moves and coalition building',
      'Live events and seasonal stories shaped by player decisions',
    ],
    releaseWindow: 'Live on Android; iOS build in discovery.',
    trailerUrl: 'https://www.youtube.com/embed/LXb3EKWsInQ', 
  },
  {
    id: 'geopolitics',
    title: 'GeoPolitics: World Stage',
    tagline: 'Diplomacy or War?',
    description: 'Expand your influence across a dynamic global map. Manage economy, military, and diplomatic relations in a real-time grand strategy experience designed for mobile.',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
    status: 'In Development',
    tags: ['RTS', 'Global', 'Warfare'],
    highlights: [
      'Dynamic world economy with trade routes that can be sabotaged or secured',
      'Back-channel diplomacy and treaty tooling built for co-op or betrayal',
      'Seasonal operations with rotating map modifiers and asymmetric win states',
    ],
    releaseWindow: 'Alpha briefing drops this winter; closed tests follow.',
    trailerUrl: 'https://www.youtube.com/embed/LXb3EKWsInQ', 
  },
];

export const STUDIO_INFO = {
  name: 'Moitra Studios',
  legalName: '15029155 Canada Inc.',
  email: 'support@moitrastudios.com',
  twitter: 'https://twitter.com',
  linkedin: 'https://linkedin.com',
  foundingYear: 2023,
  location: 'Canada / Global',
};
