import React, { useState } from 'react';
import { api } from '../utils/api';
import { useUser } from '../context/UserContext';

export const LexiFeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateProgress, data, isGuest } = useUser();

  if (isGuest) return null;

  const handleSubmit = async () => {
    if (!feedbackText.trim()) return;
    setLoading(true);
    try {
      const res = await api.fetch('submit_feedback', {
        type: 'widget',
        answers: { 'General Feedback': feedbackText }
      });
      if (res.success) {
        updateProgress({
          scores: { ...data.scores, bones: (data.scores?.bones || 0) + 20 }
        });
        setStep(3);
        setTimeout(() => {
          setIsOpen(false);
          setStep(1);
          setFeedbackText('');
        }, 3000);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>

      {isOpen && (
        <div style={{ background: 'var(--color-bg-surface)', padding: '15px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '280px', animation: 'fadeIn 0.2s', transformOrigin: 'bottom right' }}>

          <button onClick={() => { setIsOpen(false); setStep(1); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>

          {step === 1 && (
            <div style={{ marginTop: '5px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-text-main)' }}>Lexi needs treats! 🦴</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>Tell us about your experience so far and earn 20 Lexi Treats!</p>
              <button onClick={() => setStep(2)} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--color-accent-in)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Give Feedback</button>
            </div>
          )}

          {step === 2 && (
            <div style={{ marginTop: '5px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-text-main)' }}>Your Feedback</h4>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What's working? What's broken?"
                style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '0.9rem', resize: 'none', marginBottom: '8px', fontFamily: 'inherit' }}
              />
              <button disabled={loading} onClick={handleSubmit} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--color-success)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Sending...' : 'Send (+20 🦴)'}</button>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🎉</div>
              <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-accent-in)' }}>Thank you!</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>+20 Lexi Treats added.</p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-accent-in)', border: '4px solid var(--color-bg-base)', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', transition: 'transform 0.2s' }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <img src="/assets/images/lexi-mascot.png" alt="Feedback" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </button>

    </div>
  );
};
