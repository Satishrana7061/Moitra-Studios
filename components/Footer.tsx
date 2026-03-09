
import React from 'react';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STUDIO_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-lokBlue-900/80 border-t border-slate-800/50 pt-10 pb-6 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Brand — matching header logo */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-3">
              {/* Diamond Logo — same as Navbar */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-gameOrange/20 rotate-45 transform border border-gameOrange/30"></div>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 text-gameOrange relative z-10 drop-shadow-[0_0_5px_rgba(255,107,0,0.5)]"
                >
                  <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM12 19.5L4 15.5V8.5L12 4.5L20 8.5V15.5L12 19.5Z" fillOpacity="0.3" />
                  <path d="M12 6L8 9V15L12 18L16 15V9L12 6Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-cinzel font-bold text-lg tracking-[0.2em] text-white leading-none">
                  MOITRA
                </span>
                <span className="text-[0.5rem] uppercase tracking-[0.4em] text-gameOrange pl-0.5">
                  Studios
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed text-center md:text-left normal-case">
              Crafting immersive Indian political strategy games. Experience the thrill of election campaigns and political simulations.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center">
            <h4 className="text-[10px] font-black text-gameOrange uppercase tracking-[0.3em] mb-4">Quick Links</h4>
            <div className="flex flex-col items-center gap-2">
              <Link to="/indian-politics-game-home" className="text-slate-400 hover:text-white text-xs transition-colors uppercase tracking-wider">Home</Link>
              <Link to="/rajneeti-tv-network" className="text-slate-400 hover:text-white text-xs transition-colors uppercase tracking-wider">Rajneeti TV Network</Link>
              <Link to="/privacy-policy" className="text-slate-400 hover:text-white text-xs transition-colors uppercase tracking-wider">Privacy Policy</Link>
              <Link to="/contact-us" className="text-slate-400 hover:text-white text-xs transition-colors uppercase tracking-wider">Contact Us</Link>
            </div>
          </div>

          {/* Download & Contact */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <a
              href="https://play.google.com/store/apps/details?id=com.rajneeti"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-black/50 hover:bg-black/70 border border-white/10 px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gameOrange" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a2.203 2.203 0 01-.61-1.511V3.325c0-.573.22-1.092.61-1.511zM14.502 12.71l2.583 2.583-9.524 5.49a2.189 2.189 0 01-1.353.284l8.294-8.357zM17.839 12.427L20.8 10.71c.73-.418.73-1.482 0-1.9L17.84 7.093l-3.34 3.341 3.339 1.993zM14.502 11.29l-8.293-8.357a2.189 2.189 0 011.353.284l9.524 5.49-2.584 2.583z" />
              </svg>
              <div className="flex flex-col items-start leading-none gap-[1px]">
                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Get it on</span>
                <span className="text-sm font-black text-white tracking-tight">Google Play</span>
              </div>
            </a>
            <a href={`mailto:${STUDIO_INFO.email}`} className="flex items-center gap-2 text-slate-400 hover:text-gameOrange text-xs transition-colors">
              <Mail className="w-4 h-4" />
              <span className="normal-case">{STUDIO_INFO.email}</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800/50 pt-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-slate-600 text-[10px] uppercase tracking-wider">
            &copy; {new Date().getFullYear()} {STUDIO_INFO.name}. All rights reserved.
          </p>
          <p className="text-slate-700 text-[10px] uppercase tracking-wider">
            Owned & Operated by {STUDIO_INFO.legalName}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
