import { useEffect, useRef } from 'react';

export function LexiAnimation() {
  const f1Ref = useRef<SVGSVGElement>(null);
  const f2Ref = useRef<SVGSVGElement>(null);
  const fkRef = useRef<SVGSVGElement>(null);
  const fsRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const f1 = f1Ref.current;
    const f2 = f2Ref.current;
    const fk = fkRef.current;
    const fs = fsRef.current;

    if (!f1 || !f2 || !fk || !fs) return;

    const start = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;

      f1.style.display = 'none';
      f2.style.display = 'none';
      fk.style.display = 'none';
      fs.style.display = 'none';

      if (elapsed < 1600) {
        if (Math.floor(elapsed / 200) % 2 === 0) {
          f1.style.display = 'block';
        } else {
          f2.style.display = 'block';
        }
      } else if (elapsed < 1900) {
        fk.style.display = 'block';
      } else {
        fs.style.display = 'block';
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-mascot-wrapper" style={{ position: 'relative', zIndex: 999 }}>
      <div id="landing-lexi-container" style={{ position: 'relative', animation: 'runTranslate 2s ease-out forwards', zIndex: 999 }}>
        <div id="lexi-welcome-bubble" style={{ position: 'absolute', top: '-20px', left: '-80px', background: 'white', padding: '10px 20px', borderRadius: '20px', border: '2px solid #E5E7EB', fontWeight: 800, color: '#1F2937', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', opacity: 0, animation: 'popIn 0.5s ease forwards 2.5s', zIndex: 10 }}>
          Üdvözöllek!
          <div style={{ position: 'absolute', bottom: '-8px', right: '-10px', width: '20px', height: '20px', background: 'white', borderBottom: '2px solid #E5E7EB', borderRight: '2px solid #E5E7EB', transform: 'rotate(45deg)', zIndex: -1 }}></div>
        </div>

        <div style={{ position: 'relative', width: '300px', height: '200px', animation: 'float 4s ease-in-out infinite', animationDelay: '2s' }} id="landing-lexi-svg">

          <svg ref={f1Ref} className="lexi-frame frame-run-1" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: '100%', height: '100%', top: '30px', display: 'none' }}>
            <g>
              <path d="M50,100 C50,60 140,60 160,100 Z" fill="#5a5e66" />
              <path d="M120,90 C120,110 130,120 140,115" stroke="#5a5e66" strokeWidth="15" strokeLinecap="round" fill="none" />
              <path d="M60,90 C60,110 70,120 80,115" stroke="#5a5e66" strokeWidth="15" strokeLinecap="round" fill="none" />
              <path d="M40,90 Q20,100 10,80" stroke="#4a4d54" strokeWidth="15" strokeLinecap="round" fill="none" />
            </g>
            <g className="dog-head" transform="translate(130, 40)">
              <circle cx="30" cy="30" r="30" fill="#6e737b" />
              <path d="M50,20 C65,20 75,35 60,50 Z" fill="#f5f5f5" />
              <ellipse cx="65" cy="25" rx="5" ry="3" fill="#111" />
              <ellipse cx="40" cy="20" rx="4" ry="4" fill="#111" />
              <path d="M10,0 C0,-10 -5,10 10,20 Z" fill="#5a5e66" />
              <path d="M40,-5 C50,-20 60,0 50,10 Z" fill="#5a5e66" />
            </g>
          </svg>

          <svg ref={f2Ref} className="lexi-frame frame-run-2" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: '100%', height: '100%', top: '20px', display: 'none' }}>
            <g>
              <path d="M40,100 C40,70 150,60 170,90 Z" fill="#5a5e66" />
              <path d="M130,80 L160,110" stroke="#5a5e66" strokeWidth="15" strokeLinecap="round" fill="none" />
              <path d="M60,80 L20,110" stroke="#5a5e66" strokeWidth="15" strokeLinecap="round" fill="none" />
              <path d="M30,80 Q10,70 5,60" stroke="#4a4d54" strokeWidth="15" strokeLinecap="round" fill="none" />
            </g>
            <g className="dog-head" transform="translate(140, 30)">
              <circle cx="30" cy="30" r="30" fill="#6e737b" />
              <path d="M50,20 C65,20 75,35 60,50 Z" fill="#f5f5f5" />
              <ellipse cx="65" cy="25" rx="5" ry="3" fill="#111" />
              <ellipse cx="40" cy="20" rx="4" ry="4" fill="#111" />
              <path d="M10,0 C0,-10 -5,10 10,20 Z" fill="#5a5e66" />
              <path d="M40,-5 C50,-20 60,0 50,10 Z" fill="#5a5e66" />
            </g>
          </svg>

          <svg ref={fkRef} className="lexi-frame frame-skid" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: '100%', height: '100%', top: '10px', display: 'none' }}>
            <g transform="rotate(-15) translate(0, 30)">
              <path d="M50,100 C50,60 130,70 150,110 Z" fill="#5a5e66" />
              <path d="M120,90 L140,130" stroke="#5a5e66" strokeWidth="15" strokeLinecap="round" fill="none" />
              <path d="M70,90 L50,130" stroke="#5a5e66" strokeWidth="15" strokeLinecap="round" fill="none" />
            </g>
            <circle cx="30" cy="140" r="10" fill="#E5E7EB" opacity="0.8" />
            <circle cx="10" cy="135" r="15" fill="#E5E7EB" opacity="0.6" />
            <circle cx="45" cy="130" r="8" fill="#E5E7EB" opacity="0.4" />

            <g className="dog-head" transform="translate(110, 20) rotate(-10)">
              <circle cx="40" cy="40" r="35" fill="#6e737b" />
              <path d="M50,40 Q65,40 70,60 Q50,70 40,60 Z" fill="#f5f5f5" />
              <ellipse cx="65" cy="50" rx="6" ry="4" fill="#111" />
              <ellipse cx="40" cy="35" rx="5" ry="5" fill="#111" />
              <ellipse cx="60" cy="35" rx="5" ry="5" fill="#111" />
              <path d="M15,10 C5,0 0,20 15,30 Z" fill="#5a5e66" />
              <path d="M60,0 C70,-15 80,5 70,15 Z" fill="#5a5e66" />
            </g>
          </svg>

          <svg ref={fsRef} className="lexi-frame frame-sit" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible', top: 0, display: 'none' }}>
            <defs>
              <linearGradient id="heroBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7a7f87" />
                <stop offset="100%" stopColor="#5a5e66" />
              </linearGradient>
            </defs>
            <g className="body-bounce">
              <path d="M50,190 C50,130 90,120 90,160 C90,180 70,200 50,190 Z" fill="#5a5e66" />
              <path d="M150,190 C150,130 110,120 110,160 C110,180 130,200 150,190 Z" fill="#5a5e66" />
              <ellipse cx="95" cy="195" rx="12" ry="6" fill="#f5f5f5" />
              <ellipse cx="145" cy="195" rx="12" ry="6" fill="#4a4d54" />
              <ellipse cx="85" cy="195" rx="10" ry="5" fill="#f5f5f5" />
              <path d="M80,190 C80,100 160,100 160,190 Z" fill="url(#heroBodyGrad)" />
              <path d="M95,190 C85,140 105,110 120,110 C135,110 155,140 145,190 Z" fill="#f5f5f5" />
              <path d="M95,150 C110,140 130,140 145,150 Z" fill="url(#heroBodyGrad)" />

              <path d="M45,115 C25,130 20,160 35,175 C50,190 60,160 60,140 Z" fill="#5a5e66" />
              <circle cx="35" cy="175" r="10" fill="#f5f5f5" />
            </g>

            <g className="dog-head body-bounce" transform="translate(10, -5)">
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
              <path className="mouth-smile" d="M95,135 Q110,145 125,135" fill="none" stroke="#2b2b2b" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            <g className="body-bounce" transform="translate(160, 125) scale(-1, 1) rotate(45)" style={{ transformOrigin: 'center', animation: 'waveArmRight 1s infinite alternate' }}>
              <path d="M0,0 Q20,-30 40,0 L35,15 Q20,-10 5,15 Z" fill="#7a7f87" />
              <circle cx="40" cy="0" r="12" fill="#f5f5f5" />
              <circle cx="45" cy="-5" r="5" fill="#f5f5f5" />
              <circle cx="35" cy="-8" r="5" fill="#f5f5f5" />
              <circle cx="48" cy="2" r="5" fill="#f5f5f5" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
