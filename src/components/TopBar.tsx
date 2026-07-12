import { useGame, ARCADE_LIVES } from '../game/store';
import { formatTime } from '../utils/format';
import { IconHome, IconClock, IconPlus, IconHeart } from './icons';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  impossible: 'Impossible',
};

interface TopBarProps {
  onNewGame: () => void;
  onHome: () => void;
}

export const TopBar = ({ onNewGame, onHome }: TopBarProps) => {
  const difficulty = useGame((s) => s.difficulty);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const mode = useGame((s) => s.mode);
  const mistakes = useGame((s) => s.mistakes);
  const autoCheck = useGame((s) => s.autoCheck);
  const livesLeft = Math.max(0, ARCADE_LIVES - mistakes);

  return (
    <header className="topbar">
      <button className="topbar__btn" onClick={onHome} aria-label="Home">
        <IconHome size={22} />
      </button>

      {/* The clock is the anchored centrepiece; lives/mistakes sit right under it
          so the two most-glanced-at stats read as one central column. */}
      <div className="topbar__center">
        <span className="topbar__difficulty">{DIFFICULTY_LABEL[difficulty]}</span>
        <span className="topbar__timer" role="timer" aria-label="Elapsed time">
          <IconClock size={20} />
          {formatTime(elapsedMs)}
        </span>
        <span className="topbar__status">
          {mode === 'arcade' ? (
            <span className="topbar__lives" aria-label={`${livesLeft} lives left`}>
              {Array.from({ length: ARCADE_LIVES }, (_, i) => (
                <IconHeart key={i} size={22} filled={i < livesLeft} />
              ))}
            </span>
          ) : autoCheck && mistakes > 0 ? (
            <span className="topbar__mistakes">
              {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}
            </span>
          ) : null}
        </span>
      </div>

      <button className="topbar__new" onClick={onNewGame}>
        <IconPlus size={16} />
        New
      </button>
    </header>
  );
};
