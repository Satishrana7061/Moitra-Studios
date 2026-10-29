import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_LINKS } from '../constants';
import './redesign/redesign.css';
import MoitraSeal from './redesign/MoitraSeal';

// The studio's bar (28 Oct 2026): Moitra Studios on the left, its two games and the home page on
// the right. On phones the links open in a full, solid panel.
const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) => href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  useEffect(() => {
    const main = document.querySelector('main');
    const onScroll = () => setScrolled((main?.scrollTop ?? 0) > 20 || window.scrollY > 20);
    main?.addEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll);
    return () => { main?.removeEventListener('scroll', onScroll); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <nav className={`st-nav${scrolled || open ? ' solid' : ''}`} aria-label="Main">
      <div className="st-nav-in">
        <Link to="/" className="st-brand" aria-label="Moitra Studios home">
          <MoitraSeal size={46} label="" />
          <span className="st-word">MOITRA<small>STUDIOS</small></span>
        </Link>
        <div className="st-navlinks">
          {NAV_LINKS.map(l => (
            <Link key={l.href} to={l.href} className={`st-navlink ${l.page}${isActive(l.href) ? ' on' : ''}`}>{l.label}</Link>
          ))}
        </div>
        <button type="button" className="st-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="st-menu">
          {NAV_LINKS.map((l, i) => (
            <Link key={l.href} to={l.href} className={`st-menu-link ${l.page}${isActive(l.href) ? ' on' : ''}`} style={{ animationDelay: `${i * 0.06}s` }}>
              <small>{l.page === 'home' ? 'STUDIO' : l.page === 'geopolitics' ? 'WORLD STRATEGY' : 'INDIAN POLITICS'}</small>{l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
