import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { recordGame } from '../db/stats';

/**
 * Records a game to IndexedDB exactly once when it ends (won or lost). Resets
 * when a new game starts.
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
    void recordGame({
      mode: s.mode,
      difficulty: s.difficulty,
      timeMs: s.elapsedMs,
      mistakes: s.mistakes,
      hints: s.hints,
      score: s.score,
      won: s.status === 'won',
      completedAt: Date.now(),
    }).catch(() => {
      /* offline / storage error — non-fatal */
    });
  }, [status]);
};
