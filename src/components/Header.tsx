import { useState } from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onLoginClick: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="site-header" style={{ zIndex: 9999 }}>
      <div className="header-container">
        {/* Clicking the logo always returns them here to the main landing page */}
        <Link to="/" className="logo" aria-label="Főoldal">
          <span className="logo-text">Lexipaws</span>
        </Link>
        
        {/* Hamburger Menu Toggle */}
        <button 
          className={`mobile-menu-toggle ${isMobileMenuOpen ? 'is-active' : ''}`} 
          id="mobile-menu-toggle" 
          aria-label="Menü megnyitása" 
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Nav Drawer Wrapper */}
        <div className={`nav-drawer ${isMobileMenuOpen ? 'is-active' : ''}`} id="nav-drawer">
          <nav className="main-nav" aria-label="Fő navigáció">
            <ul className="nav-list">
              <li><a href="/#levels" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>A1 Kezdő</a></li>
              <li><a href="/#levels" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>A2 Alapfok</a></li>
              <li><a href="/#levels" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>B1 Középfok</a></li>
              <li><a href="/#levels" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>B2 Haladó</a></li>
            </ul>
          </nav>

          <div className="header-actions" style={{ display: 'flex', alignItems: 'center' }}>
            {/* Language Switcher to Gateway */}
            <Link to="/gateway" className="lang-switcher" title="Nyelv megváltoztatása" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#F3F4F6', marginRight: '15px', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
              <svg viewBox="0 0 100 100" width="24" height="24">
                <clipPath id="circle-clip-nav">
                  <circle cx="50" cy="50" r="50"/>
                </clipPath>
                <g clipPath="url(#circle-clip-nav)">
                  <rect x="0" y="0" width="100" height="33.3" fill="#CE2939"/>
                  <rect x="0" y="33.3" width="100" height="33.4" fill="#FFFFFF"/>
                  <rect x="0" y="66.7" width="100" height="33.3" fill="#477050"/>
                </g>
              </svg>
            </Link>
            
            <button 
              className="btn btn-logout" 
              id="nav-auth-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLoginClick();
              }}
            >
              Bejelentkezés / Regisztráció
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
