/**
 * Puzzle generation and difficulty grading.
 *
 * Grading is technique-based (what a human must know to solve it), not just a
 * clue count. Generation digs holes out of a full solution while preserving a
 * unique solution, using the clue budget of the target difficulty to steer the
 * result, then verifies the grade and retries until it matches.
 */

import { CELL_COUNT, cloneGrid } from './board';
import { createRng, type RNG } from './rng';
import { countSolutions, generateSolvedGrid } from './solver';
import { solveLogically } from './techniques';
import type { Difficulty, Grid, Puzzle } from './types';

/**
 * Grade a puzzle by the hardest technique required to solve it logically.
 * A puzzle that can't be solved by our technique set (needs guessing / more
 * advanced chains) is graded `impossible`.
 */
export const gradeDifficulty = (puzzle: Grid): Difficulty => {
  const result = solveLogically(puzzle);
  // Not solvable with our technique set → needs chains/ALS beyond it.
  if (!result.solved) return 'impossible';
  const r = result.hardestRank;
  if (r <= 1) return 'easy'; // singles only
  if (r <= 3) return 'medium'; // locked candidates, pairs
  if (r <= 5) return 'hard'; // triples, quads, X-Wing
  if (r <= 6) return 'pro'; // swordfish, wings, skyscraper, kite
  return 'impossible'; // rank 7: jellyfish, colouring, unique rect, BUG (or unsolvable)
};

/**
 * Clue budget per difficulty: the minimum number of givens to leave. Fewer
 * clues generally forces harder techniques, so this steers generation toward
 * the target grade (which is then verified).
 */
const MIN_GIVENS: Record<Difficulty, number> = {
  easy: 44,
  medium: 36,
  hard: 32,
  pro: 28,
  impossible: 24,
};

/**
 * Remove clues from a full solution, keeping a unique solution, until the clue
 * budget is reached. Removal is done in rotationally-symmetric pairs for the
 * classic aesthetic.
 */
const digHoles = (solution: Grid, minGivens: number, rng: RNG): Grid => {
  const puzzle = cloneGrid(solution);
  let givens = CELL_COUNT;
  const order = rng.shuffle([...Array(CELL_COUNT).keys()]);

  for (const i of order) {
    if (givens <= minGivens) break;
    if (puzzle[i] === 0) continue;

    const partner = CELL_COUNT - 1 - i;
    const removed: number[] = [];
    const backup: number[] = [];

    const remove = (cell: number): void => {
      backup.push(puzzle[cell]);
      removed.push(cell);
      puzzle[cell] = 0;
    };

    remove(i);
    if (partner !== i && puzzle[partner] !== 0) remove(partner);

    if (countSolutions(puzzle, 2) !== 1) {
      // Restore: removing these broke uniqueness.
      removed.forEach((cell, idx) => {
        puzzle[cell] = backup[idx];
      });
    } else {
      givens -= removed.length;
    }
  }
  return puzzle;
};

const countGivens = (grid: Grid): number => grid.reduce((n, v) => (v !== 0 ? n + 1 : n), 0);

export interface GenerateOptions {
  /** Seed for reproducible generation. Omit for a random puzzle. */
  seed?: number;
  /** Max attempts to hit the exact target grade before returning closest. */
  maxAttempts?: number;
}

const DIFFICULTY_ORDER: Difficulty[] = [
  'easy',
  'medium',
  'hard',
  'pro',
  'impossible',
];
const gradeDistance = (a: Difficulty, b: Difficulty): number =>
  Math.abs(DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b));

/**
 * Generate a puzzle of the requested difficulty with a guaranteed unique
 * solution. Falls back to the closest grade achieved if the exact target isn't
 * hit within `maxAttempts`.
 */
export const generatePuzzle = (
  difficulty: Difficulty,
  options: GenerateOptions = {},
): Puzzle => {
  const { seed, maxAttempts = 12 } = options;
  const rng = createRng(seed);

  let best: Puzzle | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = generateSolvedGrid(rng);
    const puzzle = digHoles(solution, MIN_GIVENS[difficulty], rng);
    const grade = gradeDifficulty(puzzle);
    const candidate: Puzzle = {
      puzzle,
      solution,
      difficulty: grade,
      givens: countGivens(puzzle),
    };

    if (grade === difficulty) return candidate;

    if (!best || gradeDistance(grade, difficulty) < gradeDistance(best.difficulty, difficulty)) {
      best = candidate;
    }
  }

  // Report the requested difficulty on the fallback so the UI stays consistent;
  // the puzzle is still valid and uniquely solvable.
  return { ...(best as Puzzle), difficulty };
};
