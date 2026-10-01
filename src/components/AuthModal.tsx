import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { clearGuestMigrationStorage, readGuestMigrationPayload, summarizeGuestProgress } from '../utils/guestProgress';
import type { GuestProgressSummary } from '../utils/guestProgress';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, isAcceptablePassword } from '../utils/passwordPolicy';
import { safeRedirectPath } from '../utils/safeRedirect';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register' | 'forgot' | 'reset';
  resetToken?: string;
  inviteCode?: string;
  initialEmail?: string;
}

const inputStyle: React.CSSProperties = {
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

const btnPrimaryStyle: React.CSSProperties = {
  marginTop: '0.5rem',
  width: '100%',
  padding: '0.85rem 1.25rem',
  borderRadius: '14px',
  fontWeight: 800,
  border: 'none',
  background: 'linear-gradient(135deg, var(--color-accent-in), var(--color-accent-at))',
  color: 'white',
  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
};

const btnSecondaryStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '48px',
  padding: '0.85rem 1.25rem',
  borderRadius: '14px',
  fontWeight: 800,
  fontSize: '1rem',
  border: '2px solid var(--color-text-muted)',
  background: 'transparent',
  color: 'var(--color-text-main)'
};

export function AuthModal({ isOpen, onClose, initialView = 'login', resetToken = '', inviteCode = '', initialEmail = '' }: AuthModalProps) {
  const canRegister = inviteCode.trim() !== '';
  const [tab, setTab] = useState<'login' | 'register'>(initialView === 'register' && canRegister ? 'register' : 'login');
  const { t } = useTranslation();
  const [view, setView] = useState<'auth' | 'merge' | 'forgot' | 'forgot_sent' | 'reset' | 'reset_done'>(
    initialView === 'forgot' ? 'forgot' : initialView === 'reset' ? 'reset' : 'auth'
  );

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [betaInviteCode, setBetaInviteCode] = useState(inviteCode);

  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [token] = useState(resetToken);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guest progress found on this device is only sent once the person has said yes to it (N6).
  // The answer holds for one account: changing the e-mail asks again.
  const [guestSummary, setGuestSummary] = useState<GuestProgressSummary | null>(null);
  const [mergeGuest, setMergeGuest] = useState<boolean | null>(null);

  const passwordRule = t('auth.password_rule', { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH });

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'register' && !canRegister) {
      setError('A béta regisztráció meghívóhoz kötött. Kérjük, kérj béta hozzáférést a főoldalon.');
      return;
    }

    // Login takes any password, so accounts made under the old rule still get in.
    if (tab === 'register' && !isAcceptablePassword(password)) {
      setError(passwordRule);
      return;
    }

    const summary = summarizeGuestProgress(readGuestMigrationPayload());
    if (summary && mergeGuest === null) {
      setGuestSummary(summary);
      setView('merge');
      return;
    }

    submitAuth(summary !== null && mergeGuest === true);
  };

  const answerMerge = (answer: boolean) => {
    setMergeGuest(answer);
    submitAuth(answer);
  };

  const submitAuth = async (withGuestProgress: boolean) => {
    setLoading(true);
    setError('');

    const guestMigration = readGuestMigrationPayload();
    const guestProgressLeftAlone = !withGuestProgress && summarizeGuestProgress(guestMigration) !== null;
    const migrationField = withGuestProgress ? { guest_migration: guestMigration } : {};

    try {
      if (tab === 'register') {
        const marketingDataRaw = localStorage.getItem('ftue_marketing_data');
        let marketingData = {};
        if (marketingDataRaw) {
            try {
                marketingData = JSON.parse(marketingDataRaw);
            } catch(err) {
                console.warn("Hiba a marketing adatok beolvasásakor", err);
            }
        }

        const hostname = window.location.hostname;
        let baseLanguage = 'hu';
        if (hostname.endsWith('.sk')) baseLanguage = 'sk';
        else if (hostname.endsWith('.hu')) baseLanguage = 'hu';

        const data = await api.fetch('signup', {
            email,
            password,
            username,
            age_range: ageRange,
            beta_invite_code: betaInviteCode,
            base_language: baseLanguage,
            marketing_data: marketingData,
            ...migrationField
        });

        if (data.error) {
            setError(data.error);
            setView('auth');
            setLoading(false);
            return;
        }

        if (data.success) {
            localStorage.setItem("selectedLevel", "A1");
            if (guestProgressLeftAlone) {
                localStorage.removeItem('ftue_marketing_data');
            } else {
                clearGuestMigrationStorage();
            }
            const searchParams = new URLSearchParams(window.location.search);
            window.location.href = safeRedirectPath(searchParams.get('redirect'));
        }
      } else {
        const data = await api.fetch('login', { email, password, ...migrationField });

        if (data.error) {
            setError(data.error);
            setView('auth');
            setLoading(false);
            return;
        }

        if (data.success) {
            localStorage.setItem("selectedLevel", "A1");
            if (!guestProgressLeftAlone) {
                clearGuestMigrationStorage();
            }
            const searchParams = new URLSearchParams(window.location.search);
            window.location.href = safeRedirectPath(searchParams.get('redirect'));
        }
      }
    } catch (err) {
      console.error("Auth hiba:", err);
      setError("Hálózati hiba: Nem sikerült csatlakozni a szerverhez.");
      setView('auth');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.fetch('forgot_password', { email: forgotEmail });
      if (data.error) {
        setError(data.error);
      } else {
        setView('forgot_sent');
      }
    } catch (err) {
      setError('Hálózati hiba. Kérjük próbáld újra.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== newPasswordConfirm) {
      setError('A két jelszó nem egyezik meg.');
      return;
    }
    if (!isAcceptablePassword(newPassword)) {
      setError(passwordRule);
      return;
    }
    setLoading(true);
    try {
      const data = await api.fetch('reset_password', { token, new_password: newPassword });
      if (data.error) {
        setError(data.error);
      } else {
        setView('reset_done');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      setError('Hálózati hiba. Kérjük próbáld újra.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (view === 'merge' && guestSummary) {
    const amount = (value: number) => value.toLocaleString('hu-HU');
    const amounts = [
      guestSummary.xp > 0 && t('auth.merge_xp', { amount: amount(guestSummary.xp) }),
      guestSummary.bones > 0 && t('auth.merge_bones', { amount: amount(guestSummary.bones) }),
      guestSummary.streak > 0 && t('auth.merge_streak', { amount: amount(guestSummary.streak) }),
      guestSummary.lessons > 0 && t('auth.merge_lessons', { amount: amount(guestSummary.lessons) })
    ].filter(Boolean) as string[];

    return (
      <div id="login-modal" className="modal-overlay is-active" aria-hidden="false">
        <div className="modal-content glass-panel" role="dialog" aria-modal="true" aria-labelledby="guest-merge-title">
          <h2 id="guest-merge-title" style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-main)', fontSize: '1.3rem' }}>{t('auth.merge_title')}</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>
            {t('auth.merge_intro')}
          </p>
          <ul id="guest-merge-amounts" style={{ listStyle: 'none', margin: '0 0 1rem 0', padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
            {amounts.map(label => (
              <li key={label} style={{ padding: '0.5rem 0.9rem', borderRadius: '999px', background: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontWeight: 800, fontSize: '0.95rem' }}>
                {label}
              </li>
            ))}
          </ul>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
            {t('auth.merge_note')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button type="button" id="guest-merge-accept" disabled={loading} onClick={() => answerMerge(true)} style={{ ...btnPrimaryStyle, marginTop: 0, minHeight: '48px', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {t('auth.merge_accept')}
            </button>
            <button type="button" id="guest-merge-decline" disabled={loading} onClick={() => answerMerge(false)} style={{ ...btnSecondaryStyle, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {t('auth.merge_decline')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'forgot') {
    return (
      <div id="login-modal" className="modal-overlay is-active" aria-hidden="false">
        <div className="modal-content glass-panel">
          <button type="button" onClick={() => { setView('auth'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            ← Vissza a bejelentkezéshez
          </button>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-main)', fontSize: '1.3rem' }}>Elfelejtett jelszó</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Add meg a regisztrált e-mail címedet, és küldünk egy visszaállítási linket.
          </p>
          {error && (
            <div style={{ padding: '0.8rem', marginBottom: '1rem', background: 'oklch(0.65 0.2 25 / 0.1)', color: 'var(--color-error)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="forgot-email" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>E-mail cím</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="email@domain.com"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                required
                autoComplete="email"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={{ ...btnPrimaryStyle, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Küldés...' : 'Link küldése'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'forgot_sent') {
    return (
      <div id="login-modal" className="modal-overlay is-active" aria-hidden="false">
        <div className="modal-content glass-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-main)' }}>E-mail elküldve!</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Ha a <strong>{forgotEmail}</strong> cím regisztrálva van nálunk, hamarosan megkapod a visszaállítási linket. (Ellenőrizd a spam mappát is!)
          </p>
          <button onClick={() => { setView('auth'); setError(''); }} style={{ ...btnPrimaryStyle, cursor: 'pointer' }}>
            Vissza a bejelentkezéshez
          </button>
        </div>
      </div>
    );
  }

  if (view === 'reset') {
    return (
      <div id="login-modal" className="modal-overlay is-active" aria-hidden="false">
        <div className="modal-content glass-panel">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem' }}>🔐</div>
            <h2 style={{ margin: '0.5rem 0 0.25rem', color: 'var(--color-text-main)' }}>Új jelszó megadása</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{passwordRule}</p>
          </div>
          {error && (
            <div style={{ padding: '0.8rem', marginBottom: '1rem', background: 'oklch(0.65 0.2 25 / 0.1)', color: 'var(--color-error)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="reset-new-password" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Új jelszó</label>
              <input id="reset-new-password" type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="reset-confirm-password" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Jelszó megerősítése</label>
              <input id="reset-confirm-password" type="password" placeholder="••••••••" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} required autoComplete="new-password" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{ ...btnPrimaryStyle, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Mentés...' : 'Jelszó mentése'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'reset_done') {
    return (
      <div id="login-modal" className="modal-overlay is-active" aria-hidden="false">
        <div className="modal-content glass-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-main)' }}>Jelszó sikeresen megváltozott!</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Mostantól az új jelszavaddal tudsz bejelentkezni.
          </p>
          <button onClick={() => setView('auth')} style={{ ...btnPrimaryStyle, cursor: 'pointer' }}>
            Bejelentkezés
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="login-modal" className="modal-overlay is-active" aria-hidden="false">
      <div className="modal-content glass-panel">
        <div className="auth-tabs" style={{ display: 'flex', gap: '1rem', borderBottom: 'var(--glass-border)', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
            style={{ background: 'none', border: 'none', color: tab === 'login' ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', paddingBottom: '0.25rem' }}
          >
            Bejelentkezés
          </button>
          {canRegister && (
            <button
              type="button"
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setError(''); }}
              style={{ background: 'none', border: 'none', color: tab === 'register' ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', paddingBottom: '0.25rem' }}
            >
              Regisztráció
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '0.8rem', marginBottom: '1rem', background: 'oklch(0.65 0.2 25 / 0.1)', color: 'var(--color-error)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form id="auth-form" className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleAuth}>
          {tab === 'register' && (
            <>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="auth-username" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Felhasználónév</label>
                <input type="text" id="auth-username" placeholder="Pl. Péter" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required style={inputStyle} />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="auth-age" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Életkor csoport</label>
                <select id="auth-age" value={ageRange} onChange={e => setAgeRange(e.target.value)} required style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}>
                  <option value="" disabled>Válassz életkort...</option>
                  <option value="under_18">18 év alatti</option>
                  <option value="18_24">18 - 24 év</option>
                  <option value="25_34">25 - 34 év</option>
                  <option value="35_44">35 - 44 év</option>
                  <option value="45_54">45 - 54 év</option>
                  <option value="55_plus">55 év feletti</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="auth-beta-invite" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Béta meghívó kód</label>
                <input
                  type="text"
                  id="auth-beta-invite"
                  placeholder="Pl. LEXI-2026"
                  autoComplete="off"
                  value={betaInviteCode}
                  onChange={e => setBetaInviteCode(e.target.value)}
                  readOnly
                  style={{ ...inputStyle, opacity: 0.85 }}
                />
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.78rem', lineHeight: 1.35 }}>
                  A meghívó kódot az e-mailben kapott link tölti ki.
                </p>
              </div>
            </>
          )}

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="auth-email" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>E-mail cím</label>
            <input type="email" id="auth-email" placeholder="email@domain.com" required autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setMergeGuest(null); }} style={inputStyle} />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="auth-password" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Jelszó</label>
              {tab === 'login' && (
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setError(''); setView('forgot'); }}
                  style={{ fontSize: '0.8rem', color: 'var(--color-accent-in)', textDecoration: 'none', transition: 'opacity 0.2s' }}
                >
                  Elfelejtetted?
                </a>
              )}
            </div>
            <input type="password" id="auth-password" placeholder="••••••••" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            {tab === 'register' && (
              <p id="auth-password-rule" style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.78rem', lineHeight: 1.35 }}>
                {passwordRule}
              </p>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn btn-submit-auth" style={{ ...btnPrimaryStyle, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Kérjük várjon...' : (tab === 'login' ? 'Bejelentkezés' : 'Regisztráció')}
          </button>
        </form>

        <button className="btn-close-modal" onClick={onClose} style={{ marginTop: '1rem', width: '100%' }}>Bezárás</button>
      </div>
    </div>
  );
}
