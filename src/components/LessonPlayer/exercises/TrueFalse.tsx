import React, { useState, useEffect } from 'react';
import { QuestionHeader } from '../QuestionHeader';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

interface TrueFalseProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const TrueFalse: React.FC<TrueFalseProps> = ({ question, onAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);

  useEffect(() => {
    setSelectedAnswer(null);
    onAnswer(false);
  }, [question]);

  const handleSelect = (value: boolean) => {
    setSelectedAnswer(value);
    
    // Support boolean true/false or string "True"/"False"
    let expected = question.answer;
    if (expected === undefined && question.correctAnswer !== undefined) {
      if (typeof question.correctAnswer === 'string') {
        expected = question.correctAnswer.toLowerCase() === 'true';
      } else {
        expected = !!question.correctAnswer;
      }
    }
    
    onAnswer(value === expected);
  };

  const title = question.instruction || "Igaz vagy Hamis?";
  
  // Prepare question content
  let questionHtml = question.question || question.statement || "";
  if (question.statement && question.translation) {
      questionHtml = `<strong>${question.statement}</strong><br><span style="font-size:1.1rem; color:#6B7280; margin-top: 0.5rem; display: block;">Jelentése: "${question.translation}" ?</span>`;
  } else if (question.statement) {
      questionHtml = `<strong>${question.statement}</strong>`;
  }

  return (
    <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <QuestionHeader 
        text={title} 
        newWords={question.newWords} 
        dictionary={question.dictionary} 
        hideAudio={true}
      />
      
      <div 
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(questionHtml) }}
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
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%' }}>
        <button
          onClick={() => handleSelect(true)}
          style={{
            flex: 1,
            maxWidth: '200px',
            padding: '1.5rem',
            fontSize: '1.5rem',
            borderRadius: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 'bold',
            background: selectedAnswer === true ? 'rgba(16, 185, 129, 0.2)' : 'var(--color-bg-surface)',
            border: `2px solid ${selectedAnswer === true ? '#10B981' : 'var(--glass-border)'}`,
            color: selectedAnswer === true ? '#10B981' : 'var(--color-text-main)',
            boxShadow: selectedAnswer === true ? '0 2px 0 #10B981' : '0 4px 0 var(--glass-border)',
            transform: selectedAnswer === true ? 'translateY(2px)' : 'none'
          }}
        >
          Igaz ✅
        </button>
        <button
          onClick={() => handleSelect(false)}
          style={{
            flex: 1,
            maxWidth: '200px',
            padding: '1.5rem',
            fontSize: '1.5rem',
            borderRadius: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 'bold',
            background: selectedAnswer === false ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-bg-surface)',
            border: `2px solid ${selectedAnswer === false ? '#EF4444' : 'var(--glass-border)'}`,
            color: selectedAnswer === false ? '#EF4444' : 'var(--color-text-main)',
            boxShadow: selectedAnswer === false ? '0 2px 0 #EF4444' : '0 4px 0 var(--glass-border)',
            transform: selectedAnswer === false ? 'translateY(2px)' : 'none'
          }}
        >
          Hamis ❌
        </button>
      </div>
    </div>
  );
};
