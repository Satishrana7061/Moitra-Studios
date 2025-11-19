import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../constants';

interface NavbarProps {
  onNavigate: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (page: string, href: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
    // Slight delay to allow view change before scrolling if needed
    if (page === 'home') {
      setTimeout(() => {
        const element = document.querySelector(href);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-lokBlue-950/90 backdrop-blur-md border-b border-white/5 py-2 shadow-lg' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <div 
            className="flex-shrink-0 flex items-center gap-3 cursor-pointer group" 
            onClick={() => handleNavClick('home', '#home')}
          >
            {/* Custom Moitra Logo SVG */}
            <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-lokGold-500/20 rotate-45 transform transition-transform group-hover:rotate-90 duration-500 border border-lokGold-500/30"></div>
                <svg 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-8 h-8 text-lokGold-500 relative z-10 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]"
                >
                   <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM12 19.5L4 15.5V8.5L12 4.5L20 8.5V15.5L12 19.5Z" fillOpacity="0.3"/>
                   <path d="M12 6L8 9V15L12 18L16 15V9L12 6Z" />
                </svg>
            </div>

            <div className="flex flex-col">
              <span className="font-cinzel font-bold text-xl tracking-[0.2em] text-white leading-none group-hover:text-lokGold-200 transition-colors">
                MOITRA
              </span>
              <span className="text-[0.6rem] uppercase tracking-[0.4em] text-lokGold-500 group-hover:text-lokGold-400 transition-colors pl-0.5">
                Studios
              </span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-12">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.page, link.href)}
                  className="relative text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors duration-300 py-2 group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-lokGold-500 transition-all duration-300 group-hover:w-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-lokBlue-950 border-b border-slate-800 animate-fade-in">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.page, link.href)}
                className="w-full text-left text-slate-300 hover:text-lokGold-400 block px-3 py-4 text-sm font-bold uppercase tracking-widest border-b border-slate-800/50"
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