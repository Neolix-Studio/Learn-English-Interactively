import React, { useState, useEffect } from 'react';
import { playTTS } from '../../utils/audio';

interface InteractiveSentenceProps {
  sentence: string;
  newWords: string[];
  dictionary: Record<string, string>;
  disableAudio?: boolean;
}

export const InteractiveSentence: React.FC<InteractiveSentenceProps> = ({ sentence, newWords, dictionary, disableAudio = false }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [guideIndex, setGuideIndex] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(null);

  const tokens = sentence.split(/(\s+)/);

  useEffect(() => {
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

  const getTooltipPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const headerBottom = document.querySelector('.interactive-header')?.getBoundingClientRect().bottom ?? 0;
    const reservedTop = headerBottom + 14;
    const estimatedTooltipHeight = 48;
    const viewportPadding = 24;
    const hasRoomAbove = rect.top - reservedTop >= estimatedTooltipHeight;
    const placement: 'top' | 'bottom' = hasRoomAbove ? 'top' : 'bottom';
    const minX = 88;
    const maxX = Math.max(minX, window.innerWidth - 88);
    const x = Math.min(Math.max(rect.left + rect.width / 2, minX), maxX);
    const y = placement === 'top'
      ? Math.max(rect.top - 8, reservedTop + estimatedTooltipHeight)
      : Math.min(rect.bottom + 8, window.innerHeight - viewportPadding);

    return { x, y, placement };
  };

  return (
    <div className="interactive-sentence">
      {guideIndex !== null && (
        <div className="word-guide-mobile-hint">
          Kattints a lila szóra a kiejtéshez és a jelentéshez.
        </div>
      )}
      {tokens.map((token, index) => {
        if (!token.trim()) {
          return <span key={index} style={{ whiteSpace: 'pre' }}>{token}</span>;
        }

        const subTokens = token.split('|');

        return (
          <span key={index} style={{ whiteSpace: 'nowrap' }}>
            {subTokens.map((subToken, subIndex) => {
              let cleanWord = subToken.toLowerCase().replace(/[.,!?"]/g, '').trim();

              if (cleanWord === 'kávét') cleanWord = 'kávé';
              if (cleanWord === 'teát') cleanWord = 'tea';

              const safeNewWords = Array.isArray(newWords) ? newWords : (typeof newWords === 'string' ? [newWords] : []);
              let isNewWord = safeNewWords.includes(cleanWord);
              let translation = dictionary ? dictionary[cleanWord] : undefined;

              if (!translation && dictionary) {
                 const englishKey = Object.keys(dictionary).find(key => {
                     const val = dictionary[key];
                     return val && typeof val === 'string' && val.toLowerCase() === cleanWord;
                 });
                 if (englishKey) {
                     translation = englishKey;
                     isNewWord = safeNewWords.includes(englishKey);
                     cleanWord = englishKey;
                 }
              }

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
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    handleDismissGuide();
                    if (activeTooltip === tooltipId) {
                        setActiveTooltip(null);
                        setTooltipPosition(null);
                    } else {
                        setActiveTooltip(tooltipId);
                        setTooltipPosition(getTooltipPosition(event.currentTarget));
                        if (isNewWord && !disableAudio) {
                            playTTS(cleanWord);
                        }
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.currentTarget.click();
                    }
                  }}
                  onMouseLeave={() => {
                    setActiveTooltip(null);
                    setTooltipPosition(null);
                  }}
                >
                  <span
                    style={{
                      color: isNewWord ? '#9333ea' : 'inherit',
                      borderBottom: isNewWord ? '2px dotted #9333ea' : '1px dashed #ccc',
                      fontWeight: isNewWord ? 'bold' : 'normal',
                      paddingBottom: '2px'
                    }}
                  >
                    {subToken}
                  </span>

                  {showTooltip && translation && (
                    <div
                      style={{
                        position: 'fixed',
                        top: tooltipPosition?.y ?? 0,
                        left: tooltipPosition?.x ?? 0,
                        transform: tooltipPosition?.placement === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)',
                        backgroundColor: '#374151',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        zIndex: 2000,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontWeight: 'bold',
                        animation: 'fadeIn 0.2s ease-in',
                        maxWidth: 'calc(100vw - 32px)',
                        pointerEvents: 'none'
                      }}
                    >
                      {translation}
                      <div style={{
                        position: 'absolute',
                        top: tooltipPosition?.placement === 'bottom' ? '-10px' : '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderWidth: '5px',
                        borderStyle: 'solid',
                        borderColor: tooltipPosition?.placement === 'bottom'
                          ? 'transparent transparent #374151 transparent'
                          : '#374151 transparent transparent transparent'
                      }}></div>
                    </div>
                  )}

                  {showGuide && (
                    <div
                      className="word-guide-tooltip"
                    >
                      Kattints a szóra a kiejtéshez és a jelentéshez!
                      <div className="word-guide-tooltip-arrow"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};
