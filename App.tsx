
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import GamesSection from './components/GamesSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';

const App: React.FC = () => {
  // Sync page state with URL path
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    return path === '/privacy-policy' ? 'privacy' : 'home';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPage(path === '/privacy-policy' ? 'privacy' : 'home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page: string) => {
    if (page === 'privacy') {
      window.history.pushState({}, '', '/privacy-policy');
      setCurrentPage('privacy');
    } else {
      window.history.pushState({}, '', '/');
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
