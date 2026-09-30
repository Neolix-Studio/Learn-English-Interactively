import React, { useState } from 'react';
import { QuestionHeader } from '../QuestionHeader';

import svgDictionaryRaw from '../../../assets/svgDictionary.json';
import { sanitizeSvg } from '../../../utils/sanitizeHtml';
import { getOptionState, type ExerciseAnswer } from './answer';
const svgDictionary: Record<string, string> = svgDictionaryRaw;

interface ImageChoiceProps {
  question: any;
  onAnswer: (answer: ExerciseAnswer) => void;
  isAnswered?: boolean;
}

export const ImageChoice: React.FC<ImageChoiceProps> = ({ question, onAnswer, isAnswered = false }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const displayWord = question.word || question.correctAnswer || '';
  const instruction = `Melyik ezek közül a(z) "${displayWord}"?`;

  const handleSelect = (id: string, isCorrect: boolean) => {
    if (isAnswered) return;

    setSelectedId(id);
    onAnswer({ hasAnswer: true, isCorrect, value: id });
  };

  return (
    <div className="image-choice-container image-choice-exercise" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <QuestionHeader
        text={instruction}
        newWords={question.newWords}
        dictionary={question.dictionary}
        hideAudio={true}
      />

      <div className="image-choice-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%' }}>
        {question.options.map((opt: any) => {
          const isSelected = selectedId === opt.id;
          const optIdLower = opt.id ? opt.id.toLowerCase() : (opt.text ? opt.text.toLowerCase() : '');
          const svgString = svgDictionary[optIdLower];

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id, !!opt.correct)}
              className="image-choice-btn"
              data-option-state={getOptionState(isSelected, !!opt.correct, isAnswered)}
              aria-disabled={isAnswered}
              style={{
                background: 'var(--option-bg, var(--color-bg-surface))',
                color: 'var(--option-fg, var(--color-text-main))',
                border: '2px solid var(--option-border, rgba(255,255,255,0.1))',
                boxShadow: isSelected ? '0 2px 0 var(--option-border)' : '0 4px 0 rgba(0,0,0,0.2)',
                transform: isSelected ? 'translateY(2px)' : 'none',
                cursor: isAnswered ? 'default' : 'pointer',
              }}
            >
              <div>
                {svgString ? (
	                  <div
	                    className="image-choice-svg"
	                    dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgString) }}
	                  />
                ) : null}
                {opt.text}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
