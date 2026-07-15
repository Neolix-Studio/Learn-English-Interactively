import React, { useState, useEffect } from 'react';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional context passed by the caller
  contextData?: any;
}

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({ isOpen, onClose, contextData }) => {
  const [issueType, setIssueType] = useState('bug');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIssueType('bug');
      setDescription('');
      setSteps('');
      setEmail('');
      setStatus('idle');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Kérjük, írd le a problémát.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      // Auto-capture data
      const payload = {
        issueType,
        description,
        steps,
        userEmail: email,
        contextData,
        browserInfo: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          language: navigator.language
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch('/report_problem.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Hiba történt a küldés során.');
      }

      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Hiba történt a küldés során. Kérjük, próbáld újra később.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100dvh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'var(--color-bg-surface)',
        padding: '2rem',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        border: 'var(--glass-border)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--color-text-muted)'
          }}
        >
          ✖
        </button>

        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--color-text-main)', fontSize: '1.8rem' }}>
          Jelentsd a problémát 🐞
        </h2>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ color: 'var(--color-accent-in)', margin: 0 }}>Köszönjük a jelentést!</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>A csapatunk hamarosan megvizsgálja a problémát.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Probléma típusa</label>
              <select 
                value={issueType} 
                onChange={(e) => setIssueType(e.target.value)}
                style={{
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: '1px solid var(--color-text-muted)',
                  background: 'var(--color-bg-base)',
                  color: 'var(--color-text-main)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              >
                <option value="bug">Hiba / Nem működik valami</option>
                <option value="typo">Elírás / Helyesírási hiba</option>
                <option value="audio">Hang probléma</option>
                <option value="feature">Fejlesztési ötlet</option>
                <option value="other">Egyéb</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>E-mail címed (Opcionális)</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ha szeretnéd, hogy válaszoljunk"
                style={{
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: '1px solid var(--color-text-muted)',
                  background: 'var(--color-bg-base)',
                  color: 'var(--color-text-main)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Leírás *</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mi történt pontosan?"
                rows={4}
                style={{
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: '1px solid var(--color-text-muted)',
                  background: 'var(--color-bg-base)',
                  color: 'var(--color-text-main)',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Lépések a reprodukáláshoz (Opcionális)</label>
              <textarea 
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="Hogyan tudjuk mi is előidézni a hibát?"
                rows={3}
                style={{
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: '1px solid var(--color-text-muted)',
                  background: 'var(--color-bg-base)',
                  color: 'var(--color-text-main)',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--color-error)', fontSize: '0.9rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                {errorMsg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={status === 'submitting'}
              style={{
                marginTop: '1rem',
                padding: '1rem',
                fontSize: '1.2rem',
                fontWeight: 800,
                background: 'var(--color-accent-in)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 0 var(--color-accent-on)',
                transition: 'transform 0.1s',
                opacity: status === 'submitting' ? 0.7 : 1
              }}
              onMouseDown={e => { if (status !== 'submitting') { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = 'none'; } }}
              onMouseUp={e => { if (status !== 'submitting') { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 0 var(--color-accent-on)'; } }}
            >
              {status === 'submitting' ? 'Küldés...' : 'Küldés'}
            </button>

          </form>
        )}
      </div>
    </div>
  );
};
