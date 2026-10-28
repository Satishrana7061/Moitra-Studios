import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { STUDIO_INFO } from '../constants';
import './redesign/redesign.css';

// GeoPolitics' own page (redesign approved 28 Oct 2026). The top plays the game by itself, as in
// a match: DRAW 1, a card leaves the deck and flips into the hand, flies to a place on the world
// map and shrinks into it, then the gold burst and the numbers. Below: the World Brief, the cards,
// screens from the game, and the player information the stores ask for.

// The hero board shows lon -30..170 and lat 70..-40: x = lon + 30, y = 70 - lat on a 200 x 110 board.
const PLACES = [
  { name: 'STRAIT OF HORMUZ', lon: 56.3, lat: 26.6 },
  { name: 'SUEZ CANAL', lon: 32.5, lat: 30.5 },
  { name: 'STRAIT OF MALACCA', lon: 100.5, lat: 2.5 },
  { name: 'BAB-EL-MANDEB', lon: 43.3, lat: 12.6 },
  { name: 'ROTTERDAM', lon: 4.4, lat: 51.9 },
];
type Play = { img: string; at: number; rival: [string, number] | null; you: [string, number] };
const PLAYS: Play[] = [
  { img: '/site/card1.png', at: 0, rival: ['MILITARY', -4], you: ['MILITARY', 10] },
  { img: '/site/card2.png', at: 4, rival: ['ECONOMY', -2], you: ['ECONOMY', 4] },
  { img: '/site/card3.png', at: 2, rival: null, you: ['DIPLOMACY', 3] },
];
const METERS: [string, number, number][] = [['Military', 58, 62], ['Economy', 66, 74], ['Diplomacy', 71, 64]];

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const HeroStage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let alive = true;
    const deck = stage.querySelector('.gp-deck') as HTMLElement;
    const turn = stage.querySelector('.gp-turn') as HTMLElement;
    const count = stage.querySelector('.gp-deck-count') as HTMLElement;
    const pins = Array.from(stage.querySelectorAll('.gp-place')) as HTMLElement[];
    const pt = (el: Element) => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 }; };
    const anim = (el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) => el.animate(frames, opts).finished;
    const meter = (side: string, key: string, delta: number) => {
      const m = stage.querySelector(`.gp-hud.${side} .gp-meter[data-k="${key}"]`);
      if (!m) return;
      const n = m.lastElementChild as HTMLElement, v = Math.max(5, Math.min(99, +(n.textContent || 0) + delta));
      n.textContent = String(v); (m.querySelector('i') as HTMLElement).style.setProperty('--v', `${v}%`);
    };
    let deckN = 12, k = 0;

    const playOne = async () => {
      // Each round of three plays starts from the same strengths, so the bars never drift to the top.
      if (k % PLAYS.length === 0) {
        stage.querySelectorAll('.gp-hud').forEach((hud, s) => hud.querySelectorAll('.gp-meter').forEach((m, i) => {
          const v = s === 0 ? METERS[i][1] : METERS[i][2];
          (m.lastElementChild as HTMLElement).textContent = String(v);
          (m.querySelector('i') as HTMLElement).style.setProperty('--v', `${v}%`);
        }));
      }
      const p = PLAYS[k % PLAYS.length], pin = pins[p.at]; k++;
      const W = stage.clientWidth, H = stage.clientHeight;
      await anim(turn, [{ opacity: 0, transform: 'translate(-50%,-30%)' }, { opacity: 1, transform: 'translate(-50%,-50%)', offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0, transform: 'translate(-50%,-70%)' }], { duration: 1500, easing: 'ease-out' });
      if (!alive) return;
      // Draw: out of the deck, flip, into the hand.
      const c = document.createElement('div'); c.className = 'gp-fly';
      c.innerHTML = `<div class="back gp-cardback"></div><div class="face"><img alt="" src="${p.img}"></div>`;
      stage.appendChild(c);
      const d = pt(deck), cw = deck.clientWidth, ch = deck.clientHeight;
      const hand = { x: W * 0.62, y: H - ch * 0.62 };
      c.style.left = `${d.x - cw / 2}px`; c.style.top = `${d.y - ch / 2}px`;
      deckN = deckN > 1 ? deckN - 1 : 12; count.textContent = `DECK ${deckN}`;
      const dx = hand.x - d.x, dy = hand.y - d.y;
      await anim(c, [
        { transform: 'translate(0,0) rotateY(0deg)' },
        { transform: `translate(${dx * 0.35}px,${dy - ch * 0.6}px) rotateY(90deg) scale(1.15)`, offset: .45 },
        { transform: `translate(${dx}px,${dy}px) rotateY(180deg) scale(1.35)` },
      ], { duration: 900, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
      c.classList.add('up'); c.getAnimations().forEach(a => a.cancel());
      c.style.left = `${hand.x - cw / 2}px`; c.style.top = `${hand.y - ch / 2}px`; c.style.transform = 'scale(1.35)';
      await wait(500);
      // Play: lift, arc to the place, shrink into it.
      pin.classList.add('hot');
      const t = pt(pin), tx = t.x - hand.x, ty = t.y - hand.y;
      await anim(c, [
        { transform: 'translate(0,0) scale(1.35) rotate(0deg)' },
        { transform: `translate(0,${-ch * 0.25}px) scale(1.5) rotate(-4deg)`, offset: .18 },
        { transform: `translate(${tx * 0.55}px,${ty * 0.55 - ch * 0.8}px) scale(.9) rotate(6deg)`, offset: .6 },
        { transform: `translate(${tx}px,${ty}px) scale(.1) rotate(0deg)`, opacity: .9 },
      ], { duration: 1150, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' });
      c.remove();
      // Hit: gold ring, white-gold flash, the numbers rise.
      const ring = document.createElement('div'); ring.className = 'gp-burst';
      const flash = document.createElement('div'); flash.className = 'gp-flash';
      [ring, flash].forEach(e => { e.style.left = `${t.x}px`; e.style.top = `${t.y}px`; stage.appendChild(e); });
      anim(ring, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: 1300, easing: 'cubic-bezier(.1,.6,.3,1)' }).then(() => ring.remove());
      anim(flash, [{ opacity: 1, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(1.4)' }], { duration: 2000, easing: 'ease-out' }).then(() => flash.remove());
      const lines: [string, string][] = [[`YOU ${p.you[0]} +${p.you[1]}`, 'var(--gp-green)']];
      if (p.rival) lines.push([`RIVAL ${p.rival[0]} −${-p.rival[1]}`, 'var(--gp-red)']);
      lines.forEach(([text, colour], i) => {
        const f = document.createElement('div'); f.className = 'gp-float'; f.textContent = text; f.style.color = colour;
        f.style.left = `${t.x}px`; f.style.top = `${t.y - 18 - i * 22}px`; stage.appendChild(f);
        anim(f, [{ opacity: 0, transform: 'translate(-50%,-30%)' }, { opacity: 1, transform: 'translate(-50%,-80%)', offset: .2 }, { opacity: 1, offset: .75 }, { opacity: 0, transform: 'translate(-50%,-260%)' }], { duration: 2200, delay: i * 180, easing: 'ease-out' }).then(() => f.remove());
      });
      const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
      meter('you', cap(p.you[0]), p.you[1]);
      if (p.rival) meter('rival', cap(p.rival[0]), p.rival[1]);
      await wait(2300);
      pin.classList.remove('hot');
      await wait(500);
    };

    (async () => {
      while (alive) {
        // Wait while the tab is hidden so cards don't pile up mid-flight.
        if (document.hidden) { await wait(1000); continue; }
        try { await playOne(); } catch { await wait(1000); }
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="gp-stage" ref={stageRef}>
      <svg className="gp-routes" viewBox="0 0 200 110" preserveAspectRatio="none" aria-hidden="true">
        <polyline className="gp-r box" id="gp-lane1" points="130.5,67.5 112,63 92,59 81,61 73.4,57.4 68.5,50 63.6,42.5 62.5,39.5 50,34 30,36 24.6,34 20,22 34,17" />
        <polyline className="gp-r oil" id="gp-lane2" points="86.3,43.4 89,49 82,57 73.4,57.4" />
        <polyline className="gp-r oil" points="86.3,43.4 100,52 112,63" />
        <polyline className="gp-r gas" points="58,15 70,18 88,22 110,24" />
        <polyline className="gp-r box" points="130.5,67.5 145,48 151,40 160,30" />
        <circle r=".9" fill="#fff"><animateMotion dur="14s" repeatCount="indefinite"><mpath href="#gp-lane1" /></animateMotion></circle>
        <circle r=".9" fill="#fff"><animateMotion dur="14s" begin="-7s" repeatCount="indefinite"><mpath href="#gp-lane1" /></animateMotion></circle>
        <circle r=".8" fill="#fff"><animateMotion dur="7s" repeatCount="indefinite"><mpath href="#gp-lane2" /></animateMotion></circle>
      </svg>
      {PLACES.map(p => (
        <div key={p.name} className="gp-place" style={{ left: `${(p.lon + 30) / 2}%`, top: `${(70 - p.lat) / 110 * 100}%` }}><b>{p.name}</b></div>
      ))}
      {(['you', 'rival'] as const).map((side, s) => (
        <div key={side} className={`gp-hud ${side}`}>
          <h3>{side === 'you' ? 'YOU · CANADA' : 'RIVAL · JAPAN'}</h3>
          {METERS.map(([k, a, b]) => {
            const v = s === 0 ? a : b;
            return <div key={k} className="gp-meter" data-k={k}><span>{k}</span><i style={{ ['--v' as string]: `${v}%` } as React.CSSProperties} /><span>{v}</span></div>;
          })}
        </div>
      ))}
      <div className="gp-hero-copy">
        <h1>THE WORLD IS THE BOARD</h1>
        <p>Lead one of 20 real countries. Play cards on 129 real places: straits, ports, cable landings. Today's news sets today's missions.</p>
        <div className="gp-row"><span className="gp-cta">COMING TO GOOGLE PLAY</span><a className="gp-cta ghost" href="#trailer">WATCH THE TRAILER</a></div>
      </div>
      <div className="gp-deck" aria-hidden="true"><div className="gp-cardback" /><div className="gp-cardback" /><div className="gp-cardback" /><div className="gp-deck-count">DECK 12</div></div>
      <div className="gp-turn" aria-hidden="true">YOUR TURN · DRAW 1</div>
    </div>
  );
};

const GeoPoliticsPage: React.FC = () => {
  useEffect(() => {
    // After the site-wide default (App's useSEO runs after this page's effects on first load).
    const t = setTimeout(() => {
      document.title = 'GeoPolitics | Strategy card game on a living world map | Moitra Studios';
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'GeoPolitics is a strategy card game played on a living world map. Lead one of 20 real countries, play 104 cards on 129 real places, and take on daily missions made from the world news.');
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'GeoPolitics | Strategy card game on a living world map | Moitra Studios');
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'GeoPolitics is a strategy card game played on a living world map. Lead one of 20 real countries, play 104 cards on 129 real places, and take on daily missions made from the world news.');
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rd-page gp w-full flex-1">
      <HeroStage />
      <div className="rd-wrap">
        <div className="gp-mobile-copy">
          <p>Lead one of 20 real countries. Play cards on 129 real places: straits, ports, cable landings. Today's news sets today's missions.</p>
          <div className="gp-row"><span className="gp-cta">COMING TO GOOGLE PLAY</span></div>
        </div>

        <section className="gp-sec">
          <div className="gp-kicker">TODAY'S WORLD BRIEF</div>
          <h2>The news makes the missions</h2>
          <p className="gp-lead">Every morning the game reads the world's top stories and turns three of them into missions at the places they happen. When shipping is disrupted in the Red Sea, the lane turns red and ships take the long way round Africa.</p>
          <div className="gp-brief">
            <div className="gp-mini">
              <svg viewBox="0 0 200 110" preserveAspectRatio="none" aria-hidden="true">
                <polyline className="gp-r red" points="82,57 73.4,57.4 68.5,50 63.6,42.5 62.5,39.5" />
                <polyline className="gp-r detour" id="gp-detour" points="90,57 85,72 74,88 66,100 49,106 38,92 24,70 14,50 18,34 24,26" />
                <circle r="1" fill="#fff"><animateMotion dur="9s" repeatCount="indefinite"><mpath href="#gp-detour" /></animateMotion></circle>
              </svg>
              <div className="gp-place news" style={{ left: '36.65%', top: '52.2%' }}><b>BAB-EL-MANDEB · DISRUPTED</b></div>
              <div className="gp-newsbar"><b>NEWS</b>Red Sea shipping disrupted · Trade cards there cost +1 energy today</div>
            </div>
            <div className="gp-missions">
              <div className="gp-mission"><i style={{ background: 'var(--gp-red)' }} /><div><h3>KEEP TRADE MOVING</h3><p>Play 2 Trade cards at Bab-el-Mandeb.</p></div><em>300 GOLD</em></div>
              <div className="gp-mission"><i style={{ background: 'var(--gp-cyan)' }} /><div><h3>CHIP SUPPLY CHECK</h3><p>Win a match with a Tech card at the chip controls.</p></div><em>200 + PACK</em></div>
              <div className="gp-mission"><i style={{ background: 'var(--gp-gold)' }} /><div><h3>CANAL DIPLOMACY</h3><p>Play a Diplomatic card at Panama.</p></div><em>150 GOLD</em></div>
            </div>
          </div>
        </section>

        <section className="gp-sec">
          <div className="gp-kicker">104 CARDS · 6 KINDS</div>
          <h2>Build your deck</h2>
          <div className="gp-fan"><img src="/site/card2.png" alt="Carbon Tax, an Economic card" loading="lazy" /><img src="/site/card1.png" alt="Aerial Superiority, a Military card" loading="lazy" /><img src="/site/card3.png" alt="Cultural Exchange, a Diplomatic card" loading="lazy" /></div>
          <div className="gp-strengths">
            {[['ECONOMY', 66], ['RESERVES', 41], ['MILITARY', 58], ['TECHNOLOGY', 73], ['ENERGY', 80], ['MINERALS', 77], ['DIPLOMACY', 71]].map(([k, v]) => <div key={k}>{k}<b>{v}</b></div>)}
          </div>
          <p className="gp-lead" style={{ fontSize: 16 }}>Seven strengths per country, from real data simplified for a game (Canada shown). Hurt your rival more than they hurt you, and watch your debt. Play a quick match against anyone, a private room with a friend's code, or the AI.</p>
        </section>

        <section className="gp-sec" id="trailer">
          <div className="gp-kicker">FROM THE GAME</div>
          <div className="gp-shots">
            <img src="/site/gp1.jpg" alt="GeoPolitics main menu with the Earth at sunrise" loading="lazy" />
            <img src="/site/gp2.jpg" alt="The World Brief with today's missions" loading="lazy" />
            <img src="/site/gp3.jpg" alt="A mission match at Bab-el-Mandeb" loading="lazy" />
            <img src="/site/gp4.jpg" alt="A card lands on the world map" loading="lazy" />
            <img src="/site/gp7.jpg" alt="Real trade routes on the map" loading="lazy" />
            <img src="/site/gp6.jpg" alt="The deck builder" loading="lazy" />
          </div>
          <div className="gp-video"><div>TRAILER · 0:30<span>The trailer arrives with the game's launch.</span></div></div>
        </section>

        <section className="gp-sec" id="player-information">
          <div className="gp-info">
            <h2>Player information</h2>
            <ul>
              <li><Link to="/privacy-policy">Privacy Policy</Link>: what GeoPolitics collects and why (see the GeoPolitics section).</li>
              <li><Link to="/terms-of-service">Terms of Service</Link>: the rules for playing and buying in GeoPolitics.</li>
              <li><strong>Delete your account and data:</strong> in the game open Settings › Account › Delete account, or email <span className="select-all" style={{ color: '#fff' }}>{STUDIO_INFO.email}</span> from any address with your commander name. Within 30 days we delete your account ID, linked email, commander name and emblem, progress, cards, decks, gold, phoenix and boosts. We keep only purchase records (as long as tax law requires) and player reports about cheating or abuse (up to 12 months). To delete only some data, such as your linked email, email us and say what to remove.</li>
              <li><strong>Support:</strong> <span className="select-all">{STUDIO_INFO.email}</span></li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GeoPoliticsPage;
