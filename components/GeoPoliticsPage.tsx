import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe2, Swords, Users, Ship, Shield, Mail, Trash2 } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

// GeoPolitics' own page: what the game is, real screens from it, where to get it, and the
// player information the stores ask for (privacy, terms, deleting an account).
const FEATURES = [
  { icon: Globe2, title: 'Real countries', text: 'Twenty playable countries with real strengths: economy, forex reserves, military, tech, energy, minerals and diplomacy.' },
  { icon: Swords, title: 'Cards, not dice', text: 'Build a deck of policy, military, cyber and diplomatic cards. Every card hits your rival or builds you up - and costs something.' },
  { icon: Ship, title: 'A living world map', text: 'Play on a real map of the world, where the places in the news are the places you fight over.' },
  { icon: Users, title: 'Play anyone', text: 'Quick match against a commander anywhere, or create a private room and send the code to a friend.' },
];

const SHOTS = [
  { src: '/geopolitics/geopolitics-match-board.jpg', alt: 'GeoPolitics match board with a hand of cards on the world map' },
  { src: '/geopolitics/geopolitics-rival-connected.jpg', alt: 'GeoPolitics matchmaking: rival connected, match starts in seconds' },
];

const GeoPoliticsPage: React.FC = () => {
  useEffect(() => {
    // After the site-wide default (App's useSEO runs after this page's effects on first load).
    const t = setTimeout(() => {
      document.title = 'GeoPolitics | Strategy card game about real countries | Moitra Studios';
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'GeoPolitics is a strategy card game about real countries and real issues. Pick a country, play cards across trade, tech, energy and diplomacy, and outplay your rival on a living world map.');
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'GeoPolitics | Strategy card game about real countries | Moitra Studios');
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'GeoPolitics is a strategy card game about real countries and real issues. Pick a country, play cards across trade, tech, energy and diplomacy, and outplay your rival on a living world map.');
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="w-full flex-1 bg-lokBlue-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#7dd3fc 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 normal-case">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-cyan-300 font-black mb-3">A game by {STUDIO_INFO.name}</p>
            <h1 className="font-cinzel font-black text-4xl md:text-6xl text-white tracking-wide drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">GeoPolitics</h1>
            <p className="mt-4 text-slate-300 text-base leading-relaxed max-w-xl">
              A strategy card game about real countries and real issues, simplified for play. Pick a country, play cards across trade, tech, energy, minerals, finance, security and diplomacy, and win the rounds by hurting your rival more than they hurt you.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white">Android · coming soon</span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white">Windows · coming soon</span>
            </div>
          </div>
          <img src="/geopolitics/geopolitics-earth.png" alt="The Earth at sunrise, as it appears in GeoPolitics" className="mx-auto w-64 md:w-80 drop-shadow-[0_0_60px_rgba(255,190,110,0.25)]" />
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {SHOTS.map(s => (
            <img key={s.src} src={s.src} alt={s.alt} loading="lazy" className="w-full rounded-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.45)]" />
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-white/10 bg-lokBlue-900/60 p-4">
                <Icon className="w-6 h-6 text-cyan-300 mb-2" />
                <h2 className="font-cinzel font-black text-white text-lg">{f.title}</h2>
                <p className="mt-1 text-slate-300 text-sm leading-relaxed">{f.text}</p>
              </div>
            );
          })}
        </div>

        <div id="player-information" className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="font-cinzel font-black text-white text-xl mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-cyan-300" /> Player information</h2>
          <ul className="space-y-3 text-slate-300 text-sm">
            <li><Link className="text-cyan-300 hover:text-white underline" to="/privacy-policy">Privacy Policy</Link> - what GeoPolitics collects and why (see the GeoPolitics section).</li>
            <li><Link className="text-cyan-300 hover:text-white underline" to="/terms-of-service">Terms of Service</Link> - the rules for playing and buying in GeoPolitics.</li>
            <li className="flex gap-2 items-start"><Trash2 className="w-4 h-4 mt-0.5 text-cyan-300 flex-shrink-0" /><span><strong className="text-white">Delete your account and data:</strong> in the game open Settings › Account › Delete account, or email <span className="text-white select-all">{STUDIO_INFO.email}</span> from any address with your commander name. Within 30 days we delete your account ID, linked email, commander name and emblem, progress, cards, decks, gold, phoenix and boosts. We keep only purchase records (as long as tax law requires) and player reports about cheating or abuse (up to 12 months). To delete only some data, such as your linked email, email us and say what to remove.</span></li>
            <li className="flex gap-2 items-start"><Mail className="w-4 h-4 mt-0.5 text-cyan-300 flex-shrink-0" /><span><strong className="text-white">Support:</strong> <span className="select-all">{STUDIO_INFO.email}</span></span></li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default GeoPoliticsPage;
