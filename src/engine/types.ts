/**
 * Core types for the Sudoku engine.
 *
 * A grid is a flat array of 81 cells, row-major (index = row * 9 + col).
 * A value of 0 means the cell is empty; 1-9 are filled digits.
 */

export type Grid = number[];

export type Difficulty = 'easy' | 'medium' | 'hard' | 'pro' | 'impossible';

export const DIFFICULTIES: Difficulty[] = [
  'easy',
  'medium',
  'hard',
  'pro',
  'impossible',
];

/**
 * A candidate set represented as a bitmask. Bit `n` (1 << n) is set when digit
 * `n` (1-9) is a candidate for a cell. Bit 0 is unused.
 */
export type CandidateMask = number;

export type TechniqueName =
  | 'naked-single'
  | 'hidden-single'
  | 'pointing'
  | 'claiming'
  | 'naked-pair'
  | 'hidden-pair'
  | 'naked-triple'
  | 'hidden-triple'
  | 'x-wing'
  | 'swordfish'
  | 'xy-wing';

/** A single deductive step produced by the logical solver / hint engine. */
export interface Step {
  technique: TechniqueName;
  /** Cells to fill in (usually one). */
  placements: { cell: number; value: number }[];
  /** Candidate eliminations (for techniques that don't place a digit). */
  eliminations: { cell: number; value: number }[];
  /** Cells relevant to the explanation, for UI highlighting. */
  highlights: number[];
  /** Human-readable explanation of the deduction. */
  reason: string;
}

export interface Puzzle {
  /** The puzzle as presented, 0 = empty. */
  puzzle: Grid;
  /** The unique solution. */
  solution: Grid;
  difficulty: Difficulty;
  /** Number of pre-filled (given) cells. */
  givens: number;
}
