import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { recordGame } from '../db/stats';
import { recordChallengeResult } from '../db/progress';

/**
 * Records a game to IndexedDB exactly once when it ends (won or lost). Resets
 * when a new game starts. Challenge-bank puzzles additionally update their
 * per-puzzle progress (solved state + personal bests).
 */
export const useRecordGame = (): void => {
  const status = useGame((s) => s.status);
  const recorded = useRef(false);

  useEffect(() => {
    if (status === 'playing') {
      recorded.current = false;
      return;
    }
    if (recorded.current) return;
    recorded.current = true;

    const s = useGame.getState();
    const won = s.status === 'won';

    void recordGame({
      mode: s.mode,
      difficulty: s.difficulty,
      timeMs: s.elapsedMs,
      mistakes: s.mistakes,
      hints: s.hints,
      score: s.score,
      won,
      completedAt: Date.now(),
    }).catch(() => {
      /* offline / storage error — non-fatal */
    });

    if (s.challenge) {
      void recordChallengeResult({
        mode: s.mode,
        difficulty: s.difficulty,
        index: s.challenge.index,
        score: s.score,
        timeMs: s.elapsedMs,
        won,
      }).catch(() => {
        /* non-fatal */
      });
    }
  }, [status]);
};
