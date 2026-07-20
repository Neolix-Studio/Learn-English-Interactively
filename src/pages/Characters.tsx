import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { charactersData } from '../data/characters_data';
import { SidebarLeft } from '../components/SidebarLeft';
import { SidebarRight } from '../components/SidebarRight';
import '../assets/css/dashboard.css';

export const CharactersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [progressData, setProgressData] = useState<Record<string, number>>({});
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const localCharProgress = JSON.parse(localStorage.getItem('guest_character_progress') || '{}');
      setProgressData(localCharProgress);

      if (location.state?.updatedCharacters) {
        const chars = location.state.updatedCharacters;
        setTimeout(() => {
          const firstEl = document.getElementById(`char-${chars[0]}`);
          if (firstEl) {
            firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            chars.forEach((char: string) => {
              const charEl = document.getElementById(`char-${char}`);
              if (charEl) {
                charEl.classList.add('pulse-gold');
                setTimeout(() => charEl.classList.remove('pulse-gold'), 3000);
              }
            });
          }
        }, 300);
      }
    } catch (e) {
      console.error(e);
    }
  }, [location.state]);

  const handleStartLesson = () => {
    const groups = [
        { id: "vowels_short_long_i", chars: ["ɪ", "i"] },
        { id: "vowels_a_e", chars: ["æ", "ɛ"] },
        { id: "vowels_u_o", chars: ["ʌ", "ɑ"] },
        { id: "vowels_oo_oo", chars: ["ʊ", "u"] },
        { id: "vowels_schwa_r", chars: ["ə", "ɚ"] },
        { id: "vowels_o_ow", chars: ["oʊ", "aʊ"] },
        { id: "vowels_a_i_oy", chars: ["eɪ", "aɪ", "ɔɪ"] },
        { id: "cons_s_z", chars: ["s", "z"] },
        { id: "cons_th_th", chars: ["θ", "ð"] },
        { id: "cons_th_s_f", chars: ["θ", "s", "f"] },
        { id: "cons_th_d_z", chars: ["ð", "d", "z"] },
        { id: "cons_v_w", chars: ["v", "w"] },
        { id: "cons_ch_j", chars: ["tʃ", "dʒ"] },
        { id: "cons_sh_zh", chars: ["ʃ", "ʒ"] },
        { id: "cons_m_n_ng", chars: ["m", "n", "ŋ"] },
        { id: "cons_p_b", chars: ["p", "b"] },
        { id: "cons_t_d", chars: ["t", "d"] },
        { id: "cons_k_g", chars: ["k", "g"] },
        { id: "cons_l_r", chars: ["l", "ɹ"] },
        { id: "cons_h_j_f", chars: ["h", "j", "f"] }
    ];

    const availableGroups = groups.filter(g => {
        const level = progressData[g.chars[0]] || 0;
        return level < 5;
    });

    if (availableGroups.length > 0) {
        const randomGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)];
        navigate('/lesson/characters/' + randomGroup.id);
    } else {
        alert("Gratulálok! Minden karakter leckét befejeztél.");
    }
  };

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const renderGrid = (items: typeof charactersData.vowels) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
      {items.map(item => {
        const progressLevel = progressData[item.ipa] || 0;
        const isActive = progressLevel > 0;
        const progressPercent = (progressLevel / 5) * 100;

        return (
          <button
            key={item.id}
            id={`char-${item.ipa}`}
            className="character-tile"
            onClick={() => playAudio(item.example)}
            style={{
              background: 'var(--color-bg-surface)',
              border: isActive ? '2px solid #F59E0B' : '2px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '1.2rem 0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isActive ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)',
              transition: 'all 0.1s',
              position: 'relative',
              width: '100%'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = isActive ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = isActive ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)';
            }}
          >
            {isActive && (
              <>
                <div style={{ position: 'absolute', left: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: '10px', height: '10px', background: '#F59E0B' }}></div>
                <div style={{ position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: '10px', height: '10px', background: '#F59E0B' }}></div>
              </>
            )}
            <div style={{ fontSize: '1.8rem', fontWeight: 600, color: isActive ? '#F59E0B' : 'var(--color-text-main)' }}>{item.ipa}</div>
            <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', fontWeight: 600 }}>{item.example}</div>
            <div style={{ width: '40px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '1rem', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: '#F59E0B' }}></div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="dashboard-container">
      <style>{`
        @keyframes pulseGold {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); border-color: #F59E0B; }
          50% { box-shadow: 0 0 0 20px rgba(245, 158, 11, 0); border-color: #FCD34D; }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); border-color: #F59E0B; }
        }
        .pulse-gold {
          animation: pulseGold 1.5s infinite;
          border: 2px solid #F59E0B !important;
          z-index: 10;
        }
      `}</style>
      <SidebarLeft
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onOpenProfile={() => navigate('/profile')}
      />

      <div className="main-stage-track">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileNavOpen(true)}
          style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 90, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          ☰
        </button>
        <div id="app">

          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.2rem', color: 'var(--color-text-main)', marginBottom: '1rem', fontWeight: 800 }}>Ismerd meg az angol nyelv hangjait!</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Fejleszd a hallásod és tanuld meg kiejteni az angol nyelv hangjait
            </p>
            <button
              onClick={handleStartLesson}
              style={{
                background: 'var(--color-accent-in)',
                color: 'white',
                border: 'none',
                padding: '1.1rem 3rem',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
                boxShadow: '0 4px 0 var(--color-accent-on)',
                transition: 'all 0.1s'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(4px)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 0 var(--color-accent-on)';
              }}
            >
              Kezdés: +10 Pont
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.05)' }}></div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-main)', fontWeight: 800, margin: 0 }}>Magánhangzók</h2>
            <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.05)' }}></div>
          </div>

          {renderGrid(charactersData.vowels)}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '3.5rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.05)' }}></div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-main)', fontWeight: 800, margin: 0 }}>Mássalhangzók</h2>
            <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.05)' }}></div>
          </div>

          {renderGrid(charactersData.consonants)}

        </div>
      </div>

      <SidebarRight />
    </div>
  );
};
