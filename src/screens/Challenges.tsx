import { useEffect, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadChallengePack } from '../data/challenges';
import { getChallengeProgress } from '../db/progress';
import { useStartChallenge } from '../hooks/useStartChallenge';
import { DIFFICULTIES, type Difficulty } from '../engine/types';
import type { ChallengeProgress } from '../db/idb';

const LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  impossible: 'Impossible',
};

export const Challenges = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState<Map<number, ChallengeProgress>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const { startChallenge } = useStartChallenge();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      loadChallengePack(difficulty),
      getChallengeProgress('good', difficulty),
    ]).then(([pack, prog]) => {
      if (!alive) return;
      setCount(pack.puzzles.length);
      setProgress(prog);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [difficulty]);

  const solvedCount = [...progress.values()].filter((p) => p.solved).length;

  return (
    <div className="screen">
      <ScreenHeader title="Challenges" />
      <div className="screen__body">
        <div
          className="chal-tabs"
          role="tablist"
          aria-label="Challenge difficulty"
        >
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={d === difficulty}
              className={`chal-tab ${d === difficulty ? 'chal-tab--active' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {LABELS[d]}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="chal-summary">
            {solvedCount} of {count} solved
          </p>
        )}

        {loading ? (
          <div className="chal-loading" role="status">
            <div className="spinner" aria-hidden="true" />
            <span>Loading puzzles…</span>
          </div>
        ) : (
          <div className="chal-grid">
            {Array.from({ length: count }, (_, i) => {
              const p = progress.get(i);
              return (
                <button
                  key={i}
                  className={`chal-cell ${p?.solved ? 'chal-cell--solved' : ''}`}
                  onClick={() => startChallenge(difficulty, i)}
                >
                  <span className="chal-cell__num">{i + 1}</span>
                  {p?.solved ? (
                    <span className="chal-cell__score">
                      {p.bestScore.toLocaleString()}
                    </span>
                  ) : p ? (
                    <span className="chal-cell__try">retry</span>
                  ) : null}
                  {p?.solved && (
                    <span className="chal-cell__check" aria-hidden="true">
                      ✓
                    </span>
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
