/**
 * Board geometry, candidate-bitmask helpers, and (de)serialization.
 *
 * Everything here is pure and precomputed once at module load, so the solver
 * and generator can stay fast and allocation-free in their hot loops.
 */

import type { CandidateMask, Grid } from './types';

export const BOX_SIZE = 3;
export const SIZE = 9;
export const CELL_COUNT = 81;

/** Bitmask with candidates 1-9 all set (0b11_1111_1110). */
export const ALL_CANDIDATES: CandidateMask = 0x3fe;

export const rowOf = (i: number): number => Math.floor(i / SIZE);
export const colOf = (i: number): number => i % SIZE;
export const boxOf = (i: number): number =>
  Math.floor(rowOf(i) / BOX_SIZE) * BOX_SIZE + Math.floor(colOf(i) / BOX_SIZE);
export const cellIndex = (row: number, col: number): number => row * SIZE + col;

/**
 * The 27 units (9 rows, 9 columns, 9 boxes). Each unit is a list of 9 cell
 * indices. Rows are units 0-8, columns 9-17, boxes 18-26.
 */
export const UNITS: number[][] = (() => {
  const units: number[][] = [];
  // Rows
  for (let r = 0; r < SIZE; r++) {
    const unit: number[] = [];
    for (let c = 0; c < SIZE; c++) unit.push(cellIndex(r, c));
    units.push(unit);
  }
  // Columns
  for (let c = 0; c < SIZE; c++) {
    const unit: number[] = [];
    for (let r = 0; r < SIZE; r++) unit.push(cellIndex(r, c));
    units.push(unit);
  }
  // Boxes
  for (let br = 0; br < BOX_SIZE; br++) {
    for (let bc = 0; bc < BOX_SIZE; bc++) {
      const unit: number[] = [];
      for (let r = 0; r < BOX_SIZE; r++) {
        for (let c = 0; c < BOX_SIZE; c++) {
          unit.push(cellIndex(br * BOX_SIZE + r, bc * BOX_SIZE + c));
        }
      }
      units.push(unit);
    }
  }
  return units;
})();

/** For each cell, the three units (row, column, box) it belongs to. */
export const UNITS_OF_CELL: number[][][] = (() => {
  const map: number[][][] = Array.from({ length: CELL_COUNT }, () => []);
  for (const unit of UNITS) {
    for (const cell of unit) map[cell].push(unit);
  }
  return map;
})();

/**
 * For each cell, its 20 peers: every other cell sharing a row, column, or box.
 */
export const PEERS: number[][] = (() => {
  const peers: number[][] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const set = new Set<number>();
    for (const unit of UNITS_OF_CELL[i]) {
      for (const cell of unit) if (cell !== i) set.add(cell);
    }
    peers.push([...set]);
  }
  return peers;
})();

// --- Candidate bitmask helpers ---------------------------------------------

export const bit = (n: number): CandidateMask => 1 << n;
export const hasCandidate = (mask: CandidateMask, n: number): boolean =>
  (mask & bit(n)) !== 0;
export const addCandidate = (mask: CandidateMask, n: number): CandidateMask =>
  mask | bit(n);
export const removeCandidate = (mask: CandidateMask, n: number): CandidateMask =>
  mask & ~bit(n);

/** Number of set candidate bits. */
export const popcount = (mask: CandidateMask): number => {
  let count = 0;
  let m = mask;
  while (m) {
    m &= m - 1;
    count++;
  }
  return count;
};

/** The single digit in a mask that has exactly one bit set. */
export const singleValue = (mask: CandidateMask): number => Math.log2(mask);

/** Expand a candidate mask into an array of digits (ascending). */
export const candidatesToArray = (mask: CandidateMask): number[] => {
  const out: number[] = [];
  for (let n = 1; n <= SIZE; n++) if (hasCandidate(mask, n)) out.push(n);
  return out;
};

// --- Grid helpers ----------------------------------------------------------

export const emptyGrid = (): Grid => new Array(CELL_COUNT).fill(0);
export const cloneGrid = (grid: Grid): Grid => grid.slice();

/**
 * Whether placing `value` at cell `i` breaks no row/column/box constraint,
 * given the current grid. Ignores the current contents of cell `i` itself.
 */
export const isValidPlacement = (grid: Grid, i: number, value: number): boolean => {
  for (const p of PEERS[i]) if (grid[p] === value) return false;
  return true;
};

export const isFull = (grid: Grid): boolean => grid.every((v) => v !== 0);

/** A grid is solved when it is full and every unit contains 1-9 exactly once. */
export const isSolved = (grid: Grid): boolean => {
  if (!isFull(grid)) return false;
  for (const unit of UNITS) {
    let seen = 0;
    for (const cell of unit) seen = addCandidate(seen, grid[cell]);
    if (seen !== ALL_CANDIDATES) return false;
  }
  return true;
};

/**
 * All cells that currently violate a constraint (a peer holds the same digit).
 * Used by the UI to flag duplicate entries.
 */
export const findConflicts = (grid: Grid): Set<number> => {
  const conflicts = new Set<number>();
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = grid[i];
    if (v === 0) continue;
    for (const p of PEERS[i]) {
      if (grid[p] === v) {
        conflicts.add(i);
        conflicts.add(p);
      }
    }
  }
  return conflicts;
};

/**
 * Compute candidate masks for every empty cell (0 for filled cells). This is
 * the "pencil marks if you filled every legal digit" view of the board.
 */
export const computeCandidates = (grid: Grid): CandidateMask[] => {
  const candidates = new Array<CandidateMask>(CELL_COUNT).fill(0);
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] !== 0) continue;
    let mask = ALL_CANDIDATES;
    for (const p of PEERS[i]) {
      if (grid[p] !== 0) mask = removeCandidate(mask, grid[p]);
    }
    candidates[i] = mask;
  }
  return candidates;
};

// --- Serialization ---------------------------------------------------------

/** Parse an 81-char string. `.` `0` or `-` are empty; digits 1-9 are values. */
export const parseGrid = (str: string): Grid => {
  const cleaned = str.replace(/[\r\n\s]/g, '');
  if (cleaned.length !== CELL_COUNT) {
    throw new Error(`Grid string must be ${CELL_COUNT} chars, got ${cleaned.length}`);
  }
  return [...cleaned].map((ch) => {
    if (ch === '.' || ch === '0' || ch === '-') return 0;
    const n = Number(ch);
    if (!Number.isInteger(n) || n < 1 || n > 9) {
      throw new Error(`Invalid character in grid: "${ch}"`);
    }
    return n;
  });
};

/** Serialize a grid to an 81-char string, using `.` for empty cells. */
export const stringifyGrid = (grid: Grid, emptyChar = '.'): string =>
  grid.map((v) => (v === 0 ? emptyChar : String(v))).join('');
