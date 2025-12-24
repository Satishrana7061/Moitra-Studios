
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import GamesSection from './components/GamesSection';
import AboutSection from './components/AboutSection';
import StrategyTipGenerator from './components/StrategyTipGenerator';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';

const App: React.FC = () => {
  // Use hash for routing to ensure compatibility with GitHub Pages
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash;
    return hash === '#privacy-policy' ? 'privacy' : 'home';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setCurrentPage(hash === '#privacy-policy' ? 'privacy' : 'home');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: string) => {
    if (page === 'privacy') {
      window.location.hash = 'privacy-policy';
      setCurrentPage('privacy');
    } else {
      window.location.hash = '';
      setCurrentPage('home');
    }
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-lokBlue-900">
      <Navbar onNavigate={navigateTo} />
      
      <main className="flex-grow">
        {currentPage === 'home' ? (
          <>
            <Hero />
            <GamesSection />
            <StrategyTipGenerator />
            <AboutSection />
            <ContactSection />
          </>
        ) : (
          <PrivacyPolicy onBack={() => navigateTo('home')} />
        )}
      </main>

      <Footer onNavigate={navigateTo} />
    </div>
  );
};

export default App;
