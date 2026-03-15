import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import RajneetiMap from './components/RajneetiMap';
import Navbar from './components/Navbar';
import PrivacyPolicy from './components/PrivacyPolicy';
import ContactSection from './components/ContactSection';
import RajneetiNetworkTV from './components/RajneetiNetworkTV';
import SocialCampaignsList from './components/SocialCampaignsList';
import SocialCampaignDetail from './components/SocialCampaignDetail';
import Footer from './components/Footer';

const App: React.FC = () => {
  const location = useLocation();
  const isMapPage = location.pathname === '/' || location.pathname === '/indian-politics-game-home' || !['/', '/indian-politics-game-home', '/privacy-policy', '/contact-us', '/rajneeti-tv-network'].includes(location.pathname);
  const showFooter = !isMapPage;

  return (
    <div className="h-[100dvh] w-screen bg-lokBlue-950 text-white font-sans flex flex-col overflow-hidden uppercase">
      <div className="relative w-full z-50">
        <Navbar />
      </div>
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
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
        {showFooter && <Footer />}
      </main>
    </div>
  );
};

export default App;

