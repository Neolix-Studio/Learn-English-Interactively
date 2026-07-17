import React, { useState, useEffect, useCallback } from 'react';
import { playAudioClip } from '../../../utils/audio';

interface PhonicsListenChooseProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const PhonicsListenChoose: React.FC<PhonicsListenChooseProps> = ({ question, onAnswer }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handlePlayAudio = useCallback(() => {
    const fallbackText = question.options.find((option: any) => option.correct)?.text || "";
    playAudioClip(question.audioUrl, fallbackText);
  }, [question]);

  useEffect(() => {
    setSelectedId(null);
    const timer = setTimeout(() => {
      handlePlayAudio();
    }, 500);
    return () => clearTimeout(timer);
  }, [question, handlePlayAudio]);

  const handleSelect = (id: string, isCorrect: boolean) => {
    setSelectedId(id);
    onAnswer(isCorrect);
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
              onClick={() => handleSelect(opt.id, opt.correct)}
              style={{
                background: isSelected ? 'var(--color-accent-in)' : 'var(--color-bg-surface)',
                color: isSelected ? 'var(--color-bg-base)' : 'var(--color-text-main)',
                border: isSelected ? '2px solid var(--color-accent-on)' : '2px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 2px 0 var(--color-accent-on)' : '0 4px 0 rgba(0,0,0,0.2)',
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
