import { useGame, ARCADE_LIVES } from '../game/store';
import { formatTime } from '../utils/format';

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

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

export const TopBar = ({ onNewGame, onHome }: TopBarProps) => {
  const difficulty = useGame((s) => s.difficulty);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const mistakes = useGame((s) => s.mistakes);
  const mode = useGame((s) => s.mode);
  const autoCheck = useGame((s) => s.autoCheck);
  const livesLeft = Math.max(0, ARCADE_LIVES - mistakes);

  return (
    <header className="topbar">
      <button className="topbar__icon" onClick={onHome} aria-label="Home">
        <HomeIcon />
      </button>
      <div className="topbar__meta">
        <span className="topbar__difficulty">{DIFFICULTY_LABEL[difficulty]}</span>
        {mode === 'arcade' ? (
          <span className="topbar__lives" aria-label={`${livesLeft} lives left`}>
            {'❤'.repeat(livesLeft)}
            {'♡'.repeat(ARCADE_LIVES - livesLeft)}
          </span>
        ) : (
          autoCheck && (
            <span className="topbar__mistakes" aria-label={`${mistakes} mistakes`}>
              Mistakes: {mistakes}
            </span>
          )
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
