import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { STUDIO_INFO } from '../constants';
import './redesign/redesign.css';

// The studio's front page (redesign approved 28 Oct 2026): both games in one hero, split by a
// seam the visitor can drag; a news strip; then what the studio is and a card for each game.
const GP_TICKER = [
  ['WORLD BRIEF', 'Red Sea shipping disrupted - Trade cards cost +1 energy there today'],
  ['MISSION', 'Chip supply check at the US-China chip controls'],
  ['THIS WEEK', 'Oil shock week'],
];

const StudioHome: React.FC = () => {
  const split = useRef<HTMLDivElement>(null);
  const [news, setNews] = useState<string[][]>(GP_TICKER);

  useEffect(() => {
    // After the site-wide default (App's useSEO runs after this page's effects on first load).
    const t = setTimeout(() => {
      document.title = 'Moitra Studios | GeoPolitics and Rajneeti strategy games';
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'Moitra Studios makes strategy games about how power works: GeoPolitics, the card game played on a living world map, and Rajneeti, the Indian election strategy game.');
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'Moitra Studios | GeoPolitics and Rajneeti strategy games');
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'Moitra Studios makes strategy games about how power works: GeoPolitics, the card game played on a living world map, and Rajneeti, the Indian election strategy game.');
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Rajneeti TV's newest headlines join the strip when the daily news file loads.
  useEffect(() => {
    fetch('/daily_news.json').then(r => r.ok ? r.json() : []).then((items: { ticker_headline?: string }[]) => {
      const tv = items.filter(i => i.ticker_headline).slice(0, 3).map(i => ['RAJNEETI TV', i.ticker_headline as string]);
      if (tv.length) setNews([GP_TICKER[0], tv[0], GP_TICKER[1], ...tv.slice(1), GP_TICKER[2]]);
    }).catch(() => { /* the GeoPolitics items alone are fine */ });
  }, []);

  // The seam follows the mouse (or a drag on touch) and drifts slowly on its own when left alone.
  useEffect(() => {
    const el = split.current;
    if (!el) return;
    let userAt = -1e9, dragging = false, raf = 0;
    const set = (v: number) => el.style.setProperty('--cut', `${Math.max(12, Math.min(88, v))}%`);
    const from = (e: PointerEvent) => { const r = el.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); userAt = performance.now(); };
    const move = (e: PointerEvent) => { if (e.pointerType === 'mouse' || dragging) from(e); };
    const down = (e: PointerEvent) => { dragging = true; from(e); };
    const up = () => { dragging = false; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const drift = (t: number) => { if (t - userAt > 2500) set(50 + Math.sin(t / 2600) * 18); raf = requestAnimationFrame(drift); };
      raf = requestAnimationFrame(drift);
    }
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); };
  }, []);

  const strip = news.map(([k, v], i) => <React.Fragment key={i}><b>{k}</b>{v}</React.Fragment>);

  return (
    <div className="rd-page st w-full flex-1">
      <div className="st-split" ref={split} style={{ ['--cut' as string]: '55%' } as React.CSSProperties}>
        <Link to="/geopolitics" className="st-side gp" aria-label="GeoPolitics">
          <div className="st-lbl"><small>World strategy · card game</small><strong>GEOPOLITICS</strong><span>The world map is the board. Today's news sets the missions.</span></div>
        </Link>
        <Link to="/rajneeti" className="st-side rj" aria-label="Rajneeti">
          <div className="st-lbl"><small>Indian politics · strategy</small><strong>Rajneeti</strong><span>Build a party. Win 272 seats.</span></div>
        </Link>
        <div className="st-seam" aria-hidden="true" />
      </div>
      <div className="st-ticker" aria-hidden="true"><div>{strip}{strip}</div></div>

      <div className="rd-wrap">
        <div className="st-thesis">
          <h1>We make games about <em>how power works.</em></h1>
          <p>{STUDIO_INFO.name} is a small independent studio. Our games run on real places, real numbers and the day's news, kept neutral and simplified so anyone can play.</p>
        </div>
        <div className="st-games">
          <Link className="st-gcard" to="/geopolitics">
            <img src="/site/gp4.jpg" alt="" loading="lazy" />
            <span className="st-pill">COMING TO GOOGLE PLAY</span>
            <h2>GeoPolitics</h2>
            <p>Lead one of 20 countries. 104 cards. Daily missions from the world news.</p>
          </Link>
          <Link className="st-gcard" to="/rajneeti">
            <img src="/site/rj_headquarter-builder-screen.jpg" alt="" loading="lazy" />
            <span className="st-pill">ON GOOGLE PLAY</span>
            <h2>Rajneeti</h2>
            <p>Raise funds, give speeches, build HQs and take the Lok Sabha.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudioHome;
