import React, { useEffect, useRef } from 'react';

interface VignetteAdBannerProps {
  className?: string;
}

/**
 * VignetteAdBanner — Renders a designated container for vignette-style
 * native banner ads (zone 11000701). The global script in index.html
 * handles the actual ad delivery; this component provides the styled
 * container and ad-network identifier for in-page banner placements.
 */
export const VignetteAdBanner: React.FC<VignetteAdBannerProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inject a secondary zone-scoped script instance into this container
    // so the ad network can target this specific placement.
    if (!containerRef.current) return;

    // Avoid duplicate injection on re-render
    if (containerRef.current.querySelector('script[data-zone="11000701"]')) return;

    const script = document.createElement('script');
    script.dataset.zone = '11000701';
    script.src = 'https://n6wxm.com/vignette.min.js';
    script.async = true;
    containerRef.current.appendChild(script);

    return () => {
      // Clean up on unmount
      if (containerRef.current && script.parentNode === containerRef.current) {
        containerRef.current.removeChild(script);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="vignette-ad-container"
      className={`relative w-full min-h-[90px] rounded-xl overflow-hidden border border-white/5 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center ${className}`}
    >
      {/* Subtle branding while ad loads */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-bold">
          Sponsored
        </span>
      </div>
    </div>
  );
};
