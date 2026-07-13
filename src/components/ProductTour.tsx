import React from 'react';
import { Joyride, STATUS } from 'react-joyride';
import type { Step, EventData } from 'react-joyride';

interface ProductTourProps {
  run: boolean;
  onTourEnd: () => void;
}

export const tourSteps: Step[] = [
  {
    target: '.dashboard-left-sidebar',
    content: 'Navigate your learning modules and settings here.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '.roadmap-container',
    content: 'Track your progress and upcoming milestones.',
    placement: 'right',
  },
  {
    target: '#user-profile-btn',
    content: 'Manage your profile, XP, and settings.',
    placement: 'right',
  },
  {
    target: '.changelog-anchor',
    content: 'Check out the latest features and updates in our changelog!',
    placement: 'right',
  },
];

export const ProductTour: React.FC<ProductTourProps> = ({ run, onTourEnd }) => {
  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onTourEnd();
    }
  };

  return (
    <Joyride
      run={run}
      steps={tourSteps}
      onEvent={handleJoyrideCallback}
      continuous={true}
      options={{
        arrowColor: '#ffffff',
        backgroundColor: '#ffffff',
        overlayColor: 'rgba(15, 23, 42, 0.75)', // Elegant slate dark overlay
        primaryColor: '#4F46E5', // Premium Indigo accent color
        textColor: '#1E293B', // Deep Slate text
        zIndex: 5000,
        showProgress: true,
        buttons: ['back', 'primary', 'skip'],
      }}
      styles={{
        tooltipContainer: {
          textAlign: 'left',
          borderRadius: '16px',
          padding: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
        buttonPrimary: {
          backgroundColor: '#4F46E5',
          color: '#ffffff',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '8px 16px',
          transition: 'background-color 0.2s ease',
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
      }}
    />
  );
};
