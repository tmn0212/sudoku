import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { useFx } from '../state/fxStore';
import { useSettings } from '../state/settingsStore';
import { UNITS } from '../engine/board';

/**
 * Watches the board and fires a celebration flash the moment either
 *
 *  - a row / column / box becomes completely and correctly filled, or
 *  - a digit's final copy lands, so it's now placed correctly in all nine of
 *    its cells and can't go anywhere else on the grid.
 *
 * Both light up the involved cells the same rewarding way. Lives in the UI
 * layer (not the game store) so the engine/store stay pure and unit tests never
 * trigger timers. The winning move is intentionally skipped — the win overlay
 * is the celebration there.
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
    if (!useSettings.getState().celebrateCompletions) return; // user turned it off

    const unitDone = (grid: number[], unit: number[]) =>
      unit.every((i) => grid[i] !== 0 && grid[i] === solution[i]);

    // A digit is finished once all nine of its cells hold it correctly; a single
    // wrong copy of that digit anywhere keeps it unfinished.
    const digitDone = (grid: number[], d: number) => {
      let placed = 0;
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] !== d) continue;
        if (grid[i] !== solution[i]) return false;
        placed += 1;
      }
      return placed === 9;
    };

    const flash = new Set<number>();
    for (const unit of UNITS) {
      if (unitDone(values, unit) && !unitDone(before, unit)) {
        for (const i of unit) flash.add(i);
      }
    }
    for (let d = 1; d <= 9; d++) {
      if (digitDone(values, d) && !digitDone(before, d)) {
        for (let i = 0; i < values.length; i++) if (values[i] === d) flash.add(i);
      }
    }
    if (flash.size) useFx.getState().flash([...flash]);
  }, [values]);
};
