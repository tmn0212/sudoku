import type { ReactNode } from 'react';
import './Home.css';
import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';
import { useStartChallenge } from '../hooks/useStartChallenge';
import { getChallengeProgress } from '../db/progress';
import { listSavedGames } from '../db/savedGames';
import { PACK_SIZES } from '../data/challenges';
import { formatTime } from '../utils/format';
import { IconGrid, IconBolt, IconChevronRight, IconDice } from '../components/icons';
import { DIFFICULTIES, type Difficulty } from '../engine/types';
import type { Mode, SavedGame } from '../db/idb';

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

interface ResumeItem {
  id: string;
  label: string;
  mode: Mode;
  elapsedMs: number;
  filled: number;
  empties: number;
  onResume: () => void;
}

const filledOf = (values: number[], given: boolean[]): number =>
  values.reduce((n, v, i) => (v !== 0 && !given[i] ? n + 1 : n), 0);
const emptiesOf = (given: boolean[]): number =>
  given.reduce((n, g) => (g ? n : n + 1), 0);

const gameLabel = (difficulty: string, challenge: { index: number } | null): string => {
  const d = DIFFICULTY_LABEL[difficulty as Difficulty] ?? difficulty;
  return challenge ? `${d} #${challenge.index + 1}` : d;
};

export const Home = () => {
  const navigate = useUi((s) => s.navigate);
  const { startChallenge } = useStartChallenge();
  const [rolling, setRolling] = useState(false);
  const [saved, setSaved] = useState<SavedGame[]>([]);

  // Live game (reactive) so the current game always shows the freshest progress
  // even if its debounced roster write hasn't landed yet.
  const gameId = useGame((s) => s.gameId);
  const status = useGame((s) => s.status);
  const difficulty = useGame((s) => s.difficulty);
  const mode = useGame((s) => s.mode);
  const challenge = useGame((s) => s.challenge);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const values = useGame((s) => s.values);
  const given = useGame((s) => s.given);

  useEffect(() => {
    let alive = true;
    listSavedGames().then((rows) => alive && setSaved(rows));
    return () => {
      alive = false;
    };
  }, []);

  const resumeSaved = (g: SavedGame) => {
    useGame.getState().loadGame(g);
    navigate('game');
  };

  // Merge the live game in (freshest wins). Home only surfaces the single most
  // recent game; the rest of the (up to 10) saved games are reachable from the
  // challenge listing, so we don't clutter the menu with a long roster here.
  const liveFilled = filledOf(values, given);
  const liveInProgress = status === 'playing' && liveFilled > 0;
  const resumeList: ResumeItem[] = [];
  if (liveInProgress) {
    resumeList.push({
      id: gameId,
      label: gameLabel(difficulty, challenge),
      mode,
      elapsedMs,
      filled: liveFilled,
      empties: emptiesOf(given),
      onResume: () => navigate('game'),
    });
  }
  for (const g of saved) {
    if (g.id === gameId) continue; // already shown from the live store
    resumeList.push({
      id: g.id,
      label: gameLabel(g.difficulty, g.challenge),
      mode: g.mode,
      elapsedMs: g.elapsedMs,
      filled: filledOf(g.values, g.given),
      empties: emptiesOf(g.given),
      onResume: () => resumeSaved(g),
    });
  }
  const games = resumeList.slice(0, 1);

  const surprise = async () => {
    if (rolling) return;
    setRolling(true);
    try {
      const m = pick<Mode>(['good', 'arcade']);
      const diff = pick(DIFFICULTIES);
      const count = PACK_SIZES[diff];
      const progress = await getChallengeProgress(m, diff);
      const pool: number[] = [];
      for (let i = 0; i < count; i++) if (!progress.get(i)?.solved) pool.push(i);
      const index = pool.length ? pick(pool) : Math.floor(Math.random() * count);
      await startChallenge(m, diff, index);
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

      {games.length > 0 && (
        <section className="home__resume">
          <h2 className="home__resume-title">Continue</h2>
          <div className="home__resume-list">
            {games.map((g) => (
              <button key={g.id} className="home__resume-card" onClick={g.onResume}>
                <span className="home__resume-info">
                  <span className="home__resume-label">{g.label}</span>
                  <span className="home__resume-meta">
                    <span>{g.mode === 'arcade' ? 'Arcade' : 'Good'}</span>
                    <span>{formatTime(g.elapsedMs)}</span>
                    <span>
                      {g.filled}/{g.empties}
                    </span>
                  </span>
                </span>
                <span className="home__resume-go" aria-hidden="true">
                  <IconChevronRight size={20} />
                </span>
              </button>
            ))}
          </div>
        </section>
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
