import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Dialog.css';

// The one dialog every overlay moves onto (UX2-1, #396; C24, C22, C37). It is a native <dialog> opened
// with showModal(), so it sits in the browser's top layer above the header and every stacking context,
// and the rest of the page is inert while it is open. On top of that it keeps Tab inside, closes on
// Escape and on a press that starts and ends on the scrim, gives focus back to the element that opened
// it, and owns one history entry, so the system Back closes the top dialog before it leaves the route.

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** The id of the dialog's visible title. Without one, give `label`. */
  labelledBy?: string;
  label?: string;
  /** The id of the text that says what the dialog is about, read out after the title. */
  describedBy?: string;
  /** `alertdialog` for a question that interrupts, such as ConfirmSheet's. */
  role?: 'alertdialog';
  /** Added to `lexi-dialog`, for a layout of its own (ConfirmSheet's bottom sheet). */
  className?: string;
  id?: string;
  children: ReactNode;
}

// Each open dialog pushes one history entry, marked with its token under this key on top of the
// router's own state, so React Router still finds its key and index there.
const HISTORY_KEY = 'lexiDialog';

interface Layer {
  token: string;
  onBack: () => void;
}

const layers: Layer[] = [];
let ownBacks = 0;
let listening = false;

const currentToken = (): string | undefined => window.history.state?.[HISTORY_KEY];

function handlePopState() {
  // The popstate of a history.back() this file made when a dialog closed from the page.
  if (ownBacks > 0) {
    ownBacks -= 1;
    return;
  }
  const top = layers[layers.length - 1];
  if (!top || currentToken() === top.token) return;
  layers.pop();
  top.onBack();
}

function pushLayer(layer: Layer) {
  if (!listening) {
    window.addEventListener('popstate', handlePopState);
    listening = true;
  }
  layers.push(layer);
  window.history.pushState({ ...window.history.state, [HISTORY_KEY]: layer.token }, '');
}

function releaseLayer(token: string) {
  const index = layers.findIndex(layer => layer.token === token);
  if (index !== -1) layers.splice(index, 1);
  // Closed from the page (Escape, the scrim, a button): take its entry off again. When Back closed it,
  // or a navigation replaced or covered its entry, the entry is no longer the current one.
  if (currentToken() === token) {
    ownBacks += 1;
    window.history.back();
  }
}

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, labelledBy, label, describedBy, role, className, id, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();

    const closeOnEscape = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    // Chrome lets a page hold Escape back only once per user activation; when it closes the dialog itself, follow it.
    // The close event comes a task later, so one that finds the dialog open again (StrictMode reopens it at once
    // in development) is stale.
    const followNativeClose = () => {
      if (!dialog.open) onCloseRef.current();
    };
    // The browser would let Tab leave the last control for its own toolbar; it goes round to the first instead.
    const keepTabInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const tabbable = Array.from(dialog.querySelectorAll<HTMLElement>(TABBABLE)).filter(element => element.getClientRects().length > 0);
      if (tabbable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = tabbable[0];
      const last = tabbable[tabbable.length - 1];
      const active = document.activeElement;
      // A focused element that is not on the list, such as a panel Chrome focuses because it scrolls,
      // counts by where it sits: before the first control (or around it), or after the last.
      const atStart = active === first || (!!active && !tabbable.includes(active as HTMLElement) && !!(active.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING));
      const atEnd = active === last || (!!active && !tabbable.includes(active as HTMLElement) && !!(last.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (event.shiftKey && atStart) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && atEnd) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('cancel', closeOnEscape);
    dialog.addEventListener('close', followNativeClose);
    dialog.addEventListener('keydown', keepTabInside);
    return () => {
      dialog.removeEventListener('cancel', closeOnEscape);
      dialog.removeEventListener('close', followNativeClose);
      dialog.removeEventListener('keydown', keepTabInside);
      if (dialog.open) dialog.close();
      if (opener?.isConnected && opener.getClientRects().length > 0) opener.focus();
    };
  }, [open]);

  // The history entry. Its release waits a tick, so StrictMode's unmount-and-mount in development keeps
  // the entry it already pushed instead of popping it and pushing a second one.
  const layerRef = useRef<{ token: string; release: number | null } | null>(null);
  useEffect(() => {
    if (!open) return;
    const layer = layerRef.current;
    if (layer && layer.release !== null) {
      window.clearTimeout(layer.release);
      layer.release = null;
    } else {
      const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      layerRef.current = { token, release: null };
      pushLayer({ token, onBack: () => onCloseRef.current() });
    }
    return () => {
      const current = layerRef.current;
      if (!current) return;
      current.release = window.setTimeout(() => {
        layerRef.current = null;
        releaseLayer(current.token);
      }, 0);
    };
  }, [open]);

  // A close needs the press to start on the scrim too, so selecting text in a field and letting go outside the panel keeps it open.
  const pressStartedOnScrim = useRef(false);

  if (!open) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      id={id}
      className={className ? `lexi-dialog ${className}` : 'lexi-dialog'}
      role={role}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      aria-describedby={describedBy}
      onPointerDown={event => { pressStartedOnScrim.current = event.target === event.currentTarget; }}
      onClick={event => { if (pressStartedOnScrim.current && event.target === event.currentTarget) onCloseRef.current(); }}
    >
      {children}
    </dialog>,
    document.body
  );
}
