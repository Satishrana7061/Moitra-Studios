
import { Game } from './types';

export const NAV_LINKS = [
  { label: 'Home', href: '/home', page: 'home' },
  { label: 'Privacy Policy', href: '/privacy-policy', page: 'privacy' },
  { label: 'Contact Us', href: '/contact-us', page: 'contact' },
];

export const GAMES_DATA: Game[] = [
  {
    id: 'rajneeti',
    title: 'Rajneeti: Grand Strategy',
    tagline: 'Master the Art of Indian Politics',
    description: 'A deep, turn-based political simulation where you navigate the treacherous waters of Indian democracy. Build your party, manage campaign funds, and outmaneuver rivals to claim power.',
    imageUrl: '/Rajneeti-Game-Main-Screen.png',
    status: 'Live',
    playStoreLink: 'https://play.google.com/store/apps/details?id=com.rajneeti',
    appStoreLink: undefined,
    tags: ['Strategy', 'Simulation', 'Politics'],
    highlights: [
      'Strategic voter segmentation and booth-level management',
      'Complex coalition mechanics and back-channel negotiations',
      'Realistic economic and social policy impact simulation',
    ],
    releaseWindow: 'Live on Android; iOS build in discovery.',
    trailerUrl: 'https://www.youtube.com/embed/LXb3EKWsInQ',
  },
  {
    id: 'geopolitics',
    title: 'GeoPolitics: World Stage',
    tagline: 'Diplomacy or War?',
    description: 'Expand your influence on the global stage. Manage complex trade routes, build military alliances, and use covert operations to maintain your nation\'s sovereignty in a changing world.',
    imageUrl: '/public/Rajneeti-Game-War-Card-Screen.jpg',
    status: 'In Development',
    tags: ['RTS', 'Global', 'Warfare'],
    highlights: [
      'Real-time global trade and resource management systems',
      'Deep diplomatic tree with asymmetric win conditions',
      'Modern warfare simulation including cyber and economic fronts',
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
