import { useGame } from '../game/store';
import { formatTime } from '../utils/format';
import { IconTrophy, IconHeartBroken } from './icons';

interface WinOverlayProps {
  onNext: () => void;
  onRetry: () => void;
  onHome: () => void;
  busy?: boolean;
}

export const WinOverlay = ({ onNext, onRetry, onHome, busy }: WinOverlayProps) => {
  const status = useGame((s) => s.status);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const mistakes = useGame((s) => s.mistakes);
  const difficulty = useGame((s) => s.difficulty);
  const score = useGame((s) => s.score);

  if (status === 'playing') return null;
  const won = status === 'won';

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={won ? 'Puzzle solved' : 'Game over'}
    >
      <div className="overlay__card">
        <div
          className={`overlay__icon overlay__icon--${won ? 'win' : 'lose'}`}
          aria-hidden="true"
        >
          {won ? <IconTrophy size={52} /> : <IconHeartBroken size={52} />}
        </div>
        <h2 className="overlay__title">{won ? 'Solved!' : 'Out of lives'}</h2>
        {won && (
          <div className="overlay__score">
            <span className="overlay__score-value">{score.toLocaleString()}</span>
            <span className="overlay__score-label">points</span>
          </div>
        )}
        <dl className="overlay__stats">
          <div>
            <dt>Time</dt>
            <dd>{formatTime(elapsedMs)}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd style={{ textTransform: 'capitalize' }}>{difficulty}</dd>
          </div>
          <div>
            <dt>Mistakes</dt>
            <dd>{mistakes}</dd>
          </div>
        </dl>
        <div className="overlay__actions">
          {won ? (
            <button className="overlay__button" onClick={onNext} disabled={busy}>
              {busy ? 'Loading…' : 'Next Puzzle'}
            </button>
          ) : (
            <button className="overlay__button" onClick={onRetry} disabled={busy}>
              Try Again
            </button>
          )}
          <button
            className="overlay__button overlay__button--ghost"
            onClick={onHome}
            disabled={busy}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};
