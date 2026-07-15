import React, { useState } from 'react';
import { QuestionHeader } from '../QuestionHeader';

import svgDictionaryRaw from '../../../assets/svgDictionary.json';
import { sanitizeSvg } from '../../../utils/sanitizeHtml';
const svgDictionary: Record<string, string> = svgDictionaryRaw;

interface ImageChoiceProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const ImageChoice: React.FC<ImageChoiceProps> = ({ question, onAnswer }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedId(null);
  }, [question]);
  
  const displayWord = question.word || question.correctAnswer || '';
  const instruction = `Melyik ezek közül a(z) "${displayWord}"?`;

  const handleSelect = (id: string, isCorrect: boolean) => {
    setSelectedId(id);
    onAnswer(isCorrect);
  };

  return (
    <div className="image-choice-container" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
              onClick={() => handleSelect(opt.id, opt.correct)}
              className="image-choice-btn"
              style={{
                background: isSelected ? 'var(--color-accent-in)' : 'var(--color-bg-surface)',
                color: isSelected ? 'var(--color-bg-base)' : 'var(--color-text-main)',
                border: isSelected ? '2px solid var(--color-accent-on)' : '2px solid rgba(255,255,255,0.1)',
                boxShadow: isSelected ? '0 2px 0 var(--color-accent-on)' : '0 4px 0 rgba(0,0,0,0.2)',
                transform: isSelected ? 'translateY(2px)' : 'none',
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
