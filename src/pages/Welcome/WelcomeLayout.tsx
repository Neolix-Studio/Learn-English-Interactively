import { Outlet, useNavigate } from 'react-router-dom';
import { LexiAnimation } from '../../components/LexiAnimation';
import { AuthModal } from '../../components/AuthModal';
import { useState } from 'react';

export function WelcomeLayout() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleSkip = () => {
    setIsAuthModalOpen(true);
  };

  const handleAuthClose = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f9fafb' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '600px', width: '100%', background: 'white', borderRadius: '24px', padding: '3rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center', position: 'relative' }}>
          
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
            <LexiAnimation />
          </div>

          <Outlet />

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px solid #f3f4f6' }}>
            <button 
              onClick={handleSkip}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
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
