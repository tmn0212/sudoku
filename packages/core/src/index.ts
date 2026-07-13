/**
 * `@sudoku/core` — the pure, dependency-free, React/DOM/storage-agnostic Sudoku
 * engine + scoring. This is the portable heart of the app: board geometry &
 * bitmask candidates, the backtracking solver + uniqueness counter, the
 * human-technique solver (grading + hints), seedable generation & grading,
 * shared types, and score computation. A native app consumes this unchanged.
 *
 * Keep it pure — no framework, DOM, or storage imports ever reach this package.
 */

export * from './engine/types';
export * from './engine/board';
export * from './engine/rng';
export * from './engine/solver';
export * from './engine/techniques';
export * from './engine/generator';
export * from './scoring/score';
