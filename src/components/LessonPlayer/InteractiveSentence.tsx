import React, { useState, useEffect } from 'react';
import { playTTS } from '../../utils/audio';

interface InteractiveSentenceProps {
  sentence: string;
  newWords: string[];
  dictionary: Record<string, string>;
}

export const InteractiveSentence: React.FC<InteractiveSentenceProps> = ({ sentence, newWords, dictionary }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [guideIndex, setGuideIndex] = useState<string | null>(null);

  const tokens = sentence.split(/(\s+)/);

  useEffect(() => {
    // Check if the user has seen the guide before
    const hasSeenGuide = localStorage.getItem('hasSeenWordTooltipGuide');
    const safeNewWords = Array.isArray(newWords) ? newWords : (typeof newWords === 'string' ? [newWords] : []);
    
    if (!hasSeenGuide && safeNewWords.length > 0) {
      let found = false;
      tokens.forEach((token, index) => {
        if (found || !token.trim()) return;
        
        const subTokens = token.split('|');
        subTokens.forEach((subToken, subIndex) => {
          if (found) return;

          let cleanWord = subToken.toLowerCase().replace(/[.,!?"]/g, '').trim();
          
          if (cleanWord === 'kávét') cleanWord = 'kávé';
          if (cleanWord === 'teát') cleanWord = 'tea';
          
          let isNew: boolean = safeNewWords.includes(cleanWord);
          
          if (!isNew && dictionary) {
             const englishKey = Object.keys(dictionary).find(key => {
                 const val = dictionary[key];
                 return typeof val === 'string' && val.toLowerCase() === cleanWord;
             });
             if (englishKey && safeNewWords.includes(englishKey.toLowerCase())) {
                 isNew = true;
             }
          }
          
          if (isNew) {
            setGuideIndex(`${index}-${subIndex}`);
            found = true;
          }
        });
      });
    }
  }, [sentence, newWords, dictionary, tokens]);

  const handleDismissGuide = () => {
    if (guideIndex !== null) {
      localStorage.setItem('hasSeenWordTooltipGuide', 'true');
      setGuideIndex(null);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0px', alignItems: 'center' }}>
      {tokens.map((token, index) => {
        if (!token.trim()) {
          // Render whitespace exactly as is
          return <span key={index} style={{ whiteSpace: 'pre' }}>{token}</span>;
        }

        const subTokens = token.split('|');

        return (
          <span key={index} style={{ whiteSpace: 'nowrap' }}>
            {subTokens.map((subToken, subIndex) => {
              // Clean the token to check against newWords and dictionary (remove quotes too)
              let cleanWord = subToken.toLowerCase().replace(/[.,!?"]/g, '').trim();
              
              // Handle hungarian accusative cases roughly if needed (e.g., kávét -> kávé)
              if (cleanWord === 'kávét') cleanWord = 'kávé';
              if (cleanWord === 'teát') cleanWord = 'tea';

              const safeNewWords = Array.isArray(newWords) ? newWords : (typeof newWords === 'string' ? [newWords] : []);
              let isNewWord = safeNewWords.includes(cleanWord);
              let translation = dictionary ? dictionary[cleanWord] : undefined;
              
              // Reverse lookup: if the word is Hungarian, map it to its English translation
              if (!translation && dictionary) {
                 const englishKey = Object.keys(dictionary).find(key => {
                     const val = dictionary[key];
                     return val && typeof val === 'string' && val.toLowerCase() === cleanWord;
                 });
                 if (englishKey) {
                     translation = englishKey; // The translation shown will be the English word
                     isNewWord = safeNewWords.includes(englishKey);
                     cleanWord = englishKey; // For TTS, we want the English word!
                 }
              }
              
              // Is it interactive? Only new words should have tooltips and underlines
              const isInteractive = isNewWord;
              const tooltipId = `${index}-${subIndex}`;
              const showGuide = guideIndex === tooltipId;
              const showTooltip = activeTooltip === tooltipId;

              if (!isInteractive) {
                return <span key={subIndex}>{subToken}</span>;
              }

              return (
                <div 
                  key={subIndex} 
                  style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                  onClick={() => {
                    handleDismissGuide();
                    if (activeTooltip === tooltipId) {
                        setActiveTooltip(null);
                    } else {
                        setActiveTooltip(tooltipId);
                        if (isNewWord) {
                            playTTS(cleanWord);
                        }
                    }
                  }}
                  onMouseLeave={() => {
                    setActiveTooltip(null);
                  }}
                >
                  <span 
                    style={{ 
                      color: isNewWord ? '#9333ea' : 'inherit', // Purple color for new words
                      borderBottom: isNewWord ? '2px dotted #9333ea' : '1px dashed #ccc',
                      fontWeight: isNewWord ? 'bold' : 'normal',
                      paddingBottom: '2px'
                    }}
                  >
                    {subToken}
                  </span>

                  {/* Standard Meaning Tooltip */}
                  {showTooltip && translation && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '8px',
                        backgroundColor: '#374151',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        zIndex: 50,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontWeight: 'bold',
                        animation: 'fadeIn 0.2s ease-in'
                      }}
                    >
                      {translation}
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderWidth: '5px',
                        borderStyle: 'solid',
                        borderColor: '#374151 transparent transparent transparent'
                      }}></div>
                    </div>
                  )}

                  {/* Auto-Popup Guide Tooltip */}
                  {showGuide && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '12px',
                        backgroundColor: '#8b5cf6', // Violet color for guide
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        zIndex: 60,
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                        fontWeight: 'bold',
                        lineHeight: '1.4',
                        animation: 'bounceGuide 2s infinite'
                      }}
                    >
                      Kattints a szóra a kiejtéshez és a jelentéshez!
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderWidth: '8px',
                        borderStyle: 'solid',
                        borderColor: '#8b5cf6 transparent transparent transparent'
                      }}></div>
                    </div>
                  )}
                  
                  <style>{`
                    @keyframes bounceGuide {
                      0%, 100% { transform: translateX(-50%) translateY(0); }
                      50% { transform: translateX(-50%) translateY(-5px); }
                    }
                  `}</style>
                </div>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};
