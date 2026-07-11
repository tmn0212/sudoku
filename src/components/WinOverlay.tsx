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

  if (status !== 'won') return null;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Puzzle solved">
      <div className="overlay__card">
        <div className="overlay__emoji" aria-hidden="true">🎉</div>
        <h2 className="overlay__title">Solved!</h2>
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
          New Game
        </button>
      </div>
    </div>
  );
};
