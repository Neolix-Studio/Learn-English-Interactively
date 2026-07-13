import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--color-bg-base)',
          color: 'var(--color-text-main)',
          fontFamily: 'var(--font-body)'
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🛠️</div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-error)' }}>
            Hoppá, valami elromlott!
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginBottom: '2rem', maxWidth: '500px', lineHeight: 1.6 }}>
            Elnézést kérünk, váratlan hiba történt a rendszerben. Kérjük, frissítsd az oldalt, vagy térj vissza a főoldalra.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '16px', border: 'none', background: 'var(--color-accent-in)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
            >
              Oldal frissítése
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '16px', border: 'var(--glass-border)', background: 'var(--color-bg-surface)', color: 'var(--color-text-main)', fontWeight: 800, cursor: 'pointer' }}
            >
              Vissza a főoldalra
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
