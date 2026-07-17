import React, { useEffect, useState } from 'react';
import grammarData from '../../../data/hu/grammar.json';
import '../../assets/css/grammarModal.css';

interface GrammarModalProps {
  moduleId: string;
  onClose: () => void;
  isInline?: boolean;
}

export const GrammarModal: React.FC<GrammarModalProps> = ({ moduleId, onClose, isInline = false }) => {
  const [isClosing, setIsClosing] = useState(false);
  const data = (grammarData as any)[moduleId];

  useEffect(() => {
    if (!isInline) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [isInline]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  if (!data) return null;

  if (isInline) {
    return (
      <div
        className={`grammar-modal-content ${isClosing ? 'roll-up' : 'roll-down'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 'none', margin: 0, maxHeight: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
      >
        <div className="grammar-modal-header">
          <h2>{data.title}</h2>
          <button className="grammar-modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="grammar-modal-body" style={{ maxHeight: 'none' }}>
          {data.content.map((section: any, idx: number) => (
            <div key={idx} className="grammar-section">
              <h3>{section.heading}</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{section.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grammar-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div
        className={`grammar-modal-content ${isClosing ? 'roll-up' : 'roll-down'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grammar-modal-header">
          <h2>{data.title}</h2>
          <button className="grammar-modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="grammar-modal-body">
          {data.content.map((section: any, idx: number) => (
            <div key={idx} className="grammar-section">
              <h3>{section.heading}</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{section.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
