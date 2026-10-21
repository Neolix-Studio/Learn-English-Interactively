import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { RecoveryScreen } from './RecoveryScreen';
import { MobileBottomBar } from './MobileBottomBar';

// The signed-in tab screens: their recovery screen keeps the bottom bar, so the learner can go elsewhere.
const TAB_ROUTES: Record<string, 'curriculum' | 'profile'> = {
  '/dashboard': 'curriculum',
  '/practice': 'curriculum',
  '/characters': 'curriculum',
  '/leaderboard': 'curriculum',
  '/profile': 'profile',
  '/friends': 'profile'
};

// A render error in one route shows the recovery screen in place of that route only, and going to
// another route clears it (UX3-2, #400; N4). The providers, the router and the popups above keep running.
export function RouteBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = TAB_ROUTES[location.pathname];
  // A tab screen, a lesson or the welcome flow leaves for the path (the path itself for the profile); a
  // public page for the start page.
  const exitTo = location.pathname === '/dashboard' ? '/profile'
    : tab || location.pathname.startsWith('/lesson') || location.pathname.startsWith('/welcome') ? '/dashboard'
    : '/';
  const exitLabel = exitTo === '/profile' ? t('errors.recovery_profile') : exitTo === '/dashboard' ? t('errors.recovery_path') : t('errors.recovery_home');

  return (
    <ErrorBoundary
      resetKey={location.pathname}
      fallback={(error, retry) => (
        <>
          <RecoveryScreen
            error={error}
            onRetry={retry}
            withBottomBar={!!tab}
            exit={(
              // Where the bottom bar is shown it is the way out; from 992 px, where it is hidden, this button is.
              <button
                type="button"
                className={`connection-notice__btn${tab ? ' recovery-screen__wide-only' : ''}`}
                onClick={() => navigate(exitTo, { replace: true })}
              >
                {exitLabel}
              </button>
            )}
          />
          {tab && <MobileBottomBar activeTab={tab} />}
        </>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
