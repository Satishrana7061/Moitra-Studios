import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../constants';

interface NavbarProps {
  onNavigate: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (page: string, href: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);

    // Update URL using History API for clean paths
    window.history.pushState({}, '', href);
    // Dispatch a custom event so other components can listen for navigation changes
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    // Handle initial path load
    const path = window.location.pathname;
    // Handle root path / defaulting to home but maintaining URL
    if (path === '/' || path === '/home') {
      onNavigate('home');
      if (path === '/') window.history.replaceState({}, '', '/home');
    }
    else if (path === '/privacy-policy') onNavigate('privacy');
    else if (path === '/contact-us') onNavigate('contact');
    else onNavigate('home');
  }, []);

  return (
    <nav
      className={`relative w-full z-50 transition-all duration-500 ${isScrolled
        ? 'bg-lokBlue-950/90 backdrop-blur-md border-b border-white/5 py-2 shadow-lg'
        : 'bg-transparent py-4'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <div
            className="flex-shrink-0 flex items-center gap-2 md:gap-3 cursor-pointer group"
            onClick={() => handleNavClick('home', '/home')}
          >
            {/* Custom Moitra Logo SVG */}
            <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gameOrange/20 rotate-45 transform transition-transform group-hover:rotate-90 duration-500 border border-gameOrange/30"></div>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 md:w-8 md:h-8 text-gameOrange relative z-10 drop-shadow-[0_0_5px_rgba(255,107,0,0.5)]"
              >
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM12 19.5L4 15.5V8.5L12 4.5L20 8.5V15.5L12 19.5Z" fillOpacity="0.3" />
                <path d="M12 6L8 9V15L12 18L16 15V9L12 6Z" />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="font-cinzel font-bold text-lg md:text-xl tracking-[0.2em] text-white leading-none group-hover:text-lokGold-200 transition-colors">
                MOITRA
              </span>
              <span className="text-[0.5rem] md:text-[0.6rem] uppercase tracking-[0.4em] text-gameOrange group-hover:text-gameYellow transition-colors pl-0.5">
                Studios
              </span>
            </div>
          </div>

          {/* Desktop/iPad Menu Logo */}
          <div className="hidden sm:flex items-center absolute left-1/2 -translate-x-1/2">
            <div className="origin-top animate-hinge-swing group-hover:pause">
              <img
                src="SplashTitle.png"
                alt="RAJNEETI"
                className="h-8 md:h-12 w-auto drop-shadow-[0_0_10px_rgba(255,107,0,0.3)] transition-transform hover:scale-110"
              />
            </div>
          </div>

          {/* Desktop Links */}
          <div className="hidden lg:block">
            <div className="ml-10 flex items-baseline space-x-10 lg:space-x-12">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.page, link.href)}
                  className="relative text-slate-400 hover:text-white text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors duration-300 py-2 group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gameOrange transition-all duration-300 group-hover:w-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Mobile/iPad Menu Button */}
          <div className="lg:hidden flex">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2 transition-colors border border-white/5 rounded-lg bg-white/5"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5 md:h-6 md:w-6" /> : <Menu className="h-5 w-5 md:h-6 md:w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[60px] md:top-[80px] bottom-0 z-50 bg-slate-950/95 backdrop-blur-2xl animate-fade-in flex flex-col">
          <div className="overflow-y-auto px-6 py-8 space-y-4">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.page, link.href)}
                className="w-full text-left text-white hover:text-gameOrange block py-5 text-lg font-black uppercase tracking-[0.2em] border-b border-white/5 transition-all active:scale-95 active:bg-white/5 rounded-xl px-4"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
