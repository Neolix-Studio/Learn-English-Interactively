import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmSheet } from './ConfirmSheet';
import { ReportProblemModal } from './modals/ReportProblemModal';
import { clearAppStorage } from '../utils/storedState';
import './ConnectionNotice.css';
import './RecoveryScreen.css';

interface RecoveryScreenProps {
  error: Error;
  onRetry: () => void;
  // A way out of the broken screen: the bottom bar, or a link to a page that works.
  exit?: ReactNode;
  withBottomBar?: boolean;
}

// The root boundary is outside the router, so its way out is a plain link that reloads the start page.
export function RecoveryHomeLink() {
  const { t } = useTranslation();
  return <a className="connection-notice__btn recovery-screen__link" href="/">{t('errors.recovery_home')}</a>;
}

// Shown instead of a screen that failed to render (UX3-2, #400; N4). Retrying may be enough; when the
// device's stored data is what breaks it, 'Helyi adatok törlése' removes this app's keys and reloads.
export function RecoveryScreen({ error, onRetry, exit, withBottomBar = false }: RecoveryScreenProps) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const reset = () => {
    clearAppStorage();
    window.location.reload();
  };

  return (
    <main className={`connection-error recovery-screen${withBottomBar ? ' has-bottom-bar' : ''}`} role="alert">
      <h1 className="connection-error__title">{t('errors.recovery_title')}</h1>
      <p className="connection-error__body">{t('errors.recovery_body')}</p>
      <div className="recovery-screen__actions">
        <button type="button" className="connection-notice__btn connection-notice__btn--solid" onClick={onRetry}>
          {t('errors.retry')}
        </button>
        {exit}
        <button type="button" className="connection-notice__btn" onClick={() => setReportOpen(true)}>
          {t('errors.recovery_report')}
        </button>
        <button type="button" className="connection-notice__btn recovery-screen__reset" onClick={() => setConfirmOpen(true)}>
          {t('errors.recovery_reset')}
        </button>
      </div>

      <ConfirmSheet
        open={confirmOpen}
        title={t('errors.reset_title')}
        body={t('errors.reset_body')}
        cancelLabel={t('errors.reset_cancel')}
        confirmLabel={t('errors.reset_confirm')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={reset}
        destructive
      />
      <ReportProblemModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        contextData={{ source: 'error_boundary', route: window.location.pathname, error: String(error?.message || error).slice(0, 500) }}
      />
    </main>
  );
}
