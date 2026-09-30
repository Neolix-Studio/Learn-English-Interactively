import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { useTranslation } from 'react-i18next';

interface PostLessonProps {
  baseXp: number;
  accuracy: number;
  isGuest: boolean;
  isTutorial?: boolean;
  isCharacterLesson?: boolean;
  onComplete: () => void;
}

export const PostLesson: React.FC<PostLessonProps> = ({ baseXp, accuracy, isGuest, isTutorial, isCharacterLesson, onComplete }) => {
  const { data } = useUser();
  const { t } = useTranslation();
  const initialXp = data?.points || 0;
  const targetXp = initialXp + baseXp;

  const [currentScreen, setCurrentScreen] = useState(1);
  const [displayedXp, setDisplayedXp] = useState(0);
  const [displayedTotalXp, setDisplayedTotalXp] = useState(initialXp);
  const [displayedAccuracy, setDisplayedAccuracy] = useState(0);
  const [selectedStreak, setSelectedStreak] = useState<number | null>(null);

  // Success green is for a result that is one. Below 60% the card is neutral.
  const accuracyTone = accuracy < 60
    ? { background: 'var(--color-bg-surface)', border: 'var(--color-border)', label: 'var(--color-text-muted)', value: 'var(--color-text-main)' }
    : { background: 'rgba(16,185,129,0.1)', border: 'var(--color-success)', label: 'var(--color-success)', value: 'var(--color-success)' };

  useEffect(() => {
    if (currentScreen === 1) {
      const duration = 1500;
      const steps = 45;
      const stepTime = duration / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        const easeOut = 1 - Math.pow(1 - progress, 3);

        setDisplayedXp(Math.floor(baseXp * easeOut));
        setDisplayedTotalXp(Math.floor(initialXp + (baseXp * easeOut)));
        setDisplayedAccuracy(Math.floor(accuracy * easeOut));

        if (currentStep >= steps) {
          clearInterval(timer);
          setDisplayedXp(baseXp);
          setDisplayedTotalXp(targetXp);
          setDisplayedAccuracy(accuracy);
        }
      }, stepTime);

      return () => clearInterval(timer);
    }
  }, [currentScreen, baseXp, accuracy, initialXp, targetXp]);

  const handleNext = () => {
    if (currentScreen === 1) {
      if (!isTutorial) {
        if (isGuest) {
          setCurrentScreen(9);
        } else {
          onComplete();
        }
        return;
      }
      if (isCharacterLesson) {
        if (isGuest) {
          setCurrentScreen(9);
        } else {
          onComplete();
        }
        return;
      }
    }

    // The first-lesson sequence is 1 → 5 → 6 → 9. Screens 2–4 and 7–8 showed invented numbers and are gone (Q13).
    if (currentScreen === 1) {
      setCurrentScreen(5);
    } else if (currentScreen === 6) {
      if (selectedStreak === null) {
        alert(t('post_lesson.streak_warning'));
        return;
      }
      const existingData = JSON.parse(localStorage.getItem('ftue_marketing_data') || '{}');
      existingData.streakCommitment = selectedStreak;
      localStorage.setItem('ftue_marketing_data', JSON.stringify(existingData));
      setCurrentScreen(9);
    } else if (currentScreen === 9) {
      onComplete();
    } else {
      setCurrentScreen(prev => prev + 1);
    }
  };

  const getDopamineText = (days: number) => {
    switch(days) {
      case 7: return t('post_lesson.dopamine_7');
      case 14: return t('post_lesson.dopamine_14');
      case 30: return t('post_lesson.dopamine_30');
      case 50: return t('post_lesson.dopamine_50');
      default: return "";
    }
  };

  return (
    <div
      className="post-lesson-shell"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'var(--color-bg-base)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        animation: 'fadeIn 0.5s ease-in',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseFire {
          0% { filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.5)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 30px rgba(245, 158, 11, 0.8)); transform: scale(1.05); }
          100% { filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.5)); transform: scale(1); }
        }

        @keyframes float3D {
          0% { transform: translateY(0) rotateX(5deg) rotateY(0deg); }
          50% { transform: translateY(-15px) rotateX(-5deg) rotateY(10deg); }
          100% { transform: translateY(0) rotateX(5deg) rotateY(0deg); }
        }
        @keyframes popInBubble {
          0% { transform: scale(0) translateY(20px); opacity: 0; transform-origin: bottom right; }
          70% { transform: scale(1.1) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        .streak-option {
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .streak-option:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.15);
        }
        .streak-option.selected {
          transform: translateY(-2px) scale(1.01);
          border-color: #3b82f6;
          background: #eff6ff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .post-lesson-shell,
        .post-lesson-shell * {
          box-sizing: border-box;
        }

        .post-lesson-hero-image {
          transform: scale(2.35);
          transform-origin: center;
        }

        @media (max-width: 600px), (max-height: 700px) {
          .post-lesson-shell {
            justify-content: flex-start !important;
            align-items: stretch !important;
            height: 100dvh !important;
            padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom)) !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
          }

          .post-lesson-screen {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0;
            margin: 0 auto !important;
          }

          .post-lesson-screen h1,
          .post-lesson-screen h2 {
            max-width: 100%;
            line-height: 1.15 !important;
            overflow-wrap: anywhere;
          }

          .post-lesson-screen h1 {
            font-size: clamp(2rem, 11vw, 2.5rem) !important;
            margin-bottom: 1.25rem !important;
          }

          .post-lesson-screen h2 {
            font-size: clamp(1.55rem, 8vw, 2rem) !important;
            margin-bottom: 1.25rem !important;
          }

          .post-lesson-hero-image {
            width: clamp(92px, 34vw, 150px) !important;
            height: clamp(92px, 34vw, 150px) !important;
            margin-bottom: 0.75rem !important;
          }

          .post-lesson-xp-panel {
            width: 100% !important;
            max-width: 100% !important;
            margin-bottom: 1rem !important;
          }

          .post-lesson-xp-row {
            font-size: clamp(0.95rem, 4.5vw, 1.1rem) !important;
          }

          .post-lesson-metric-grid {
            display: grid !important;
            grid-template-columns: 1fr;
            gap: 0.75rem !important;
            width: 100% !important;
            margin-bottom: 1rem !important;
          }

          .post-lesson-metric-card {
            min-width: 0;
            padding: 1rem !important;
          }

          .post-lesson-metric-value {
            font-size: clamp(2rem, 12vw, 2.5rem) !important;
            line-height: 1.05;
          }

          .post-lesson-chat {
            flex-direction: column;
            align-items: center !important;
            min-height: 0 !important;
            margin-bottom: 1.25rem !important;
            text-align: center;
          }

          .post-lesson-chat > div {
            max-width: 100%;
          }

          .streak-option {
            padding: 1rem !important;
            font-size: 1rem !important;
          }

          .post-lesson-next-wrap {
            width: 100% !important;
            max-width: 100% !important;
            margin-top: 1rem !important;
            padding-top: 0 !important;
          }

          .post-lesson-next-wrap .btn,
          .post-lesson-auth-actions .btn {
            width: 100%;
            min-height: 48px;
            font-size: 1rem !important;
            white-space: normal;
          }
        }
      `}</style>

      {currentScreen === 1 && (
        <div className="post-lesson-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '600px', animation: 'slideUp 0.5s ease-out' }}>
          <img className="post-lesson-hero-image" src="/assets/images/Transparent PNGs/tyler-jump.png" alt="Lexi Happy" style={{ width: '200px', height: '200px', objectFit: 'contain', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.2))', marginBottom: '1rem' }} />
          <h1 style={{ color: 'var(--color-accent-in)', fontSize: '2.5rem', margin: '0 0 2rem 0' }}>{t('post_lesson.completed_title')}</h1>

          <div className="post-lesson-xp-panel" style={{ width: '100%', maxWidth: '400px', marginBottom: '2rem' }}>
            <div className="post-lesson-xp-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-text-main)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                <span>XP: {displayedTotalXp}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>/ {Math.floor(targetXp / 1000) * 1000 + 1000}</span>
            </div>
            <div style={{ width: '100%', height: '20px', background: 'var(--color-bg-base)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{
                    width: `${Math.min(100, Math.max(0, (displayedTotalXp % 1000) / 10))}%`,
                    height: '100%',
                    background: 'var(--color-accent-in)',
                    transition: 'width 0.1s linear'
                }}></div>
            </div>
          </div>

          <div className="post-lesson-metric-grid" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', width: '100%' }}>
            <div className="post-lesson-metric-card" style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid #F59E0B', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', flex: 1 }}>
              <div style={{ color: '#F59E0B', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('post_lesson.earned_xp')}</div>
              <div className="post-lesson-metric-value" style={{ fontSize: '2.5rem', color: '#F59E0B', fontWeight: 800 }}>+{displayedXp}</div>
            </div>
            <div className="post-lesson-metric-card" data-tone={accuracy < 60 ? 'neutral' : 'success'} style={{ background: accuracyTone.background, border: `2px solid ${accuracyTone.border}`, borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', flex: 1 }}>
              <div style={{ color: accuracyTone.label, fontWeight: 'bold', textTransform: 'uppercase' }}>{t('post_lesson.accuracy')}</div>
              <div className="post-lesson-metric-value" style={{ fontSize: '2.5rem', color: accuracyTone.value, fontWeight: 800 }}>{displayedAccuracy}%</div>
            </div>
          </div>
        </div>
      )}

      {currentScreen === 5 && (
        <div className="post-lesson-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '600px', animation: 'fadeIn 0.5s' }}>
          <svg viewBox="0 0 100 100" width="180" height="180" style={{ animation: 'pulseFire 2s infinite' }}>
              <defs>
                  <linearGradient id="fireGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
              </defs>
              <path d="M 50 10 C 30 40 10 60 20 80 C 25 90 35 95 50 95 C 65 95 75 90 80 80 C 90 60 70 40 50 10 Z" fill="url(#fireGrad2)"/>
              <path d="M 50 40 C 40 60 30 75 35 85 C 40 90 45 92 50 92 C 55 92 60 90 65 85 C 70 75 60 60 50 40 Z" fill="#FFFBEB"/>
          </svg>
          <h2 style={{ color: '#F59E0B', fontSize: '3.5rem', margin: '0.5rem 0' }}>1</h2>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)', textTransform: 'uppercase' }}>{t('post_lesson.streak_days')}</div>

          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '2rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((day, index) => {
              const todayIndex = (new Date().getDay() + 6) % 7;
              const isToday = index === todayIndex;
              const isPast = index < todayIndex;

              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: isToday ? '#F59E0B' : 'var(--color-text-muted)', fontWeight: isToday ? 'bold' : 'normal' }}>
                    {day}
                  </div>
                  <div style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: isToday ? 'transparent' : (isPast ? 'var(--color-bg-surface)' : 'transparent'),
                    border: isToday ? '3px solid #F59E0B' : '2px dashed var(--color-border)',
                    boxShadow: isToday ? '0 0 15px rgba(245, 158, 11, 0.4)' : 'none'
                  }}>
                    {isToday && (
                       <svg viewBox="0 0 100 100" width="24" height="24">
                           <path d="M 50 10 C 30 40 10 60 20 80 C 25 90 35 95 50 95 C 65 95 75 90 80 80 C 90 60 70 40 50 10 Z" fill="#F59E0B"/>
                       </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '1rem', width: '100%' }}>
              <p style={{ color: '#EF4444', textAlign: 'center', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                 {t('post_lesson.streak_caution')}
              </p>
          </div>
        </div>
      )}

      {currentScreen === 6 && (
        <div className="post-lesson-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '600px', animation: 'fadeIn 0.5s' }}>

          <div className="post-lesson-chat" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', width: '100%', marginBottom: '2rem', minHeight: '120px' }}>
             <div style={{ flexShrink: 0, animation: 'slideUp 0.6s ease-out' }}>
                 <svg viewBox="0 0 200 200" width="100" height="100">
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

             <div style={{ flex: 1, position: 'relative' }}>
                 <div style={{
                     background: selectedStreak ? 'var(--color-bg-surface)' : 'rgba(255,255,255,0.5)',
                     border: selectedStreak ? '2px solid #3B82F6' : '2px solid var(--color-border)',
                     borderRadius: '16px',
                     borderTopLeftRadius: '0',
                     padding: '1.25rem',
                     color: 'var(--color-text-main)',
                     fontWeight: 600,
                     fontSize: '1.1rem',
                     lineHeight: '1.5',
                     boxShadow: selectedStreak ? '0 10px 25px rgba(59, 130, 246, 0.15)' : 'none',
                     animation: 'popInBubble 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                 }}>
                    {selectedStreak === null
                      ? t('post_lesson.choose_goal')
                      : getDopamineText(selectedStreak)}
                 </div>
             </div>
          </div>

          <h2 style={{ color: 'var(--color-text-main)', fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>{t('post_lesson.commit_title')}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            {[
              { id: 7, label: t('post_lesson.streak_option', { days: 7 }) },
              { id: 14, label: t('post_lesson.streak_option', { days: 14 }) },
              { id: 30, label: t('post_lesson.streak_option', { days: 30 }) },
              { id: 50, label: t('post_lesson.streak_option', { days: 50 }) }
            ].map(goal => (
              <button
                key={goal.id}
                className={`streak-option ${selectedStreak === goal.id ? 'selected' : ''}`}
                onClick={() => setSelectedStreak(goal.id)}
                style={{
                  padding: '1.25rem',
                  border: '2px solid var(--color-border)',
                  borderRadius: '16px',
                  background: 'var(--color-bg-surface)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--color-text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔥</span>
                    <span>{goal.label}</span>
                </div>
                {selectedStreak === goal.id && (
                    <span style={{ color: '#3B82F6', fontSize: '1.5rem' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentScreen === 9 && (
        <div className="post-lesson-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '500px', animation: 'fadeIn 0.5s' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'float3D 3s infinite ease-in-out' }}>🔒</div>
          <h2 style={{ color: 'var(--color-text-main)', fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>{t('post_lesson.save_progress_title')}</h2>
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '3rem', fontSize: '1.2rem', lineHeight: '1.6' }}>
            {t('post_lesson.save_progress_desc')}
          </p>

          <div className="post-lesson-auth-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '1rem', fontSize: '1.2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}
                onClick={() => {
                  localStorage.setItem("forceBetaRequestModal", "true");
                  window.location.href = "/";
                }}
              >
                {t('post_lesson.create_profile_btn')}
              </button>
              <button
                className="btn"
                style={{ cursor: 'pointer', background: 'transparent', border: '2px solid rgba(0,0,0,0.1)', color: 'var(--color-text-muted)', padding: '1rem', fontSize: '1.2rem', borderRadius: '16px', transition: 'background 0.2s' }}
                onClick={onComplete}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                {t('post_lesson.later_btn')}
              </button>
          </div>
        </div>
      )}

      {currentScreen !== 9 && (
        <div className="post-lesson-next-wrap" style={{ width: '100%', maxWidth: '600px', marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}
            onClick={handleNext}
          >
            {t('post_lesson.continue_btn')}
          </button>
        </div>
      )}
    </div>
  );
};
