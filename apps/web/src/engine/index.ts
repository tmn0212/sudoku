/** Public API for the Sudoku engine. */

export * from './types';
export {
  ALL_CANDIDATES,
  CELL_COUNT,
  SIZE,
  BOX_SIZE,
  boxOf,
  cellIndex,
  cloneGrid,
  colOf,
  computeCandidates,
  candidatesToArray,
  emptyGrid,
  findConflicts,
  isFull,
  isSolved,
  isValidPlacement,
  parseGrid,
  rowOf,
  stringifyGrid,
} from './board';
export { createRng, type RNG } from './rng';
export { solve, countSolutions, hasUniqueSolution, generateSolvedGrid } from './solver';
export {
  findStep,
  solveLogically,
  TECHNIQUES,
  type LogicalSolveResult,
} from './techniques';
export {
  gradeDifficulty,
  generatePuzzle,
  type GenerateOptions,
} from './generator';
