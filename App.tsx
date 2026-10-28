import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSEO } from './hooks/useSEO';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import StudioHome from './components/StudioHome';

// The studio's site (28 Oct 2026): the home page, one page per game, and the pages the app
// stores ask for. Game pages are code-split.
const GeoPoliticsPage = lazy(() => import('./components/GeoPoliticsPage'));
const RajneetiPage = lazy(() => import('./components/RajneetiPage'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const ContactSection = lazy(() => import('./components/ContactSection'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-screen" style={{ background: '#0d0c10' }}>
    <div className="w-10 h-10 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
  </div>
);

const ScrollToTop = ({ mainRef }: { mainRef: React.RefObject<HTMLElement> }) => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const reset = () => {
      // A link to a section (#player-information) scrolls there; anything else starts at the top.
      const target = hash ? document.getElementById(hash.slice(1)) : null;
      if (target) { target.scrollIntoView({ behavior: 'auto' }); return; }
      if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    reset();
    // Second pass to catch after Suspense finishes rendering the lazy chunk
    const timer = setTimeout(reset, 120);
    return () => clearTimeout(timer);
  }, [pathname, hash, mainRef]);
  return null;
};

const App: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);

  // Global SEO Defaults
  useSEO({});

  return (
    <div className="w-screen text-white font-sans flex flex-col min-h-screen" style={{ background: '#0d0c10' }}>
      <ScrollToTop mainRef={mainRef} />
      <div className="fixed top-0 left-0 right-0 w-full z-50">
        <Navbar />
      </div>
      <main ref={mainRef} className="w-full flex-1 flex flex-col" style={{ paddingTop: 68 }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<StudioHome />} />
            <Route path="/geopolitics" element={<GeoPoliticsPage />} />
            <Route path="/rajneeti" element={<RajneetiPage />} />
            <Route path="/indian-politics-game-home" element={<RajneetiPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy onBack={() => window.history.back()} />} />
            <Route path="/contact-us" element={<ContactSection />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="*" element={<StudioHome />} />
          </Routes>
        </Suspense>
        <Footer />
      </main>
    </div>
  );
};

export default App;
