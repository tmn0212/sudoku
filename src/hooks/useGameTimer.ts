import { useEffect } from 'react';
import { useGame } from '../game/store';

/**
 * Advances the game timer once per second while a game is in progress and the
 * tab is visible. Pauses automatically when the tab is backgrounded.
 */
export const useGameTimer = (): void => {
  const status = useGame((s) => s.status);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    if (status !== 'playing') return;

    let last = performance.now();
    const interval = setInterval(() => {
      if (document.hidden) {
        last = performance.now();
        return;
      }
      const now = performance.now();
      tick(now - last);
      last = now;
    }, 1000);

    return () => clearInterval(interval);
  }, [status, tick]);
};
