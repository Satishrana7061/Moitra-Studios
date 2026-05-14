import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface AdBannerProps {
  layoutArea: 'sidebar' | 'leaderboard' | 'interstitial' | 'skyscraper';
  className?: string;
  dataAdSlot?: string;
}

// Add the window.adsbygoogle type to avoid TS errors
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({ layoutArea, className = '', dataAdSlot }) => {
  useEffect(() => {
    // Only push if there's a live slot and ad slot is provided
    if (dataAdSlot) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e: any) {
        if (e && e.message && e.message.includes("All 'ins' elements")) {
          // ignore React 18 strict mode duplicate push error
        } else {
          console.warn("AdSense error", e);
        }
      }
    }
  }, [dataAdSlot]);

  const dimensions = {
    sidebar: 'w-full h-[250px]',
    leaderboard: 'w-full h-[90px] md:h-[120px]',
    interstitial: 'w-full h-[300px] md:h-[400px]',
    skyscraper: 'w-full h-full min-h-[300px]',
  };

  const adStyles = dimensions[layoutArea];

  // If a dataAdSlot is provided, we transition to a live AdSense renderer
  if (dataAdSlot) {
    return (
      <div className={`relative flex flex-col items-center justify-center overflow-hidden container-ad ${adStyles} ${className}`}>
        <ins className="adsbygoogle w-full h-full"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-5388311417259055"
             data-ad-slot={dataAdSlot}
             data-ad-format="auto"
             data-full-width-responsive="true" />
      </div>
    );
  }

  // Otherwise fallback to Monetag
  return (
    <div className={`relative bg-slate-900 border border-white/5 rounded-xl flex flex-col items-center justify-center overflow-hidden group ${adStyles} ${className}`}>
      <MonetagBanner zoneId="11007318" className="w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white font-bold mb-2">Advertisement</span>
        <AlertCircle className="w-6 h-6 text-white mb-2" />
      </div>
    </div>
  );
};
