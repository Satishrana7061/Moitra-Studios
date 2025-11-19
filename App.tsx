import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import GamesSection from './components/GamesSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div className="min-h-screen flex flex-col bg-lokBlue-900">
      <Navbar onNavigate={setCurrentPage} />
      
      <main className="flex-grow">
        {currentPage === 'home' ? (
          <>
            <Hero />
            <GamesSection />
            {/* Royal Advisor Removed */}
            <AboutSection />
            <ContactSection />
          </>
        ) : (
          <PrivacyPolicy onBack={() => setCurrentPage('home')} />
        )}
      </main>

      <Footer onNavigate={setCurrentPage} />
    </div>
  );
};

export default App;