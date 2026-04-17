import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: string;
}

export const useSEO = ({ 
  title, 
  description, 
  canonical,
  ogType = 'website' 
}: SEOProps) => {
  const siteName = 'Rajneeti | Moitra Studios';
  const defaultDesc = 'Master Indian elections in Rajneeti. Build alliances, manage your party, and win the political battlefield.';
  const baseUrl = 'https://moitrastudios.com';

  useEffect(() => {
    // 1. Update Title
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    document.title = fullTitle;

    // 2. Update Meta Description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description || defaultDesc);
    }

    // 3. Update Canonical Tag (Consolidate Redirects)
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    // Always use the naked moitrastudios.com domain to fix "Page with redirect" errors
    const currentPath = window.location.pathname.replace(/^\/Moitra-Studios/, ''); // Fix for GH Pages basename if needed
    const finalCanonical = canonical || `${baseUrl}${currentPath}`;
    canonicalTag.setAttribute('href', finalCanonical);

    // 4. Update Open Graph Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description || defaultDesc);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', finalCanonical);

    const ogTypeTag = document.querySelector('meta[property="og:type"]');
    if (ogTypeTag) ogTypeTag.setAttribute('content', ogType);

  }, [title, description, canonical, ogType]);
};
