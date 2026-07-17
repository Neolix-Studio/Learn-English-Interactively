import React, { useState, useEffect } from 'react';
import { QuestionHeader } from '../QuestionHeader';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

interface TypeInProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const TypeIn: React.FC<TypeInProps> = ({ question, onAnswer }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue('');
    onAnswer(false);
  }, [question]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const correctAnswer = question.correctAnswer || question.answer;

    const isCorrect = val.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    onAnswer(isCorrect);
  };

  const title = question.instruction || "Írd be a hiányzó szót!";
  const questionText = question.question || "";

  const sentenceText = question.sentence || "";

  return (
    <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <QuestionHeader
        text={title}
        newWords={question.newWords}
        dictionary={question.dictionary}
        hideAudio={true}
      />

      <div
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(questionText) }}
        style={{
          fontSize: '1.2rem',
          marginBottom: '1rem',
          color: 'var(--color-text-main)',
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      />

      <div style={{
          fontSize: '1.5rem',
          marginBottom: '2rem',
          background: 'var(--color-bg-surface)',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          width: '100%',
          textAlign: 'center',
          lineHeight: '2.5rem'
      }}>
        {sentenceText.includes('____') ? (
            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(sentenceText.replace('____', '...')) }} />
        ) : (
            <span>{sentenceText}</span>
        )}
      </div>

      <div style={{ width: '100%', position: 'relative' }}>
          <input
              type="text"
              value={inputValue}
              onChange={handleChange}
              placeholder="Ide írd a választ..."
              style={{
                  width: '100%',
                  padding: '1.2rem',
                  fontSize: '1.2rem',
                  borderRadius: '12px',
                  border: '2px solid var(--glass-border)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  textAlign: 'center'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-accent-in)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              autoFocus
          />
          {question.hint && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem', color: '#6B7280', fontSize: '0.9rem' }}>
                  💡 Segítség: {question.hint}
              </div>
          )}
      </div>
    </div>
  );
};
