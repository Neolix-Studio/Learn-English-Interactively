import React, { useEffect } from 'react';

interface MoraleBoostProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const MoraleBoost: React.FC<MoraleBoostProps> = ({ question, onAnswer }) => {
  // Automatically mark as correct so the user can just click continue
  useEffect(() => {
    onAnswer(true);
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>
        🎉
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
        {question.message || "Kiváló munka! Csak így tovább!"}
      </h2>
      <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>
        Folytassuk a tanulást!
      </p>
    </div>
  );
};
