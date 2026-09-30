import React, { useState, useEffect, useCallback } from 'react';
import { playAudioClip } from '../../../utils/audio';
import { getOptionState, type ExerciseAnswer } from './answer';

interface PhonicsListenChooseProps {
  question: any;
  onAnswer: (answer: ExerciseAnswer) => void;
  isAnswered?: boolean;
}

export const PhonicsListenChoose: React.FC<PhonicsListenChooseProps> = ({ question, onAnswer, isAnswered = false }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handlePlayAudio = useCallback(() => {
    const fallbackText = question.options.find((option: any) => option.correct)?.text || "";
    playAudioClip(question.audioUrl, fallbackText);
  }, [question]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handlePlayAudio();
    }, 500);
    return () => clearTimeout(timer);
  }, [question, handlePlayAudio]);

  const handleSelect = (id: string, isCorrect: boolean) => {
    if (isAnswered) return;

    setSelectedId(id);
    onAnswer({ hasAnswer: true, isCorrect, value: id });
  };

  return (
    <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text-main)', marginBottom: '3rem', fontWeight: 'bold' }}>
        {question.instruction || 'Mit hallasz?'}
      </h2>

      <button
        onClick={handlePlayAudio}
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '32px',
          background: 'var(--color-accent-in)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginBottom: '4rem',
          boxShadow: '0 8px 0 var(--color-accent-on)',
          transition: 'transform 0.1s, box-shadow 0.1s'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(8px)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 8px 0 var(--color-accent-on)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 8px 0 var(--color-accent-on)';
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg-base)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
        {question.options.map((opt: any) => {
          const isSelected = selectedId === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id, !!opt.correct)}
              data-option-state={getOptionState(isSelected, !!opt.correct, isAnswered)}
              aria-disabled={isAnswered}
              style={{
                background: 'var(--option-bg, var(--color-bg-surface))',
                color: 'var(--option-fg, var(--color-text-main))',
                border: '2px solid var(--option-border, rgba(255,255,255,0.1))',
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: isAnswered ? 'default' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 2px 0 var(--option-border)' : '0 4px 0 rgba(0,0,0,0.2)',
                transform: isSelected ? 'translateY(2px)' : 'none',
                fontSize: '1.4rem',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
};
