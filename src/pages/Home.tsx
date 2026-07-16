import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AuthModal } from '../components/AuthModal';
import { LexiAnimation } from '../components/LexiAnimation';
import { useUser } from '../context/UserContext';
import { api } from '../utils/api';

const betaRequestFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem'
};

const betaRequestLabelStyle: CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--color-text-muted)'
};

const betaRequestControlStyle: CSSProperties = {
  background: 'var(--color-bg-base)',
  border: '1px solid var(--color-text-muted)',
  borderRadius: '8px',
  color: 'var(--color-text-main)',
  padding: '0.8rem 1rem',
  outline: 'none',
  fontSize: '16px',
  minHeight: '48px',
  width: '100%',
  boxSizing: 'border-box'
};

function BetaRequestField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div style={betaRequestFieldStyle}>
      <label htmlFor={id} style={betaRequestLabelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWipModalOpen, setIsWipModalOpen] = useState(false);
  const [isBetaRequestOpen, setIsBetaRequestOpen] = useState(false);
  const [betaRequestName, setBetaRequestName] = useState('');
  const [betaRequestEmail, setBetaRequestEmail] = useState('');
  const [betaRequestMessage, setBetaRequestMessage] = useState('');
  const [betaRequestStatus, setBetaRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [betaRequestError, setBetaRequestError] = useState('');
  const currentSearch = window.location.search;
  const searchParams = new URLSearchParams(currentSearch);
  const inviteCode = searchParams.get('invite') || '';
  const inviteEmail = searchParams.get('email') || '';
  const shouldOpenLogin = searchParams.get('login') === 'true';
  const { data, isGuest, isLoading } = useUser();
  const isAuthenticated = !isLoading && !isGuest;

  const openAuthModal = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      localStorage.removeItem("forceRegisterModal");
      localStorage.removeItem("forceBetaRequestModal");
      setIsAuthModalOpen(false);
      return;
    }

    if (inviteCode) {
      setIsAuthModalOpen(true);
      return;
    }

    if (localStorage.getItem("forceRegisterModal") === "true" || localStorage.getItem("forceBetaRequestModal") === "true") {
      setIsBetaRequestOpen(true);
      localStorage.removeItem("forceRegisterModal");
      localStorage.removeItem("forceBetaRequestModal");
    }

    if (shouldOpenLogin) {
      setIsAuthModalOpen(true);
    }
  }, [isAuthenticated, isLoading, inviteCode, shouldOpenLogin]);

  const handleBetaRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBetaRequestStatus('loading');
    setBetaRequestError('');

    const hostname = window.location.hostname;
    const baseLanguage = hostname.endsWith('.sk') ? 'sk' : 'hu';

    const response = await api.fetch('request_beta_access', {
      name: betaRequestName,
      email: betaRequestEmail,
      message: betaRequestMessage,
      base_language: baseLanguage,
      source_path: window.location.pathname
    });

    if (response?.success) {
      setBetaRequestStatus('success');
      return;
    }

    setBetaRequestStatus('error');
    setBetaRequestError(response?.error || 'Nem sikerült elküldeni a kérelmet. Kérjük, próbáld újra később.');
  };

  const closeBetaRequestModal = () => {
    setIsBetaRequestOpen(false);
    setBetaRequestStatus('idle');
    setBetaRequestError('');
  };

  return (
    <>
      <SEO 
        title="Online Angol Nyelvtanulás Magyaroknak | Neolix"
        description="Tanulj angolul egyszerűen, a saját tempódban! Magyar nyelvű nyelvtani magyarázatok, gyakorlati feladatok és szintfelmérő tesztek."
        canonicalPath="/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Neolix Angol Nyelvtanulás",
          "url": "https://lexipaws.eu"
        }}
      />
      <Header onLoginClick={openAuthModal} />
      
      <main style={{ marginTop: '70px' }}>
        <section className="hero-section" style={{ position: 'relative', zIndex: 1000 }}>
          <div className="hero-container">
            <div className="hero-text-content">
              <h1 className="hero-title">Tanulj angolul <span>egyszerűen</span>, a saját tempódban!</h1>
              <p className="hero-subtitle">Magyar nyelvű nyelvtani magyarázatok, gyakorlati feladatok és szintfelmérő tesztek. Minden egy helyen, ami a magabiztos nyelvtudáshoz kell.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px', margin: '0 auto', marginTop: '2rem' }}>
                {isAuthenticated ? (
                  <>
                    <p className="hero-user-welcome">Szia, {data.username}!</p>
                    <Link to="/dashboard" className="btn-start" style={{ width: '100%', textAlign: 'center' }}>Vissza a felületre</Link>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsBetaRequestOpen(true)} className="btn-secondary" style={{ width: '100%', padding: '1rem 2.5rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '16px', border: '2px solid var(--color-accent-in)', background: 'var(--color-bg-base)', color: 'var(--color-accent-in)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      Béta hozzáférés kérése
                    </button>
                    <button onClick={openAuthModal} className="btn-secondary" style={{ width: '100%', padding: '1rem 2.5rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '16px', border: '2px solid var(--color-bg-base)', background: 'var(--color-bg-surface)', color: 'var(--color-text-main)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      Már van profilom
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <LexiAnimation />
          </div>
        </section>

        <section id="levels" className="levels-section">
          <h2 className="section-title">Válaszd ki a szinted, és kezdd el a tanulást!</h2>
          
          <div className="cards-grid">
            <article className="level-card border-a1">
              <header className="card-header">
                <span className="level-badge badge-a1">A1</span>
                <h3>A1 – Kezdő szint</h3>
              </header>
              <p className="card-description">Teljesen az alapoktól indulunk. Megtanulod a betűzést, a számokat, a legegyszerűbb mondatszerkezeteket és az alapvető kifejezéseket.</p>
              <footer className="card-footer">
                {isAuthenticated ? (
                  <Link to="/dashboard" className="btn-card landing-level-btn">Belépés az A1 tananyaghoz</Link>
                ) : (
                  <button type="button" onClick={openAuthModal} className="btn-card landing-level-btn">Belépés az A1 tananyaghoz</button>
                )}
              </footer>
            </article>

            <article className="level-card border-a2">
              <header className="card-header">
                <span className="level-badge badge-a2">A2</span>
                <h3>A2 – Alapfok</h3>
              </header>
              <p className="card-description">Képes leszel egyszerű, mindennapi témákról beszélgetni. Megtanulod a legfontosabb múlt és jövő időket, illetve a mindennapi szófordulatokat.</p>
              <footer className="card-footer">
                <a href="#" onClick={(e) => { e.preventDefault(); setIsWipModalOpen(true); }} className="btn-card landing-level-btn">Belépés az A2 tananyaghoz</a>
              </footer>
            </article>

            <article className="level-card border-b1">
              <header className="card-header">
                <span className="level-badge badge-b1">B1</span>
                <h3>B1 – Küszöbszint</h3>
              </header>
              <p className="card-description">Utazás során már könnyedén feltalálod magad. Megérted a bonyolultabb nyelvtani összefüggéseket, és hosszabb szövegeket is képes leszel feldolgozni.</p>
              <footer className="card-footer">
                <a href="#" onClick={(e) => { e.preventDefault(); setIsWipModalOpen(true); }} className="btn-card landing-level-btn">Belépés a B1 tananyaghoz</a>
              </footer>
            </article>

            <article className="level-card border-b2">
              <header className="card-header">
                <span className="level-badge badge-b2">B2</span>
                <h3>B2 – Haladó szint</h3>
              </header>
              <p className="card-description">Magabiztos, folyamatos kommunikáció anyanyelvi beszélőkkel. Összetett szövegek, absztrakt témák megértése és felkészülés a B2-es nyelvvizsgára.</p>
              <footer className="card-footer">
                <a href="#" onClick={(e) => { e.preventDefault(); setIsWipModalOpen(true); }} className="btn-card landing-level-btn">Belépés a B2 tananyaghoz</a>
              </footer>
            </article>
          </div>
        </section>

        <section className="how-it-works-section">
          <h2 className="section-title">Így épül fel a tananyag:</h2>
          
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-icon">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                </svg>
              </div>
              <h3>Magyar nyelvű elmélet</h3>
              <p>Nem kell szótáraznod a szabályokat. Minden nyelvtani részt egyszerű, érthető magyar magyarázatokkal mutatunk be.</p>
            </div>

            <div className="step-item">
              <div className="step-icon">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <h3>Sokszínű gyakorlás</h3>
              <p>Olvasásértési feladatok, igaz/hamis tesztek és interaktív kvízek segítenek abban, hogy a gyakorlatban is rögzüljön a frissen szerzett tudás.</p>
            </div>

            <div className="step-item">
              <div className="step-icon">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
                </svg>
              </div>
              <h3>Szintzáró vizsgák</h3>
              <p>Minden kisebb témakör után egy rövid kvíz vár, az adott szint végén pedig egy nagy összefoglaló vizsgával ellenőrizheted a tudásod.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      
      <AuthModal
        isOpen={!isAuthenticated && isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView={inviteCode ? 'register' : 'login'}
        inviteCode={inviteCode}
        initialEmail={inviteEmail}
      />

      {isBetaRequestOpen && (
        <div id="beta-request-modal" className="modal-overlay is-active" aria-hidden="false">
          <div className="modal-content glass-panel">
            {betaRequestStatus === 'success' ? (
              <>
                <h2>Béta jelentkezés fogadva</h2>
                <p>Köszönjük! Küldtünk egy visszaigazoló e-mailt. Ha jóváhagyjuk a jelentkezésedet, meghívó kódot küldünk a fiók létrehozásához.</p>
                <button onClick={closeBetaRequestModal} className="btn-close-modal">Bezárás</button>
              </>
            ) : (
              <>
                <h2>Béta hozzáférés kérése</h2>
                <p>Írd meg, milyen e-mail címen értesíthetünk. Jóváhagyás után meghívó kódot küldünk, amellyel létrehozhatod a fiókodat.</p>
                {betaRequestStatus === 'error' && (
                  <div style={{ padding: '0.8rem', marginBottom: '1rem', background: 'oklch(0.65 0.2 25 / 0.1)', color: 'var(--color-error)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                    {betaRequestError}
                  </div>
                )}
                <form onSubmit={handleBetaRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <BetaRequestField id="beta-request-name" label="Név">
                    <input
                      id="beta-request-name"
                      type="text"
                      value={betaRequestName}
                      onChange={e => setBetaRequestName(e.target.value)}
                      maxLength={100}
                      placeholder="Pl. Péter"
                      style={betaRequestControlStyle}
                    />
                  </BetaRequestField>
                  <BetaRequestField id="beta-request-email" label="E-mail cím">
                    <input
                      id="beta-request-email"
                      type="email"
                      value={betaRequestEmail}
                      onChange={e => setBetaRequestEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="email@domain.com"
                      style={betaRequestControlStyle}
                    />
                  </BetaRequestField>
                  <BetaRequestField id="beta-request-message" label="Megjegyzés">
                    <textarea
                      id="beta-request-message"
                      value={betaRequestMessage}
                      onChange={e => setBetaRequestMessage(e.target.value)}
                      maxLength={1000}
                      placeholder="Például: szülőként tesztelném, vagy saját tanuláshoz kérnék hozzáférést."
                      style={{ ...betaRequestControlStyle, minHeight: '76px', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </BetaRequestField>
                  <button type="submit" disabled={betaRequestStatus === 'loading'} className="btn btn-submit-auth" style={{ width: '100%', padding: '0.85rem 1.25rem', borderRadius: '14px', fontWeight: 800, border: 'none', background: 'linear-gradient(135deg, var(--color-accent-in), var(--color-accent-at))', color: 'white', cursor: betaRequestStatus === 'loading' ? 'not-allowed' : 'pointer', opacity: betaRequestStatus === 'loading' ? 0.7 : 1 }}>
                    {betaRequestStatus === 'loading' ? 'Küldés...' : 'Kérelem elküldése'}
                  </button>
                </form>
                <button onClick={closeBetaRequestModal} className="btn-close-modal" style={{ marginTop: '1rem', width: '100%' }}>Bezárás</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* WIP Modal */}
      {isWipModalOpen && (
        <div id="wip-modal" className="modal-overlay is-active" aria-hidden="false">
          <div className="modal-content glass-panel">
            <div className="wip-badge">🚧 WIP 🚧</div>
            <h2>Hamarosan érkezik!</h2>
            <p>Az A2, B1 és B2 szintek jelenleg fejlesztés alatt állnak. Tanáraink gőzerővel dolgoznak a magyar nyelvű magyarázatokon és teszteken.</p>
            <button onClick={() => setIsWipModalOpen(false)} className="btn-close-modal">Bezárás</button>
          </div>
        </div>
      )}
    </>
  );
}
