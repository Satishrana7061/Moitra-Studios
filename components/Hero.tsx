
import React from 'react';
import { SectionId } from '../types';
import { Play } from 'lucide-react';
import ImageCarousel from './ImageCarousel';

const Hero: React.FC = () => {
  return (
    <section
      id={SectionId.HOME}
      className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-lokBlue-950"
    >
      {/* 1. Cinematic Background Layer */}
      <div className="absolute inset-0 z-0">
        {/* Horizontal Scrolling Carousel */}
        <ImageCarousel />
        
        {/* Vignette & Overlay for text readability - Reduced opacity for visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-lokBlue-950/70 via-lokBlue-950/30 to-lokBlue-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-40" />
      </div>

      {/* 2. Content Layer */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center pt-12">
        
        {/* Main Headline - Massive & Serif */}
        <h1 className="text-5xl md:text-8xl lg:text-9xl font-cinzel font-black text-white mb-6 leading-none tracking-tight drop-shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          RAJNEETI <br />
          {/* <span className="text-transparent bg-clip-text bg-gradient-to-b from-lokGold-400 to-lokGold-600">
            YOURS
          </span> */}
        </h1>
        
        {/* Subheadline */}
        {/* <p className="text-lg md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          Build alliances. Manipulate markets. <strong className="text-slate-200 font-bold">Control the narrative.</strong><br/>
          The next generation of political strategy for mobile is here.
        </p> */}

        {/* CTA Buttons - Sharp & Technical */}
        <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <a
            href={`#${SectionId.GAMES}`}
            className="group relative px-8 py-4 bg-lokGold-600 text-lokBlue-950 font-bold uppercase tracking-widest overflow-hidden shadow-[0_0_20px_rgba(217,119,6,0.3)] hover:shadow-[0_0_30px_rgba(217,119,6,0.5)] transition-shadow"
          >
            <span className="relative z-10 flex items-center gap-2">
              Play Now <Play size={16} className="fill-current" />
            </span>
            <div className="absolute inset-0 bg-white transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out" />
          </a>

          <a
            href={`#${SectionId.ABOUT}`}
            className="group px-8 py-4 bg-transparent border border-slate-600 text-slate-300 font-bold uppercase tracking-widest hover:border-white hover:text-white transition-all duration-300 backdrop-blur-sm"
          >
            Briefing
          </a>
        </div>
      </div>

      {/* 3. Bottom UI Elements - Gradient Fade Only */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-lokBlue-950 to-transparent z-20 pointer-events-none" />
    </section>
  );
};

export default Hero;
