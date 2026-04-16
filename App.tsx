import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Code-split heavy pages for faster initial load
import RajneetiMap from './components/RajneetiMap';
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const ContactSection = lazy(() => import('./components/ContactSection'));
const RajneetiNetworkTV = lazy(() => import('./components/RajneetiNetworkTV'));
const SocialCampaignsList = lazy(() => import('./components/SocialCampaignsList'));
const SocialCampaignDetail = lazy(() => import('./components/SocialCampaignDetail'));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-950">
    <div className="w-10 h-10 border-2 border-gameOrange/20 border-t-gameOrange rounded-full animate-spin" />
  </div>
);

const ScrollToTop = ({ mainRef }: { mainRef: React.RefObject<HTMLElement> }) => {
  const { pathname } = useLocation();
  useEffect(() => {
    const resetScroll = () => {
      if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    resetScroll();
    // Second pass to catch after Suspense finishes rendering the lazy chunk
    const timer = setTimeout(resetScroll, 50);
    return () => clearTimeout(timer);
  }, [pathname, mainRef]);
  
  return null;
};

const App: React.FC = () => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isMapPage = location.pathname === '/' || location.pathname === '/indian-politics-game-home';

  return (
    <div className="h-[100dvh] w-screen bg-lokBlue-950 text-white font-sans flex flex-col overflow-hidden">
      <ScrollToTop mainRef={mainRef} />
      <div className={`${isMapPage ? 'absolute top-0' : 'relative'} w-full z-50`}>
        <Navbar />
      </div>
      <main
        ref={mainRef}
        className="flex-1 w-full relative overflow-y-auto overflow-x-hidden"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RajneetiMap />} />
            <Route path="/indian-politics-game-home" element={<RajneetiMap />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy onBack={() => window.history.back()} />} />
            <Route path="/contact-us" element={<ContactSection />} />
            <Route path="/rajneeti-tv-network" element={<RajneetiNetworkTV />} />
            <Route path="/social-campaign" element={<SocialCampaignsList />} />
            <Route path="/social-campaign/:id" element={<SocialCampaignDetail />} />
            <Route path="*" element={<RajneetiMap />} />
          </Routes>
        </Suspense>
        <Footer />
      </main>
    </div>
  );
};

export default App;

