import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { useFx, type Ghost } from '../state/fxStore';
import { CELL_COUNT } from '../engine/board';

/**
 * Watches the cell layers and drives the pop-in (new content) / pop-out (removed
 * content) animations. Lives in the UI layer so the game store stays pure.
 *
 * A whole-board swap (new game, load, big undo) changes far more cells than any
 * hand move, so those are skipped — only incremental edits animate.
 */
export const usePops = (): void => {
  const values = useGame((s) => s.values);
  const notes = useGame((s) => s.notes);
  const notesAlt = useGame((s) => s.notesAlt);
  const bans = useGame((s) => s.bans);
  const solution = useGame((s) => s.solution);
  const prev = useRef({ values, notes, notesAlt, bans });

  useEffect(() => {
    const p = prev.current;
    prev.current = { values, notes, notesAlt, bans };

    let changed = 0;
    for (let i = 0; i < CELL_COUNT; i++) {
      if (
        values[i] !== p.values[i] ||
        notes[i] !== p.notes[i] ||
        notesAlt[i] !== p.notesAlt[i] ||
        bans[i] !== p.bans[i]
      ) {
        changed++;
      }
    }
    if (changed === 0 || changed > 30) return; // reset / load / bulk change

    const pops: number[] = [];
    const ghosts: Omit<Ghost, 'id'>[] = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      const gainedValue = values[i] !== 0 && p.values[i] === 0;
      const gainedMark =
        (notes[i] & ~p.notes[i]) |
        (notesAlt[i] & ~p.notesAlt[i]) |
        (bans[i] & ~p.bans[i]);
      if (gainedValue || gainedMark) pops.push(i);

      // A value that was removed or replaced pops out (covers erase, overwrite,
      // and the auto-ban conversion of a wrong entry).
      if (p.values[i] !== 0 && values[i] !== p.values[i]) {
        ghosts.push({
          cell: i,
          value: p.values[i],
          notes: 0,
          notesAlt: 0,
          bans: 0,
          wrong: p.values[i] !== solution[i],
        });
        continue;
      }
      // Marks only ghost out when the cell empties entirely, so auto-cleanup of
      // a single peer note doesn't spray ghosts everywhere.
      const lostMarks =
        (p.notes[i] & ~notes[i]) |
        (p.notesAlt[i] & ~notesAlt[i]) |
        (p.bans[i] & ~bans[i]);
      const emptied =
        values[i] === 0 && notes[i] === 0 && notesAlt[i] === 0 && bans[i] === 0;
      if (lostMarks && emptied) {
        ghosts.push({
          cell: i,
          value: 0,
          notes: p.notes[i],
          notesAlt: p.notesAlt[i],
          bans: p.bans[i],
          wrong: false,
        });
      }
    }

    if (pops.length) useFx.getState().pop(pops);
    if (ghosts.length) useFx.getState().addGhosts(ghosts);
  }, [values, notes, notesAlt, bans, solution]);
};
