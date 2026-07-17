import React, { useCallback, useEffect, useState } from 'react';
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
import { DashboardLeaderboardSummaryTour, ProductTour } from '../components/ProductTour';
import { isLeaderboardUnlocked } from '../utils/featureUnlocks';
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
  const [runLeaderboardSummaryTour, setRunLeaderboardSummaryTour] = useState(false);
  const [tourLevelModalOpen, setTourLevelModalOpen] = useState(false);
  const [highlightLeaderboardUnlock, setHighlightLeaderboardUnlock] = useState(false);
  const isMobileViewport = () => window.matchMedia('(max-width: 991px)').matches;

  useEffect(() => {
    if (!isLoading && data?.onboarding_completed === true) {
      const tourCompleted = localStorage.getItem('lexipaws_tour_completed');
      if (!tourCompleted) {
        if (isMobileViewport()) {
          setIsMobileNavOpen(true);
          setTourLevelModalOpen(false);
        } else {
          setTourLevelModalOpen(true);
        }
        setRunTour(true);
      }
    }
  }, [isLoading, data?.onboarding_completed]);

  useEffect(() => {
    if (!isLoading && isLeaderboardUnlocked(data.points)) {
      const tourCompleted = localStorage.getItem('lexipaws_leaderboard_tour_completed');
      const tourPending = localStorage.getItem('lexipaws_leaderboard_tour_pending');
      if (!tourCompleted && !tourPending) {
        localStorage.setItem('lexipaws_leaderboard_tour_pending', 'true');
        setHighlightLeaderboardUnlock(true);
      } else if (tourPending && !tourCompleted) {
        setHighlightLeaderboardUnlock(true);
      }
    }
  }, [isLoading, data.points]);

  useEffect(() => {
    if (!isLoading && isLeaderboardUnlocked(data.points)) {
      const pending = localStorage.getItem('lexipaws_dashboard_leaderboard_summary_pending');
      if (pending) {
        if (isMobileViewport()) {
          setIsMobileNavOpen(false);
          setIsMobileStatsOpen(true);
        }
        setRunLeaderboardSummaryTour(true);
      }
    }
  }, [isLoading, data.points]);

  const handleTourEnd = () => {
    setRunTour(false);
    setTourLevelModalOpen(false);
    setIsMobileNavOpen(false);
    setIsMobileStatsOpen(false);
    localStorage.setItem('lexipaws_tour_completed', 'true');
  };

  const handleLeaderboardSummaryTourEnd = () => {
    setRunLeaderboardSummaryTour(false);
    setIsMobileStatsOpen(false);
    setHighlightLeaderboardUnlock(false);
    localStorage.removeItem('lexipaws_dashboard_leaderboard_summary_pending');
  };

  const handleDashboardTourStepChange = useCallback((index: number) => {
    if (!isMobileViewport()) return;

    const leftSidebarSteps = new Set([0, 1, 2]);
    const rightSidebarSteps = new Set([5, 6]);

    if (leftSidebarSteps.has(index)) {
      setIsMobileNavOpen(true);
      setIsMobileStatsOpen(false);
      return;
    }

    if (rightSidebarSteps.has(index)) {
      setIsMobileNavOpen(false);
      setIsMobileStatsOpen(true);
      return;
    }

    setIsMobileNavOpen(false);
    setIsMobileStatsOpen(false);
  }, []);

  useEffect(() => {
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
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    document.body.classList.toggle('has-mobile-drawer-open', isMobileNavOpen || isMobileStatsOpen);
    return () => document.body.classList.remove('has-mobile-drawer-open');
  }, [isMobileNavOpen, isMobileStatsOpen]);

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
      if (!lastRefill || (now - parseInt(lastRefill)) > 3600000) {
        setIsFeedbackModalOpen(true);
      } else {
        alert(t('dashboard.not_enough_energy'));
      }
      return;
    }

    if (!isPremium && !isReentering) {
      const updates: any = { energy: energy - 1 };
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
      <ProductTour
        run={runTour}
        onTourEnd={handleTourEnd}
        onFirstStepDone={() => setTourLevelModalOpen(false)}
        onStepChange={handleDashboardTourStepChange}
      />
      <DashboardLeaderboardSummaryTour
        run={runLeaderboardSummaryTour}
        onTourEnd={handleLeaderboardSummaryTourEnd}
      />
      <div className="dashboard-container">
        <SidebarLeft
            isOpen={isMobileNavOpen}
            onClose={() => setIsMobileNavOpen(false)}
            onOpenProfile={() => navigate('/profile')}
            tourLevelModalOpen={tourLevelModalOpen}
            onTourLevelModalClose={() => setTourLevelModalOpen(false)}
            highlightLeaderboardUnlock={highlightLeaderboardUnlock}
        />

        <main className="main-stage-track">
          <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>{t('dashboard.title', 'Tanulási Útvonal')}</h1>
          <div id="app">

            <div id="roadmap-screen" className="screen active">
              <Roadmap onNodeClick={handleNodeClick} />
            </div>

          </div>
        </main>

        <SidebarRight
            isOpen={isMobileStatsOpen}
            onClose={() => setIsMobileStatsOpen(false)}
            onOpenShop={openShop}
        />

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


      <FeedbackRefillModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} onSuccess={() => {
      }} />
      <LexiFeedbackWidget />
    </>
  );
};
