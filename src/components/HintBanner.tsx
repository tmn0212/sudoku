import { useGame } from '../game/store';

export const HintBanner = () => {
  const hint = useGame((s) => s.hint);
  const applyHint = useGame((s) => s.applyHint);
  const clearHint = useGame((s) => s.clearHint);

  if (!hint) return null;

  const canApply = (hint.step?.placements.length ?? 0) > 0;

  return (
    <div className="hint-banner" role="status">
      <p className="hint-banner__text">{hint.message}</p>
      <div className="hint-banner__actions">
        {canApply && (
          <button className="hint-banner__apply" onClick={applyHint}>
            Place it
          </button>
        )}
        <button className="hint-banner__dismiss" onClick={clearHint} aria-label="Dismiss hint">
          Got it
        </button>
      </div>
    </div>
  );
};
