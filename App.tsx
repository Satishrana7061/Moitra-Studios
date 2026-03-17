import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Code-split heavy pages for faster initial load
const RajneetiMap = lazy(() => import('./components/RajneetiMap'));
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

const App: React.FC = () => {
  const location = useLocation();
  const isMapPage = location.pathname === '/' || location.pathname === '/indian-politics-game-home';

  return (
    <div className="h-[100dvh] w-screen bg-lokBlue-950 text-white font-sans flex flex-col overflow-hidden">
      <div className={`${isMapPage ? 'absolute top-0' : 'relative'} w-full z-50`}>
        <Navbar />
      </div>
      <main
        className="flex-1 w-full relative overflow-y-auto overflow-x-hidden"
        style={{ scrollBehavior: 'smooth' }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RajneetiMap />} />
            <Route path="/indian-politics-game-home" element={<RajneetiMap />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy onBack={() => window.history.back()} />} />
            <Route path="/contact-us" element={<ContactSection />} />
            <Route path="/rajneeti-tv-network" element={<RajneetiNetworkTV />} />
            <Route path="/social-campaigns" element={<SocialCampaignsList />} />
            <Route path="/social-campaigns/:id" element={<SocialCampaignDetail />} />
            <Route path="*" element={<RajneetiMap />} />
          </Routes>
        </Suspense>
        <Footer />
      </main>
    </div>
  );
};

export default App;

