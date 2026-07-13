import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { CELL_COUNT } from '../engine/board';

const LINGER_MS = 1000;

/**
 * When the game is validating and the player leaves a wrong digit in a cell, it
 * lingers (red) for a beat, then pops out and is recorded as a ban — so the pad
 * greys that digit out for the cell and the same mistake can't be repeated.
 *
 * Lives in the UI layer (timers, not pure state). Each pending cell has its own
 * timer, cancelled if the cell is corrected or cleared first.
 */
export const useAutoBanWrong = (): void => {
  const values = useGame((s) => s.values);
  const prev = useRef(values);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const p = prev.current;
    prev.current = values;
    const s = useGame.getState();
    const checking = s.autoCheck || s.mode === 'arcade';
    const t = timers.current;

    for (let i = 0; i < CELL_COUNT; i++) {
      if (values[i] === p[i]) continue;
      const existing = t.get(i);
      if (existing) {
        clearTimeout(existing);
        t.delete(i);
      }
      const wrong =
        checking && !s.given[i] && values[i] !== 0 && values[i] !== s.solution[i];
      if (wrong) {
        const digit = values[i];
        t.set(
          i,
          setTimeout(() => {
            t.delete(i);
            useGame.getState().autoBanWrong(i, digit);
          }, LINGER_MS),
        );
      }
    }
  }, [values]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      for (const timer of t.values()) clearTimeout(timer);
      t.clear();
    };
  }, []);
};
