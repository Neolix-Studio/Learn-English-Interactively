import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export function NotFoundPage() {
  const handleLoginClick = () => {
    localStorage.setItem("forceLoginModal", "true");
    window.location.href = "/";
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      <Header onLoginClick={handleLoginClick} />
      <main style={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--color-text-main)'
      }}>
        <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>🐕</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(135deg, var(--color-accent-in), var(--color-accent-at))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404 - Az oldal nem található
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', marginBottom: '2rem', maxWidth: '500px', lineHeight: 1.6 }}>
          Hoppá! Úgy tűnik, Lexi, a kutyánk elásott valahol ezt az oldalt. 
          A keresett link nem létezik, vagy már el lett távolítva.
        </p>
        <Link to="/" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '16px', textDecoration: 'none', background: 'linear-gradient(135deg, var(--color-accent-in), var(--color-accent-at))', color: 'white', fontWeight: 800 }}>
          Vissza a főoldalra
        </Link>
      </main>
      <Footer />
    </div>
  );
}
