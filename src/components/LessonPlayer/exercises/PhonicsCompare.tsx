import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playAudioClip } from '../../../utils/audio';

interface PhonicsCompareProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
  isAnswered?: boolean;
}

export const PhonicsCompare: React.FC<PhonicsCompareProps> = ({ question, onAnswer, isAnswered = false }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playAudio1 = useCallback(() => {
    playAudioClip(question.audioUrl1, question.word1);
  }, [question]);

  const playAudio2 = useCallback(() => {
    playAudioClip(question.audioUrl2, question.word2);
  }, [question]);

  useEffect(() => {
    setSelectedOption(null);
    onAnswer(false);
    
    // Slight initial delay so it doesn't blast immediately on render
    initialTimeoutRef.current = setTimeout(() => {
      playAudio1();
      
      // Delay second audio
      timeoutRef.current = setTimeout(() => {
        playAudio2();
      }, 1500);
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
    };
  }, [question, onAnswer, playAudio1, playAudio2]);

  const handleSelect = (option: 'same' | 'different') => {
    if (isAnswered) return;
    
    setSelectedOption(option);
    
    const isActuallySame = question.isSame;
    const isCorrect = (option === 'same' && isActuallySame) || (option === 'different' && !isActuallySame);
    
    onAnswer(isCorrect);
  };

  const handleManualPlay1 = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
    playAudio1();
  };

  const handleManualPlay2 = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
    playAudio2();
  };

  const getOptionStyle = (option: 'same' | 'different') => {
    const isSelected = selectedOption === option;
    return {
      background: isSelected ? 'var(--color-accent-in)' : 'var(--color-bg-surface)',
      color: isSelected ? 'var(--color-bg-base)' : 'var(--color-text-main)',
      border: isSelected ? '2px solid var(--color-accent-on)' : '2px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '1.5rem',
      cursor: isAnswered ? 'default' : 'pointer',
      transition: 'all 0.2s',
      boxShadow: isSelected && !isAnswered ? '0 2px 0 var(--color-accent-on)' : '0 4px 0 rgba(0,0,0,0.2)',
      transform: isSelected && !isAnswered ? 'translateY(2px)' : 'none',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      textAlign: 'center' as const,
      flex: 1
    };
  };

  return (
    <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text-main)', marginBottom: '3rem', fontWeight: 'bold' }}>
        {question.instruction || 'Hallgasd meg és válaszolj!'}
      </h2>
      
      {/* Audio buttons container */}
      <div style={{
        background: 'var(--color-bg-surface)',
        borderRadius: '24px',
        border: '2px solid rgba(255,255,255,0.05)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        marginBottom: '3rem',
        width: '100%',
        maxWidth: '300px'
      }}>
        {/* Audio 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleManualPlay1} style={{
            width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-accent-in)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg-base)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <div style={{ flex: 1, borderBottom: '2px solid rgba(255,255,255,0.1)', height: '2px', display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
            {isAnswered && <span style={{ color: 'var(--color-text-main)', fontSize: '1.2rem', fontWeight: 'bold' }}>{question.word1}</span>}
          </div>
        </div>

        {/* Audio 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleManualPlay2} style={{
            width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-accent-in)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg-base)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <div style={{ flex: 1, borderBottom: '2px solid rgba(255,255,255,0.1)', height: '2px', display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
            {isAnswered && <span style={{ color: 'var(--color-text-main)', fontSize: '1.2rem', fontWeight: 'bold' }}>{question.word2}</span>}
          </div>
        </div>
      </div>

      <div style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
        {question.questionText || 'Melyik szavakat hallod?'}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <button onClick={() => handleSelect('same')} style={getOptionStyle('same')}>
          ugyanazt a szót
        </button>
        <button onClick={() => handleSelect('different')} style={getOptionStyle('different')}>
          két különböző szót
        </button>
      </div>
    </div>
  );
};
