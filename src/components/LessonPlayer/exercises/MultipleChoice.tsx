import React, { useState } from 'react';
import { QuestionHeader } from '../QuestionHeader';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import { getOptionState, type ExerciseAnswer } from './answer';

interface MultipleChoiceProps {
  question: any;
  onAnswer: (answer: ExerciseAnswer) => void;
  isAnswered?: boolean;
}

export const MultipleChoice: React.FC<MultipleChoiceProps> = ({ question, onAnswer, isAnswered = false }) => {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  const correctAnswer = question.correctAnswer || question.answer;

  const handleSelect = (opt: string) => {
    if (isAnswered) return;

    setSelectedOpt(opt);
    onAnswer({ hasAnswer: true, isCorrect: opt === correctAnswer, value: opt });
  };

  const title = question.instruction || "Válaszd ki a helyes választ!";
  const questionText = question.question || "";
  const options = question.options || [];

  return (
    <div className="multiple-choice-exercise" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <QuestionHeader
        text={title}
        newWords={question.newWords}
        dictionary={question.dictionary}
        hideAudio={true}
      />

      <div
        className="lesson-question-card"
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

      <div className="lesson-options-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        {options.map((opt: string, i: number) => {
          const isSelected = selectedOpt === opt;
          return (
            <button
              key={`${opt}-${i}`}
              onClick={() => handleSelect(opt)}
              className="lesson-option-btn"
              data-option-state={getOptionState(isSelected, opt === correctAnswer, isAnswered)}
              aria-disabled={isAnswered}
              style={{
                padding: '1.2rem',
                fontSize: '1.2rem',
                borderRadius: '12px',
                cursor: isAnswered ? 'default' : 'pointer',
                transition: 'all 0.2s',
                fontWeight: 'bold',
                background: 'var(--option-bg, var(--color-bg-base))',
                color: 'var(--option-fg, var(--color-text-main))',
                border: '2px solid var(--option-border, var(--glass-border-color, var(--color-text-muted)))',
                boxShadow: isSelected ? '0 2px 0 var(--option-border)' : '0 4px 0 var(--glass-border-color, var(--color-text-muted))',
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
