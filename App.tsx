import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RajneetiMap from './components/RajneetiMap';
import Navbar from './components/Navbar';
import PrivacyPolicy from './components/PrivacyPolicy';
import ContactSection from './components/ContactSection';
import RajneetiNetworkTV from './components/RajneetiNetworkTV';

const App: React.FC = () => {
  return (
    <div className="h-screen w-screen bg-lokBlue-950 text-white font-sans flex flex-col overflow-hidden uppercase">
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
          <Route path="*" element={<RajneetiMap />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
