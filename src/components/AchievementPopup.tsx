import React, { useEffect, useState } from 'react';

export const AchievementPopup: React.FC = () => {
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleAchievementUnlock = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.achievements) {
        setUnlockedAchievements(prev => [...prev, ...customEvent.detail.achievements]);
        setIsVisible(true);
      }
    };

    window.addEventListener('achievementUnlocked', handleAchievementUnlock);
    return () => {
      window.removeEventListener('achievementUnlocked', handleAchievementUnlock);
    };
  }, []);

  useEffect(() => {
    if (isVisible && unlockedAchievements.length > 0) {
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Remove the first item from the queue
        setTimeout(() => setUnlockedAchievements(prev => prev.slice(1)), 300);
      }, 5000);
      return () => clearTimeout(timer);
    } else if (!isVisible && unlockedAchievements.length > 0) {
      // Show next in queue
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, unlockedAchievements]);

  if (!isVisible && unlockedAchievements.length === 0) return null;

  const currentAchievement = unlockedAchievements[0];

  const getAchievementDetails = (id: string) => {
    switch(id) {
      case 'first_steps':
        return { title: 'First Steps', svg: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> };
      case 'flawless':
        return { title: 'Flawless', svg: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg> };
      case 'on_a_roll':
        return { title: 'On a Roll', svg: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13.07 4.8 14.56 2.92C14.6 2.87 14.62 2.81 14.62 2.74C14.61 2.62 14.51 2.52 14.39 2.5C14.28 2.48 14.17 2.53 14.1 2.62C11.96 5.48 11.27 8.35 12.33 11.13C12.43 11.41 12.55 11.69 12.68 11.97C12.79 12.19 12.79 12.42 12.68 12.64C12.57 12.86 12.37 13 12.13 13C12 13 11.87 12.96 11.75 12.88C10.74 12.18 10.23 11.12 10.25 9.94C10.25 9.8 10.15 9.68 10.02 9.64C9.89 9.59 9.74 9.64 9.66 9.75C7.99 11.91 7.29 14.51 7.71 17.13C8.03 19.16 9.17 20.89 10.87 21.83C12.57 22.77 14.54 22.82 16.28 21.96C18.01 21.1 19.19 19.46 19.48 17.5C19.74 15.68 19.06 13.56 17.66 11.2ZM14.97 19.86C14.51 20.12 13.98 20.25 13.43 20.25C13.3 20.25 13.16 20.25 13.02 20.22C11.91 19.99 11 19.14 10.72 18.04C10.5 17.17 10.66 16.25 11.17 15.53C11.3 15.34 11.45 15.17 11.61 15C11.67 14.94 11.72 14.89 11.78 14.83C12.53 14 13.39 13.32 14.36 12.79C14.35 12.97 14.35 13.16 14.35 13.34C14.35 14.7 15 15.93 16 16.71C16.36 17.06 16.64 17.47 16.8 17.92C17.09 18.73 16.92 19.57 16.36 20.12C15.96 20.5 15.48 20.73 14.97 20.86V19.86Z"/></svg> };
      case 'overachiever':
        return { title: 'Overachiever', svg: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg> };
      default:
        return { title: 'Achievement Unlocked', svg: <span style={{fontSize:'24px'}}>🏆</span> };
    }
  };

  const details = getAchievementDetails(currentAchievement);

  return (
    <div style={{
      position: 'fixed',
      bottom: isVisible ? '20px' : '-100px',
      left: '50%',
      transform: 'translateX(-50%)',
      transition: 'bottom 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      background: 'linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-base))',
      border: '1px solid var(--color-accent-in)',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 15px rgba(59, 130, 246, 0.4)',
      borderRadius: '50px',
      padding: '0.8rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      zIndex: 99999,
      color: 'var(--color-text-main)'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(59, 130, 246, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-accent-in)',
        boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
      }}>
        {details.svg}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-on)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Eredmény feloldva</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{details.title}</span>
      </div>
    </div>
  );
};
