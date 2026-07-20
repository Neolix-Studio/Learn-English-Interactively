import React, { useEffect, useState } from 'react';

interface LexiMascotProps {
  speaking?: boolean;
  size?: number;
}

export const LexiMascot: React.FC<LexiMascotProps> = ({ speaking = false, size = 100 }) => {
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (!speaking) {
      setMouthOpen(false);
      return;
    }

    const interval = setInterval(() => {
      setMouthOpen(prev => !prev);
    }, 150);

    return () => clearInterval(interval);
  }, [speaking]);

  return (
    <div style={{ width: `${size}px`, height: `${size}px`, position: 'relative' }}>
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="heroBodyGradMascot" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7a7f87" />
            <stop offset="100%" stopColor="#5a5e66" />
          </linearGradient>
        </defs>

        <g>
          <path d="M50,190 C50,130 90,120 90,160 C90,180 70,200 50,190 Z" fill="#5a5e66" />
          <path d="M150,190 C150,130 110,120 110,160 C110,180 130,200 150,190 Z" fill="#5a5e66" />
          <ellipse cx="95" cy="195" rx="12" ry="6" fill="#f5f5f5" />
          <ellipse cx="145" cy="195" rx="12" ry="6" fill="#4a4d54" />
          <ellipse cx="85" cy="195" rx="10" ry="5" fill="#f5f5f5" />
          <path d="M80,190 C80,100 160,100 160,190 Z" fill="url(#heroBodyGradMascot)" />
          <path d="M95,190 C85,140 105,110 120,110 C135,110 155,140 145,190 Z" fill="#f5f5f5" />
          <path d="M95,150 C110,140 130,140 145,150 Z" fill="url(#heroBodyGradMascot)" />

          <path d="M45,115 C25,130 20,160 35,175 C50,190 60,160 60,140 Z" fill="#5a5e66" />
          <circle cx="35" cy="175" r="10" fill="#f5f5f5" />
        </g>

        <g transform="translate(10, -5)">
          <path className="ear-left" d="M45,70 C25,45 20,75 45,95 Z" fill="#5a5e66" />
          <path className="ear-right" d="M175,70 C195,45 200,75 175,95 Z" fill="#5a5e66" />
          <path d="M50,100 C50,45 170,45 170,100 C170,130 140,145 110,145 C80,145 50,130 50,100 Z" fill="#6e737b" />
          <path d="M95,55 Q110,60 125,55" fill="none" stroke="#5a5e66" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M100,48 Q110,52 120,48" fill="none" stroke="#5a5e66" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M105,65 C105,100 95,120 95,120 L125,120 C125,120 115,100 115,65 Z" fill="#f5f5f5" />
          <path d="M80,115 C80,100 140,100 140,115 C140,140 80,140 80,115 Z" fill="#6e737b" />
          <path d="M98,110 C98,103 122,103 122,110 C122,120 98,120 98,110 Z" fill="#2b2b2b" />
          <ellipse cx="104" cy="112" rx="2" ry="3" fill="#111" />
          <ellipse cx="116" cy="112" rx="2" ry="3" fill="#111" />
          <g className="eye">
            <ellipse cx="78" cy="85" rx="8" ry="7" fill="#8b5a2b" />
            <ellipse cx="78" cy="85" rx="5" ry="5" fill="#111" />
            <circle cx="76" cy="83" r="2" fill="#fff" />
            <ellipse cx="142" cy="85" rx="8" ry="7" fill="#8b5a2b" />
            <ellipse cx="142" cy="85" rx="5" ry="5" fill="#111" />
            <circle cx="140" cy="83" r="2" fill="#fff" />
          </g>
          <ellipse cx="60" cy="100" rx="12" ry="18" fill="#5a5e66" opacity="0.4"/>
          <ellipse cx="160" cy="100" rx="12" ry="18" fill="#5a5e66" opacity="0.4"/>

          <path
            className="mouth-smile"
            d={mouthOpen ? "M95,135 Q110,155 125,135" : "M95,135 Q110,145 125,135"}
            fill={mouthOpen ? "#2b2b2b" : "none"}
            stroke="#2b2b2b"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ transition: 'all 0.1s' }}
          />
        </g>
      </svg>
    </div>
  );
};
