import { useGame } from '../game/store';
import { formatTime } from '../utils/format';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

interface TopBarProps {
  onNewGame: () => void;
}

export const TopBar = ({ onNewGame }: TopBarProps) => {
  const difficulty = useGame((s) => s.difficulty);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const mistakes = useGame((s) => s.mistakes);
  const autoCheck = useGame((s) => s.autoCheck);

  return (
    <header className="topbar">
      <div className="topbar__meta">
        <span className="topbar__difficulty">{DIFFICULTY_LABEL[difficulty]}</span>
        {autoCheck && (
          <span className="topbar__mistakes" aria-label={`${mistakes} mistakes`}>
            Mistakes: {mistakes}
          </span>
        )}
      </div>
      <div className="topbar__timer" role="timer" aria-label="Elapsed time">
        {formatTime(elapsedMs)}
      </div>
      <button className="topbar__new" onClick={onNewGame}>
        New
      </button>
    </header>
  );
};
