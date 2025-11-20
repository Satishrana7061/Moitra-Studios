
import { Game } from './types';

export const NAV_LINKS = [
  { label: 'Home', href: '#home', page: 'home' },
  { label: 'Games', href: '#games', page: 'home' },
  { label: 'About', href: '#about', page: 'home' },
  { label: 'Contact', href: '#contact', page: 'home' },
];

export const GAMES_DATA: Game[] = [
  {
    id: 'rajneeti',
    title: 'Rajneeti: Grand Strategy',
    tagline: 'Master the Art of Indian Politics',
    description: 'Navigate the treacherous waters of political strategy. Build alliances, manage resources, and outwit opponents to claim the ultimate seat of power in this deep, turn-based strategy simulation.',
    // Image: A moody, dark image of a parliament or political gathering
    imageUrl: 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?q=80&w=2574&auto=format&fit=crop',
    status: 'Live',
    playStoreLink: 'https://play.google.com',
    tags: ['Strategy', 'Simulation', 'Politics'],
    trailerUrl: 'https://www.youtube.com/embed/f-eZm87K9_g', 
  },
  {
    id: 'geopolitics',
    title: 'GeoPolitics: World Stage',
    tagline: 'Diplomacy or War?',
    description: 'Expand your influence across a dynamic global map. Manage economy, military, and diplomatic relations in a real-time grand strategy experience designed for mobile.',
    // Image: Digital Earth / Network map
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
    status: 'In Development',
    tags: ['RTS', 'Global', 'Warfare'],
    trailerUrl: 'https://www.youtube.com/embed/LXb3EKWsInQ', 
  },
];

export const STUDIO_INFO = {
  name: 'Moitra Studios',
  legalName: '15029155 Canada Inc.',
  address: '7368 Saint Barbara Blvd, MISSISSAUGA - L5W 0C3, Canada (CA)',
  email: 'support@moitrastudios.com',
  twitter: 'https://twitter.com',
  linkedin: 'https://linkedin.com',
  foundingYear: 2023,
  location: 'Canada / Global',
};
