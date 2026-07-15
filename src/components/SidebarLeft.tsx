import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useUser } from '../context/UserContext';
import { AudioSynth, setGlobalVolume } from '../utils/audio';
import { api } from '../utils/api';
import { ReportProblemModal } from './modals/ReportProblemModal';

interface SidebarLeftProps {
  onOpenProfile?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ onOpenProfile, isOpen, onClose }) => {
  const { data, activeLevel, setActiveLevel, updateProgress, buyCosmetic } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('adhd_volume');
    return saved ? Math.round(Number(saved) * 100) : 50;
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);

  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('neolix_reduced_motion') === 'true';
  });

  useEffect(() => {
    if (reducedMotion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
    localStorage.setItem('neolix_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    let intervalId: any;
    let attempts = 0;

    const initHeadway = () => {
      attempts++;
      // @ts-ignore
      if (window.Headway && typeof window.Headway.getNewWidget === 'function' && document.querySelector(".changelog-sidebar-anchor")) {
        // @ts-ignore
        const headwayInstance = window.Headway.getNewWidget();
        headwayInstance.init({
          selector: ".changelog-sidebar-anchor",
          account: "xWE06J",
          trigger: ".changelog-sidebar-anchor"
        });
        clearInterval(intervalId);
      } else if (attempts > 30) {
        clearInterval(intervalId);
      }
    };

    initHeadway();
    intervalId = setInterval(initHeadway, 500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleThemeChange = async (theme: string) => {
    const unlocked = data.unlocked_themes || ['system', 'light', 'dark'];
    
    if (!unlocked.includes(theme)) {
      let cost = 0;
      if (theme === 'fall') cost = 200;
      if (theme === 'halloween') cost = 500;
      
      const bones = data.scores?.bones || 0;
      if (bones < cost) {
        alert(t('settings.not_enough_bones', { cost }));
        return;
      }
      
      const confirm = window.confirm(t('settings.confirm_purchase', { cost }));
      if (!confirm) return;
      
      const res = await buyCosmetic('theme', theme, cost);
      if (!res.success) {
        alert(res.message);
        return;
      }
    }
    
    updateProgress({
      scores: {
        ...data.scores,
        active_theme: theme
      }
    });
  };

  const handleLogout = async () => {
    try {
      await api.fetch('logout');
    } catch(e) {}
    localStorage.removeItem("user_local_progress");
    localStorage.removeItem("neolix_guest_progress");
    localStorage.removeItem("ftue_marketing_data");
    window.location.href = '/';
  };

  const handleLevelClick = (e: React.MouseEvent, level: string) => {
    e.preventDefault();
    setActiveLevel(level);
    navigate('/dashboard');
    if (onClose) onClose();
  };

  return (
    <aside className={`dashboard-left-sidebar ${isOpen ? 'is-active' : ''}`} aria-label="Fő navigáció">
      <button className="mobile-close-stats-btn" onClick={onClose}>✕ {t('sidebar.close')}</button>
      
      <Link to="/" onClick={onClose} className="logo" aria-label="Vissza a főoldalra">
        <span className="logo-text">
          Lexipaws
        </span>
      </Link>
      
      <nav className="main-nav" aria-label="Szintválasztó navigáció">
        <div className="sidebar-section-title">
          {t('sidebar.journey')}
        </div>
        <div style={{ padding: '0 1rem 0.5rem 1rem' }}>
          <button 
            type="button"
            onClick={() => setIsLevelModalOpen(true)} 
            className="nav-link left-nav-link active-level-button" 
            id="level-selector-btn"
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0.8rem 1.2rem', 
              background: 'rgba(255,255,255,0.06)', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              cursor: 'pointer',
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="nav-icon">
                {activeLevel === 'A1' ? '🌱' : activeLevel === 'A2' ? '🌿' : activeLevel === 'B1' ? '🌳' : '🎓'}
              </span>
              <span style={{ fontWeight: 700 }}>
                {activeLevel === 'A1' ? t('sidebar.a1_beginner') : activeLevel === 'A2' ? t('sidebar.a2_elementary') : activeLevel === 'B1' ? t('sidebar.b1_intermediate') : t('sidebar.b2_advanced')}
              </span>
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>▾</span>
          </button>
        </div>

        <div className="sidebar-section-title practice-title">
          {t('sidebar.practice_section')}
        </div>
        <ul className="nav-list left-nav-list">
          <li>
            <Link to="/practice" onClick={onClose} className={`nav-link left-nav-link ${location.pathname === '/practice' ? 'active' : ''}`}>
              <span className="nav-icon">🎯</span> {t('sidebar.review')}
            </Link>
          </li>
          <li>
            <Link to="/characters" onClick={onClose} className={`nav-link left-nav-link ${location.pathname === '/characters' ? 'active' : ''}`}>
              <span className="nav-icon">Aa</span> {t('sidebar.characters')}
            </Link>
          </li>
          <li>
            <Link to="/leaderboard" onClick={onClose} className={`nav-link left-nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}>
              <span className="nav-icon">🏆</span> {t('sidebar.leaderboard')}
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <ul className="sidebar-footer-list">
          <li>
            <button onClick={onOpenProfile} className="nav-link left-nav-link" id="user-profile-btn">
              <span className="nav-icon">👤</span> {t('sidebar.profile')}
            </button>
          </li>
          <li>
            <button onClick={() => setShowSettings(!showSettings)} className="nav-link left-nav-link" id="settings-toggle-btn">
              <span className="nav-icon">⚙️</span> {t('sidebar.settings')}
            </button>
          </li>
          {showSettings && (
            <div className="sidebar-settings-panel">
              
              <div className="sidebar-settings-group">
                <div className="sidebar-settings-row">
                  <label htmlFor="sound-slider" className="sidebar-settings-label">{t('settings.volume')}</label>
                  <span id="sound-val-display" className="sidebar-settings-val">{volume}%</span>
                </div>
                <input 
                  type="range" 
                  id="sound-slider" 
                  min="0" 
                  max="100" 
                  step="1" 
                  value={volume}
                  onChange={(e) => {
                    const newVol = Number(e.target.value);
                    setVolume(newVol);
                    localStorage.setItem('adhd_volume', (newVol / 100).toString());
                    document.cookie = `adhd_volume=${newVol / 100}; path=/; max-age=31536000`;
                    setGlobalVolume(newVol / 100);
                    AudioSynth.playTone(300 + newVol * 4, 'sine', 0.05);
                  }}
                  className="sidebar-settings-slider" 
                />
              </div>
              
              <div className="sidebar-settings-switch-row">
                <label htmlFor="reduced-motion-toggle" className="sidebar-settings-label">{t('settings.reduced_motion')}</label>
                <label className="switch" htmlFor="reduced-motion-toggle">
                  <input 
                    type="checkbox" 
                    id="reduced-motion-toggle" 
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              
              <div className="sidebar-settings-vertical-group">
                <label className="sidebar-settings-label">{t('settings.visual_theme')}</label>
                <select 
                  value={(data.scores?.active_theme === 'default' ? 'system' : data.scores?.active_theme) || 'system'} 
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="sidebar-settings-select"
                >
                  <option value="system">{t('settings.theme_system')}</option>
                  <option value="light">{t('settings.theme_light')}</option>
                  <option value="dark">{t('settings.theme_dark')}</option>
                  <option value="fall">
                    {!(data.unlocked_themes || ['system', 'light', 'dark']).includes('fall') ? 'Fall 🍂 (🔒 200 🦴)' : 'Fall 🍂'}
                  </option>
                  <option value="halloween">
                    {!(data.unlocked_themes || ['system', 'light', 'dark']).includes('halloween') ? 'Halloween 🎃 (🔒 500 🦴)' : 'Halloween 🎃'}
                  </option>
                </select>
                <button 
                  onClick={() => handleThemeChange('system')}
                  className="sidebar-settings-reset-btn"
                >
                  {t('settings.reset_theme')}
                </button>
              </div>
              
            </div>
          )}
          <li>
            <button onClick={handleLogout} id="logout-btn" className="nav-link left-nav-link">
              <span className="nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', position: 'relative', top: '-1px' }}>
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                  <line x1="12" y1="2" x2="12" y2="12"></line>
                </svg>
              </span> 
              {t('sidebar.logout')}
            </button>
          </li>
          <li>
            <button onClick={() => setIsReportModalOpen(true)} id="report-problem-btn" className="nav-link left-nav-link">
              <span className="nav-icon">🚩</span>
              {t('sidebar.report_problem')}
            </button>
          </li>
        </ul>
        
        <div className="sidebar-footer-links">
          <Link to="/privacy-policy" className="sidebar-footer-link">{t('footer.privacy_policy')}</Link>
          <Link to="/terms" className="sidebar-footer-link">{t('footer.terms')}</Link>
          <Link to="/impressum" className="sidebar-footer-link">{t('footer.impressum')}</Link>
          <Link to="/contact" className="sidebar-footer-link">{t('footer.contact')}</Link>
          <div className="changelog-sidebar-anchor changelog-anchor sidebar-footer-link" style={{ cursor: 'pointer' }}>
            {t('sidebar.changelog', 'Újdonságok')}
          </div>
        </div>
      </div>

        <ReportProblemModal 
            isOpen={isReportModalOpen} 
            onClose={() => setIsReportModalOpen(false)} 
            contextData={{ username: data?.username, activeLevel }}
        />

        {isLevelModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100dvh',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(8px)',
            padding: '1.5rem',
            boxSizing: 'border-box'
          }}>
            <button
              type="button"
              aria-label="Szintválasztó bezárása"
              onClick={() => setIsLevelModalOpen(false)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'default'
              }}
            />
            <div style={{
              background: 'var(--color-bg-surface)',
              padding: '2rem',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '550px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative',
              zIndex: 1
            }}>
              <button 
                type="button"
                onClick={() => setIsLevelModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  padding: '5px'
                }}
              >
                ✕
              </button>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
                {t('sidebar.select_level', 'Szintválasztó')}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {t('sidebar.journey_modal_desc', 'Válassz ki egy szintet a tanulás folytatásához:')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { id: 'A1', label: t('sidebar.a1_beginner'), icon: '🌱', desc: t('levels.a1_desc', 'Teljesen az alapoktól indulunk. Megtanulod a betűzést, a számokat, a legegyszerűbb mondatszerkezeteket és az alapvető kifejezéseket.') },
                  { id: 'A2', label: t('sidebar.a2_elementary'), icon: '🌿', desc: t('levels.a2_desc', 'Képes leszel egyszerű, mindennapi témákról beszélgetni. Megtanulod a legfontosabb múlt és jövő időket, illetve a mindennapi szófordulatokat.') },
                  { id: 'B1', label: t('sidebar.b1_intermediate'), icon: '🌳', desc: t('levels.b1_desc', 'Utazás során már könnyedén feltalálod magad. Megérted a bonyolultabb nyelvtani összefüggéseket, és hosszabb szövegeket is képes leszel feldolgozni.') },
                  { id: 'B2', label: t('sidebar.b2_advanced'), icon: '🎓', desc: t('levels.b2_desc', 'Magabiztos, folyamatos kommunikáció anyanyelvi beszélőkkel. Összetett szövegek, absztrakt témák megértése és felkészülés a B2-es nyelvvizsgára.') },
                ].map((lvl) => {
                  const isActive = activeLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => {
                        setActiveLevel(lvl.id);
                        setIsLevelModalOpen(false);
                        navigate('/dashboard');
                        if (onClose) onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        padding: '1.2rem',
                        borderRadius: '16px',
                        border: isActive ? '2px solid var(--color-accent-in, #4F46E5)' : '2px solid transparent',
                        background: isActive ? 'var(--color-bg-active, rgba(79, 70, 229, 0.08))' : 'var(--color-bg-base, #F8FAFC)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                    >
                      <span style={{ fontSize: '2rem', marginTop: '0.2rem' }}>{lvl.icon}</span>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {lvl.label}
                          {isActive && (
                            <span style={{
                              fontSize: '0.75rem',
                              background: 'var(--color-accent-in, #4F46E5)',
                              color: '#fff',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '99px',
                              fontWeight: 600
                            }}>
                              {t('sidebar_right.you', 'Aktív')}
                            </span>
                          )}
                        </h3>
                        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                          {lvl.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
    </aside>
  );
};
