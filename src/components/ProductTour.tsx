import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import type { Step, EventData, Options } from 'react-joyride';
import { useTranslation } from 'react-i18next';

interface ProductTourProps {
  run: boolean;
  onTourEnd: () => void;
  onFirstStepDone?: () => void;
  onStepChange?: (index: number) => void;
}

interface LeaderboardTourProps {
  run: boolean;
  onTourEnd: () => void;
  onStepChange?: (index: number) => void;
}

interface DashboardLeaderboardSummaryTourProps {
  run: boolean;
  onTourEnd: () => void;
}

const MOBILE_BREAKPOINT = '(max-width: 991px)';
const MOBILE_TOUR_STEP_DELAY_MS = 380;

const isMobileViewport = () => (
  typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches
);

const getSharedJoyrideOptions = (showProgress = true): Partial<Options> => ({
  arrowColor: '#ffffff',
  arrowSize: 12,
  arrowSpacing: 8,
  backgroundColor: '#ffffff',
  overlayColor: 'rgba(15, 23, 42, 0.75)',
  primaryColor: '#4F46E5',
  textColor: '#1E293B',
  zIndex: 100000,
  showProgress,
  scrollDuration: 220,
  scrollOffset: 96,
  spotlightPadding: isMobileViewport() ? 6 : 10,
  targetWaitTimeout: 2500,
  offset: isMobileViewport() ? 8 : 10,
  buttons: ['back', 'primary', 'skip'],
});

const sharedFloatingOptions = {
  strategy: 'fixed' as const,
  flipOptions: {
    padding: 18,
    fallbackStrategy: 'bestFit' as const,
  },
  shiftOptions: {
    padding: {
      top: 18,
      right: 14,
      bottom: 92,
      left: 14,
    },
  },
  autoUpdate: {
    ancestorScroll: true,
    ancestorResize: true,
    elementResize: true,
    layoutShift: true,
    animationFrame: true,
  },
};

const getSharedJoyrideStyles = () => ({
  floater: {
    maxWidth: 'min(360px, calc(100vw - 28px))',
    width: 'min(360px, calc(100vw - 28px))',
    zIndex: 100000,
  },
  tooltip: {
    borderRadius: '16px',
    maxHeight: 'calc(100dvh - 118px)',
    maxWidth: 'min(360px, calc(100vw - 28px))',
    overflowY: 'auto' as const,
    width: 'min(360px, calc(100vw - 28px))',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
    borderRadius: '16px',
    padding: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: 'min(360px, calc(100vw - 28px))',
  },
  tooltipTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  tooltipContent: {
    fontSize: '0.95rem',
    color: '#475569',
    lineHeight: '1.5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  tooltipFooter: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    justifyContent: 'flex-end',
  },
  buttonPrimary: {
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    padding: '8px 16px',
    outline: 'none',
  },
  buttonBack: {
    color: '#64748B',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginRight: '12px',
  },
  buttonSkip: {
    color: '#94A3B8',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
});

const getNextStepIndex = (data: EventData, stepCount: number) => {
  if (data.action === 'prev') return Math.max(0, data.index - 1);
  if (data.action === 'next' || data.action === 'close') return Math.min(stepCount - 1, data.index + 1);
  return data.index;
};

export const ProductTour: React.FC<ProductTourProps> = ({ run, onTourEnd, onFirstStepDone, onStepChange }) => {
  const { t } = useTranslation();
  const isMobile = isMobileViewport();
  const [stepIndex, setStepIndex] = useState(0);
  const [isTourReady, setIsTourReady] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tourSteps: Step[] = useMemo(() => [
    {
      target: isMobile ? '#level-selector-btn' : '.level-selector-modal',
      title: t('tour.dashboard.level_title'),
      content: t('tour.dashboard.level_content'),
      placement: isMobile ? 'bottom' : 'center',
      skipBeacon: true,
      isFixed: true,
    },
    {
      target: '.practice-title',
      title: t('tour.dashboard.practice_title'),
      content: t('tour.dashboard.practice_content'),
      placement: isMobile ? 'bottom-start' : 'right',
      isFixed: isMobile,
    },
    {
      target: '#user-profile-btn',
      title: t('tour.dashboard.profile_title'),
      content: t('tour.dashboard.profile_content'),
      placement: isMobile ? 'top-start' : 'right',
      isFixed: isMobile,
    },
    {
      target: '.module-banner-container',
      title: t('tour.dashboard.banner_title'),
      content: t('tour.dashboard.banner_content'),
      placement: isMobile ? 'top' : 'bottom',
      isFixed: isMobile,
    },
    {
      target: '.module-banner-grammar-btn',
      title: t('tour.dashboard.guide_title'),
      content: t('tour.dashboard.guide_content'),
      placement: isMobile ? 'top' : 'left',
      isFixed: isMobile,
    },
    {
      target: '.shop-tour-target',
      title: t('tour.dashboard.shop_title'),
      content: t('tour.dashboard.shop_content'),
      placement: isMobile ? 'bottom-start' : 'left',
      isFixed: isMobile,
    },
    {
      target: '.quests-tour-target',
      title: t('tour.dashboard.quests_title'),
      content: t('tour.dashboard.quests_content'),
      placement: isMobile ? 'top-start' : 'left',
      isFixed: isMobile,
    },
  ], [isMobile, t]);

  useEffect(() => {
    if (!run) {
      setStepIndex(0);
      setIsTourReady(false);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      return;
    }

    setIsTourReady(false);
    setStepIndex(0);
    onStepChange?.(0);
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setIsTourReady(true);
    }, isMobile ? MOBILE_TOUR_STEP_DELAY_MS : 0);
  }, [isMobile, run, onStepChange]);

  useEffect(() => () => {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
  }, []);

  const handleJoyrideCallback = (data: EventData) => {
    const { index, status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (type === 'step:before') {
      onStepChange?.(index);
    }

    if (index === 0 && (type === 'step:after' || type === 'error:target_not_found')) {
      onFirstStepDone?.();
    }

    if (finishedStatuses.includes(status)) {
      onTourEnd();
      return;
    }

    if (type === 'step:after' || type === 'error:target_not_found') {
      const nextIndex = getNextStepIndex(data, tourSteps.length);
      onStepChange?.(nextIndex);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      stepTimerRef.current = setTimeout(() => {
        setStepIndex(nextIndex);
        setIsTourReady(true);
      }, isMobile ? MOBILE_TOUR_STEP_DELAY_MS : 0);
    }
  };

  return (
    <Joyride
      run={run && isTourReady}
      steps={tourSteps}
      stepIndex={stepIndex}
      onEvent={handleJoyrideCallback}
      continuous={true}
      floatingOptions={sharedFloatingOptions}
      scrollToFirstStep={true}
      locale={{
        back: t('tour.controls.back'),
        close: t('tour.controls.close'),
        last: t('tour.controls.last'),
        next: t('tour.controls.next'),
        skip: t('tour.controls.skip'),
      }}
      options={getSharedJoyrideOptions(true)}
      styles={getSharedJoyrideStyles()}
    />
  );
};

export const LeaderboardTour: React.FC<LeaderboardTourProps> = ({ run, onTourEnd, onStepChange }) => {
  const { t } = useTranslation();
  const isMobile = isMobileViewport();
  const [stepIndex, setStepIndex] = useState(0);
  const [isTourReady, setIsTourReady] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps: Step[] = [
    {
      target: '.leaderboard-nav-link',
      title: t('tour.leaderboard.nav_title'),
      content: t('tour.leaderboard.nav_content'),
      placement: isMobile ? 'bottom' : 'right',
      skipBeacon: true,
      isFixed: isMobile,
    },
    {
      target: '.leaderboard-weekly-tab',
      title: t('tour.leaderboard.weekly_title'),
      content: t('tour.leaderboard.weekly_content'),
      placement: 'bottom',
      isFixed: isMobile,
    },
    {
      target: '.leaderboard-reset-timer',
      title: t('tour.leaderboard.timer_title'),
      content: t('tour.leaderboard.timer_content'),
      placement: 'bottom',
      isFixed: isMobile,
    },
    {
      target: '.leaderboard-search',
      title: t('tour.leaderboard.search_title'),
      content: t('tour.leaderboard.search_content'),
      placement: 'bottom',
      isFixed: isMobile,
    },
    {
      target: '.leaderboard-monthly-tab',
      title: t('tour.leaderboard.monthly_title'),
      content: t('tour.leaderboard.monthly_content'),
      placement: 'bottom',
      isFixed: isMobile,
    },
    {
      target: '.leaderboard-back-btn',
      title: t('tour.leaderboard.back_title'),
      content: t('tour.leaderboard.back_content'),
      placement: isMobile ? 'bottom' : 'right',
      isFixed: isMobile,
    },
  ];

  useEffect(() => {
    if (!run) {
      setStepIndex(0);
      setIsTourReady(false);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      return;
    }

    setIsTourReady(false);
    setStepIndex(0);
    onStepChange?.(0);
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setIsTourReady(true);
    }, isMobile ? MOBILE_TOUR_STEP_DELAY_MS : 0);
  }, [isMobile, run, onStepChange]);

  useEffect(() => () => {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
  }, []);

  const handleJoyrideCallback = (data: EventData) => {
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (data.type === 'step:before') {
      onStepChange?.(data.index);
    }
    if (finishedStatuses.includes(data.status)) {
      onTourEnd();
      return;
    }

    if (data.type === 'step:after' || data.type === 'error:target_not_found') {
      const nextIndex = getNextStepIndex(data, steps.length);
      onStepChange?.(nextIndex);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      stepTimerRef.current = setTimeout(() => {
        setStepIndex(nextIndex);
      }, isMobile ? MOBILE_TOUR_STEP_DELAY_MS : 0);
    }
  };

  return (
    <Joyride
      run={run && isTourReady}
      steps={steps}
      stepIndex={stepIndex}
      onEvent={handleJoyrideCallback}
      continuous={true}
      floatingOptions={sharedFloatingOptions}
      scrollToFirstStep={true}
      locale={{
        back: t('tour.controls.back'),
        close: t('tour.controls.close'),
        last: t('tour.controls.last'),
        next: t('tour.controls.next'),
        skip: t('tour.controls.skip'),
      }}
      options={getSharedJoyrideOptions(true)}
      styles={getSharedJoyrideStyles()}
    />
  );
};

export const DashboardLeaderboardSummaryTour: React.FC<DashboardLeaderboardSummaryTourProps> = ({ run, onTourEnd }) => {
  const { t } = useTranslation();
  const isMobile = isMobileViewport();

  const steps: Step[] = [
    {
      target: '.leaderboard-summary-tour-target',
      title: t('tour.leaderboard.summary_title'),
      content: t('tour.leaderboard.summary_content'),
      placement: isMobile ? 'top-start' : 'left',
      skipBeacon: true,
      isFixed: isMobile,
    },
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(data.status)) {
      onTourEnd();
    }
  };

  return (
    <Joyride
      run={run}
      steps={steps}
      onEvent={handleJoyrideCallback}
      continuous={true}
      floatingOptions={sharedFloatingOptions}
      scrollToFirstStep={true}
      locale={{
        back: t('tour.controls.back'),
        close: t('tour.controls.close'),
        last: t('tour.controls.last'),
        next: t('tour.controls.next'),
        skip: t('tour.controls.skip'),
      }}
      options={getSharedJoyrideOptions(false)}
      styles={getSharedJoyrideStyles()}
    />
  );
};
