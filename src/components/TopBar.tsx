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
  const mistakes = useGame((s) => s.mistakes);
  const mode = useGame((s) => s.mode);
  const autoCheck = useGame((s) => s.autoCheck);
  const livesLeft = Math.max(0, ARCADE_LIVES - mistakes);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button className="topbar__btn" onClick={onHome} aria-label="Home">
          <IconHome size={22} />
        </button>
        <div className="topbar__meta">
          <span className="topbar__difficulty">{DIFFICULTY_LABEL[difficulty]}</span>
          {mode === 'arcade' ? (
            <span className="topbar__lives" aria-label={`${livesLeft} lives left`}>
              {Array.from({ length: ARCADE_LIVES }, (_, i) => (
                <IconHeart key={i} size={13} filled={i < livesLeft} />
              ))}
            </span>
          ) : (
            autoCheck && (
              <span className="topbar__mistakes" aria-label={`${mistakes} mistakes`}>
                Mistakes: {mistakes}
              </span>
            )
          )}
        </div>
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
