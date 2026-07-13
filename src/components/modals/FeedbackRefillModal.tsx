import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../utils/api';
import { useUser } from '../../context/UserContext';

interface FeedbackRefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FeedbackRefillModal: React.FC<FeedbackRefillModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { updateProgress } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [answers, setAnswers] = useState({
    rating: '',
    pacing: '',
    bugs: ''
  });

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError('');
      setAnswers({ rating: '', pacing: '', bugs: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.fetch('submit_feedback', {
        type: 'energy_refill',
        answers
      });
      
      if (res.success) {
        // Refill energy immediately locally!
        updateProgress({
          energy: 5,
          last_energy_refill: new Date().toISOString()
        });
        localStorage.setItem('last_feedback_refill', Date.now().toString());
        setStep(4); // Success step
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      } else {
        setError(res.error || 'Failed to submit feedback.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: 'var(--color-bg-surface)', padding: '2.5rem', borderRadius: '24px', maxWidth: '450px', width: '100%', border: 'var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', position: 'relative', animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--color-bg-base)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-main)' }}>
          ✕
        </button>

        {/* Header with Lexi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem' }}>
           <img src="/assets/images/lexi-mascot.png" alt="Lexi" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'contain', background: 'var(--color-accent-in)' }} />
           <div>
             <h2 style={{ margin: 0, color: 'var(--color-text-main)', fontSize: '1.4rem' }}>Help Lexi Improve!</h2>
             <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Answer a few quick questions to earn 5 🔋</p>
           </div>
        </div>

        {error && <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-main)' }}>How are you finding the lessons so far?</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              {[{e: '😡', label: 'Frustrating'}, {e: '😐', label: 'Okay'}, {e: '😍', label: 'Awesome!'}].map(item => (
                <button 
                  key={item.label}
                  onClick={() => { setAnswers({...answers, rating: item.label}); setStep(2); }}
                  style={{ flex: 1, padding: '1.5rem 0', background: 'var(--color-bg-base)', border: 'var(--glass-border)', borderRadius: '16px', cursor: 'pointer', fontSize: '2.5rem', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {item.e}
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ animation: 'slideInRight 0.3s' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-main)' }}>Is the grammar pacing too fast or just right?</h3>
            <textarea 
              value={answers.pacing}
              onChange={(e) => setAnswers({...answers, pacing: e.target.value})}
              placeholder="Tell us what you think..."
              style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '12px', border: 'var(--glass-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '1rem', resize: 'none', marginBottom: '15px', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)} style={{ padding: '12px 20px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--color-text-muted)', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 'bold' }}>Back</button>
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', background: 'var(--color-accent-in)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center' }}>Next</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div style={{ animation: 'slideInRight 0.3s' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-main)' }}>Did you run into any bugs or weird glitches?</h3>
            <textarea 
              value={answers.bugs}
              onChange={(e) => setAnswers({...answers, bugs: e.target.value})}
              placeholder="e.g. A button didn't work..."
              style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '12px', border: 'var(--glass-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '1rem', resize: 'none', marginBottom: '15px', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button disabled={loading} onClick={() => setStep(2)} style={{ padding: '12px 20px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--color-text-muted)', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 'bold' }}>Back</button>
              <button disabled={loading} onClick={handleSubmit} style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', background: 'var(--color-success)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Submitting...' : 'Submit & Claim 5 🔋'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 - Success */}
        {step === 4 && (
          <div style={{ textAlign: 'center', animation: 'scaleUp 0.3s' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-accent-in)' }}>Energy Refilled!</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>Lexi thanks you for your feedback! You can now continue learning.</p>
          </div>
        )}

      </div>
    </div>
  );
};
