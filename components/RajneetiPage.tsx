import React, { useEffect, useRef, useState } from 'react';
import { GAMES_DATA, STUDIO_INFO } from '../constants';
import './redesign/redesign.css';

// Rajneeti's own page (redesign approved 28 Oct 2026): bright like the game, with the Lok Sabha's
// 543 seats filling in the player's saffron until the count passes the 272 majority.
const TOTAL = 543, MAJORITY = 272, YOURS = 301, RIVAL = 190;
const PLAY_URL = GAMES_DATA.find(g => g.id === 'rajneeti')?.playStoreLink ?? 'https://play.google.com/store/apps/details?id=com.rajneeti';

const LokSabha: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [won, setWon] = useState(0);

  useEffect(() => {
    const cv = canvas.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;
    // Seats in 12 curved rows, each row's share by its length; filled left to right across the house.
    const rows = 12, R0 = 120, R1 = 340, cx = 360, cy = 360;
    const radii = Array.from({ length: rows }, (_, r) => R0 + (R1 - R0) * r / (rows - 1));
    const sumR = radii.reduce((a, b) => a + b, 0);
    const seats: { x: number; y: number; a: number }[] = [];
    let placed = 0;
    radii.forEach((rad, i) => {
      const n = i === rows - 1 ? TOTAL - placed : Math.round(TOTAL * rad / sumR); placed += n;
      for (let j = 0; j < n; j++) { const a = Math.PI - Math.PI * (j + .5) / n; seats.push({ x: cx + rad * Math.cos(a), y: cy - rad * Math.sin(a), a }); }
    });
    seats.sort((a, b) => b.a - a.a);
    const draw = (n: number) => {
      g.clearRect(0, 0, cv.width, cv.height);
      seats.forEach((s, i) => {
        g.beginPath(); g.arc(s.x, s.y, 7.4, 0, Math.PI * 2);
        g.fillStyle = i < n ? '#ff8a1f' : (i >= TOTAL - RIVAL && n > 120 ? '#0d2a6b' : '#c9b89f'); g.fill();
      });
      const maj = n >= MAJORITY;
      g.strokeStyle = maj ? '#138a3c' : 'rgba(42,26,12,.35)'; g.lineWidth = maj ? 4 : 2; g.setLineDash(maj ? [] : [8, 8]);
      g.beginPath(); g.moveTo(cx, cy - R1 - 16); g.lineTo(cx, cy - R0 + 16); g.stroke(); g.setLineDash([]);
      g.fillStyle = maj ? '#138a3c' : '#6b4a2a'; g.font = '700 20px "Baloo 2", sans-serif'; g.textAlign = 'center';
      g.fillText(maj ? 'MAJORITY!' : String(MAJORITY), cx, cy - 20);
      setWon(n);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(YOURS); return; }
    let raf = 0, start = 0, last = -1;
    const tick = (t: number) => {
      if (!start) start = t;
      const e = (t - start) / 1000;
      const n = e < 6 ? Math.floor(YOURS * (1 - Math.pow(1 - e / 6, 2))) : YOURS;
      if (n !== last) { draw(n); last = n; }
      if (e > 9) { start = t; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="rj-house">
      <div className="rj-house-h"><span>LOK SABHA · {TOTAL} SEATS</span><span>MAJORITY {MAJORITY}</span></div>
      <canvas ref={canvas} width={720} height={380} role="img" aria-label="The Lok Sabha's seats filling with your party's colour" />
      <div className="rj-house-h">
        <div className="rj-seats">{won}<small>YOUR SEATS</small></div>
        <div className="rj-legend"><span><i style={{ background: 'var(--rj-saffron)' }} />Your party</span><span><i style={{ background: 'var(--rj-navy)' }} />Rival</span><span><i style={{ background: '#c9b89f' }} />Undecided</span></div>
      </div>
    </div>
  );
};

const FEATURES = [
  { img: '/site/rj_fund-raise-screen.jpg', title: 'Raise funds', text: 'Run donation drives and spend carefully.' },
  { img: '/site/rj_speech-screen.jpg', title: 'Give speeches', text: 'Pick the issue each state cares about.' },
  { img: '/site/rj_headquarter-builder-screen.jpg', title: 'Build HQs', text: 'Grow your party office by office.' },
  { img: '/site/rj_war-card-screen.jpg', title: 'Play war cards', text: 'Swing a close seat at the last turn.' },
];

// Delhi, the game's city: real footage from the game (recorded 28 Oct 2026 in a Delhi story battle),
// each clip a card played and the street answering it.
const DELHI_CLIPS = [
  { name: 'rj_delhi_parliament', title: 'Students block the road to Parliament', text: 'Thousands fill the roundabout outside the old Parliament House. A fact-check lands, and the crowd stays.' },
  { name: 'rj_delhi_jantar_mantar', title: 'Farmers march on Jantar Mantar', text: 'The crowd gathers beside the observatory. Police arrive by bus, TV crews follow, shops shut.' },
  { name: 'rj_delhi_smoke', title: 'Campus gates sealed', text: 'Smoke rises over the crowd while buses and traffic jam the roads around it.' },
];

const DelhiClip: React.FC<{ name: string; title: string; text: string }> = ({ name, title, text }) => {
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <figure className="rj-clip">
      <video src={`/site/${name}.mp4`} poster={`/site/${name}.jpg`} autoPlay={!still} controls={still}
        muted loop playsInline preload="metadata" aria-label={`Rajneeti gameplay in Delhi: ${title}`} />
      <figcaption><h3>{title}</h3><p>{text}</p></figcaption>
    </figure>
  );
};

const RajneetiPage: React.FC = () => {
  useEffect(() => {
    const t = setTimeout(() => {
      document.title = 'Rajneeti | Indian political strategy game | Moitra Studios';
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'Rajneeti is the Indian political strategy game: start a party, raise funds, fight for the news on the streets of Delhi, build HQs across every state and win 272 seats in the Lok Sabha.');
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'Rajneeti | Indian political strategy game | Moitra Studios');
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'Rajneeti is the Indian political strategy game: start a party, raise funds, fight for the news on the streets of Delhi, build HQs across every state and win 272 seats in the Lok Sabha.');
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rd-page rj w-full flex-1">
      <div className="rj-tri" />
      <div className="rd-wrap">
        <div className="rj-hero">
          <div>
            <h1>Win the house. <span>272</span> seats to rule.</h1>
            <p>Start a party, raise funds, give speeches and build HQs across every state. Turn by turn, the Lok Sabha fills with your colour.</p>
            <div className="rj-row">
              <a className="rj-btn" href={PLAY_URL} target="_blank" rel="noopener noreferrer">▶ Get it on Google Play</a>
            </div>
          </div>
          <LokSabha />
        </div>
        <section className="rj-delhi" aria-labelledby="rj-delhi-h">
          <div className="rj-delhi-intro">
            <h2 id="rj-delhi-h">Delhi is the battlefield</h2>
            <p>The whole of New Delhi, mapped street by street. Pick a story from the news, play your cards, and watch the city answer: crowds march, police block the roads, TV vans arrive.</p>
          </div>
          <img className="rj-delhi-city" src="/site/rj_delhi_city.jpg" alt="Rajneeti's Delhi from above: Lutyens' Delhi, Kartavya Path, the India Gate hexagon and the Yamuna" loading="lazy" />
          <div className="rj-clips">
            {DELHI_CLIPS.map(c => <DelhiClip key={c.name} {...c} />)}
          </div>
        </section>
        <div className="rj-feats">
          {FEATURES.map(f => (
            <div key={f.title} className="rj-feat"><img src={f.img} alt={`Rajneeti: ${f.title.toLowerCase()} screen`} loading="lazy" /><div><h2>{f.title}</h2><p>{f.text}</p></div></div>
          ))}
        </div>
        <div className="rj-band" style={{ marginBottom: 40 }}>
          <div><h2>Free on Google Play</h2><p>Rajneeti: Indian Strategy Game, by {STUDIO_INFO.name}.</p></div>
          <a className="rj-btn" href={PLAY_URL} target="_blank" rel="noopener noreferrer">▶ Get it on Google Play</a>
        </div>
      </div>
    </div>
  );
};

export default RajneetiPage;
