import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playAudioClip } from '../../../utils/audio';
import { getOptionState, type ExerciseAnswer } from './answer';

interface PhonicsCompareProps {
  question: any;
  onAnswer: (answer: ExerciseAnswer) => void;
  isAnswered?: boolean;
}

export const PhonicsCompare: React.FC<PhonicsCompareProps> = ({ question, onAnswer, isAnswered = false }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const correctOption = question.isSame ? 'same' : 'different';

  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playAudio1 = useCallback(() => {
    playAudioClip(question.audioUrl1, question.word1);
  }, [question]);

  const playAudio2 = useCallback(() => {
    playAudioClip(question.audioUrl2, question.word2);
  }, [question]);

  useEffect(() => {
    initialTimeoutRef.current = setTimeout(() => {
      playAudio1();

      timeoutRef.current = setTimeout(() => {
        playAudio2();
      }, 1500);
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
    };
  }, [question, playAudio1, playAudio2]);

  const handleSelect = (option: 'same' | 'different') => {
    if (isAnswered) return;

    setSelectedOption(option);
    onAnswer({ hasAnswer: true, isCorrect: option === correctOption, value: option });
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
      background: 'var(--option-bg, var(--color-bg-surface))',
      color: 'var(--option-fg, var(--color-text-main))',
      border: '2px solid var(--option-border, rgba(255,255,255,0.1))',
      borderRadius: '16px',
      padding: '1.5rem',
      cursor: isAnswered ? 'default' : 'pointer',
      transition: 'all 0.2s',
      boxShadow: isSelected ? '0 2px 0 var(--option-border)' : '0 4px 0 rgba(0,0,0,0.2)',
      transform: isSelected ? 'translateY(2px)' : 'none',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <button
          onClick={() => handleSelect('same')}
          data-option-state={getOptionState(selectedOption === 'same', correctOption === 'same', isAnswered)}
          aria-disabled={isAnswered}
          style={getOptionStyle('same')}
        >
          ugyanazt a szót
        </button>
        <button
          onClick={() => handleSelect('different')}
          data-option-state={getOptionState(selectedOption === 'different', correctOption === 'different', isAnswered)}
          aria-disabled={isAnswered}
          style={getOptionStyle('different')}
        >
          két különböző szót
        </button>
      </div>
    </div>
  );
};
