import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { useFx } from '../state/fxStore';
import { UNITS } from '../engine/board';

/**
 * Watches the board and flashes a row / column / box the moment it becomes
 * completely and correctly filled. Lives in the UI layer (not the game store)
 * so the engine/store stay pure and unit tests never trigger timers. The
 * winning move is intentionally skipped — the win overlay is the celebration
 * there.
 */
export const useCompletionFx = (): void => {
  const values = useGame((s) => s.values);
  const prev = useRef(values);

  useEffect(() => {
    const before = prev.current;
    prev.current = values;
    if (before === values) return;

    const { solution, status } = useGame.getState();
    if (status !== 'playing') return; // the winning move gets the overlay instead

    const isDone = (grid: number[], unit: number[]) =>
      unit.every((i) => grid[i] !== 0 && grid[i] === solution[i]);

    const flash = new Set<number>();
    for (const unit of UNITS) {
      if (isDone(values, unit) && !isDone(before, unit)) {
        for (const i of unit) flash.add(i);
      }
    }
    if (flash.size) useFx.getState().flash([...flash]);
  }, [values]);
};
