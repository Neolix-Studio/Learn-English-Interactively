import { useId } from 'react';
import { Dialog } from './Dialog';
import './ConfirmSheet.css';

// The one "are you sure?" (UX0b-3, #397; UX2-2 moves the remaining confirm() calls onto it), on the Dialog
// primitive. It asks before something is lost, so the safe answer is the main button: it comes first, has
// focus when the sheet opens, and Escape, a tap on the scrim and the system Back all give it. The second
// button is the action the sheet asks about. The caller passes every string, already translated.

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  body: string;
  /** The safe answer, which keeps things as they are. */
  cancelLabel: string;
  /** The action the sheet asks about. */
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** The action throws something away: its button takes the danger colour. */
  destructive?: boolean;
}

export function ConfirmSheet({ open, title, body, cancelLabel, confirmLabel, onCancel, onConfirm, destructive = false }: ConfirmSheetProps) {
  const id = useId();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      labelledBy={`${id}-title`}
      describedBy={`${id}-body`}
      role="alertdialog"
      className="confirm-sheet"
    >
      <div className="confirm-sheet-panel">
        <h2 id={`${id}-title`} className="confirm-sheet-title">{title}</h2>
        <p id={`${id}-body`} className="confirm-sheet-body">{body}</p>
        <div className="confirm-sheet-actions">
          <button type="button" className="confirm-sheet-button confirm-sheet-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-sheet-button confirm-sheet-confirm${destructive ? ' is-destructive' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
