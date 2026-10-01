import React from 'react';
import { useTranslation } from 'react-i18next';
import './ConnectionNotice.css';

export type SaveError = 'signed_out' | 'offline' | 'failed';

// Shown instead of the app when get_session fails: the learner may be signed in, so
// falling back to guest would hide their account and start writing guest progress (B4a, #383).
export const ConnectionError: React.FC<{ retrying: boolean; onRetry: () => void }> = ({ retrying, onRetry }) => {
  const { t } = useTranslation();
  return (
    <main className="connection-error" role="alert">
      <h1 className="connection-error__title">{t('errors.connection_title')}</h1>
      <p className="connection-error__body">{t('errors.connection_body')}</p>
      <button type="button" className="connection-notice__btn connection-notice__btn--solid" onClick={onRetry} disabled={retrying}>
        {retrying ? t('errors.retrying') : t('errors.retry')}
      </button>
    </main>
  );
};

// A save that did not reach the server, after api.fetch's own CSRF retry.
export const SaveErrorNotice: React.FC<{
  kind: SaveError;
  onRetry: () => void;
  onSignIn: () => void;
  onDismiss: () => void;
}> = ({ kind, onRetry, onSignIn, onDismiss }) => {
  const { t } = useTranslation();
  const message = kind === 'signed_out' ? t('errors.signed_out')
    : kind === 'offline' ? t('errors.save_offline')
    : t('errors.save_failed');
  return (
    <div className="save-error-notice" role="alert">
      <p className="save-error-notice__text">{message}</p>
      <div className="save-error-notice__actions">
        <button type="button" className="connection-notice__btn" onClick={onDismiss}>
          {t('errors.dismiss')}
        </button>
        {kind === 'signed_out' ? (
          <button type="button" className="connection-notice__btn connection-notice__btn--solid" onClick={onSignIn}>
            {t('errors.sign_in')}
          </button>
        ) : (
          <button type="button" className="connection-notice__btn connection-notice__btn--solid" onClick={onRetry}>
            {t('errors.retry')}
          </button>
        )}
      </div>
    </div>
  );
};
