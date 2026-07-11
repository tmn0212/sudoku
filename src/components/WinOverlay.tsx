import { useGame } from '../game/store';
import { formatTime } from '../utils/format';

interface WinOverlayProps {
  onNewGame: () => void;
}

export const WinOverlay = ({ onNewGame }: WinOverlayProps) => {
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
        <div className="overlay__emoji" aria-hidden="true">
          {won ? '🎉' : '💥'}
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
        <button className="overlay__button" onClick={onNewGame}>
          {won ? 'New Game' : 'Try Again'}
        </button>
      </div>
    </div>
  );
};
