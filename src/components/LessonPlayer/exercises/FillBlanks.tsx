import React, { useState } from 'react';
import { QuestionHeader } from '../QuestionHeader';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import { LexiMascot } from '../../LexiMascot';
import { getOptionState, type ExerciseAnswer } from './answer';

interface FillBlanksProps {
  question: any;
  onAnswer: (answer: ExerciseAnswer) => void;
  isAnswered?: boolean;
}

export const FillBlanks: React.FC<FillBlanksProps> = ({ question, onAnswer, isAnswered = false }) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const expected = Array.isArray(question.answer) ? question.answer[0] : question.answer;
  const correctAnswer = String(expected ?? '').split('/')[0];

  const handleSelect = (word: string) => {
    if (isAnswered) return;

    setSelectedWord(word);
    onAnswer({ hasAnswer: true, isCorrect: word === correctAnswer, value: word });
  };

  const huText = question.hu || "Válaszd ki a helyes szót a mondat kiegészítéséhez!";
  const sentenceText = question.sentence || question.question || "";

  const isDialogue = sentenceText.includes('A: ') && sentenceText.includes('B: ');
  let personA = '';
  let personB = '';
  if (isDialogue) {
    const parts = sentenceText.split('B: ');
    personA = parts[0].replace('A: ', '').replace('<br>', '').trim();
    personB = parts[1].trim();
  }

  const [sentenceBeforeBlank, sentenceAfterBlank] = sentenceText.split(/_{3,}/);

  return (
    <div className="fill-blanks-exercise" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {isDialogue ? (
        <>
          <QuestionHeader
            text={huText}
            newWords={question.newWords}
            dictionary={question.dictionary}
            hideAudio={true}
            hideMascot={true}
            disableWordAudio={true}
          />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', alignSelf: 'flex-start', maxWidth: '85%' }}>
              <div style={{ flexShrink: 0 }}>
                <LexiMascot size={60} />
              </div>
              <div style={{
                background: 'var(--color-bg-surface)',
                padding: '1rem 1.5rem',
                borderRadius: '20px',
                borderTopLeftRadius: '4px',
                border: '2px solid var(--color-border)',
                fontSize: '1.3rem',
                color: 'var(--color-text-main)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                position: 'relative',
                marginTop: '0.5rem',
                lineHeight: '1.6rem'
              }}>
                <div style={{
                  position: 'absolute', top: '10px', left: '-10px', width: '0', height: '0',
                  borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '10px solid var(--color-border)',
                }}></div>
                <div style={{
                  position: 'absolute', top: '10px', left: '-7px', width: '0', height: '0',
                  borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '10px solid var(--color-bg-surface)',
                }}></div>
                {personA}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', alignSelf: 'flex-end', maxWidth: '85%', flexDirection: 'row-reverse' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-border)', flexShrink: 0 }}>
                <svg width="35" height="35" viewBox="0 0 24 24" fill="#9CA3AF">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div style={{
                background: 'var(--color-accent-in)',
                padding: '1rem 1.5rem',
                borderRadius: '20px',
                borderTopRightRadius: '4px',
                fontSize: '1.3rem',
                color: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'relative',
                marginTop: '0.5rem',
                lineHeight: '1.6rem'
              }}>
                <div style={{
                  position: 'absolute', top: '10px', right: '-8px', width: '0', height: '0',
                  borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '10px solid var(--color-accent-in)',
                }}></div>
                <span dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(personB.replace(
                    /_{3,}/,
                    selectedWord
                      ? `<span style="border-bottom: 2px solid white; padding: 0 0.5rem; font-weight: bold;">${selectedWord}</span>`
                      : `<span style="border-bottom: 2px solid rgba(255,255,255,0.5); padding: 0 1.5rem;"></span>`
                  ))
                }} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="fill-blank-task-label">Válaszd ki a hiányzó szót</div>
          <div className="fill-blank-compose-card">
            <div
              className="fill-blank-prompt-button"
              aria-label="Magyar jelentés"
            >
              <span>{huText}</span>
            </div>
            <div className="fill-blank-compose-answer">
              <span>{sentenceBeforeBlank}</span>
              {selectedWord ? (
                <span
                  className="fill-blank-answer"
                  data-option-state={getOptionState(true, selectedWord === correctAnswer, isAnswered)}
                >
                  {selectedWord}
                </span>
              ) : (
                <span className="fill-blank-slot" aria-label="hiányzó szó"></span>
              )}
              <span>{sentenceAfterBlank}</span>
            </div>
          </div>
        </>
      )}

      <div className="lesson-options-stack fill-blank-options" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '400px' }}>
        {(question.opts || question.options || []).map((opt: string, i: number) => {
          const isSelected = selectedWord === opt;

          return (
            <button
              key={`${opt}-${i}`}
              onClick={() => handleSelect(opt)}
              className="lesson-option-btn"
              data-option-state={getOptionState(isSelected, opt === correctAnswer, isAnswered)}
              aria-disabled={isAnswered}
              style={{
                padding: '1rem',
                fontSize: '1.2rem',
                borderRadius: '12px',
                cursor: isAnswered ? 'default' : 'pointer',
                transition: 'all 0.2s',
                fontWeight: 'bold',
                background: 'var(--option-bg, var(--color-bg-surface))',
                color: 'var(--option-fg, var(--color-text-main))',
                border: '2px solid var(--option-border, transparent)',
                boxShadow: isSelected ? '0 2px 0 var(--option-border)' : 'none',
                transform: isSelected ? 'translateY(2px)' : 'none'
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
