import { useEffect } from 'react';
import { addCandidate } from '@sudoku/core';
import { useGame } from '../game/store';
import { useFx, type Ghost } from '../state/fxStore';

/** How long a bounce ghost lives — a touch past the 1s bounce animation (pop in,
 *  ~0.5s hold, pop out). */
const BOUNCE_TTL_MS = 1050;

/**
 * Bounces a note back out of any cell that refused it because a peer already
 * resolves the digit (see the game store's `bounce` signal). The mark pops in
 * like a normal note, then springs straight out again — so a drag-note across a
 * mix of legal and illegal cells reads clearly: the legal cells keep the note,
 * the illegal ones visibly reject it.
 *
 * Kept in the UI layer (the game store stays free of fx) and driven by object
 * identity: `inputDigit` sets a fresh `bounce` object per rejection, so this
 * effect fires exactly once each time.
 */
export const useBounceFx = (): void => {
  const bounce = useGame((s) => s.bounce);

  useEffect(() => {
    if (!bounce) return;
    const mask = addCandidate(0, bounce.digit);
    const ghosts: Omit<Ghost, 'id'>[] = bounce.cells.map((cell) => ({
      cell,
      value: 0,
      notes: bounce.layer === 'note' ? mask : 0,
      notesAlt: bounce.layer === 'noteAlt' ? mask : 0,
      bans: 0,
      wrong: false,
      bounce: true,
    }));
    useFx.getState().addGhosts(ghosts, BOUNCE_TTL_MS);
  }, [bounce]);
};
