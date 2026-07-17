import { SkeletonLeaderboardRow } from '../components/SkeletonLoader';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarLeft } from '../components/SidebarLeft';
import { SidebarRight } from '../components/SidebarRight';
import { LeaderboardTour } from '../components/ProductTour';
import { MobileBottomBar } from '../components/MobileBottomBar';
import { api } from '../utils/api';
import { isLeaderboardUnlocked } from '../utils/featureUnlocks';
import { useUser } from '../context/UserContext';
import '../assets/css/dashboard.css';

interface LeaderboardUser {
  username: string;
  xp: number;
  rank?: number;
  active_title?: string | null;
  active_border?: string | null;
}

export const LeaderboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading: isUserLoading } = useUser();
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [leagueId, setLeagueId] = useState<number>(1);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserXp, setCurrentUserXp] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const navigate = useNavigate();

  const [weeklyCountdown, setWeeklyCountdown] = useState('');
  useEffect(() => {
    const getNextMonday = () => {
      const now = new Date();
      const day = now.getDay();
      const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
      const next = new Date(now);
      next.setDate(now.getDate() + daysUntilMonday);
      next.setHours(0, 0, 0, 0);
      return next;
    };
    const tick = () => {
      const diff = getNextMonday().getTime() - Date.now();
      if (diff <= 0) { setWeeklyCountdown(t('leaderboard.soon')); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setWeeklyCountdown(`${d}n ${h}ó ${m}p ${s}mp`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [t]);

  const currentUsername = data.username;
  const listRef = useRef<HTMLDivElement>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.fetch(`get_leaderboard&timeframe=${timeframe}&league_id=${leagueId}`);
      if (response.success) {
        setUsers(response.leaderboard);
        setCurrentUserRank(response.userRank);
        setCurrentUserXp(response.userXp);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, [timeframe, leagueId]);

  useEffect(() => {
    fetchLeaderboard();
    window.addEventListener('lexipawsProgressSaved', fetchLeaderboard);
    return () => window.removeEventListener('lexipawsProgressSaved', fetchLeaderboard);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!isLeaderboardUnlocked(data.points)) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const pending = localStorage.getItem('lexipaws_leaderboard_tour_pending');
    const completed = localStorage.getItem('lexipaws_leaderboard_tour_completed');
    if (pending && !completed) {
      localStorage.setItem('lexipaws_dashboard_leaderboard_summary_pending', 'true');
      setRunTour(true);
    }
  }, [data.points, isUserLoading, navigate]);

  useEffect(() => {
    document.body.classList.toggle('has-mobile-drawer-open', isMobileNavOpen);
    return () => document.body.classList.remove('has-mobile-drawer-open');
  }, [isMobileNavOpen]);

  const handleTourEnd = () => {
    setRunTour(false);
    setIsMobileNavOpen(false);
    localStorage.removeItem('lexipaws_leaderboard_tour_pending');
    localStorage.setItem('lexipaws_leaderboard_tour_completed', 'true');
  };

  const handleLeaderboardTourStepChange = useCallback((index: number) => {
    if (!window.matchMedia('(max-width: 991px)').matches) return;
    setIsMobileNavOpen(index === 0);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await api.fetch(`search_leaderboard&username=${encodeURIComponent(searchQuery.trim())}&timeframe=${timeframe}&league_id=${leagueId}`);
      if (response.success) {
        const { rank, xp, username } = response;

        let userIndex = users.findIndex(u => u.username === username);
        let updatedUsers = [...users];

        if (userIndex === -1) {
            updatedUsers.push({ username, xp, rank });
            updatedUsers.sort((a, b) => b.xp - a.xp);
            setUsers(updatedUsers);
            setTimeout(() => {
                scrollToAndHighlight(username);
            }, 100);
        } else {
            scrollToAndHighlight(username);
        }
      } else {
        alert(response.message || t('leaderboard.user_not_found'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToAndHighlight = (username: string) => {
    const el = document.getElementById(`user-row-${username}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash-orange');
        setTimeout(() => el.classList.remove('flash-orange'), 3000);
    }
  };

  const getLeagueName = (id: number) => {
    switch (id) {
        case 1: return { name: t('leaderboard.league_bronze'), color: '#CD7F32', icon: '🥉' };
        case 2: return { name: t('leaderboard.league_silver'), color: '#C0C0C0', icon: '🥈' };
        case 3: return { name: t('leaderboard.league_gold'), color: '#FFD700', icon: '🥇' };
        case 4: return { name: t('leaderboard.league_diamond'), color: '#00BFFF', icon: '💎' };
        default: return { name: '', color: '', icon: '' };
    }
  };

  return (
    <div className="dashboard-container">
      <LeaderboardTour
        run={runTour}
        onTourEnd={handleTourEnd}
        onStepChange={handleLeaderboardTourStepChange}
      />
      <style>{`
        @keyframes flashOrange {
          0% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.8); border-color: #F59E0B; transform: scale(1.02); }
          50% { box-shadow: 0 0 20px 4px rgba(245, 158, 11, 0.4); border-color: #FCD34D; transform: scale(1.02); }
          100% { box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-color: transparent; transform: scale(1); }
        }
        .flash-orange {
          animation: flashOrange 2s ease-out;
          z-index: 10;
        }

        .segmented-control {
            display: flex;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 4px;
            margin-bottom: 2rem;
            width: 100%;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
        }
        .segment-btn {
            flex: 1;
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: var(--color-text-muted);
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 1rem;
        }
        .segment-btn.active {
            background: var(--color-accent-in);
            color: white;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .league-tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        .league-tab {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.8rem 1.5rem;
            border-radius: 16px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            background: var(--color-bg-surface);
            color: var(--color-text-muted);
            border: 2px solid rgba(255,255,255,0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .league-tab:hover {
            transform: translateY(-2px);
            border-color: rgba(255,255,255,0.2);
        }
        .leaderboard-row {
            display: flex;
            align-items: center;
            padding: 1rem;
            background: var(--color-bg-surface);
            border-radius: 16px;
            margin-bottom: 0.5rem;
            transition: transform 0.2s ease;
            position: relative;
            overflow: hidden;
        }
        .leaderboard-row:hover {
            transform: translateX(5px);
        }
        .rank-number {
            width: 50px;
            font-size: 1.2rem;
            font-weight: 900;
            color: var(--color-text-muted);
        }

        .rank-1 { background: linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, var(--color-bg-surface) 100%); border-left: 4px solid #FFD700; }
        .rank-2 { background: linear-gradient(90deg, rgba(192, 192, 192, 0.15) 0%, var(--color-bg-surface) 100%); border-left: 4px solid #C0C0C0; }
        .rank-3 { background: linear-gradient(90deg, rgba(205, 127, 50, 0.15) 0%, var(--color-bg-surface) 100%); border-left: 4px solid #CD7F32; }

        .rank-1 .rank-number { color: #FFD700; font-size: 1.5rem; }
        .rank-2 .rank-number { color: #C0C0C0; font-size: 1.4rem; }
        .rank-3 .rank-number { color: #CD7F32; font-size: 1.3rem; }
      `}</style>

      <SidebarLeft
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onOpenProfile={() => navigate('/profile')}
        highlightLeaderboardUnlock={runTour}
      />

      <div className="main-stage-track">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileNavOpen(true)}
          style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 90, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          ☰
        </button>
        <div id="app" className="leaderboard-app">

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>{t('leaderboard.title')}</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>{t('leaderboard.subtitle')}</p>
          </div>

          <button
            type="button"
            className="leaderboard-back-btn"
            onClick={() => navigate('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.08)', background: 'var(--color-bg-surface)', color: 'var(--color-text-main)', borderRadius: '10px', padding: '0.65rem 0.9rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ← {t('leaderboard.back_to_dashboard')}
          </button>

          <div className="segmented-control">
              <button
                className={`segment-btn leaderboard-weekly-tab ${timeframe === 'weekly' ? 'active' : ''}`}
                onClick={() => setTimeframe('weekly')}
              >{t('leaderboard.weekly')}</button>
              <button
                className={`segment-btn leaderboard-monthly-tab ${timeframe === 'monthly' ? 'active' : ''}`}
                onClick={() => setTimeframe('monthly')}
              >{t('leaderboard.monthly')}</button>
          </div>

          {timeframe === 'weekly' && (
            <div className="leaderboard-reset-timer" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-surface)', border: 'var(--glass-border)', borderRadius: '20px', padding: '0.35rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                ⏱ {t('leaderboard.weekly_reset')}: <strong style={{ color: 'var(--color-text-main)', fontVariantNumeric: 'tabular-nums' }}>{weeklyCountdown}</strong>
              </span>
            </div>
          )}

          <div className="league-tabs">
              {[1, 2, 3, 4].map(id => {
                  const league = getLeagueName(id);
                  const isActive = leagueId === id;
                  return (
                      <div
                        key={id}
                        className="league-tab"
                        style={{
                            borderColor: isActive ? league.color : 'rgba(255,255,255,0.05)',
                            background: isActive ? `${league.color}15` : 'var(--color-bg-surface)',
                            color: isActive ? league.color : 'var(--color-text-muted)'
                        }}
                        onClick={() => setLeagueId(id)}
                      >
                          <span style={{ fontSize: '1.4rem' }}>{league.icon}</span>
                          {league.name}
                      </div>
                  );
              })}
          </div>

          <form className="leaderboard-search" onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', background: 'var(--color-bg-surface)', padding: '0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ paddingLeft: '1rem', color: 'var(--color-text-muted)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
              </div>
              <input
                  type="text"
                  placeholder={t('leaderboard.search_placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                      flex: 1, padding: '0.8rem 0', border: 'none',
                      background: 'transparent', outline: 'none',
                      color: 'var(--color-text-main)', fontSize: '1.1rem'
                  }}
              />
              <button type="submit" style={{
                  padding: '0.8rem 1.5rem', borderRadius: '8px', background: 'var(--color-accent-in)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'background 0.2s'
              }}>{t('leaderboard.search_btn')}</button>
          </form>

          <div ref={listRef} style={{ paddingBottom: '2rem' }}>
              {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                          <SkeletonLeaderboardRow key={i} index={i} />
                      ))}
                  </div>
              ) : (
                  <>
                      {users.length === 0 ? (
                          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-surface)', borderRadius: '16px' }}>
                              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📭</span>
                              {t('leaderboard.no_points')}
                          </div>
                      ) : (
                          users.map((user, index) => {
                              const rank = user.rank || index + 1;
                              const isCurrentUser = user.username === currentUsername;
                              const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';

                              return (
                                  <div
                                      key={user.username}
                                      id={`user-row-${user.username}`}
                                      className={`rank-card ${rankClass}`}
                                      style={isCurrentUser ? { borderColor: 'var(--color-accent-in)', boxShadow: '0 0 15px rgba(79, 70, 229, 0.2)' } : {}}
                                  >
                                      <div className="rank-number">
                                          {rank}
                                      </div>

                                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', fontWeight: 'bold', color: 'var(--color-text-main)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                          {user.username.substring(0, 2).toUpperCase()}
                                      </div>
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: isCurrentUser ? 'var(--color-text-main)' : 'var(--color-text-main)' }}>
                                              {user.username}
                                              {isCurrentUser && <span style={{ marginLeft: '10px', fontSize: '0.8rem', background: 'var(--color-accent-in)', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>{t('leaderboard.you')}</span>}
                                          </div>
                                          {user.active_title && (
                                            <div style={{ fontSize: '0.85rem', color: '#F59E0B', fontWeight: 'bold', marginTop: '2px' }}>
                                              {user.active_title}
                                            </div>
                                          )}
                                      </div>

                                      <div style={{ fontWeight: '800', color: 'var(--color-accent-in)', fontSize: '1.2rem' }}>
                                          {user.xp} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>XP</span>
                                      </div>
                                  </div>
                              );
                          })
                      )}

                      {currentUserRank && currentUserRank > users.length && (
                          <div style={{ marginTop: '2rem' }}>
                              <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                              </div>
                              <div
                                  id={`user-row-${currentUsername}`}
                                  className="rank-card"
                                  style={{ borderColor: 'var(--color-accent-in)', boxShadow: '0 0 15px rgba(79, 70, 229, 0.2)' }}
                              >
                                  <div className="rank-number">
                                      {currentUserRank}
                                  </div>

                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', fontWeight: 'bold', color: 'var(--color-text-main)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                      {currentUsername?.substring(0, 2).toUpperCase()}
                                  </div>

                                  <div style={{ flex: 1, fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                                      {currentUsername}
                                      <span style={{ marginLeft: '10px', fontSize: '0.8rem', background: 'var(--color-accent-in)', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>{t('leaderboard.you')}</span>
                                  </div>

                                  <div style={{ fontWeight: '800', color: 'var(--color-accent-in)', fontSize: '1.2rem' }}>
                                      {currentUserXp} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>XP</span>
                                  </div>
                              </div>
                          </div>
                      )}
                  </>
              )}
          </div>

        </div>
      </div>

      <SidebarRight />
      <MobileBottomBar activeTab="stats" />
    </div>
  );
};
