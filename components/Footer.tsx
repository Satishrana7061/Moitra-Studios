
import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

interface FooterProps {
  onNavigate: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-lokBlue-900 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        
        <div className="flex items-center gap-2 mb-6">
           <Gamepad2 className="h-6 w-6 text-slate-500" />
           <span className="font-bold text-lg text-slate-500 uppercase">
              MOITRA<span className="text-slate-600">STUDIOS</span>
            </span>
        </div>

        <div className="flex space-x-8 mb-8">
          <button onClick={() => onNavigate('home')} className="text-slate-400 hover:text-lokGold-400 text-sm transition-colors">Home</button>
          <button onClick={() => { onNavigate('home'); setTimeout(() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="text-slate-400 hover:text-lokGold-400 text-sm transition-colors">Games</button>
          <button onClick={() => onNavigate('privacy')} className="text-slate-400 hover:text-lokGold-400 text-sm transition-colors">Privacy Policy</button>
        </div>

        <div className="text-center">
          <p className="text-slate-600 text-sm mb-2">
            &copy; {new Date().getFullYear()} {STUDIO_INFO.name}. All rights reserved.
          </p>
          <p className="text-slate-700 text-xs uppercase tracking-wider mb-1">
            Owned & Operated by {STUDIO_INFO.legalName}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
