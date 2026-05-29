import React, { useEffect, useRef } from 'react';

interface VignetteAdBannerProps {
  className?: string;
  zoneId?: string;
}

/**
 * VignetteAdBanner — Renders a designated container for vignette-style
 * native banner ads. The global script in index.html is removed and handled per-page;
 * this component provides the styled container and ad-network identifier.
 */
export const VignetteAdBanner: React.FC<VignetteAdBannerProps> = ({ 
  className = '',
  zoneId = '11000701'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Avoid duplicate injection on re-render
    if (containerRef.current.querySelector(`script[data-zone="${zoneId}"]`)) return;

    const script = document.createElement('script');
    script.dataset.zone = zoneId;
    script.src = 'https://n6wxm.com/vignette.min.js';
    script.async = true;
    containerRef.current.appendChild(script);

    return () => {
      // Clean up on unmount
      if (containerRef.current && script.parentNode === containerRef.current) {
        containerRef.current.removeChild(script);
      }
    };
  }, [zoneId]);

  return (
    <div
      ref={containerRef}
      id={`vignette-ad-container-${zoneId}`}
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
