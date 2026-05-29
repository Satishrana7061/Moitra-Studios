import React, { useEffect } from 'react';

/**
 * PopunderScript — Dynamically injects the Monetag OnClick Popunder script.
 * Should only be mounted on non-game (content, article) pages.
 */
export const PopunderScript: React.FC = () => {
  useEffect(() => {
    const zoneId = '11001020';
    const scriptSrc = 'https://al5sm.com/tag.min.js';

    // Check if script already exists in the document to prevent duplicate popunder hooks
    const existing = document.querySelector(`script[src="${scriptSrc}"]`) || 
                     Array.from(document.getElementsByTagName('script')).find(s => s.dataset.zone === zoneId);
    
    if (existing) return;

    const script = document.createElement('script');
    script.innerHTML = `(function(s){s.dataset.zone='${zoneId}',s.src='${scriptSrc}'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`;

    document.head.appendChild(script);

    return () => {
      // Remove the injected script tag to clean up when navigating away
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null; // This component doesn't render any UI
};
