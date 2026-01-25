
import React from 'react';
import { SectionId } from '../types';
import { Play } from 'lucide-react';
import ImageCarousel from './ImageCarousel';

const Hero: React.FC = () => {
  return (
    <section
      id={SectionId.HOME}
      className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-transparent"
    >
      {/* 1. Cinematic Background Layer */}
      <div className="absolute inset-0 z-0">
        {/* Scrolling Game Screenshots Carousel */}
        <ImageCarousel />

        {/* Grid Overlay for technical feel */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Vignette & Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      {/* 2. Content Layer */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center pt-12">

        {/* Main Headline - Massive & Serif */}
        <h1 className="text-5xl md:text-8xl lg:text-9xl font-cinzel font-black text-white mb-6 leading-none tracking-tight drop-shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          POWER IS <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-lokGold-400 to-lokGold-600">
            YOURS
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          Build alliances. Manipulate markets. <strong className="text-slate-200 font-bold">Control the narrative.</strong><br />
          The next generation of political strategy for mobile is here.
        </p>

        {/* CTA Buttons - Sharp & Technical */}
        <div className="flex flex-col sm:flex-row gap-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <a
            href={`#${SectionId.GAMES}`}
            className="group relative px-10 py-5 bg-gameOrange text-white font-black uppercase tracking-[0.2em] overflow-hidden border-[4px] border-black rounded-xl shadow-[0_6px_0px_#8b4513] transition-all hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-none"
          >
            <span className="relative z-10 flex items-center gap-3">
              Play Now <Play size={20} className="fill-current" />
            </span>
          </a>

          <a
            href={`#${SectionId.ABOUT}`}
            className="group px-10 py-5 bg-gameBlue text-white font-black uppercase tracking-[0.2em] border-[4px] border-black rounded-xl shadow-[0_6px_0px_#0084b4] transition-all hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-none"
          >
            Briefing
          </a>
        </div>
      </div>

      {/* 3. Bottom UI Elements - Gradient Fade Only */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent z-20 pointer-events-none" />
    </section>
  );
};

export default Hero;
