/**
 * Ephemeral, non-persisted visual-effects state. Kept out of the game store so
 * the game/engine layers stay pure and side-effect-free. Drives the "unit
 * completed" flash plus the pop-in / pop-out animations for placed and cleared
 * cell content.
 */

import { create } from 'zustand';

/** A snapshot of content that just left a cell, animating out. */
export interface Ghost {
  id: number;
  cell: number;
  value: number;
  notes: number;
  notesAlt: number;
  bans: number;
  /** A wrong entry being auto-converted to a ban leaves in red. */
  wrong: boolean;
}

interface FxState {
  /** Cells currently playing the completion flash (empty most of the time). */
  flashCells: number[];
  flash: (cells: number[]) => void;
  /** Cells whose freshly-placed content should play a pop-in animation. */
  popCells: number[];
  pop: (cells: number[]) => void;
  /** Snapshots of just-removed content, animating out then discarded. */
  ghosts: Ghost[];
  addGhosts: (ghosts: Omit<Ghost, 'id'>[]) => void;
}

let clearTimer: ReturnType<typeof setTimeout> | undefined;
let popTimer: ReturnType<typeof setTimeout> | undefined;
let ghostId = 0;

export const useFx = create<FxState>()((set, get) => ({
  flashCells: [],
  flash: (cells) => {
    if (cells.length === 0) return;
    if (clearTimer) clearTimeout(clearTimer);
    set({ flashCells: cells });
    // Long enough for the staggered wave (max ~460ms delay + ~550ms anim).
    clearTimer = setTimeout(() => set({ flashCells: [] }), 1100);
  },
  popCells: [],
  pop: (cells) => {
    if (cells.length === 0) return;
    if (popTimer) clearTimeout(popTimer);
    set({ popCells: cells });
    popTimer = setTimeout(() => set({ popCells: [] }), 340);
  },
  ghosts: [],
  addGhosts: (list) => {
    if (list.length === 0) return;
    const added = list.map((g) => ({ ...g, id: ++ghostId }));
    set({ ghosts: [...get().ghosts, ...added] });
    const ids = new Set(added.map((g) => g.id));
    setTimeout(
      () => set({ ghosts: get().ghosts.filter((g) => !ids.has(g.id)) }),
      300,
    );
  },
}));
