/**
 * Backtracking solver with the MRV (minimum-remaining-values) heuristic.
 *
 * This is the "ground truth" engine: it can find a solution, count solutions
 * (capped, for uniqueness checks), and fill an empty grid to produce a random
 * complete solution. The human-technique solver lives in `techniques.ts`.
 */

import {
  ALL_CANDIDATES,
  CELL_COUNT,
  candidatesToArray,
  cloneGrid,
  computeCandidates,
  PEERS,
  popcount,
  removeCandidate,
} from './board';
import type { CandidateMask, Grid } from './types';
import type { RNG } from './rng';

/**
 * Internal recursive core. Operates on a working grid and its live candidate
 * masks. `onSolution` returns `true` to stop the search early.
 */
const search = (
  grid: Grid,
  candidates: CandidateMask[],
  onSolution: (grid: Grid) => boolean,
  rng?: RNG,
): boolean => {
  // Pick the empty cell with the fewest candidates (MRV). This dramatically
  // prunes the search tree and lets contradictions surface immediately.
  let target = -1;
  let best = 10;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] !== 0) continue;
    const count = popcount(candidates[i]);
    if (count === 0) return false; // dead end: empty cell with no candidates
    if (count < best) {
      best = count;
      target = i;
      if (count === 1) break;
    }
  }

  if (target === -1) {
    // No empty cells remain -> complete solution.
    return onSolution(grid);
  }

  const mask = candidates[target];
  // For randomized full-grid generation we need a shuffled order; the hot
  // counting/solving path iterates set bits directly to avoid allocation.
  const options = rng ? rng.shuffle(candidatesToArray(mask)) : null;
  let remaining = mask;

  for (let idx = 0; ; idx++) {
    let value: number;
    if (options) {
      if (idx >= options.length) break;
      value = options[idx];
    } else {
      if (remaining === 0) break;
      const lsb = remaining & -remaining; // lowest set bit
      value = 31 - Math.clz32(lsb); // digit = log2(lsb)
      remaining &= remaining - 1;
    }

    grid[target] = value;
    // Remove `value` from peers' candidates, remembering what we changed.
    const touched: number[] = [];
    for (const p of PEERS[target]) {
      if (grid[p] === 0 && (candidates[p] & (1 << value)) !== 0) {
        candidates[p] = removeCandidate(candidates[p], value);
        touched.push(p);
      }
    }
    const savedTarget = candidates[target];
    candidates[target] = 0;

    if (search(grid, candidates, onSolution, rng)) return true;

    // Undo.
    grid[target] = 0;
    candidates[target] = savedTarget;
    for (const p of touched) candidates[p] = (candidates[p] | (1 << value)) as CandidateMask;
  }

  return false;
};

/**
 * Whether any filled cell already conflicts with a peer. The search only checks
 * empty cells against peers, so a grid whose *givens* conflict must be rejected
 * up front — otherwise the solver would fruitlessly explore a huge tree trying
 * to complete an unsatisfiable position.
 */
const hasFilledConflict = (grid: Grid): boolean => {
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = grid[i];
    if (v === 0) continue;
    for (const p of PEERS[i]) if (grid[p] === v) return true;
  }
  return false;
};

/** Return a solved copy of `grid`, or `null` if it has no solution. */
export const solve = (grid: Grid): Grid | null => {
  if (hasFilledConflict(grid)) return null;
  const work = cloneGrid(grid);
  let result: Grid | null = null;
  search(work, computeCandidates(work), (solved) => {
    result = cloneGrid(solved);
    return true;
  });
  return result;
};

/**
 * Count solutions, stopping once `limit` is reached. Use `limit = 2` to test
 * for a unique solution (result of exactly 1 means unique).
 */
export const countSolutions = (grid: Grid, limit = 2): number => {
  if (hasFilledConflict(grid)) return 0;
  const work = cloneGrid(grid);
  let count = 0;
  search(work, computeCandidates(work), () => {
    count++;
    return count >= limit;
  });
  return count;
};

export const hasUniqueSolution = (grid: Grid): boolean => countSolutions(grid, 2) === 1;

/**
 * Generate a random, fully solved grid using randomized backtracking.
 */
export const generateSolvedGrid = (rng: RNG): Grid => {
  const grid: Grid = new Array(CELL_COUNT).fill(0);
  const candidates: CandidateMask[] = new Array(CELL_COUNT).fill(ALL_CANDIDATES);
  let result: Grid | null = null;
  search(
    grid,
    candidates,
    (solved) => {
      result = cloneGrid(solved);
      return true;
    },
    rng,
  );
  // Search on an empty grid always succeeds.
  return result as unknown as Grid;
};
