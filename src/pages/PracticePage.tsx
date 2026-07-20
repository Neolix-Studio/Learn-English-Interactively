import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarLeft } from '../components/SidebarLeft';
import { SidebarRight } from '../components/SidebarRight';
import { LessonPlayer } from '../components/LessonPlayer/LessonPlayer';
import { useUser } from '../context/UserContext';
import { api } from '../utils/api';
import '../assets/css/dashboard.css';

export const PracticePage: React.FC = () => {
  const { isGuest, completeLesson, activeLevel } = useUser();
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicMistakesNode, setDynamicMistakesNode] = useState<any>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  const handleStart = async () => {
    if (activeMode === 'hibak') {
      if (isGuest) {
        alert(t('practice.login_required'));
        return;
      }
      setIsLoading(true);
      const response = await api.fetch('get_weak_words', { level: activeLevel || 'A1', limit: 10 });
      setIsLoading(false);

      if (response.status === 'success' && response.data && response.data.length > 0) {
        const dynamicNode = {
          id: 'practice_mistakes',
          title: t('practice.mistakes_title'),
          type: 'practice',
          lessons: [
            {
              id: 'lesson_1',
              items: response.data.map((item: any) => item.question_data)
            }
          ]
        };
        setDynamicMistakesNode(dynamicNode);
        setIsPlaying(true);
      } else {
        alert(t('practice.no_mistakes'));
      }
    } else if (activeMode === 'tortenetek') {
      import('../utils/storyLoader').then(({ getRandomStory }) => {
        const storyNode = getRandomStory();
        if (storyNode) {
          setDynamicMistakesNode(storyNode);
          setIsPlaying(true);
        } else {
          alert(t('practice.no_stories'));
        }
      });
    }
  };

  const handleComplete = (scoreData: any) => {
    setIsPlaying(false);
    if (dynamicMistakesNode) {
      completeLesson(dynamicMistakesNode.id, scoreData.xpEarned, 100);
    }
  };

  if (isPlaying && dynamicMistakesNode) {
    return (
      <LessonPlayer
        lessonNode={dynamicMistakesNode}
        onExit={() => setIsPlaying(false)}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <div className="dashboard-container">
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
            <h1 style={{ fontSize: '2.2rem', color: 'var(--color-text-main)', marginBottom: '1rem', fontWeight: 800 }}>{t('practice.page_title')}</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              {t('practice.page_subtitle')}
            </p>

            <div style={{ minHeight: '60px' }}>
              {activeMode && (
                <button
                  onClick={handleStart}
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
                    transition: 'all 0.1s',
                    animation: 'fadeSlideIn 0.3s ease both'
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
                  {t('practice.start_btn')}
                </button>
              )}
              {isLoading && (
                <div style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
                  {t('practice.loading_tasks')}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <button
              onClick={() => setActiveMode('hibak')}
              style={{
                background: 'var(--color-bg-surface)',
                border: activeMode === 'hibak' ? '2px solid #F59E0B' : '2px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                boxShadow: activeMode === 'hibak' ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)',
                transition: 'all 0.1s',
                textAlign: 'left'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(4px)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = activeMode === 'hibak' ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = activeMode === 'hibak' ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)';
              }}
            >
              <div style={{ fontSize: '2.5rem' }}>🎯</div>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: activeMode === 'hibak' ? '#F59E0B' : 'var(--color-text-main)', margin: '0 0 0.25rem 0', fontWeight: 800 }}>{t('practice.mode_mistakes')}</h3>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>{t('practice.mode_mistakes_desc')}</p>
              </div>
            </button>

            <button
              onClick={() => setActiveMode('tortenetek')}
              style={{
                background: 'var(--color-bg-surface)',
                border: activeMode === 'tortenetek' ? '2px solid #F59E0B' : '2px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                boxShadow: activeMode === 'tortenetek' ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)',
                transition: 'all 0.1s',
                textAlign: 'left'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(4px)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = activeMode === 'tortenetek' ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = activeMode === 'tortenetek' ? '0 4px 0 #D97706' : '0 4px 0 rgba(0,0,0,0.2)';
              }}
            >
              <div style={{ fontSize: '2.5rem' }}>📖</div>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: activeMode === 'tortenetek' ? '#F59E0B' : 'var(--color-text-main)', margin: '0 0 0.25rem 0', fontWeight: 800 }}>{t('practice.mode_stories')}</h3>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>{t('practice.mode_stories_desc')}</p>
              </div>
            </button>

          </div>

        </div>
      </div>

      <SidebarRight />
    </div>
  );
};
