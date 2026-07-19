import { useState } from 'react';
import './TopBar.css';
import { useGame, ARCADE_LIVES } from '../game/store';
import { formatTime } from '../utils/format';
import {
  IconClock,
  IconHeart,
  IconHome,
  IconMenu,
  IconPlus,
  IconRefresh,
  IconSettings,
} from './icons';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  impossible: 'Impossible',
};

const MODE_LABEL: Record<string, string> = { relaxed: 'Relaxed', arcade: 'Arcade' };

interface TopBarProps {
  onNewGame: () => void;
  onHome: () => void;
  onSettings: () => void;
  onRestart: () => void;
}

export const TopBar = ({ onNewGame, onHome, onSettings, onRestart }: TopBarProps) => {
  const difficulty = useGame((s) => s.difficulty);
  const mode = useGame((s) => s.mode);
  const challenge = useGame((s) => s.challenge);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const mistakes = useGame((s) => s.mistakes);
  const autoCheck = useGame((s) => s.autoCheck);
  const livesLeft = Math.max(0, ARCADE_LIVES - mistakes);
  const [menuOpen, setMenuOpen] = useState(false);

  const run = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="topbar">
      {/* Empty left cell keeps the clock centred now that settings moved into
          the more-options menu on the right. */}
      <div className="topbar__slot" aria-hidden="true" />

      {/* The clock is the anchored centrepiece; the puzzle's mode/difficulty/#
          sit above it and lives/mistakes right below, one central column. In
          Relaxed the clock is hidden (it still runs, just off-screen — scoring
          reads it) so the mode/difficulty label becomes the headline instead. */}
      <div className={`topbar__center ${mode === 'relaxed' ? 'topbar__center--noclock' : ''}`}>
        <span className="topbar__difficulty">
          <span>{MODE_LABEL[mode] ?? mode}</span>
          <span>{DIFFICULTY_LABEL[difficulty] ?? difficulty}</span>
          {challenge && <span>#{challenge.index + 1}</span>}
        </span>
        {mode === 'arcade' && (
          <span className="topbar__timer" role="timer" aria-label="Elapsed time">
            <IconClock size={20} />
            {formatTime(elapsedMs)}
          </span>
        )}
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

      <div className="topbar__actions">
        <button
          className="topbar__btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <IconMenu size={26} />
        </button>
        {menuOpen && (
          <>
            <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="topbar__menu" role="menu">
              <button className="topbar__menu-item" role="menuitem" onClick={run(onNewGame)}>
                <IconPlus size={19} />
                New game
              </button>
              <button className="topbar__menu-item" role="menuitem" onClick={run(onRestart)}>
                <IconRefresh size={19} />
                Restart puzzle
              </button>
              <button className="topbar__menu-item" role="menuitem" onClick={run(onSettings)}>
                <IconSettings size={19} />
                Settings
              </button>
              <button className="topbar__menu-item" role="menuitem" onClick={run(onHome)}>
                <IconHome size={19} />
                Home
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
