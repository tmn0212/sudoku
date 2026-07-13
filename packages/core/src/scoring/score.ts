/**
 * Scoring. Modeled on well-documented app scoring (sudoku.com-style):
 *   score = difficultyRating + timeBonus − mistakePenalty − hintPenalty
 * Pure and dependency-free so it's trivially testable.
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
  hints: number;
  won: boolean;
}

export const computeScore = ({
  difficulty,
  mode,
  timeMs,
  mistakes,
  hints,
  won,
}: ScoreInput): number => {
  if (!won) return 0;
  const rating = RATING[difficulty];
  const seconds = Math.max(timeMs / 1000, 1);
  const timeBonus = Math.round(rating * clamp(TARGET_TIME[difficulty] / seconds, 0, 3));
  const hintPenalty = 100 * hints;
  let score = rating + timeBonus - mistakePenalty(mistakes) - hintPenalty;
  // Arcade rewards flawless, no-mistake solves.
  if (mode === 'arcade' && mistakes === 0) score += Math.round(rating * 0.5);
  return Math.max(0, Math.round(score));
};
