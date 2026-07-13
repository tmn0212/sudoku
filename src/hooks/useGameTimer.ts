import { useEffect } from 'react';
import { useGame } from '../game/store';
import { appVisibility } from '../platform/visibility';

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
      if (appVisibility.isHidden()) {
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
