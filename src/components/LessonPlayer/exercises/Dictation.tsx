import React, { useState, useEffect } from 'react';
import { playTTS } from '../../../utils/audio';
import { QuestionHeader } from '../QuestionHeader';

interface DictationProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const Dictation: React.FC<DictationProps> = ({ question, onAnswer }) => {
  const [inputValue, setInputValue] = useState('');

  const sentence = question.sentence || question.correctAnswer;

  useEffect(() => {
    setInputValue('');
    onAnswer(false);
    
    // Auto-play on mount
    const timer = setTimeout(() => {
      playTTS(sentence);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [question, sentence]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Check answer (ignore case and punctuation)
    const cleanAnswer = val.trim().toLowerCase().replace(/[.,!?]/g, '');
    const cleanCorrect = sentence.trim().toLowerCase().replace(/[.,!?]/g, '');
    
    onAnswer(cleanAnswer === cleanCorrect);
  };

  return (
    <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <QuestionHeader 
        text="Írd le, amit hallasz!" 
        ttsText={sentence}
        newWords={question.newWords} 
        dictionary={question.dictionary}
        hideAudio={true}
      />
      
      <button 
        onClick={() => playTTS(sentence)}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--color-accent-in)',
          color: 'white',
          fontSize: '2rem',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
          transition: 'transform 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        🔊
      </button>
      
      <input 
        type="text" 
        value={inputValue}
        onChange={handleChange}
        placeholder="Kattints ide a gépeléshez..." 
        style={{
          width: '100%',
          padding: '1.5rem',
          fontSize: '1.2rem',
          borderRadius: '12px',
          border: '2px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.05)',
          color: 'var(--color-text-main)',
          textAlign: 'center',
          marginTop: '1rem',
          outline: 'none',
          transition: 'border 0.2s'
        }}
        onFocus={(e) => e.currentTarget.style.border = '2px solid var(--color-accent-in)'}
        onBlur={(e) => e.currentTarget.style.border = '2px solid rgba(255,255,255,0.1)'}
      />
    </div>
  );
};
