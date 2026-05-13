import React, { useEffect, useRef } from 'react';

interface MonetagBannerProps {
  zoneId: string;
  className?: string;
}

/**
 * MonetagBanner — Renders a placement-based Monetag ad (like In-Page Push).
 * This component injects the specific zone script into its container.
 */
export const MonetagBanner: React.FC<MonetagBannerProps> = ({ zoneId, className = '' }) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adRef.current) return;

    // Avoid duplicate script injection
    if (adRef.current.querySelector(`script[data-zone="${zoneId}"]`)) return;

    const script = document.createElement('script');
    script.dataset.zone = zoneId;
    // In-Page Push specific source as provided by user
    script.src = 'https://nap5k.com/tag.min.js';
    script.async = true;
    
    // Using the user's specific execution pattern for In-Page Push
    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `(function(s){s.dataset.zone='${zoneId}',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`;

    adRef.current.appendChild(inlineScript);

    return () => {
      // Cleanup on unmount if needed
    };
  }, [zoneId]);

  return (
    <div
      ref={adRef}
      className={`relative bg-slate-900/50 border border-white/5 rounded-xl flex items-center justify-center overflow-hidden min-h-[100px] ${className}`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0 opacity-20 pointer-events-none">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white font-bold">Sponsored Content</span>
      </div>
    </div>
  );
};
