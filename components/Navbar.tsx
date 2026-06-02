import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { NAV_LINKS } from '../constants';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isMapPage = location.pathname === '/' || location.pathname === '/indian-politics-game-home';

  // Determine active link
  const getIsActive = (href: string) => {
    if (href === '/indian-politics-game-home') {
      return location.pathname === '/' || location.pathname === '/indian-politics-game-home';
    }
    return location.pathname.startsWith(href);
  };

  useEffect(() => {
    const handleScroll = () => {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        setIsScrolled(mainElement.scrollTop > 20);
      } else {
        setIsScrolled(window.scrollY > 20);
      }
    };

    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);

    return () => {
      if (mainElement) mainElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleNavClick = (href: string) => {
    navigate(href);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Navbar Animations */}
      <style>{`
        @keyframes navbar-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes navbar-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes navbar-glow-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255,107,0,0.3), inset 0 0 8px rgba(255,107,0,0.1); }
          50% { box-shadow: 0 0 20px rgba(255,107,0,0.5), inset 0 0 12px rgba(255,107,0,0.2); }
        }
        @keyframes navbar-border-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes navbar-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes navbar-link-line {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes navbar-menu-stagger {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .navbar-shimmer-text {
          background: linear-gradient(90deg, #fff 0%, #fff 40%, #fbbf24 50%, #fff 60%, #fff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: navbar-shimmer 4s ease-in-out infinite;
        }
        .navbar-float {
          animation: navbar-float 3s ease-in-out infinite;
        }
        .navbar-diamond-glow {
          animation: navbar-glow-pulse 3s ease-in-out infinite;
        }
        .navbar-link-hover:hover .navbar-link-underline {
          animation: navbar-link-line 0.3s ease-out forwards;
        }
        .navbar-link-underline {
          transform: scaleX(0);
          transform-origin: center;
        }
        .navbar-link-active .navbar-link-underline {
          transform: scaleX(1) !important;
        }
      `}</style>

      <nav
        className={`relative w-full z-50 transition-all duration-700 ease-out ${
          isScrolled
            ? 'py-1.5'
            : 'py-3 md:py-4'
        }`}
      >
        {/* Glassmorphic background layer */}
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            isScrolled
              ? 'bg-slate-950/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
              : 'bg-gradient-to-b from-slate-950/60 to-transparent backdrop-blur-sm'
          }`}
        />

        {/* Animated bottom border glow */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[1px] transition-opacity duration-700 ${
            isScrolled ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,107,0,0.4) 20%, rgba(251,191,36,0.6) 50%, rgba(255,107,0,0.4) 80%, transparent 100%)',
          }}
        />

        <div className="relative max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-12 md:h-14 w-full">

            {/* ─── Logo (Left) ─── */}
            <div
              className="flex-shrink-0 flex items-center gap-2.5 md:gap-3 cursor-pointer group z-30"
              onClick={() => handleNavClick('/indian-politics-game-home')}
            >
              {/* Diamond Logo with glow */}
              <div className="relative w-9 h-9 md:w-11 md:h-11 flex items-center justify-center">
                <div className="absolute inset-0 rotate-45 rounded-sm border border-gameOrange/40 bg-gameOrange/10 transition-all duration-700 group-hover:rotate-[135deg] group-hover:border-gameOrange/60 navbar-diamond-glow" />
                <div className="absolute inset-[3px] rotate-45 rounded-sm border border-gameOrange/20 bg-gameOrange/5 transition-all duration-700 group-hover:rotate-[135deg]" />
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 md:w-6 md:h-6 text-gameOrange relative z-10 drop-shadow-[0_0_8px_rgba(255,107,0,0.6)] transition-transform duration-500 group-hover:scale-110"
                >
                  <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM12 19.5L4 15.5V8.5L12 4.5L20 8.5V15.5L12 19.5Z" fillOpacity="0.3" />
                  <path d="M12 6L8 9V15L12 18L16 15V9L12 6Z" />
                </svg>
              </div>

              <div className="flex flex-col">
                <span className="font-cinzel font-bold text-lg md:text-xl tracking-[0.2em] leading-none navbar-shimmer-text">
                  MOITRA
                </span>
                <span className="text-[0.5rem] md:text-[0.6rem] uppercase tracking-[0.4em] text-gameOrange/80 group-hover:text-gameOrange transition-colors duration-300 pl-0.5">
                  Studios
                </span>
              </div>
            </div>

            {/* ─── Desktop Navigation (xl+) — Flex layout after logo ─── */}
            <div className="hidden xl:flex flex-1 items-center justify-center gap-0 ml-8">

              {/* Left navigation links */}
              <div className="flex items-center gap-6 2xl:gap-10">
                {NAV_LINKS.slice(0, 2).map((link) => {
                  const active = getIsActive(link.href);
                  return (
                    <button
                      key={link.label}
                      onClick={() => handleNavClick(link.href)}
                      className={`relative text-[11px] 2xl:text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 py-2 group flex items-center gap-1.5 whitespace-nowrap navbar-link-hover ${active ? 'navbar-link-active' : ''}`}
                    >
                      <span className={`transition-all duration-300 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:tracking-[0.2em]'}`}>
                        {link.label}
                      </span>
                      <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full navbar-link-underline ${active ? 'bg-gameOrange shadow-[0_0_8px_rgba(255,107,0,0.5)]' : 'bg-gameOrange/70'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Center Rajneeti Logo — generous spacing */}
              <div className="mx-10 2xl:mx-16 flex-shrink-0">
                <div
                  className="navbar-float cursor-pointer"
                  onClick={() => handleNavClick('/indian-politics-game-home')}
                >
                  <img
                    src="/SplashTitle.png"
                    alt="RAJNEETI"
                    className="h-8 md:h-10 2xl:h-12 w-auto drop-shadow-[0_0_15px_rgba(255,107,0,0.4)] transition-all duration-500 hover:scale-110 hover:drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]"
                  />
                </div>
              </div>

              {/* Right navigation links */}
              <div className="flex items-center gap-6 2xl:gap-10">
                {NAV_LINKS.slice(2).map((link) => {
                  const active = getIsActive(link.href);
                  return (
                    <button
                      key={link.label}
                      onClick={() => handleNavClick(link.href)}
                      className={`relative text-[11px] 2xl:text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 py-2 group flex items-center gap-1.5 whitespace-nowrap navbar-link-hover ${active ? 'navbar-link-active' : ''}`}
                    >
                      {link.label === 'PM Interview' ? (
                        <span className={`flex items-center gap-1.5 transition-all duration-300 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:tracking-[0.2em]'}`}>
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                          {link.label}
                        </span>
                      ) : (
                        <span className={`transition-all duration-300 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:tracking-[0.2em]'}`}>
                          {link.label}
                        </span>
                      )}
                      <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full navbar-link-underline ${active ? 'bg-gameOrange shadow-[0_0_8px_rgba(255,107,0,0.5)]' : 'bg-gameOrange/70'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── Mobile/Tablet Center Title ─── */}
            <div className="xl:hidden flex-1 flex items-center justify-center">
              <div
                className="navbar-float cursor-pointer"
                onClick={() => handleNavClick('/indian-politics-game-home')}
              >
                <img
                  src="/SplashTitle.png"
                  alt="RAJNEETI"
                  className="h-7 md:h-9 w-auto drop-shadow-[0_0_12px_rgba(255,107,0,0.4)]"
                />
              </div>
            </div>

            {/* ─── Mobile Menu Toggle ─── */}
            <div className="xl:hidden flex items-center z-30 ml-auto">
              <button
                aria-label="Toggle navigation menu"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`relative p-2.5 transition-all duration-300 rounded-xl border ${
                  isMobileMenuOpen
                    ? 'bg-gameOrange/20 border-gameOrange/40 text-gameOrange'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className={`transition-transform duration-500 ${isMobileMenuOpen ? 'rotate-90' : 'rotate-0'}`}>
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* ─── Mobile Menu Overlay ─── */}
        {isMobileMenuOpen && (
          <div
            className="xl:hidden fixed inset-0 top-0 z-40"
            style={{ animation: 'navbar-slide-in 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Content */}
            <div className="relative h-full flex flex-col pt-20 md:pt-24 px-6 overflow-y-auto">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gameOrange/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-1 relative">
                {NAV_LINKS.map((link, idx) => {
                  const active = getIsActive(link.href);
                  return (
                    <button
                      key={link.label}
                      onClick={() => handleNavClick(link.href)}
                      className={`w-full text-left py-5 px-5 text-lg font-black uppercase tracking-[0.15em] rounded-2xl transition-all duration-300 flex items-center gap-3 ${
                        active
                          ? 'bg-gameOrange/10 text-gameOrange border border-gameOrange/20'
                          : 'text-white hover:bg-white/5 border border-transparent'
                      }`}
                      style={{
                        animation: `navbar-menu-stagger 0.4s cubic-bezier(0.32, 0.72, 0, 1) ${idx * 0.08}s both`,
                      }}
                    >
                      {link.label === 'PM Interview' && (
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                      )}
                      {active && (
                        <span className="w-1 h-6 bg-gameOrange rounded-full shrink-0" />
                      )}
                      {link.label}
                    </button>
                  );
                })}
              </div>

              {/* Mobile footer branding */}
              <div className="mt-auto pb-10 pt-8 text-center opacity-30">
                <span className="font-cinzel text-sm tracking-[0.3em] text-white">MOITRA STUDIOS</span>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
