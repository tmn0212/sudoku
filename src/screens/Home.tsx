import type { ReactNode } from 'react';
import { useState } from 'react';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';
import { useStartChallenge } from '../hooks/useStartChallenge';
import { getChallengeProgress } from '../db/progress';
import { PACK_SIZES } from '../data/challenges';
import { formatTime } from '../utils/format';
import { IconGrid, IconBolt, IconChevronRight, IconDice } from '../components/icons';
import { DIFFICULTIES, type Difficulty } from '../engine/types';
import type { Mode } from '../db/idb';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  impossible: 'Impossible',
};

const MODES: { id: Mode; label: string; blurb: string; icon: ReactNode }[] = [
  { id: 'good', label: 'Good', blurb: 'Classic sudoku at your own pace', icon: <IconGrid size={24} /> },
  { id: 'arcade', label: 'Arcade', blurb: 'Race the clock, limited mistakes', icon: <IconBolt size={24} /> },
];

const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const Home = () => {
  const navigate = useUi((s) => s.navigate);
  const { startChallenge } = useStartChallenge();
  const [rolling, setRolling] = useState(false);

  const status = useGame((s) => s.status);
  const difficulty = useGame((s) => s.difficulty);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const values = useGame((s) => s.values);
  const given = useGame((s) => s.given);
  const filled = values.filter((v, i) => v !== 0 && !given[i]).length;
  const empties = given.filter((g) => !g).length;
  const inProgress = status === 'playing' && filled > 0;

  // Surprise: a random unsolved puzzle from a random mode + difficulty.
  const surprise = async () => {
    if (rolling) return;
    setRolling(true);
    try {
      const mode = pick<Mode>(['good', 'arcade']);
      const diff = pick(DIFFICULTIES);
      const count = PACK_SIZES[diff];
      const progress = await getChallengeProgress(mode, diff);
      const pool: number[] = [];
      for (let i = 0; i < count; i++) if (!progress.get(i)?.solved) pool.push(i);
      const index = pool.length ? pick(pool) : Math.floor(Math.random() * count);
      await startChallenge(mode, diff, index);
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="home">
      <div className="home__brand">
        <div className="home__logo" aria-hidden="true">
          <span>5</span>
          <i className="home__logo-dot" />
          <span>3</span>
        </div>
        <h1 className="home__title">Sudoku</h1>
        <p className="home__tagline">Play offline and learn the techniques</p>
      </div>

      {inProgress && (
        <button className="home__continue" onClick={() => navigate('game')}>
          <div>
            <span className="home__continue-label">Continue</span>
            <span className="home__continue-meta">
              <span>{DIFFICULTY_LABEL[difficulty]}</span>
              <span>{formatTime(elapsedMs)}</span>
              <span>
                {filled}/{empties}
              </span>
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
        <button className="home__surprise" onClick={surprise} disabled={rolling}>
          <IconDice size={20} />
          {rolling ? 'Finding a puzzle…' : 'Surprise me'}
        </button>
      </div>

      <nav className="home__nav">
        <button onClick={() => navigate('learn')}>Learn</button>
        <button onClick={() => navigate('stats')}>Stats</button>
        <button onClick={() => navigate('settings')}>Settings</button>
      </nav>
    </div>
  );
};
