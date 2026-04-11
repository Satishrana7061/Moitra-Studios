import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface AdBannerProps {
  layoutArea: 'sidebar' | 'leaderboard' | 'interstitial' | 'skyscraper';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ layoutArea, className = '' }) => {
  // TODO: When Google AdSense is approved, uncomment the useEffect logic below to initialize ads correctly.
  /*
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("AdSense error", e);
    }
  }, []);
  */

  const dimensions = {
    sidebar: 'w-full h-[250px]',
    leaderboard: 'w-full h-[90px] md:h-[120px]',
    interstitial: 'w-full h-[300px] md:h-[400px]',
    skyscraper: 'w-full h-full min-h-[300px]',
  };

  const adStyles = dimensions[layoutArea];

  return (
    <div className={`relative bg-slate-900 border border-white/5 rounded-xl flex flex-col items-center justify-center overflow-hidden group ${adStyles} ${className}`}>
      
      {/* 
        =====================================================================
        HOW TO IMPLEMENT GOOGLE ADSENSE:
        Once your AdSense account is approved, replace this entire <div className="absolute inset-0..."> 
        with the snippet provided by Google. It should look something like this:

        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
             data-ad-slot="1234567890"
             data-ad-format="auto"
             data-full-width-responsive="true" />
        =====================================================================
      */}
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-gradient-to-br from-slate-900/80 to-black/80">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-2">Advertisement Placeholder</span>
        {layoutArea === 'interstitial' ? (
           <>
              <h3 className="text-xl md:text-2xl font-rajdhani font-bold text-white/50 mb-2">Sponsors Keep Us Live</h3>
              <p className="text-slate-500 text-xs md:text-sm max-w-sm">
                Advertisements placed here will fund the development of the Rajneeti platform.
              </p>
           </>
        ) : (
           <AlertCircle className="w-6 h-6 text-white/20 mb-2 group-hover:scale-110 transition-transform" />
        )}
      </div>

      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
    </div>
  );
};
