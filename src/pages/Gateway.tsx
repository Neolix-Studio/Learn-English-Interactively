import React, { useEffect } from 'react';
import '../assets/css/gateway.css';
import { SEO } from '../components/SEO';

export const Gateway: React.FC = () => {
  useEffect(() => {
  }, []);

  const setLanguage = (lang: string) => {
    localStorage.setItem('neolix_language', lang);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
      <main className="gateway-container">
      <div className="mascot-wrapper">
        <svg viewBox="0 0 200 200" width="180" height="180" className="floating-mascot">
          <g transform="translate(10, 20)">
            <path className="ear-left" d="M45,70 C25,45 20,75 45,95 Z" fill="#5a5e66" />
            <path className="ear-right" d="M175,70 C195,45 200,75 175,95 Z" fill="#5a5e66" />
            <path d="M50,100 C50,45 170,45 170,100 C170,130 140,145 110,145 C80,145 50,130 50,100 Z" fill="#6e737b" />
            <path d="M105,65 C105,100 95,120 95,120 L125,120 C125,120 115,100 115,65 Z" fill="#f5f5f5" />
            <path d="M80,115 C80,100 140,100 140,115 C140,140 80,140 80,115 Z" fill="#6e737b" />
            <path d="M98,110 C98,103 122,103 122,110 C122,120 98,120 98,110 Z" fill="#2b2b2b" />

            <g className="eye">
              <ellipse cx="78" cy="85" rx="8" ry="7" fill="#8b5a2b" />
              <ellipse cx="78" cy="85" rx="5" ry="5" fill="#111" />
              <circle cx="76" cy="83" r="2" fill="#fff" />

              <ellipse cx="142" cy="85" rx="8" ry="7" fill="#8b5a2b" />
              <ellipse cx="142" cy="85" rx="5" ry="5" fill="#111" />
              <circle cx="140" cy="83" r="2" fill="#fff" />
            </g>
            <path className="mouth-smile" d="M95,135 Q110,145 125,135" fill="none" stroke="#2b2b2b" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      <h1 className="gateway-title">
        Válaszd ki a nyelved<br />
        <span className="subtitle">Vyber si svoj jazyk</span>
      </h1>

      <div className="cards-grid">
        <a href="https://lexipaws.hu" className="language-card active-card" onClick={() => setLanguage('hu')}>
          <div className="flag-icon">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <clipPath id="circle-clip">
                <circle cx="50" cy="50" r="50"/>
              </clipPath>
              <g clipPath="url(#circle-clip)">
                <rect x="0" y="0" width="100" height="33.3" fill="#CE2939"/>
                <rect x="0" y="33.3" width="100" height="33.4" fill="#FFFFFF"/>
                <rect x="0" y="66.7" width="100" height="33.3" fill="#477050"/>
              </g>
              <circle cx="50" cy="50" r="50" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2"/>
            </svg>
          </div>
          <h2>Magyar</h2>
          <p>Tanulj angolul magyarul</p>
          <div className="select-btn">Kiválasztás</div>
        </a>

        <a href="https://lexipaws.sk" className="language-card active-card" onClick={() => setLanguage('sk')}>
          <div className="flag-icon">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <clipPath id="sk-clip">
                <circle cx="50" cy="50" r="50"/>
              </clipPath>
              <g clipPath="url(#sk-clip)">
                <rect x="0" y="0" width="100" height="33.3" fill="#FFFFFF"/>
                <rect x="0" y="33.3" width="100" height="33.4" fill="#0B4EA2"/>
                <rect x="0" y="66.7" width="100" height="33.3" fill="#EE1C25"/>
                <path d="M 30,25 Q 40,25 40,40 L 40,55 Q 30,65 20,55 L 20,40 Q 20,25 30,25 Z" fill="#EE1C25" stroke="#FFFFFF" strokeWidth="2"/>
                <path d="M 23,50 L 30,35 L 37,50 Z" fill="#FFFFFF"/>
                <rect x="28" y="38" width="4" height="15" fill="#FFFFFF"/>
                <rect x="23" y="43" width="14" height="4" fill="#FFFFFF"/>
              </g>
              <circle cx="50" cy="50" r="50" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2"/>
            </svg>
          </div>
          <h2>Slovenský</h2>
          <p>Učte sa anglicky po slovensky</p>
          <div className="select-btn">Výber</div>
        </a>
      </div>
    </main>
    </div>
  );
};
