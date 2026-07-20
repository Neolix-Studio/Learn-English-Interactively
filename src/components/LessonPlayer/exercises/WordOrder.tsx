import React, { useState, useEffect } from 'react';
import { playTTS, preloadTTS } from '../../../utils/audio';
import { QuestionHeader } from '../QuestionHeader';

interface WordOrderProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const WordOrder: React.FC<WordOrderProps> = ({ question, onAnswer }) => {
  const [sourceWords, setSourceWords] = useState<string[]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const isNativeTarget = question.targetLang === 'hu' || question.targetLang === 'sk';

  useEffect(() => {
    setSourceWords([...question.scrambledWords]);
    setTargetWords([]);
    onAnswer(false);

    if (!isNativeTarget) {
      preloadTTS(question.scrambledWords);
    }
  }, [question, isNativeTarget]);

  const handleSourceClick = (word: string, index: number) => {
    if (!isNativeTarget) {
      playTTS(word, 'en-US');
    }
    const newSource = [...sourceWords];
    newSource.splice(index, 1);
    setSourceWords(newSource);

    const newTarget = [...targetWords, word];
    setTargetWords(newTarget);

    checkAnswer(newTarget);
  };

  const handleTargetClick = (word: string, index: number) => {
    if (!isNativeTarget) {
      playTTS(word, 'en-US');
    }
    const newTarget = [...targetWords];
    newTarget.splice(index, 1);
    setTargetWords(newTarget);

    setSourceWords([...sourceWords, word]);

    checkAnswer(newTarget);
  };

  const checkAnswer = (currentAssembled: string[]) => {
    const assembledStr = currentAssembled.join(' ');
    const normalize = (s: string) => s.toLowerCase().replace(/[.,!?]/g, '').trim();
    onAnswer(normalize(assembledStr) === normalize(question.correctAnswer));
  };

  const promptText = question.hu || question.prompt || "Fordítsd le ezt a mondatot";

  return (
    <div className="word-order-exercise" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column' }}>
      <QuestionHeader
        text={promptText}
        newWords={question.newWords}
        dictionary={question.dictionary}
        hideAudio={true}
        disableWordAudio={isNativeTarget}
      />

      <div
        className="word-order-target"
        style={{
          minHeight: '60px',
          borderBottom: '2px solid var(--color-bg-surface)',
          paddingBottom: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        {targetWords.map((w, i) => (
          <button
            key={`t-${i}`}
            className="interactive-word-chip"
            onClick={() => handleTargetClick(w, i)}
            style={{
              padding: '0.8rem 1.2rem',
              background: 'var(--color-bg-surface)',
              border: '2px solid var(--color-text-muted)',
              borderRadius: '12px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              boxShadow: '0 2px 0 var(--color-text-muted)',
              color: 'var(--color-text-main)',
              transition: 'transform 0.1s'
            }}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="word-order-source" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
        {sourceWords.map((w, i) => (
          <button
            key={`s-${i}`}
            className="interactive-word-chip"
            onClick={() => handleSourceClick(w, i)}
            style={{
              padding: '0.8rem 1.2rem',
              background: 'var(--color-bg-surface)',
              border: '2px solid var(--glass-border)',
              borderRadius: '12px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              boxShadow: '0 2px 0 var(--glass-border)',
              color: 'var(--color-text-main)',
              transition: 'transform 0.1s'
            }}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
};
