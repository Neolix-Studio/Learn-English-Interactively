import React, { useEffect } from 'react';

interface HarderEncouragementProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const HarderEncouragement: React.FC<HarderEncouragementProps> = ({ question, onAnswer }) => {
  useEffect(() => {
    onAnswer(true);
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>
        💪
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent-in)', marginBottom: '1rem' }}>
        {question.message || "Készen állsz egy kis nehezítésre?"}
      </h2>
      <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>
        Nézzük meg, mit tanultál eddig!
      </p>
    </div>
  );
};
