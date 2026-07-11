/**
 * Ephemeral, non-persisted visual-effects state. Kept out of the game store so
 * the game/engine layers stay pure and side-effect-free. Currently drives the
 * "unit completed" flash (a row/column/box lighting up when it's filled in).
 */

import { create } from 'zustand';

interface FxState {
  /** Cells currently playing the completion flash (empty most of the time). */
  flashCells: number[];
  flash: (cells: number[]) => void;
}

let clearTimer: ReturnType<typeof setTimeout> | undefined;

export const useFx = create<FxState>()((set) => ({
  flashCells: [],
  flash: (cells) => {
    if (cells.length === 0) return;
    if (clearTimer) clearTimeout(clearTimer);
    set({ flashCells: cells });
    // Long enough for the staggered wave (max ~460ms delay + ~550ms anim).
    clearTimer = setTimeout(() => set({ flashCells: [] }), 1100);
  },
}));
