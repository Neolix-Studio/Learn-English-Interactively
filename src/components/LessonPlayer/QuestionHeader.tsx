import React, { useState } from 'react';
import { LexiMascot } from '../LexiMascot';
import { InteractiveSentence } from './InteractiveSentence';
import { playTTS } from '../../utils/audio';

interface QuestionHeaderProps {
  text: string;
  ttsText?: string;
  newWords?: string[];
  dictionary?: Record<string, string>;
  hideAudio?: boolean;
  hideMascot?: boolean;
}

export const QuestionHeader: React.FC<QuestionHeaderProps> = ({ text, ttsText, newWords = [], dictionary = {}, hideAudio = false, hideMascot = false }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    playTTS(ttsText || text).then(() => {
      setIsSpeaking(false);
    }).catch(() => {
      setIsSpeaking(false);
    });
  };

  return (
    <div className="question-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: '2rem', gap: '20px' }}>
      {/* Mascot Side */}
      {!hideMascot && (
        hideAudio ? (
          <div className="question-header-mascot" style={{ transform: 'translateY(-15px)' }}>
            <LexiMascot speaking={isSpeaking} size={100} />
          </div>
        ) : (
          <button
            type="button"
            className="question-header-mascot"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', transform: 'translateY(-15px)' }} 
            onClick={handleSpeak}
            aria-label="Felolvasás indítása"
            title="Kattints a felolvasáshoz!"
          >
            <LexiMascot speaking={isSpeaking} size={100} />
          </button>
        )
      )}

      {/* Speech Bubble Side */}
      <div 
        className="question-header-bubble"
        style={{
          position: 'relative',
          background: 'var(--color-bg-surface)',
          border: '2px solid var(--glass-border)',
          borderRadius: '24px',
          borderTopLeftRadius: '4px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          color: 'var(--color-text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        {/* Tail pointing left */}
        <div 
          style={{
            position: 'absolute',
            top: '20px',
            left: '-12px',
            width: '0',
            height: '0',
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent',
            borderRight: '12px solid var(--glass-border)',
          }}
        ></div>
        <div 
          style={{
            position: 'absolute',
            top: '20px',
            left: '-9px',
            width: '0',
            height: '0',
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent',
            borderRight: '12px solid var(--color-bg-surface)',
          }}
        ></div>

        {!hideAudio && (
          <button 
            onClick={handleSpeak}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-in)'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
        )}

        <InteractiveSentence 
          sentence={text} 
          newWords={newWords} 
          dictionary={dictionary} 
        />
      </div>
    </div>
  );
};
