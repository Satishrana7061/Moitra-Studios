import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import GamesSection from './components/GamesSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';

const App: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-lokBlue-900">
      <Navbar onNavigate={(page: string) => navigate(page === 'privacy' ? '/privacy' : '/')} />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={
            <>
              <Hero />
              <GamesSection />
              {/* Royal Advisor Removed */}
              <AboutSection />
              <ContactSection />
            </>
          } />
          <Route path="/privacy" element={<PrivacyPolicy onBack={() => navigate('/')} />} />
        </Routes>
      </main>

      <Footer onNavigate={(page: string) => navigate(page === 'privacy' ? '/privacy' : '/')} />
    </div>
  );
};

export default App;