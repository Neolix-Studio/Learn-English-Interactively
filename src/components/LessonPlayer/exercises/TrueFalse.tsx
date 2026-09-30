import React, { useState } from 'react';
import { QuestionHeader } from '../QuestionHeader';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import { getOptionState, type ExerciseAnswer } from './answer';

interface TrueFalseProps {
  question: any;
  onAnswer: (answer: ExerciseAnswer) => void;
  isAnswered?: boolean;
}

export const TrueFalse: React.FC<TrueFalseProps> = ({ question, onAnswer, isAnswered = false }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);

  let expected = question.answer;
  if (expected === undefined && question.correctAnswer !== undefined) {
    if (typeof question.correctAnswer === 'string') {
      expected = question.correctAnswer.toLowerCase() === 'true';
    } else {
      expected = !!question.correctAnswer;
    }
  }

  const handleSelect = (value: boolean) => {
    if (isAnswered) return;

    setSelectedAnswer(value);
    onAnswer({ hasAnswer: true, isCorrect: value === expected, value });
  };

  const getOptionStyle = (value: boolean): React.CSSProperties => {
    const isSelected = selectedAnswer === value;
    return {
      flex: 1,
      maxWidth: '200px',
      padding: '1.5rem',
      fontSize: '1.5rem',
      borderRadius: '16px',
      cursor: isAnswered ? 'default' : 'pointer',
      transition: 'all 0.2s',
      fontWeight: 'bold',
      background: 'var(--option-bg, var(--color-bg-surface))',
      border: '2px solid var(--option-border, transparent)',
      color: 'var(--option-fg, var(--color-text-main))',
      boxShadow: isSelected ? '0 2px 0 var(--option-border)' : 'none',
      transform: isSelected ? 'translateY(2px)' : 'none'
    };
  };

  const title = question.instruction || "Igaz vagy Hamis?";

  let questionHtml = question.question || question.statement || "";
  if (question.statement && question.translation) {
      questionHtml = `<strong>${question.statement}</strong><br><span style="font-size:1.1rem; color:#6B7280; margin-top: 0.5rem; display: block;">Jelentése: "${question.translation}" ?</span>`;
  } else if (question.statement) {
      questionHtml = `<strong>${question.statement}</strong>`;
  }

  return (
    <div className="true-false-exercise" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <QuestionHeader
        text={title}
        newWords={question.newWords}
        dictionary={question.dictionary}
        hideAudio={true}
      />

      <div
        className="lesson-question-card"
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

      <div className="lesson-options-stack true-false-options" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%' }}>
        <button
          onClick={() => handleSelect(true)}
          className="lesson-option-btn"
          data-option-state={getOptionState(selectedAnswer === true, expected === true, isAnswered)}
          aria-disabled={isAnswered}
          style={getOptionStyle(true)}
        >
          Igaz ✅
        </button>
        <button
          onClick={() => handleSelect(false)}
          className="lesson-option-btn"
          data-option-state={getOptionState(selectedAnswer === false, expected === false, isAnswered)}
          aria-disabled={isAnswered}
          style={getOptionStyle(false)}
        >
          Hamis ❌
        </button>
      </div>
    </div>
  );
};
