import { useBanPrompt } from '../state/banPromptStore';
import './BanConfirm.css';

/**
 * Confirmation shown when the user tries to enter a digit they've banned in the
 * selected cell (gated by the warn-on-banned setting). Rendered on the game
 * screen; returns nothing while there's no pending digit.
 */
export const BanConfirm = () => {
  const digit = useBanPrompt((s) => s.digit);
  const confirm = useBanPrompt((s) => s.confirm);
  const cancel = useBanPrompt((s) => s.cancel);

  if (digit == null) return null;

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Place a banned digit"
      onClick={cancel}
    >
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Place a banned digit?</h2>
        <p className="modal__body">
          You marked <strong>{digit}</strong> as not allowed in this cell. Place
          it anyway?
        </p>
        <div className="modal__actions">
          <button className="modal__btn" onClick={cancel}>
            Cancel
          </button>
          <button className="modal__btn modal__btn--primary" onClick={confirm}>
            Place {digit}
          </button>
        </div>
      </div>
    </div>
  );
};
