/**
 * Scoring. Modeled on well-documented app scoring (sudoku.com-style):
 *   score = difficultyRating + timeBonus + flawlessBonus − mistakePenalty
 * Hints don't touch the score: Relaxed hints are free, and Arcade spends a
 * quarter-life per hint instead (see the game store's lives model). Pure and
 * dependency-free so it's trivially testable.
 */

import type { Difficulty, Mode } from '../engine/types';

/** Base points for completing a puzzle of each difficulty. */
export const RATING: Record<Difficulty, number> = {
  easy: 200,
  medium: 450,
  hard: 800,
  pro: 1200,
  impossible: 1600,
};

/** Reference solve time (seconds) used to scale the time bonus. */
export const TARGET_TIME: Record<Difficulty, number> = {
  easy: 240,
  medium: 420,
  hard: 660,
  pro: 900,
  impossible: 1200,
};

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/** −30 for the first mistake, then −10 more for each subsequent one. */
export const mistakePenalty = (mistakes: number): number => {
  let total = 0;
  for (let k = 0; k < mistakes; k++) total += 30 + 10 * k;
  return total;
};

export interface ScoreInput {
  difficulty: Difficulty;
  mode: Mode;
  timeMs: number;
  mistakes: number;
  won: boolean;
}

/**
 * The final score, split into its named parts so the end-of-game screen can
 * reveal them one line at a time and animate the running total. `total` is the
 * clamped sum and is exactly what `computeScore` returns. The mistake penalty is
 * stored as a positive magnitude (it *subtracts* from the total).
 */
export interface ScoreBreakdown {
  /** Flat award for completing the puzzle (the difficulty rating). */
  base: number;
  /** Bonus scaled by how fast the solve was — only known once the clock stops. */
  timeBonus: number;
  /** Arcade-only reward for a no-mistake solve. */
  flawlessBonus: number;
  /** Positive magnitude subtracted for mistakes. */
  mistakePenalty: number;
  /** The clamped final score = base + bonuses − penalty. */
  total: number;
}

/**
 * The single source of truth for how a finished game scores, decomposed. A game
 * that wasn't won scores nothing. `computeScore` is just `.total`.
 */
export const scoreBreakdown = ({
  difficulty,
  mode,
  timeMs,
  mistakes,
  won,
}: ScoreInput): ScoreBreakdown => {
  if (!won) {
    return { base: 0, timeBonus: 0, flawlessBonus: 0, mistakePenalty: 0, total: 0 };
  }
  const base = RATING[difficulty];
  const seconds = Math.max(timeMs / 1000, 1);
  const timeBonus = Math.round(base * clamp(TARGET_TIME[difficulty] / seconds, 0, 3));
  const mPenalty = mistakePenalty(mistakes);
  // Arcade rewards flawless, no-mistake solves (hints don't affect it — they
  // cost lives, not accuracy).
  const flawlessBonus = mode === 'arcade' && mistakes === 0 ? Math.round(base * 0.5) : 0;
  const total = Math.max(0, base + timeBonus + flawlessBonus - mPenalty);
  return { base, timeBonus, flawlessBonus, mistakePenalty: mPenalty, total };
};

export const computeScore = (input: ScoreInput): number => scoreBreakdown(input).total;

export interface LiveScoreInput {
  difficulty: Difficulty;
  /** Non-given cells currently filled with the correct digit. */
  filled: number;
  /** Total non-given (solvable) cells in the puzzle. */
  fillable: number;
  mistakes: number;
}

/**
 * A running, in-progress score for the live HUD. The time bonus can't be known
 * until the clock stops, so this excludes it and instead awards the base rating
 * *in proportion to how much of the board is correctly filled* — the number
 * climbs as you make progress and dips on mistakes. At full completion it equals
 * the final score's `base − mistakePenalty`, so the win screen can pick up
 * exactly where the live counter left off and animate the time bonus on top.
 */
export const liveScore = ({
  difficulty,
  filled,
  fillable,
  mistakes,
}: LiveScoreInput): number => {
  const progress = fillable > 0 ? clamp(filled / fillable, 0, 1) : 0;
  const earned = Math.round(RATING[difficulty] * progress);
  return Math.max(0, earned - mistakePenalty(mistakes));
};
