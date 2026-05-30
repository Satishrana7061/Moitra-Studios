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
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!adRef.current || injectedRef.current) return;

    // Mark as injected to prevent duplicate scripts on re-render
    injectedRef.current = true;

    // Method 1: Direct script tag with data-zone attribute
    const script = document.createElement('script');
    script.async = true;
    script.dataset.zone = zoneId;
    script.src = 'https://nap5k.com/tag.min.js';
    
    adRef.current.appendChild(script);

    return () => {
      // Cleanup on unmount
      injectedRef.current = false;
    };
  }, [zoneId]);

  return (
    <div
      ref={adRef}
      className={`min-h-[50px] w-full flex items-center justify-center bg-white/5 border border-white/5 rounded-lg overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
};
