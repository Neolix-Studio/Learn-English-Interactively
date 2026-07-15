import { Outlet } from 'react-router-dom';
import { LexiAnimation } from '../../components/LexiAnimation';
import { AuthModal } from '../../components/AuthModal';
import { useState } from 'react';

export function WelcomeLayout() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSkip = () => {
    setIsAuthModalOpen(true);
  };

  const handleAuthClose = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <div className="welcome-layout">
      <main className="welcome-main">
        <div className="welcome-card">
          
          <div className="welcome-mascot">
            <LexiAnimation />
          </div>

          <Outlet />

          <div className="welcome-auth-link">
            <button 
              onClick={handleSkip}
              className="welcome-link-button"
            >
              Már van profilom (Bejelentkezés)
            </button>
          </div>
        </div>
      </main>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={handleAuthClose} />
    </div>
  );
}
