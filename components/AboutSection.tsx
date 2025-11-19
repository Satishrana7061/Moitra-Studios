
import React from 'react';
import { SectionId } from '../types';
import { Target, Users, Zap, MapPin } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

const AboutSection: React.FC = () => {
  return (
    <section id={SectionId.ABOUT} className="py-24 bg-lokBlue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Crafting Worlds of <span className="text-lokGreen-500">Strategy</span>
            </h2>
            <p className="text-slate-400 text-lg mb-6 leading-relaxed">
              Founded in 2023, <strong>{STUDIO_INFO.name}</strong> began as a mission to bring depth back to mobile gaming. 
              We believe strategy games shouldn't just be about clicking buttons—they should be about 
              making hard choices, managing consequences, and outsmarting your rivals.
            </p>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              From the political intrigue of <em>Rajneeti</em> to our upcoming global warfare titles, 
              we combine classic 4X mechanics with modern, accessible UX.
            </p>

            {/* Legal Info Block */}
            <div className="mb-8 p-4 border-l-2 border-slate-700 bg-slate-800/30">
               <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Owned & Operated By</p>
               <p className="text-slate-300 font-semibold">{STUDIO_INFO.legalName}</p>
               <div className="flex items-start gap-2 mt-2 text-slate-400 text-sm">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{STUDIO_INFO.address}</span>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="bg-slate-800 p-3 rounded-lg h-fit">
                  <Target className="text-lokGold-400 w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Deep Mechanics</h4>
                  <p className="text-sm text-slate-500">Complex systems, simple controls.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-slate-800 p-3 rounded-lg h-fit">
                  <Users className="text-lokGreen-500 w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Player First</h4>
                  <p className="text-sm text-slate-500">No pay-to-win walls, just skill.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-slate-800 p-3 rounded-lg h-fit">
                  <Zap className="text-blue-500 w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Smart AI</h4>
                  <p className="text-sm text-slate-500">Responsive opponents that adapt to you.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="absolute inset-0 bg-lokGold-500 rounded-2xl transform rotate-3 opacity-20"></div>
            {/* Updated Image: A modern, cinematic gaming/developer setup with purple/blue lighting */}
            <img 
              src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2670&auto=format&fit=crop" 
              alt="Studio Workspace" 
              className="relative rounded-2xl shadow-2xl border border-slate-700 w-full grayscale-[30%] hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute bottom-8 left-8 bg-lokBlue-900/90 backdrop-blur p-4 rounded-lg border border-slate-600 shadow-xl">
               <div className="text-4xl font-bold text-white">10k+</div>
               <div className="text-sm text-slate-400 uppercase tracking-widest">Active Players</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutSection;
