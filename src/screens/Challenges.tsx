import { useEffect, useState } from 'react';
import './Challenges.css';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconCheck, IconDice, IconClock } from '../components/icons';
import { formatTime } from '../utils/format';
import { loadChallengePack } from '../data/challenges';
import { getChallengeProgress } from '../db/progress';
import { listSavedGames } from '../db/savedGames';
import { useStartChallenge } from '../hooks/useStartChallenge';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';
import type { Difficulty } from '../engine/types';
import type { ChallengeProgress, Mode, SavedGame } from '../db/idb';

const LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  impossible: 'Impossible',
};

export const Challenges = () => {
  const mode = (useUi((s) => s.params.mode) as Mode) ?? 'good';
  const difficulty = (useUi((s) => s.params.difficulty) as Difficulty) ?? 'easy';
  const navigate = useUi((s) => s.navigate);

  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState<Map<number, ChallengeProgress>>(
    new Map(),
  );
  // Saved in-progress games for this mode+difficulty, keyed by puzzle index.
  const [roster, setRoster] = useState<Map<number, SavedGame>>(new Map());
  const [loading, setLoading] = useState(true);
  const { startChallenge } = useStartChallenge();

  // The single live game (freshest) — may not have hit the roster yet.
  const gameStatus = useGame((s) => s.status);
  const gameMode = useGame((s) => s.mode);
  const gameChallenge = useGame((s) => s.challenge);
  const activeIndex =
    gameStatus === 'playing' &&
    gameMode === mode &&
    gameChallenge?.difficulty === difficulty
      ? gameChallenge.index
      : null;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      loadChallengePack(difficulty),
      getChallengeProgress(mode, difficulty),
      listSavedGames(),
    ]).then(([pack, prog, saved]) => {
      if (!alive) return;
      setCount(pack.puzzles.length);
      setProgress(prog);
      const map = new Map<number, SavedGame>();
      for (const g of saved) {
        if (g.mode === mode && g.challenge?.difficulty === difficulty) {
          map.set(g.challenge.index, g);
        }
      }
      setRoster(map);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [mode, difficulty]);

  const solvedCount = [...progress.values()].filter((p) => p.solved).length;

  const isActive = (index: number): boolean =>
    index === activeIndex || roster.has(index);

  const open = (index: number) => {
    if (index === activeIndex) {
      navigate('game'); // the live game — resume as-is
    } else if (roster.has(index)) {
      useGame.getState().loadGame(roster.get(index)!); // resume a saved game
      navigate('game');
    } else {
      void startChallenge(mode, difficulty, index);
    }
  };

  const randomUnsolved = () => {
    const pool: number[] = [];
    for (let i = 0; i < count; i++) if (!progress.get(i)?.solved) pool.push(i);
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    void startChallenge(mode, difficulty, pick);
  };

  const allSolved = !loading && count > 0 && solvedCount >= count;

  return (
    <div className="screen">
      <ScreenHeader title={`${LABELS[difficulty]} Challenges`} />
      <div className="screen__body">
        <div className="chal-top">
          <p className="chal-summary">
            {solvedCount} of {count || '…'} solved
          </p>
          <button
            className="chal-random"
            onClick={randomUnsolved}
            disabled={loading || allSolved}
          >
            {allSolved ? (
              <>
                <IconCheck size={16} />
                All done
              </>
            ) : (
              <>
                <IconDice size={16} />
                Random
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="chal-loading" role="status">
            <div className="spinner" aria-hidden="true" />
            <span>Loading puzzles…</span>
          </div>
        ) : (
          <div className="chal-grid">
            {Array.from({ length: count }, (_, i) => {
              const p = progress.get(i);
              const active = isActive(i);
              const state = active
                ? 'active'
                : p?.solved
                  ? 'solved'
                  : p
                    ? 'retry'
                    : 'new';
              return (
                <button
                  key={i}
                  className={`chal-cell chal-cell--${state}`}
                  onClick={() => open(i)}
                >
                  <span className="chal-cell__num">{i + 1}</span>
                  {state === 'active' ? (
                    <span className="chal-cell__tag">Continue</span>
                  ) : state === 'solved' ? (
                    <span className="chal-cell__stats">
                      <span className="chal-cell__score">
                        {p!.bestScore.toLocaleString()}
                      </span>
                      {p!.bestTimeMs > 0 && (
                        <span className="chal-cell__time">
                          <IconClock size={9} />
                          {formatTime(p!.bestTimeMs)}
                        </span>
                      )}
                    </span>
                  ) : state === 'retry' ? (
                    <span className="chal-cell__tag">Retry</span>
                  ) : null}
                  {state === 'solved' && (
                    <span className="chal-cell__check" aria-hidden="true">
                      <IconCheck size={13} />
                    </span>
                  )}
                  {state === 'active' && (
                    <span className="chal-cell__dot" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
