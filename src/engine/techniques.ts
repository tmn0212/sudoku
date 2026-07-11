/**
 * Human-style logical solver.
 *
 * Rather than brute force, this applies the deductive techniques a person uses,
 * from easiest to hardest. It drives two features:
 *   1. Difficulty grading (the hardest technique a puzzle requires).
 *   2. Teaching hints (the easiest next deduction, with an explanation).
 */

import {
  PEERS,
  UNITS,
  boxOf,
  candidatesToArray,
  cloneGrid,
  colOf,
  computeCandidates,
  hasCandidate,
  isFull,
  isSolved,
  popcount,
  removeCandidate,
  rowOf,
  singleValue,
} from './board';
import type { CandidateMask, Grid, Step, TechniqueName } from './types';

const ROW_UNITS = UNITS.slice(0, 9);
const COL_UNITS = UNITS.slice(9, 18);
const BOX_UNITS = UNITS.slice(18, 27);
const LINE_UNITS = UNITS.slice(0, 18); // rows + columns

interface SolveState {
  grid: Grid;
  candidates: CandidateMask[];
}

const cellName = (i: number): string => `R${rowOf(i) + 1}C${colOf(i) + 1}`;

const unitLabel = (unitIndex: number): string => {
  if (unitIndex < 9) return `row ${unitIndex + 1}`;
  if (unitIndex < 18) return `column ${unitIndex - 9 + 1}`;
  return `box ${unitIndex - 18 + 1}`;
};

// --- Individual techniques --------------------------------------------------
// Each returns the first Step it finds, or null. Elimination techniques only
// return when they actually remove at least one candidate.

const nakedSingle = ({ grid, candidates }: SolveState): Step | null => {
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== 0) continue;
    if (popcount(candidates[i]) === 1) {
      const value = singleValue(candidates[i]);
      return {
        technique: 'naked-single',
        placements: [{ cell: i, value }],
        eliminations: [],
        highlights: [i],
        reason: `${cellName(i)} has only one possible digit: ${value}.`,
      };
    }
  }
  return null;
};

const hiddenSingle = ({ grid, candidates }: SolveState): Step | null => {
  for (let u = 0; u < UNITS.length; u++) {
    const unit = UNITS[u];
    for (let n = 1; n <= 9; n++) {
      let spot = -1;
      let count = 0;
      for (const cell of unit) {
        if (grid[cell] === 0 && hasCandidate(candidates[cell], n)) {
          spot = cell;
          count++;
          if (count > 1) break;
        }
      }
      if (count === 1 && popcount(candidates[spot]) > 1) {
        return {
          technique: 'hidden-single',
          placements: [{ cell: spot, value: n }],
          eliminations: [],
          highlights: [spot, ...unit.filter((c) => c !== spot)],
          reason: `In ${unitLabel(u)}, ${n} can only go in ${cellName(spot)}.`,
        };
      }
    }
  }
  return null;
};

/**
 * Locked candidates (pointing): within a box, if a digit's only possible cells
 * all lie in one row or column, it can be removed from that line elsewhere.
 */
const pointing = ({ grid, candidates }: SolveState): Step | null => {
  for (const box of BOX_UNITS) {
    for (let n = 1; n <= 9; n++) {
      const cells = box.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], n));
      if (cells.length < 2) continue;
      const sameRow = cells.every((c) => rowOf(c) === rowOf(cells[0]));
      const sameCol = cells.every((c) => colOf(c) === colOf(cells[0]));
      if (!sameRow && !sameCol) continue;
      const line = sameRow ? ROW_UNITS[rowOf(cells[0])] : COL_UNITS[colOf(cells[0])];
      const eliminations = line
        .filter((c) => !cells.includes(c) && grid[c] === 0 && hasCandidate(candidates[c], n))
        .map((c) => ({ cell: c, value: n }));
      if (eliminations.length > 0) {
        return {
          technique: 'pointing',
          placements: [],
          eliminations,
          highlights: cells,
          reason: `In box ${boxOf(cells[0]) + 1}, ${n} is locked to one ${
            sameRow ? 'row' : 'column'
          }, so it can be removed from the rest of that ${sameRow ? 'row' : 'column'}.`,
        };
      }
    }
  }
  return null;
};

/**
 * Locked candidates (claiming): within a row or column, if a digit's only
 * possible cells all lie in one box, remove it from the rest of that box.
 */
const claiming = ({ grid, candidates }: SolveState): Step | null => {
  for (const line of LINE_UNITS) {
    for (let n = 1; n <= 9; n++) {
      const cells = line.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], n));
      if (cells.length < 2) continue;
      if (!cells.every((c) => boxOf(c) === boxOf(cells[0]))) continue;
      const box = BOX_UNITS[boxOf(cells[0])];
      const eliminations = box
        .filter((c) => !cells.includes(c) && grid[c] === 0 && hasCandidate(candidates[c], n))
        .map((c) => ({ cell: c, value: n }));
      if (eliminations.length > 0) {
        return {
          technique: 'claiming',
          placements: [],
          eliminations,
          highlights: cells,
          reason: `${n} within this line only fits in box ${
            boxOf(cells[0]) + 1
          }, so it can be removed from the rest of that box.`,
        };
      }
    }
  }
  return null;
};

/** Naked subset (pair or triple) within any unit. */
const nakedSubset = (
  { grid, candidates }: SolveState,
  size: 2 | 3,
  technique: TechniqueName,
): Step | null => {
  for (const unit of UNITS) {
    const cells = unit.filter((c) => grid[c] === 0 && popcount(candidates[c]) >= 2 && popcount(candidates[c]) <= size);
    if (cells.length < size) continue;
    const combos = combinations(cells, size);
    for (const combo of combos) {
      let union = 0;
      for (const c of combo) union |= candidates[c];
      if (popcount(union) !== size) continue;
      const digits = candidatesToArray(union);
      const eliminations = unit
        .filter((c) => !combo.includes(c) && grid[c] === 0)
        .flatMap((c) =>
          digits
            .filter((n) => hasCandidate(candidates[c], n))
            .map((n) => ({ cell: c, value: n })),
        );
      if (eliminations.length > 0) {
        return {
          technique,
          placements: [],
          eliminations,
          highlights: combo,
          reason: `${combo.map(cellName).join(', ')} form a naked ${
            size === 2 ? 'pair' : 'triple'
          } on {${digits.join(', ')}}, removing those digits from the rest of the unit.`,
        };
      }
    }
  }
  return null;
};

/** Hidden pair: two digits confined to the same two cells in a unit. */
const hiddenPair = ({ grid, candidates }: SolveState): Step | null => {
  for (const unit of UNITS) {
    for (let a = 1; a <= 8; a++) {
      for (let b = a + 1; b <= 9; b++) {
        const cellsA = unit.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], a));
        const cellsB = unit.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], b));
        if (cellsA.length !== 2 || cellsB.length !== 2) continue;
        if (cellsA[0] !== cellsB[0] || cellsA[1] !== cellsB[1]) continue;
        const keep = (1 << a) | (1 << b);
        const eliminations = cellsA.flatMap((c) =>
          candidatesToArray(candidates[c] & ~keep).map((n) => ({ cell: c, value: n })),
        );
        if (eliminations.length > 0) {
          return {
            technique: 'hidden-pair',
            placements: [],
            eliminations,
            highlights: cellsA,
            reason: `${a} and ${b} are confined to ${cellsA
              .map(cellName)
              .join(' and ')}, so all other candidates there can be removed.`,
          };
        }
      }
    }
  }
  return null;
};

/** X-Wing on rows or columns for a single digit. */
const xWing = ({ grid, candidates }: SolveState): Step | null => {
  for (let n = 1; n <= 9; n++) {
    // Row-based X-Wing.
    const step = xWingOriented({ grid, candidates }, n, 'row') ?? xWingOriented({ grid, candidates }, n, 'col');
    if (step) return step;
  }
  return null;
};

const xWingOriented = (
  { grid, candidates }: SolveState,
  n: number,
  orientation: 'row' | 'col',
): Step | null => {
  const lines = orientation === 'row' ? ROW_UNITS : COL_UNITS;
  const positions = lines.map((line) =>
    line.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], n)),
  );
  for (let i = 0; i < lines.length; i++) {
    if (positions[i].length !== 2) continue;
    const keyI = orientation === 'row' ? positions[i].map(colOf) : positions[i].map(rowOf);
    for (let j = i + 1; j < lines.length; j++) {
      if (positions[j].length !== 2) continue;
      const keyJ = orientation === 'row' ? positions[j].map(colOf) : positions[j].map(rowOf);
      if (keyI[0] !== keyJ[0] || keyI[1] !== keyJ[1]) continue;
      // Eliminate n from the two cross-lines, outside the four corner cells.
      const corners = [...positions[i], ...positions[j]];
      const crossUnits =
        orientation === 'row' ? [COL_UNITS[keyI[0]], COL_UNITS[keyI[1]]] : [ROW_UNITS[keyI[0]], ROW_UNITS[keyI[1]]];
      const eliminations = crossUnits
        .flat()
        .filter((c) => !corners.includes(c) && grid[c] === 0 && hasCandidate(candidates[c], n))
        .map((c) => ({ cell: c, value: n }));
      if (eliminations.length > 0) {
        return {
          technique: 'x-wing',
          placements: [],
          eliminations,
          highlights: corners,
          reason: `X-Wing on ${n}: the four ${cellName(corners[0])}-style corners remove ${n} from the crossing ${
            orientation === 'row' ? 'columns' : 'rows'
          }.`,
        };
      }
    }
  }
  return null;
};

// --- combinatorics helper ---------------------------------------------------

const combinations = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  const recurse = (start: number, combo: T[]): void => {
    if (combo.length === size) {
      result.push(combo.slice());
      return;
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i]);
      recurse(i + 1, combo);
      combo.pop();
    }
  };
  recurse(0, []);
  return result;
};

// --- technique registry & orchestration ------------------------------------

interface TechniqueEntry {
  name: TechniqueName;
  rank: number; // 1 = easiest
  run: (state: SolveState) => Step | null;
}

/** Techniques in ascending order of difficulty; the solver tries them in order. */
export const TECHNIQUES: TechniqueEntry[] = [
  { name: 'naked-single', rank: 1, run: nakedSingle },
  { name: 'hidden-single', rank: 1, run: hiddenSingle },
  { name: 'pointing', rank: 2, run: pointing },
  { name: 'claiming', rank: 2, run: claiming },
  { name: 'naked-pair', rank: 3, run: (s) => nakedSubset(s, 2, 'naked-pair') },
  { name: 'hidden-pair', rank: 3, run: hiddenPair },
  { name: 'naked-triple', rank: 4, run: (s) => nakedSubset(s, 3, 'naked-triple') },
  { name: 'x-wing', rank: 5, run: xWing },
];

const TECHNIQUE_RANK: Record<TechniqueName, number> = Object.fromEntries(
  TECHNIQUES.map((t) => [t.name, t.rank]),
) as Record<TechniqueName, number>;

const applyStep = (state: SolveState, step: Step): void => {
  for (const { cell, value } of step.placements) {
    state.grid[cell] = value;
    state.candidates[cell] = 0;
    for (const peer of PEERS[cell]) {
      if (state.grid[peer] === 0) {
        state.candidates[peer] = removeCandidate(state.candidates[peer], value);
      }
    }
  }
  for (const { cell, value } of step.eliminations) {
    state.candidates[cell] = removeCandidate(state.candidates[cell], value);
  }
};

/** Find the easiest applicable next step, or null if none of the techniques fire. */
export const findStep = (grid: Grid): Step | null => {
  const state: SolveState = { grid: cloneGrid(grid), candidates: computeCandidates(grid) };
  for (const technique of TECHNIQUES) {
    const step = technique.run(state);
    if (step) return step;
  }
  return null;
};

export interface LogicalSolveResult {
  solved: boolean;
  grid: Grid;
  steps: Step[];
  techniquesUsed: Set<TechniqueName>;
  hardestRank: number;
}

/**
 * Attempt to solve `grid` using only the human techniques above. Reports which
 * techniques were needed and the hardest rank reached — the basis for grading.
 */
export const solveLogically = (grid: Grid): LogicalSolveResult => {
  const state: SolveState = { grid: cloneGrid(grid), candidates: computeCandidates(grid) };
  const steps: Step[] = [];
  const techniquesUsed = new Set<TechniqueName>();
  let hardestRank = 0;

  while (!isFull(state.grid)) {
    let progressed = false;
    for (const technique of TECHNIQUES) {
      const step = technique.run(state);
      if (!step) continue;
      applyStep(state, step);
      steps.push(step);
      techniquesUsed.add(technique.name);
      hardestRank = Math.max(hardestRank, TECHNIQUE_RANK[technique.name]);
      progressed = true;
      break;
    }
    if (!progressed) break;
  }

  return {
    solved: isSolved(state.grid),
    grid: state.grid,
    steps,
    techniquesUsed,
    hardestRank,
  };
};
