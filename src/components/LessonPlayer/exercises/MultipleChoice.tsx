import React, { useState, useEffect } from 'react';
import { QuestionHeader } from '../QuestionHeader';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

interface MultipleChoiceProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const MultipleChoice: React.FC<MultipleChoiceProps> = ({ question, onAnswer }) => {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOpt(null);
    onAnswer(false);
  }, [question]);

  const handleSelect = (opt: string) => {
    setSelectedOpt(opt);
    const correctAnswer = question.correctAnswer || question.answer;
    onAnswer(opt === correctAnswer);
  };

  const title = question.instruction || "Válaszd ki a helyes választ!";
  const questionText = question.question || "";
  const options = question.options || [];

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
          fontSize: '1.5rem', 
          marginBottom: '3rem', 
          background: 'var(--color-bg-surface)', 
          padding: '2rem', 
          borderRadius: '12px', 
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          width: '100%',
          textAlign: 'center',
          lineHeight: '2rem'
        }}
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        {options.map((opt: string, i: number) => {
          const isSelected = selectedOpt === opt;
          return (
            <button
              key={`${opt}-${i}`}
              onClick={() => handleSelect(opt)}
              style={{
                padding: '1.2rem',
                fontSize: '1.2rem',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 'bold',
                background: isSelected ? 'var(--color-accent-in)' : 'var(--color-bg-base)',
                color: isSelected ? 'white' : 'var(--color-text-main)',
                border: isSelected ? '2px solid var(--color-accent-on)' : '2px solid var(--glass-border-color, var(--color-text-muted))',
                boxShadow: isSelected ? '0 2px 0 var(--color-accent-on)' : '0 4px 0 var(--glass-border-color, var(--color-text-muted))',
                transform: isSelected ? 'translateY(2px)' : 'none',
                textAlign: 'left'
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};
