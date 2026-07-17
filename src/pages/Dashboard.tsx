import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SidebarLeft } from '../components/SidebarLeft';
import { SidebarRight } from '../components/SidebarRight';
import { Roadmap } from '../components/Roadmap';
import { LessonPlayer } from '../components/LessonPlayer/LessonPlayer';
import { BossEncounter } from '../components/LessonPlayer/BossEncounter';

import { useNavigate, useLocation } from 'react-router-dom';
import { FeedbackRefillModal } from '../components/modals/FeedbackRefillModal';
import { useUser } from '../context/UserContext';
import { useShop } from '../context/ShopContext';
import RewardPopup from '../components/RewardPopup';
import { MobileBottomBar } from '../components/MobileBottomBar';
import { LexiFeedbackWidget } from '../components/LexiFeedbackWidget';
import { ProductTour } from '../components/ProductTour';
import '../assets/css/dashboard.css';
import '../assets/css/interactive.css';

export const Dashboard: React.FC = () => {
  const { data, completeLesson, updateProgress, isLoading } = useUser();
  const { openShop } = useShop();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (!isLoading && data?.onboarding_completed === true) {
      const tourCompleted = localStorage.getItem('lexipaws_tour_completed');
      if (!tourCompleted) {
        setRunTour(true);
      }
    }
  }, [isLoading, data?.onboarding_completed]);

  const handleTourEnd = () => {
    setRunTour(false);
    localStorage.setItem('lexipaws_tour_completed', 'true');
  };

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (location.state?.openTab) {
      const tab = location.state.openTab;
      if (tab === 'levels') {
        setIsMobileNavOpen(true);
        setIsMobileStatsOpen(false);
      } else if (tab === 'stats') {
        setIsMobileStatsOpen(true);
        setIsMobileNavOpen(false);
      } else if (tab === 'curriculum') {
        setIsMobileNavOpen(false);
        setIsMobileStatsOpen(false);
      }
      // Clear state so it doesn't reopen if refreshed
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!isLoading && data.onboarding_completed === false) {
      navigate('/welcome/start');
    }
  }, [isLoading, data.onboarding_completed, navigate]);

  const handleNodeClick = (nodeData: any) => {
    const isPremium = data.subscription_tier === 'premium' || data.subscription_tier === 'lifetime';
    const energy = data.energy ?? 5;
    
    const lastStartedLesson = localStorage.getItem('neolix_active_lesson');
    const isReentering = lastStartedLesson === nodeData.id;
    
    if (!isPremium && !isReentering && energy <= 0) {
      const lastRefill = localStorage.getItem('last_feedback_refill');
      const now = Date.now();
      // 1 hour cooldown = 3600000 ms
      if (!lastRefill || (now - parseInt(lastRefill)) > 3600000) {
        setIsFeedbackModalOpen(true);
      } else {
        alert(t('dashboard.not_enough_energy'));
      }
      return;
    }
    
    if (!isPremium && !isReentering) {
      const updates: any = { energy: energy - 1 };
      // If energy was full, start the regeneration timer now
      if (energy === 5) {
        updates.last_energy_refill = new Date().toISOString();
      }
      updateProgress(updates);
    }
    
    localStorage.setItem('neolix_active_lesson', nodeData.id);
    setActiveLesson(nodeData);
  };



  return (
    <>
      <ProductTour run={runTour} onTourEnd={handleTourEnd} />
      <div className="dashboard-container">
        {/* LEFT SIDEBAR (Phase 2) */}
        <SidebarLeft 
            isOpen={isMobileNavOpen}
            onClose={() => setIsMobileNavOpen(false)}
            onOpenProfile={() => navigate('/profile')} 
        />

        {/* MAIN CONTENT AREA */}
        <main className="main-stage-track">
          <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>{t('dashboard.title', 'Tanulási Útvonal')}</h1>
          <div id="app">
            
            {/* Roadmap Screen (Native React) */}
            <div id="roadmap-screen" className="screen active">
              <Roadmap onNodeClick={handleNodeClick} />
            </div>

          </div>
        </main>

        {/* RIGHT SIDEBAR (Phase 1) */}
        <SidebarRight 
            isOpen={isMobileStatsOpen}
            onClose={() => setIsMobileStatsOpen(false)}
            onOpenShop={openShop} 
        />

        {/* MOBILE BOTTOM BAR (Phase 1) */}
        <MobileBottomBar 
          activeTab={isMobileNavOpen ? 'levels' : isMobileStatsOpen ? 'stats' : 'curriculum'}
          onTabClick={(tab) => {
            if (tab === 'levels') {
              setIsMobileNavOpen(!isMobileNavOpen);
              setIsMobileStatsOpen(false);
            } else if (tab === 'stats') {
              setIsMobileStatsOpen(!isMobileStatsOpen);
              setIsMobileNavOpen(false);
            } else if (tab === 'curriculum') {
              setIsMobileNavOpen(false);
              setIsMobileStatsOpen(false);
            }
          }}
        />
      </div>

      <RewardPopup />
      
      {/* Full Screen Interactive Player */}
      {activeLesson && activeLesson.id !== 'Boss' && (
        <LessonPlayer 
          lessonNode={activeLesson}
          onExit={() => setActiveLesson(null)}
          onComplete={(scoreData) => {
            localStorage.removeItem('neolix_active_lesson');
            completeLesson(activeLesson.id, scoreData.xpEarned, 100, scoreData.completedLessonId, scoreData.isNodeComplete, scoreData.isTutorial); 
            setActiveLesson(null);
          }}
        />
      )}

      {/* Boss Encounter Player */}
      {activeLesson && activeLesson.id === 'Boss' && (
        <BossEncounter 
          lessonNode={activeLesson}
          onExit={() => setActiveLesson(null)}
          onComplete={(scoreData) => {
            localStorage.removeItem('neolix_active_lesson');
            completeLesson(activeLesson.id, scoreData.xpEarned, 100);
            setActiveLesson(null);
          }}
        />
      )}
      
      {/* Onboarding overlay removed in favor of /welcome/start redirection */}
      
      {/* Modals */}
      <FeedbackRefillModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} onSuccess={() => {
         // They got a refill, so we can just let them click again or automatically start the lesson.
      }} />
      <LexiFeedbackWidget />
    </>
  );
};
