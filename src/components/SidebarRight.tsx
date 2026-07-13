import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { useShop } from '../context/ShopContext';
import { api } from '../utils/api';

interface SidebarRightProps {
  onOpenShop?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({ onOpenShop, isOpen, onClose }) => {
  const { isGuest, data, activeLevel } = useUser();
  const { openShop } = useShop();
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [now, setNow] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 60000);
    return () => clearInterval(interval);
  }, []);



  useEffect(() => {
    const fetchLeaderboard = async () => {
      const res = await api.fetch('get_leaderboard');
      if (res && res.leaderboard) {
        setLeaderboard(res.leaderboard);
      }
    };
    fetchLeaderboard();
  }, [data.points]); // Refetch if points change

  // Helper to calculate XP progress visually
  const xp = data.points || 0;
  // Temporary logic for XP thresholds (mocked for now based on legacy logic)
  const nextTier = Math.floor(xp / 1000) * 1000 + 1000;
  const progressPercent = Math.min(100, Math.max(0, (xp % 1000) / 10));

  // Determine Level text
  const personalLevel = data.scores?.level || 1;

  // Determine active streak and shields
  const streakCount = data.scores?.streak_count || 0;
  
  // Energy Calculation
  const energy = data.energy ?? 5;
  const isPremium = data.subscription_tier === 'premium' || data.subscription_tier === 'lifetime';
  
  let nextEnergyIn = "";
  if (!isPremium && energy < 5 && data.last_energy_refill) {
      const refillTime = new Date(data.last_energy_refill).getTime();
      const nextRefillTime = refillTime + (2 * 60 * 60 * 1000); // 2 hours
      const diff = Math.max(0, nextRefillTime - now);
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      nextEnergyIn = `${h}h ${m}m`;
  }
  const streakShields = data.scores?.streak_shields || 0;

  return (
    <aside className={`dashboard-right-sidebar ${isOpen ? 'is-active' : ''}`} aria-label={t('sidebar_right.stats_panel_aria')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>

        {/* TOP STATS BAR */}
        <div className="top-stats-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.8rem', background: 'var(--color-bg-surface)', borderBottom: 'var(--glass-border)', marginBottom: '0.2rem' }}>
          {/* Flag Icon */}
          <div className="stat-icon-group" title="US/Hungarian" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            <svg width="28" height="28" viewBox="0 0 100 100" style={{ borderRadius: '50%', overflow: 'hidden', border: 'var(--glass-border)' }}>
              <defs>
                <clipPath id="us-clip"><polygon points="0,0 100,0 0,100" /></clipPath>
                <clipPath id="hu-clip"><polygon points="100,0 100,100 0,100" /></clipPath>
              </defs>
              <g clipPath="url(#us-clip)">
                <rect x="0" y="0" width="100" height="14" fill="#B22234"/><rect x="0" y="14" width="100" height="14" fill="#fff"/><rect x="0" y="28" width="100" height="14" fill="#B22234"/><rect x="0" y="42" width="100" height="14" fill="#fff"/><rect x="0" y="56" width="100" height="14" fill="#B22234"/><rect x="0" y="70" width="100" height="14" fill="#fff"/><rect x="0" y="84" width="100" height="16" fill="#B22234"/>
                <rect x="0" y="0" width="50" height="50" fill="#3C3B6E"/>
                <circle cx="12" cy="12" r="3.5" fill="#fff"/><circle cx="38" cy="12" r="3.5" fill="#fff"/><circle cx="25" cy="25" r="3.5" fill="#fff"/><circle cx="12" cy="38" r="3.5" fill="#fff"/><circle cx="38" cy="38" r="3.5" fill="#fff"/>
              </g>
              <g clipPath="url(#hu-clip)">
                <rect x="0" y="0" width="100" height="33.3" fill="#CE2939"/><rect x="0" y="33.3" width="100" height="33.3" fill="#fff"/><rect x="0" y="66.6" width="100" height="33.4" fill="#436F4D"/>
              </g>
              <line x1="0" y1="100" x2="100" y2="0" stroke="var(--color-bg-base)" strokeWidth="3"/>
            </svg>
            <span>ENG</span>
          </div>
          {/* Fire Streak */}
          <div className="stat-icon-group" title={t('sidebar_right.daily_streak_title')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#FF9800' }}>
            <svg width="24" height="24" viewBox="0 0 100 100">
              <path d="M50,10 C50,10 20,40 20,70 C20,86.5 33.5,100 50,100 C66.5,100 80,86.5 80,70 C80,40 50,10 50,10 Z" fill="#FF9800"/>
              <path d="M50,40 C50,40 35,60 35,75 C35,83.3 41.7,90 50,90 C58.3,90 65,83.3 65,75 C65,60 50,40 50,40 Z" fill="#FFC107"/>
            </svg>
            <span>{streakCount}</span>
          </div>
          {/* Energy */}
          <div className="stat-icon-group" title={t('sidebar_right.energy_title')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#3B82F6' }}>
            <img src="/assets/images/energy.svg" alt="Energy" width="24" height="24" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>{isPremium ? '∞' : `${energy}/5`}</span>
              {nextEnergyIn && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '-2px', fontWeight: 'bold' }}>{nextEnergyIn}</span>}
            </div>
          </div>
          {/* Dog Treat Currency */}
          <div className="stat-icon-group" title={t('sidebar_right.dog_treats_title')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#8D6E63' }}>
            <svg width="24" height="24" viewBox="0 0 100 100" style={{ marginRight: '2px', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' }}>
              <g transform="rotate(-30 50 50)">
                <path d="M25 40 C15 40 15 25 25 25 C32 25 35 30 35 35 L65 35 C65 30 68 25 75 25 C85 25 85 40 75 40 C70 40 68 45 68 50 C68 55 70 60 75 60 C85 60 85 75 75 75 C68 75 65 70 65 65 L35 65 C35 70 32 75 25 75 C15 75 15 60 25 60 C30 60 32 55 32 50 C32 45 30 40 25 40 Z" fill="#FDE68A" stroke="#D97706" strokeWidth="4" strokeLinejoin="round"/>
                <circle cx="40" cy="50" r="2.5" fill="#D97706" opacity="0.6"/>
                <circle cx="50" cy="50" r="2.5" fill="#D97706" opacity="0.6"/>
                <circle cx="60" cy="50" r="2.5" fill="#D97706" opacity="0.6"/>
              </g>
            </svg>
            <span>{data.scores?.bones || 0}</span>
          </div>
        </div>

        {/* SHOP BUTTON */}
        <div style={{ padding: '0 0.8rem', margin: '0.2rem 0' }}>
          <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '10px', fontWeight: 'bold' }} onClick={openShop}>
            {t('sidebar_right.shop_btn')}
          </button>
        </div>

        <button className="mobile-close-stats-btn" onClick={onClose}>✕ {t('sidebar.close')}</button>
        
        {/* XP és Szint progresszió */}
        <div className="stats-widget" style={{ padding: '0.4rem 0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('sidebar_right.personal_level')}</h3>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent-in)' }}>{t('sidebar_right.level_label', { level: personalLevel })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-main)' }}>XP: {xp} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>/ {nextTier}</span></span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{activeLevel} {t('sidebar_right.learner')}</span>
          </div>
          <div className="xp-level-bar" style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
            <div className="xp-level-fill" id="xp-fill-bar" style={{ 
                height: '100%', 
                width: '100%', 
                transform: `scaleX(${progressPercent / 100})`,
                transformOrigin: 'left',
                background: 'linear-gradient(180deg, var(--color-accent-on) 0%, var(--color-accent-in) 100%)', 
                transition: 'transform 0.5s ease',
                borderRadius: '8px',
                boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.2), 0 2px 6px rgba(59, 130, 246, 0.4)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Glossy Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, height: '40%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
                    borderRadius: '8px 8px 0 0'
                }}></div>
            </div>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.8rem 0' }} />



        {/* Heti Ranglista (Leaderboard) */}
        <div className="stats-widget" style={{ padding: '0.4rem 0.8rem' }}>
          {!isGuest && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('sidebar_right.weekly_leaderboard_title')}</h3>
              <span style={{ fontSize: '0.9rem' }}>🔒</span>
            </div>
          )}
          
          {isGuest ? (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '1.2rem', background: 'var(--color-bg-surface)', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--color-text-main)', marginBottom: '1.5rem', lineHeight: '1.4', fontWeight: 800, textAlign: 'center' }}>{t('sidebar_right.save_progress_msg')}</h4>
              <button 
                onClick={() => { localStorage.setItem("forceRegisterModal", "true"); window.location.href = "/"; }}
                style={{ width: '100%', padding: '0.9rem', background: '#58cc02', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '1rem', cursor: 'pointer', boxShadow: '0 4px 0 #46a302', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.2s' }}
                onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(4px)', e.currentTarget.style.boxShadow = 'none')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'none', e.currentTarget.style.boxShadow = '0 4px 0 #46a302')}
              >
                {t('sidebar_right.create_profile_btn')}
              </button>
              <button 
                onClick={() => { localStorage.setItem("forceLoginModal", "true"); window.location.href = "/"; }}
                style={{ width: '100%', padding: '0.9rem', background: '#1cb0f6', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 0 #1899d6', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.2s' }}
                onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(4px)', e.currentTarget.style.boxShadow = 'none')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'none', e.currentTarget.style.boxShadow = '0 4px 0 #1899d6')}
              >
                {t('sidebar_right.login_btn')}
              </button>
            </div>
          ) : xp < 150 ? (
            <div style={{ textAlign: 'center', padding: '0.6rem', background: 'var(--color-bg-surface)', borderRadius: '8px', border: '1px dashed var(--color-text-muted)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{t('sidebar_right.gather_xp_msg', { amount: 150 - xp })}</p>
              <div style={{ width: '100%', height: '8px', background: 'var(--color-bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(xp / 150) * 100}%`, height: '100%', background: 'var(--color-accent-in)', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {(() => {
                if (leaderboard.length === 0) return <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>{t('sidebar_right.no_data')}</div>;
                
                const userIndex = leaderboard.findIndex((u: any) => u.username === data.username);
                let visibleIndices: number[] = [];
                if (userIndex === -1) {
                  for (let i = 0; i < Math.min(5, leaderboard.length); i++) visibleIndices.push(i);
                } else {
                  const indices = new Set<number>();
                  for (let i = 0; i < Math.min(3, leaderboard.length); i++) indices.add(i);
                  for (let i = Math.max(0, userIndex - 2); i <= Math.min(leaderboard.length - 1, userIndex + 2); i++) indices.add(i);
                  visibleIndices = Array.from(indices).sort((a, b) => a - b);
                }

                return visibleIndices.map((idx, i) => {
                  const user = leaderboard[idx];
                  const isCurrent = user.username === data.username;
                  const showDivider = i > 0 && visibleIndices[i] - visibleIndices[i - 1] > 1;
                  
                  return (
                    <React.Fragment key={idx}>
                      {showDivider && (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: '0.2rem 0', letterSpacing: '2px' }}>•••</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isCurrent ? 'rgba(59, 130, 246, 0.1)' : 'transparent', border: isCurrent ? '1px solid var(--color-accent-in)' : '1px solid transparent', padding: '0.5rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ fontWeight: 'bold', width: '20px', textAlign: 'center', color: isCurrent ? 'var(--color-accent-in)' : 'var(--color-text-muted)' }}>{idx + 1}</div>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--color-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', overflow: 'hidden' }}>
                            {isCurrent ? '👤' : '🔥'}
                          </div>
                          <span style={{ fontWeight: isCurrent ? 600 : 400, color: isCurrent ? 'var(--color-text-main)' : 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px', display: 'inline-block', flex: 1 }} title={user.username}>{isCurrent ? `${user.username} ${t('sidebar_right.you')}` : user.username}</span>
                        </div>
                        <span style={{ fontWeight: isCurrent ? 'bold' : 'normal', color: isCurrent ? 'var(--color-accent-in)' : 'var(--color-text-muted)', whiteSpace: 'nowrap', paddingLeft: '0.5rem' }}>{user.points} XP</span>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          )}
        </div>

        <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.3rem 0' }} />

        {/* Napi Küldetések (Daily Quests) */}
        <div className="stats-widget" style={{ padding: '0.4rem 0.8rem' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem', fontWeight: 700 }}>{t('sidebar_right.daily_quests_title')}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {data.active_quests && data.active_quests.length > 0 ? (
              data.active_quests.map((quest: any, idx: number) => {
                const progress = data.quest_progress?.[quest.id] || 0;
                const isCompleted = progress >= quest.target;
                const progressPercent = Math.min(100, (progress / quest.target) * 100);
                
                return (
                  <div key={idx} style={{ padding: '0.5rem 0.6rem', borderRadius: '10px', background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-bg-surface)', border: isCompleted ? '1px solid #10B981' : 'var(--glass-border)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{quest.title || quest.description}</span>
                    <div style={{ marginTop: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', fontWeight: 'bold' }}>{t('sidebar_right.progress')}</span>
                        <span style={{ fontSize: '0.75rem', color: isCompleted ? '#10B981' : 'var(--color-text-muted)', fontWeight: 'bold' }}>{progress} / {quest.target}</span>
                      </div>
                      {/* 3D Progress Bar Track */}
                      <div style={{ 
                          width: '100%', 
                          height: '10px', 
                          background: 'rgba(255,255,255,0.05)', 
                          borderRadius: '5px', 
                          overflow: 'hidden',
                          position: 'relative',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' 
                      }}>
                        {/* 3D Progress Bar Fill */}
                        <div style={{ 
                            width: `${progressPercent}%`, 
                            height: '100%', 
                            background: isCompleted ? 'linear-gradient(180deg, #34D399 0%, #10B981 100%)' : 'linear-gradient(180deg, var(--color-accent-on) 0%, var(--color-accent-in) 100%)',
                            borderRadius: '5px',
                            boxShadow: isCompleted ? 'inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.2)' : 'inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.2)',
                            position: 'relative'
                        }}>
                            {/* Glossy Overlay */}
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, height: '40%',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
                                borderRadius: '5px 5px 0 0'
                            }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{t('sidebar_right.no_active_quests')}</p>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
};
