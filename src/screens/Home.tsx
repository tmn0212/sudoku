import type { ReactNode } from 'react';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';
import { formatTime } from '../utils/format';
import { IconGrid, IconBolt, IconChevronRight } from '../components/icons';
import type { Difficulty } from '../engine/types';
import type { Mode } from '../db/idb';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  impossible: 'Impossible',
};

const MODES: { id: Mode; label: string; blurb: string; icon: ReactNode }[] = [
  { id: 'good', label: 'Good', blurb: 'Classic sudoku · take your time', icon: <IconGrid size={24} /> },
  { id: 'arcade', label: 'Arcade', blurb: 'Race the clock · limited mistakes', icon: <IconBolt size={24} /> },
];

export const Home = () => {
  const navigate = useUi((s) => s.navigate);

  const status = useGame((s) => s.status);
  const difficulty = useGame((s) => s.difficulty);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const values = useGame((s) => s.values);
  const given = useGame((s) => s.given);
  const filled = values.filter((v, i) => v !== 0 && !given[i]).length;
  const empties = given.filter((g) => !g).length;
  const inProgress = status === 'playing' && filled > 0;

  return (
    <div className="home">
      <div className="home__brand">
        <div className="home__logo" aria-hidden="true">
          <span>5</span>
          <span>·</span>
          <span>3</span>
        </div>
        <h1 className="home__title">Sudoku</h1>
        <p className="home__tagline">Play offline · learn the techniques</p>
      </div>

      {inProgress && (
        <button className="home__continue" onClick={() => navigate('game')}>
          <div>
            <span className="home__continue-label">Continue</span>
            <span className="home__continue-meta">
              {DIFFICULTY_LABEL[difficulty]} · {formatTime(elapsedMs)} · {filled}/
              {empties}
            </span>
          </div>
          <span className="home__continue-go" aria-hidden="true">
            <IconChevronRight size={22} />
          </span>
        </button>
      )}

      <div className="home__modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className="home__modecard"
            onClick={() => navigate('difficulties', { mode: m.id })}
          >
            <span className="home__modecard-icon" aria-hidden="true">
              {m.icon}
            </span>
            <span className="home__modecard-label">{m.label}</span>
            <span className="home__modecard-blurb">{m.blurb}</span>
            <span className="home__modecard-go" aria-hidden="true">
              <IconChevronRight size={20} />
            </span>
          </button>
        ))}
      </div>

      <nav className="home__nav">
        <button onClick={() => navigate('learn')}>Learn</button>
        <button onClick={() => navigate('stats')}>Stats</button>
        <button onClick={() => navigate('settings')}>Settings</button>
      </nav>
    </div>
  );
};
