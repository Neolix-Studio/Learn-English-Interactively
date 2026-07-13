import React, { useState, useEffect } from 'react';
import { QuestionHeader } from '../QuestionHeader';

interface MatchPairsProps {
  question: any;
  onAnswer: (isCorrect: boolean) => void;
}

export const MatchPairs: React.FC<MatchPairsProps> = ({ question, onAnswer }) => {
  const [items, setItems] = useState<{ id: string, text: string, pairId: string, matched: boolean }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    // Generate unique items
    const newItems: any[] = [];
    question.pairs.forEach((p: any, i: number) => {
      newItems.push({ id: `en-${i}`, text: p.en, pairId: p.en, matched: false });
      newItems.push({ id: `hu-${i}`, text: p.hu, pairId: p.en, matched: false });
    });
    
    // Shuffle
    for (let i = newItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
    }
    
    setItems(newItems);
    setSelectedIds([]);
    onAnswer(false);
  }, [question]);

  const handleItemClick = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.matched) return;

    if (selectedIds.length === 0) {
      setSelectedIds([id]);
    } else if (selectedIds.length === 1) {
      if (selectedIds[0] === id) {
        // Deselect
        setSelectedIds([]);
        return;
      }
      
      const firstItem = items.find(i => i.id === selectedIds[0]);
      if (firstItem && firstItem.pairId === item.pairId) {
        // Match!
        const newItems = items.map(i => 
          (i.id === id || i.id === selectedIds[0]) ? { ...i, matched: true } : i
        );
        setItems(newItems);
        setSelectedIds([]);
        
        // Check if all matched
        if (newItems.every(i => i.matched)) {
          onAnswer(true);
        }
      } else {
        // No match
        setSelectedIds([selectedIds[0], id]);
        setTimeout(() => {
          setSelectedIds((prev) => {
             // Only clear if they are still the same (user didn't click another)
             if (prev.includes(id) && prev.includes(selectedIds[0])) return [];
             return prev;
          });
        }, 800);
      }
    } else {
       // Already 2 selected (waiting for timeout), just select the new one
       setSelectedIds([id]);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <QuestionHeader 
        text="Párosítsd a szavakat!" 
        newWords={question.newWords} 
        dictionary={question.dictionary} 
        hideAudio={true}
      />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const isError = selectedIds.length === 2 && selectedIds.includes(item.id);
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              disabled={item.matched}
              style={{
                padding: '1.2rem',
                fontSize: '1.2rem',
                borderRadius: '12px',
                cursor: item.matched ? 'default' : 'pointer',
                transition: 'all 0.2s',
                fontWeight: 'bold',
                background: item.matched ? 'var(--color-bg-base)' : isError ? 'rgba(239, 68, 68, 0.2)' : isSelected ? 'rgba(16, 185, 129, 0.2)' : 'var(--color-bg-surface)',
                border: `2px solid ${item.matched ? 'var(--color-bg-base)' : isError ? '#EF4444' : isSelected ? '#10B981' : 'var(--glass-border)'}`,
                color: item.matched ? 'var(--color-text-muted)' : isError ? '#EF4444' : isSelected ? '#10B981' : 'var(--color-text-main)',
                boxShadow: item.matched ? 'none' : '0 2px 0 #E5E7EB',
                opacity: item.matched ? 0.5 : 1
              }}
            >
              {item.text}
            </button>
          );
        })}
      </div>
    </div>
  );
};
