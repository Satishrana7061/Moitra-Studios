import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe2, Landmark } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

// The studio's front page: who we are, and our two games side by side. Each card opens that
// game's own page - Rajneeti keeps its long-standing address so existing links still work.
const GAMES = [
  {
    key: 'geopolitics',
    title: 'GeoPolitics',
    tagline: 'Real countries. Real crises. One card at a time.',
    blurb: 'A strategy card game for two commanders. Pick a country, guard your economy, reserves, military, tech, energy, minerals and diplomacy, and outplay your rival on a living world map.',
    image: '/geopolitics/geopolitics-rival-connected.jpg',
    href: '/geopolitics',
    accent: 'from-cyan-400/30',
    border: 'border-cyan-300/40',
    badge: 'Android and Windows · coming soon',
    icon: Globe2,
  },
  {
    key: 'rajneeti',
    title: 'Rajneeti',
    tagline: 'Win India, state by state.',
    blurb: 'The Indian political strategy game: build alliances, raise funds, give speeches and run your party\'s campaign across every state.',
    image: '/rajneeti_cover_banner.png',
    href: '/indian-politics-game-home',
    accent: 'from-orange-400/30',
    border: 'border-gameOrange/40',
    badge: 'On Google Play',
    icon: Landmark,
  },
];

const StudioHome: React.FC = () => {
  useEffect(() => {
    // After the site-wide default (App's useSEO runs after this page's effects on first load).
    const t = setTimeout(() => {
      document.title = 'Moitra Studios | GeoPolitics and Rajneeti strategy games';
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'Moitra Studios makes strategy games about politics and the world: GeoPolitics, the card game of real countries, and Rajneeti, the Indian election strategy game.');
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'Moitra Studios | GeoPolitics and Rajneeti strategy games');
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'Moitra Studios makes strategy games about politics and the world: GeoPolitics, the card game of real countries, and Rajneeti, the Indian election strategy game.');
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="w-full flex-1 bg-lokBlue-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#7dd3fc 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <header className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.5em] text-gameOrange font-black mb-3">{STUDIO_INFO.name}</p>
          <h1 className="font-cinzel font-black text-3xl md:text-5xl text-white tracking-wide drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            Strategy games about the world we live in
          </h1>
          <p className="mt-4 text-slate-300 max-w-2xl mx-auto text-sm md:text-base normal-case leading-relaxed">
            We make games where politics, trade and diplomacy are the battlefield - built on real places and public facts, simplified for play.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GAMES.map(g => {
            const Icon = g.icon;
            return (
              <Link
                key={g.key}
                to={g.href}
                className={`group relative flex flex-col rounded-2xl overflow-hidden border ${g.border} bg-lokBlue-900/60 shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white`}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={g.image} alt={`${g.title} game screen`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${g.accent} via-transparent to-transparent`} />
                  <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.2em] font-black bg-black/60 text-white px-3 py-1 rounded-full">{g.badge}</span>
                </div>
                <div className="flex-1 flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-white/80" />
                    <h2 className="font-cinzel font-black text-2xl text-white tracking-wide">{g.title}</h2>
                  </div>
                  <p className="text-gameOrange text-xs uppercase tracking-[0.2em] font-black">{g.tagline}</p>
                  <p className="text-slate-300 text-sm leading-relaxed normal-case">{g.blurb}</p>
                  <span className="mt-auto inline-flex items-center gap-2 text-white text-xs uppercase tracking-[0.25em] font-black">
                    Open {g.title} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-6 text-[11px] uppercase tracking-[0.25em]">
          <Link to="/privacy-policy" className="text-slate-400 hover:text-white">Privacy Policy</Link>
          <Link to="/terms-of-service" className="text-slate-400 hover:text-white">Terms of Service</Link>
          <Link to="/contact-us" className="text-slate-400 hover:text-white">Contact</Link>
        </div>
      </div>
    </section>
  );
};

export default StudioHome;
