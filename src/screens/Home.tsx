import { useState } from 'react';
import { DIFFICULTIES, type Difficulty } from '../engine/types';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';
import { useStartGame } from '../hooks/useStartGame';
import { formatTime } from '../utils/format';
import type { Mode } from '../db/idb';

const DIFFICULTY_META: Record<Difficulty, { label: string; blurb: string }> = {
  easy: { label: 'Easy', blurb: 'Singles only' },
  medium: { label: 'Medium', blurb: 'Locked candidates, pairs' },
  hard: { label: 'Hard', blurb: 'Triples, X-Wing' },
  pro: { label: 'Pro', blurb: 'Swordfish, XY-Wing' },
  impossible: { label: 'Impossible', blurb: 'Chains & deep logic' },
};

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: 'good', label: 'Good', blurb: 'Classic sudoku, take your time' },
  { id: 'arcade', label: 'Arcade', blurb: 'Solve without mistakes' },
];

export const Home = () => {
  const [mode, setMode] = useState<Mode>('good');
  const { start, generating } = useStartGame();
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
              {DIFFICULTY_META[difficulty].label} · {formatTime(elapsedMs)} ·{' '}
              {filled}/{empties}
            </span>
          </div>
          <span className="home__continue-go" aria-hidden="true">▶</span>
        </button>
      )}

      <div className="home__modes" role="tablist" aria-label="Game mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            className={`home__mode ${mode === m.id ? 'home__mode--active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span className="home__mode-label">{m.label}</span>
            <span className="home__mode-blurb">{m.blurb}</span>
          </button>
        ))}
      </div>

      <div className="home__difficulties">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            className="home__difficulty"
            disabled={generating}
            onClick={() => start(d, mode)}
          >
            <span className="home__difficulty-label">{DIFFICULTY_META[d].label}</span>
            <span className="home__difficulty-blurb">{DIFFICULTY_META[d].blurb}</span>
          </button>
        ))}
      </div>

      <button className="home__challenges" onClick={() => navigate('challenges')}>
        <div>
          <span className="home__challenges-label">Challenges</span>
          <span className="home__challenges-blurb">
            240 graded puzzles · beat your best score
          </span>
        </div>
        <span className="home__continue-go" aria-hidden="true">▶</span>
      </button>

      <nav className="home__nav">
        <button onClick={() => navigate('learn')}>Learn</button>
        <button onClick={() => navigate('stats')}>Stats</button>
        <button onClick={() => navigate('settings')}>Settings</button>
      </nav>

      {generating && (
        <div className="home__generating" role="status">
          <div className="spinner" aria-hidden="true" />
          <span>Generating puzzle…</span>
        </div>
      )}
    </div>
  );
};
