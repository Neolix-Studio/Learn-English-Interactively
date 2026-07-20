import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MobileBottomBar } from '../components/MobileBottomBar';
import { AvatarUploadModal } from '../components/modals/AvatarUploadModal';
import { api } from '../utils/api';
import { clearGuestMigrationStorage } from '../utils/guestProgress';
import { SkeletonProfile } from '../components/SkeletonLoader';

const ACHIEVEMENT_DEF = [
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Complete your first lesson.',
    svg: <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  },
  {
    id: 'flawless',
    title: 'Flawless',
    description: 'Get 100% accuracy in a lesson.',
    svg: <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
  },
  {
    id: 'on_a_roll',
    title: 'On a Roll',
    description: 'Reach a 7-day streak.',
    svg: <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13.07 4.8 14.56 2.92C14.6 2.87 14.62 2.81 14.62 2.74C14.61 2.62 14.51 2.52 14.39 2.5C14.28 2.48 14.17 2.53 14.1 2.62C11.96 5.48 11.27 8.35 12.33 11.13C12.43 11.41 12.55 11.69 12.68 11.97C12.79 12.19 12.79 12.42 12.68 12.64C12.57 12.86 12.37 13 12.13 13C12 13 11.87 12.96 11.75 12.88C10.74 12.18 10.23 11.12 10.25 9.94C10.25 9.8 10.15 9.68 10.02 9.64C9.89 9.59 9.74 9.64 9.66 9.75C7.99 11.91 7.29 14.51 7.71 17.13C8.03 19.16 9.17 20.89 10.87 21.83C12.57 22.77 14.54 22.82 16.28 21.96C18.01 21.1 19.19 19.46 19.48 17.5C19.74 15.68 19.06 13.56 17.66 11.2ZM14.97 19.86C14.51 20.12 13.98 20.25 13.43 20.25C13.3 20.25 13.16 20.25 13.02 20.22C11.91 19.99 11 19.14 10.72 18.04C10.5 17.17 10.66 16.25 11.17 15.53C11.3 15.34 11.45 15.17 11.61 15C11.67 14.94 11.72 14.89 11.78 14.83C12.53 14 13.39 13.32 14.36 12.79C14.35 12.97 14.35 13.16 14.35 13.34C14.35 14.7 15 15.93 16 16.71C16.36 17.06 16.64 17.47 16.8 17.92C17.09 18.73 16.92 19.57 16.36 20.12C15.96 20.5 15.48 20.73 14.97 20.86V19.86Z"/></svg>
  },
  {
    id: 'overachiever',
    title: 'Overachiever',
    description: 'Reach 1000 XP.',
    svg: <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
  }
];

export const ProfilePage: React.FC = () => {
  const { data, updateProgress, buyCosmetic, updatePreferences, updateLanguage, isGuest, isLoading } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await api.fetch('logout');
      clearGuestMigrationStorage();
      window.location.href = '/';
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      alert('In this Beta version, please contact support to fully delete your account.');
    }
  };

  React.useEffect(() => {
    if (!isLoading && isGuest) {
      navigate('/?login=true&redirect=/profile');
    }
  }, [isLoading, isGuest, navigate]);

  if (isLoading) {
    return <SkeletonProfile />;
  }

  if (isGuest) {
    return null;
  }

  const handleThemeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const theme = e.target.value;
    updateProgress({
      scores: {
        ...data.scores,
        active_theme: theme
      }
    });
  };

  const handleNameplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nameplate = e.target.value;
    updateProgress({
      scores: {
        ...data.scores,
        active_nameplate: nameplate
      }
    });
  };

  const activeNameplate = data.scores?.active_nameplate || 'none';

  const renderUsername = () => {
    if (activeNameplate === 'cyber') {
      return (
        <div className="game-tag cyber-tag" style={{ marginBottom: '0.5rem' }}>
          <span className="username">{data.username}</span>
        </div>
      );
    }
    if (activeNameplate === 'fire') {
      return (
        <div className="game-tag fire-tag" style={{ marginBottom: '0.5rem' }}>
          <span className="username">{data.username}</span>
        </div>
      );
    }
    if (activeNameplate === 'infernal') {
      return (
        <div className="rpg-title-badge infernal" style={{ marginBottom: '0.5rem' }}>
          <span className="title-text">{data.username}</span>
        </div>
      );
    }
    return <h2 className="profile-username" style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-main)', fontSize: '1.8rem' }}>{data.username}</h2>;
  };

  const achievements = data.scores?.achievements || [];

  return (
    <div className="profile-page-container" style={{ padding: '2rem', paddingBottom: '100px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      <div className="profile-page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--color-bg-surface)', border: 'var(--glass-border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-main)' }}>
          ←
        </button>
        <h1 className="profile-page-title" style={{ margin: 0, color: 'var(--color-text-main)', fontSize: '2rem', fontWeight: 800 }}>{t('profile.title')}</h1>
      </div>

      <div className="profile-user-card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--color-bg-surface)', padding: '2rem', borderRadius: '24px', border: 'var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <button
          type="button"
          className="profile-avatar-button"
          onClick={() => setIsAvatarModalOpen(true)}
          style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--color-bg-base)', border: '4px solid var(--color-bg-base)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
        >
          {data.avatar ? (
            <img src={`/avatars/${data.avatar}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: '3rem' }}>🧑‍🎓</div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.7rem', textAlign: 'center', padding: '4px 0', fontWeight: 'bold' }}>EDIT</div>
        </button>
        <div className="profile-user-summary">
          {renderUsername()}
          <div className="profile-stat-chip-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.4rem 0.8rem', background: 'color-mix(in srgb, var(--color-accent-in) 10%, transparent)', color: 'var(--color-accent-in)', borderRadius: '12px', fontWeight: 'bold' }}>{data.subscription_tier.toUpperCase()} PLAN</span>
            <span style={{ padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '12px', fontWeight: 'bold' }}>{data.points} XP</span>
            <span style={{ padding: '0.4rem 0.8rem', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', borderRadius: '12px', fontWeight: 'bold' }}>{data.scores?.bones || 0} 🦴 Lexi Treats</span>
          </div>
          </div>
        </div>

      <div className="profile-action-row" style={{ display: 'flex', gap: '1rem', marginTop: '-1rem' }}>
        <button
          onClick={() => navigate('/friends')}
          style={{ flex: 1, padding: '1rem', background: 'var(--color-bg-surface)', border: 'var(--glass-border)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-main)', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{ fontSize: '1.2rem' }}>👥</span> Friends List
        </button>
      </div>

      <div className="profile-section-card" style={{ background: 'var(--color-bg-surface)', padding: '2rem', borderRadius: '24px', border: 'var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏅 {t('profile.achievements')}
          </h3>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: achievements.length === ACHIEVEMENT_DEF.length ? '#F59E0B' : 'var(--color-text-muted)' }}>
            {achievements.length} / {ACHIEVEMENT_DEF.length}
          </span>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ height: '6px', background: 'var(--color-bg-base)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(achievements.length / ACHIEVEMENT_DEF.length) * 100}%`,
              background: achievements.length === ACHIEVEMENT_DEF.length
                ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                : 'linear-gradient(90deg, var(--color-accent-in), var(--color-accent-at))',
              borderRadius: '99px',
              transition: 'width 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
            }} />
          </div>
          {achievements.length === 0 && (
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
              Complete lessons to unlock your first achievement!
            </p>
          )}
          {achievements.length === ACHIEVEMENT_DEF.length && (
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.85rem', color: '#F59E0B', textAlign: 'center', fontWeight: 700 }}>
              🌟 All achievements unlocked!
            </p>
          )}
        </div>

        <div className="profile-achievement-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {ACHIEVEMENT_DEF.map(ach => {
            const isUnlocked = achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className="achievement-badge"
                title={isUnlocked ? ach.description : `🔒 ${ach.description}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', cursor: 'help',
                  background: isUnlocked ? 'color-mix(in srgb, var(--color-accent-in) 6%, var(--color-bg-base))' : 'var(--color-bg-base)',
                  borderRadius: '16px', padding: '1.2rem 0.75rem',
                  border: isUnlocked ? '1.5px solid color-mix(in srgb, var(--color-accent-in) 35%, transparent)' : '1.5px solid transparent',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  border: isUnlocked ? '2px solid var(--color-accent-in)' : '2px dashed color-mix(in srgb, var(--color-text-muted) 40%, transparent)',
                  background: isUnlocked ? 'color-mix(in srgb, var(--color-accent-in) 12%, transparent)' : 'var(--color-bg-surface)',
                  color: isUnlocked ? 'var(--color-accent-in)' : 'var(--color-text-muted)',
                  filter: isUnlocked ? 'drop-shadow(0 0 10px color-mix(in srgb, var(--color-accent-in) 50%, transparent))' : 'grayscale(100%) opacity(35%)',
                  transform: isUnlocked ? 'scale(1)' : 'scale(0.92)',
                }}>
                  {isUnlocked ? ach.svg : <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isUnlocked ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>{ach.title}</div>
                  <div style={{ fontSize: '0.72rem', color: isUnlocked ? '#10B981' : 'var(--color-text-muted)', marginTop: '0.25rem', fontWeight: isUnlocked ? 700 : 400 }}>
                    {isUnlocked ? ('✓ ' + t('profile.unlocked')) : ('🔒 ' + t('profile.locked'))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="profile-section-card" style={{ background: 'var(--color-bg-surface)', padding: '2rem', borderRadius: '24px', border: 'var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--color-text-main)' }}>{t('profile.settings')}</h3>

        <div className="profile-settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{t('settings.visual_theme')}</span>
          <select
            value={(data.scores.active_theme === 'default' ? 'system' : data.scores.active_theme) || 'system'}
            onChange={handleThemeChange}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-bg-surface)', color: 'var(--color-text-main)', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}
          >
            <option value="system">{t('settings.theme_system')}</option>
            <option value="light">{t('settings.theme_light')}</option>
            <option value="dark">{t('settings.theme_dark')}</option>
            {(data.unlocked_themes || []).includes('fall') && (
              <option value="fall">Fall 🍂</option>
            )}
            {(data.unlocked_themes || []).includes('halloween') && (
              <option value="halloween">Halloween 🎃</option>
            )}
          </select>
        </div>

        <div className="profile-settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>Nameplate</span>
          <select
            value={activeNameplate}
            onChange={handleNameplateChange}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-bg-surface)', color: 'var(--color-text-main)', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}
          >
            <option value="none">None (Standard)</option>
            <option value="cyber">Cyber Neon Capsule</option>
            <option value="fire">Mythic Fire Nameplate</option>
            <option value="infernal">Infernal Knight Badge</option>
          </select>
        </div>

        <div className="profile-settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>Study Language / Domain</span>
          <select
            value={data.base_language || 'hu'}
            onChange={async (e) => {
              const newLang = e.target.value;
              await updateLanguage(newLang);
              if (newLang === 'sk' && !window.location.hostname.endsWith('.sk')) {
                  window.location.href = 'https://lexipaws.sk/';
              } else if (newLang === 'hu' && !window.location.hostname.endsWith('.hu')) {
                  window.location.href = 'https://lexipaws.hu/';
              } else {
                  window.location.reload();
              }
            }}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--color-bg-surface)', color: 'var(--color-text-main)', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}
          >
            <option value="hu">Hungarian (Magyar)</option>
            <option value="sk">Slovak (Slovenčina)</option>
          </select>
        </div>

        <div className="profile-settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{t('settings.sound_effects')}</span>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
            <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--color-success)', borderRadius: '28px', transition: '.4s' }}></span>
            <span style={{ position: 'absolute', content: '""', height: '22px', width: '22px', left: '25px', bottom: '3px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '50%', transition: '.4s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
          </label>
        </div>

        <h3 style={{ margin: '1.5rem 0 1rem 0', fontSize: '1.1rem', color: 'var(--color-text-main)' }}>{t('settings.notifications_title')}</h3>

        <div className="profile-settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{t('settings.notif_inactivity_title')}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{t('settings.notif_inactivity_desc')}</div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
            <input
              type="checkbox"
              checked={data.notification_preferences?.inactivity ?? true}
              onChange={(e) => updatePreferences({ inactivity: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: (data.notification_preferences?.inactivity ?? true) ? 'var(--color-success)' : 'var(--color-text-muted)', borderRadius: '28px', transition: '.4s' }}></span>
            <span style={{ position: 'absolute', content: '""', height: '22px', width: '22px', left: (data.notification_preferences?.inactivity ?? true) ? '25px' : '3px', bottom: '3px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '50%', transition: '.4s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
          </label>
        </div>

        <div className="profile-settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{t('settings.notif_milestones_title')}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{t('settings.notif_milestones_desc')}</div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
            <input
              type="checkbox"
              checked={data.notification_preferences?.milestones ?? true}
              onChange={(e) => updatePreferences({ milestones: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: (data.notification_preferences?.milestones ?? true) ? 'var(--color-success)' : 'var(--color-text-muted)', borderRadius: '28px', transition: '.4s' }}></span>
            <span style={{ position: 'absolute', content: '""', height: '22px', width: '22px', left: (data.notification_preferences?.milestones ?? true) ? '25px' : '3px', bottom: '3px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '50%', transition: '.4s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
          </label>
        </div>

        <div className="profile-settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{t('settings.notif_news_title')}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{t('settings.notif_news_desc')}</div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
            <input
              type="checkbox"
              checked={data.notification_preferences?.marketing ?? true}
              onChange={(e) => updatePreferences({ marketing: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: (data.notification_preferences?.marketing ?? true) ? 'var(--color-success)' : 'var(--color-text-muted)', borderRadius: '28px', transition: '.4s' }}></span>
            <span style={{ position: 'absolute', content: '""', height: '22px', width: '22px', left: (data.notification_preferences?.marketing ?? true) ? '25px' : '3px', bottom: '3px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '50%', transition: '.4s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
          </label>
        </div>

        <div className="profile-settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{t('settings.notif_weekly_title')}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{t('settings.notif_weekly_desc')}</div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
            <input
              type="checkbox"
              checked={data.notification_preferences?.weekly_report ?? true}
              onChange={(e) => updatePreferences({ weekly_report: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: (data.notification_preferences?.weekly_report ?? true) ? 'var(--color-success)' : 'var(--color-text-muted)', borderRadius: '28px', transition: '.4s' }}></span>
            <span style={{ position: 'absolute', content: '""', height: '22px', width: '22px', left: (data.notification_preferences?.weekly_report ?? true) ? '25px' : '3px', bottom: '3px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '50%', transition: '.4s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
          </label>
        </div>
      </div>

      <div className="profile-section-card" style={{ background: 'var(--color-bg-surface)', padding: '2rem', borderRadius: '24px', border: 'var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--color-text-main)' }}>Account Actions</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={handleLogout}
            style={{ padding: '1rem', borderRadius: '12px', background: 'var(--color-bg-base)', color: 'var(--color-text-main)', border: '1px solid var(--glass-border)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--glass-border)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--color-bg-base)'}
          >
            Log Out
          </button>

          <button
            onClick={handleDeleteAccount}
            style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            Delete Account
          </button>
        </div>
      </div>

      <AvatarUploadModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} />
      <MobileBottomBar activeTab="profile" />
    </div>
  );
};
