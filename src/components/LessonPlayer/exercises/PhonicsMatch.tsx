import React, { useState, useEffect } from 'react';
import { QuestionHeader } from '../QuestionHeader';

interface PhonicsMatchProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const PhonicsMatch: React.FC<PhonicsMatchProps> = ({ question, onAnswer }) => {
  const [audioItems, setAudioItems] = useState<any[]>([]);
  const [textItems, setTextItems] = useState<any[]>([]);
  
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  
  const [matchedIds, setMatchedIds] = useState<string[]>([]); // pair IDs
  const [errorIds, setErrorIds] = useState<string[]>([]); // pair IDs that just failed

  useEffect(() => {
    // Generate items
    const audios = question.pairs.map((p: any) => ({ ...p, id: `audio-${p.text}`, pairId: p.text }));
    const texts = question.pairs.map((p: any) => ({ ...p, id: `text-${p.text}`, pairId: p.text }));
    
    // Shuffle separately
    setAudioItems([...audios].sort(() => Math.random() - 0.5));
    setTextItems([...texts].sort(() => Math.random() - 0.5));
    
    setMatchedIds([]);
    setSelectedAudioId(null);
    setSelectedTextId(null);
    setErrorIds([]);
    onAnswer(false);
  }, [question]);

  const handleAudioClick = (item: any) => {
    if (matchedIds.includes(item.pairId)) return;
    
    // Play audio
    if (item.audioUrl) {
      const audio = new Audio(item.audioUrl);
      audio.play().catch(e => console.error(e));
    } else {
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }

    setSelectedAudioId(item.id);
    setErrorIds([]);

    if (selectedTextId) {
      checkMatch(item.id, selectedTextId);
    }
  };

  const handleTextClick = (item: any) => {
    if (matchedIds.includes(item.pairId)) return;
    
    setSelectedTextId(item.id);
    setErrorIds([]);

    if (selectedAudioId) {
      checkMatch(selectedAudioId, item.id);
    }
  };

  const checkMatch = (audioId: string, textId: string) => {
    const audioItem = audioItems.find(a => a.id === audioId);
    const textItem = textItems.find(t => t.id === textId);

    if (audioItem && textItem && audioItem.pairId === textItem.pairId) {
      // Match
      const newMatched = [...matchedIds, audioItem.pairId];
      setMatchedIds(newMatched);
      setSelectedAudioId(null);
      setSelectedTextId(null);
      
      if (newMatched.length === question.pairs.length) {
        onAnswer(true);
      }
    } else {
      // Mismatch
      setErrorIds([audioId, textId]);
      setTimeout(() => {
        setSelectedAudioId(null);
        setSelectedTextId(null);
        setErrorIds([]);
      }, 800);
    }
  };

  const getStyle = (id: string, isMatched: boolean) => {
    const isSelected = selectedAudioId === id || selectedTextId === id;
    const isError = errorIds.includes(id);

    let background = 'var(--color-bg-surface)';
    let border = '2px solid rgba(255,255,255,0.1)';
    let color = 'var(--color-text-main)';

    if (isMatched) {
      background = 'var(--color-bg-surface)';
      border = '2px solid rgba(255,255,255,0.05)';
      color = 'var(--color-text-muted)';
    } else if (isError) {
      background = '#FEE2E2'; // light red
      border = '2px solid #EF4444';
      color = '#EF4444';
    } else if (isSelected) {
      background = 'var(--color-accent-in)';
      border = '2px solid var(--color-accent-on)';
      color = 'var(--color-bg-base)';
    }

    return {
      background,
      border,
      color,
      borderRadius: '16px',
      padding: '1.2rem',
      cursor: isMatched ? 'default' : 'pointer',
      transition: 'all 0.2s',
      boxShadow: isSelected && !isMatched ? '0 2px 0 var(--color-accent-on)' : (!isMatched ? '0 4px 0 rgba(0,0,0,0.2)' : 'none'),
      transform: isSelected && !isMatched ? 'translateY(2px)' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      opacity: isMatched ? 0.5 : 1,
      minHeight: '64px',
      pointerEvents: isMatched ? ('none' as const) : ('auto' as const),
      animation: isError ? 'shake 0.4s' : 'none'
    };
  };

  return (
    <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text-main)', marginBottom: '2rem', fontWeight: 'bold' }}>
        {question.instruction || 'Válaszd ki az összetartozó párokat!'}
      </h2>
      
      <div style={{ display: 'flex', width: '100%', gap: '2rem' }}>
        {/* Left Column - Audio */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {audioItems.map((item, idx) => {
            const isMatched = matchedIds.includes(item.pairId);
            return (
              <button key={item.id} onClick={() => handleAudioClick(item)} style={getStyle(item.id, isMatched)}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              </button>
            );
          })}
        </div>

        {/* Right Column - Text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {textItems.map((item, idx) => {
            const isMatched = matchedIds.includes(item.pairId);
            return (
              <button key={item.id} onClick={() => handleTextClick(item)} style={getStyle(item.id, isMatched)}>
                {item.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
