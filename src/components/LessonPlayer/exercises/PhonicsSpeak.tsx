import React, { useState, useEffect, useCallback } from 'react';
import { playAudioClip } from '../../../utils/audio';

interface PhonicsSpeakProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
  onSkip?: () => void;
  isAnswered?: boolean;
}

export const PhonicsSpeak: React.FC<PhonicsSpeakProps> = ({ question, onAnswer, onSkip, isAnswered = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);

  const handleListen = useCallback(() => {
    playAudioClip(question.audioUrl, question.word);
  }, [question]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleListen();
    }, 500);
    return () => clearTimeout(timer);
  }, [question, handleListen]);

  const handleSpeak = () => {
    if (isAnswered || hasSpoken) return;

    setIsListening(true);

    setTimeout(() => {
      setIsListening(false);
      setHasSpoken(true);

      onAnswer(true);
    }, 2000);
  };

  const handleSkip = () => {
    if (isAnswered) return;
    if (onSkip) {
      onSkip();
    } else {
      onAnswer(true);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text-main)', marginBottom: '2rem', fontWeight: 'bold' }}>
        {question.instruction || 'Mondd ki ezt a szót!'}
      </h2>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '4rem' }}>
        <div style={{ width: '100px', height: '100px' }}>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="#4B5563" />
            <circle cx="50" cy="40" r="20" fill="#E5E7EB" />
            <path d="M25 80 C25 60, 75 60, 75 80" fill="#E5E7EB" />
          </svg>
        </div>

        <div style={{
          background: 'var(--color-bg-surface)',
          padding: '1.5rem',
          borderRadius: '24px',
          borderTopLeftRadius: '4px',
          border: '2px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          <button onClick={handleListen} style={{
            width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-accent-in)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg-base)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
            {question.word}
          </span>
        </div>
      </div>

      <button
        onClick={handleSpeak}
        disabled={isAnswered || hasSpoken}
        style={{
          width: '100%',
          padding: '1.5rem',
          borderRadius: '16px',
          background: isListening ? '#3B82F6' : 'var(--color-bg-surface)',
          color: isListening ? 'white' : 'var(--color-text-main)',
          border: isListening ? '2px solid #2563EB' : '2px solid rgba(255,255,255,0.1)',
          cursor: (isAnswered || hasSpoken) ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: isListening ? 'none' : '0 4px 0 rgba(0,0,0,0.2)',
          transform: isListening ? 'translateY(4px)' : 'none',
          transition: 'all 0.2s',
          marginBottom: '2rem'
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {isListening ? 'Figyelek...' : 'Kattints a beszédhez'}
        </span>
      </button>

      <button
        onClick={handleSkip}
        disabled={isAnswered || hasSpoken || isListening}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: (isAnswered || hasSpoken || isListening) ? 'default' : 'pointer',
          textDecoration: 'underline',
          opacity: (isAnswered || hasSpoken || isListening) ? 0.5 : 1
        }}
      >
        Most nem tudok beszélni
      </button>
    </div>
  );
};
