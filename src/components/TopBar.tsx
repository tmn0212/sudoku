import { useGame } from '../game/store';
import { formatTime } from '../utils/format';
import { IconHome, IconClock, IconPlus } from './icons';

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

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button className="topbar__btn" onClick={onHome} aria-label="Home">
          <IconHome size={22} />
        </button>
        <span className="topbar__difficulty">{DIFFICULTY_LABEL[difficulty]}</span>
      </div>

      <div className="topbar__right">
        <span className="topbar__timer" role="timer" aria-label="Elapsed time">
          <IconClock size={15} />
          {formatTime(elapsedMs)}
        </span>
        <button className="topbar__new" onClick={onNewGame}>
          <IconPlus size={16} />
          New
        </button>
      </div>
    </header>
  );
};
