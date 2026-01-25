import React, { useState, useEffect } from 'react';
import RajneetiMap from './components/RajneetiMap';
import Navbar from './components/Navbar';
import PrivacyPolicy from './components/PrivacyPolicy';
import ContactSection from './components/ContactSection';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    // Handle browser back/forward navigation
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/privacy-policy') setCurrentPage('privacy');
      else if (path === '/contact-us') setCurrentPage('contact');
      else setCurrentPage('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderContent = () => {
    switch (currentPage) {
      case 'privacy':
        return <PrivacyPolicy onBack={() => setCurrentPage('home')} />;
      case 'contact':
        return <ContactSection />;
      default:
        return <RajneetiMap />;
    }
  };

  return (
    <div className="h-screen w-screen bg-lokBlue-950 text-white font-sans flex flex-col overflow-hidden uppercase">
      <div className={currentPage === 'home' ? 'absolute top-0 left-0 w-full z-50' : 'relative w-full z-50'}>
        <Navbar onNavigate={(page) => setCurrentPage(page)} />
      </div>
      <main className="flex-1 relative overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
