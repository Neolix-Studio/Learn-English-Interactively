import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import type { EventData, Options, Step } from 'react-joyride';

interface ProductTourProps {
  run: boolean;
  onTourEnd: () => void;
  onStepChange?: (index: number) => void;
}

const MOBILE_BREAKPOINT = '(max-width: 991px)';
const MOBILE_TOUR_STEP_DELAY_MS = 380;

const isMobileViewport = () => (
  typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches
);

const getSharedJoyrideOptions = (): Partial<Options> => ({
  arrowColor: '#ffffff',
  arrowSize: 12,
  arrowSpacing: 8,
  backgroundColor: '#ffffff',
  overlayColor: 'rgba(15, 23, 42, 0.75)',
  primaryColor: '#4F46E5',
  textColor: '#1E293B',
  zIndex: 100000,
  showProgress: true,
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

export const ProductTour: React.FC<ProductTourProps> = ({ run, onTourEnd, onStepChange }) => {
  const isMobile = isMobileViewport();
  const [stepIndex, setStepIndex] = useState(0);
  const [isTourReady, setIsTourReady] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tourSteps: Step[] = useMemo(() => [
    {
      target: isMobile ? '#level-selector-btn' : '.dashboard-left-sidebar',
      title: 'Navigation',
      content: 'Navigate your learning modules and settings here.',
      placement: isMobile ? 'bottom-start' : 'right',
      skipBeacon: true,
      isFixed: isMobile,
    },
    {
      target: '.roadmap-container',
      title: 'Roadmap',
      content: 'Track your progress and upcoming milestones.',
      placement: isMobile ? 'top' : 'right',
      isFixed: isMobile,
    },
    {
      target: '#user-profile-btn',
      title: 'Profile',
      content: 'Manage your profile, XP, and settings.',
      placement: isMobile ? 'top-start' : 'right',
      isFixed: isMobile,
    },
    {
      target: '.changelog-anchor',
      title: 'Updates',
      content: 'Check out the latest features and updates in our changelog!',
      placement: isMobile ? 'top-start' : 'right',
      isFixed: isMobile,
    },
  ], [isMobile]);

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
      const nextIndex = getNextStepIndex(data, tourSteps.length);
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
      steps={tourSteps}
      stepIndex={stepIndex}
      onEvent={handleJoyrideCallback}
      continuous={true}
      floatingOptions={sharedFloatingOptions}
      scrollToFirstStep={true}
      options={getSharedJoyrideOptions()}
      styles={getSharedJoyrideStyles()}
    />
  );
};
