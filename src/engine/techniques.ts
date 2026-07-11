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
  cellIndex,
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

const SUBSET_WORD: Record<number, string> = { 2: 'pair', 3: 'triple', 4: 'quad' };

/** Naked subset (pair, triple, or quad) within any unit. */
const nakedSubset = (
  { grid, candidates }: SolveState,
  size: 2 | 3 | 4,
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
            SUBSET_WORD[size]
          } on {${digits.join(', ')}}, removing those digits from the rest of the unit.`,
        };
      }
    }
  }
  return null;
};

/**
 * Hidden subset (used here for quads): `size` digits confined to exactly `size`
 * cells in a unit, letting all other candidates be cleared from those cells.
 */
const hiddenSubset = (
  { grid, candidates }: SolveState,
  size: 3 | 4,
  technique: TechniqueName,
): Step | null => {
  const digitsList = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const unit of UNITS) {
    const empties = unit.filter((c) => grid[c] === 0);
    if (empties.length <= size) continue;
    for (const combo of combinations(digitsList, size)) {
      const keep = combo.reduce((m, n) => m | (1 << n), 0);
      const cells = empties.filter((c) => (candidates[c] & keep) !== 0);
      if (cells.length !== size) continue;
      // Every chosen digit must actually appear among these cells.
      if (!combo.every((n) => cells.some((c) => hasCandidate(candidates[c], n)))) continue;
      const eliminations = cells.flatMap((c) =>
        candidatesToArray(candidates[c] & ~keep).map((n) => ({ cell: c, value: n })),
      );
      if (eliminations.length > 0) {
        return {
          technique,
          placements: [],
          eliminations,
          highlights: cells,
          reason: `${combo.join(', ')} are confined to ${cells
            .map(cellName)
            .join(', ')}, so other candidates there can be removed.`,
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

/** Hidden triple: three digits confined to the same three cells in a unit. */
const hiddenTriple = ({ grid, candidates }: SolveState): Step | null => {
  for (const unit of UNITS) {
    const empties = unit.filter((c) => grid[c] === 0);
    if (empties.length < 3) continue;
    for (let a = 1; a <= 7; a++) {
      for (let b = a + 1; b <= 8; b++) {
        for (let d = b + 1; d <= 9; d++) {
          const digits = [a, b, d];
          const cells = empties.filter((c) =>
            digits.some((n) => hasCandidate(candidates[c], n)),
          );
          if (cells.length !== 3) continue;
          const eachAppears = digits.every(
            (n) => cells.filter((c) => hasCandidate(candidates[c], n)).length >= 2,
          );
          if (!eachAppears) continue;
          const keep = (1 << a) | (1 << b) | (1 << d);
          const eliminations = cells.flatMap((c) =>
            candidatesToArray(candidates[c] & ~keep).map((n) => ({ cell: c, value: n })),
          );
          if (eliminations.length > 0) {
            return {
              technique: 'hidden-triple',
              placements: [],
              eliminations,
              highlights: cells,
              reason: `${a}, ${b} and ${d} are confined to ${cells
                .map(cellName)
                .join(', ')}, so other candidates there can be removed.`,
            };
          }
        }
      }
    }
  }
  return null;
};

/** Swordfish: an X-Wing generalized to three base lines for a single digit. */
const swordfish = (state: SolveState): Step | null =>
  swordfishOriented(state, 'row') ?? swordfishOriented(state, 'col');

const swordfishOriented = (
  { grid, candidates }: SolveState,
  orientation: 'row' | 'col',
): Step | null => {
  const lines = orientation === 'row' ? ROW_UNITS : COL_UNITS;
  for (let n = 1; n <= 9; n++) {
    const info = lines
      .map((line) => {
        const cells = line.filter(
          (c) => grid[c] === 0 && hasCandidate(candidates[c], n),
        );
        const cross = cells.map((c) => (orientation === 'row' ? colOf(c) : rowOf(c)));
        return { cells, cross };
      })
      .filter((x) => x.cells.length >= 2 && x.cells.length <= 3);

    for (const combo of combinations(info, 3)) {
      const cross = new Set<number>();
      combo.forEach((x) => x.cross.forEach((c) => cross.add(c)));
      if (cross.size !== 3) continue;
      const baseCells = new Set(combo.flatMap((x) => x.cells));
      const crossUnits = [...cross].map((ci) =>
        orientation === 'row' ? COL_UNITS[ci] : ROW_UNITS[ci],
      );
      const eliminations = crossUnits
        .flat()
        .filter((c) => !baseCells.has(c) && grid[c] === 0 && hasCandidate(candidates[c], n))
        .map((c) => ({ cell: c, value: n }));
      if (eliminations.length > 0) {
        return {
          technique: 'swordfish',
          placements: [],
          eliminations,
          highlights: [...baseCells],
          reason: `Swordfish on ${n} across three ${
            orientation === 'row' ? 'rows' : 'columns'
          } removes ${n} from the crossing ${
            orientation === 'row' ? 'columns' : 'rows'
          }.`,
        };
      }
    }
  }
  return null;
};

/** Jellyfish: a fish generalized to four base lines for a single digit. */
const jellyfish = (state: SolveState): Step | null =>
  fishOriented(state, 'row', 4, 'jellyfish') ?? fishOriented(state, 'col', 4, 'jellyfish');

const fishOriented = (
  { grid, candidates }: SolveState,
  orientation: 'row' | 'col',
  size: number,
  technique: TechniqueName,
): Step | null => {
  const lines = orientation === 'row' ? ROW_UNITS : COL_UNITS;
  for (let n = 1; n <= 9; n++) {
    const info = lines
      .map((line) => {
        const cells = line.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], n));
        const cross = cells.map((c) => (orientation === 'row' ? colOf(c) : rowOf(c)));
        return { cells, cross };
      })
      .filter((x) => x.cells.length >= 2 && x.cells.length <= size);

    for (const combo of combinations(info, size)) {
      const cross = new Set<number>();
      combo.forEach((x) => x.cross.forEach((c) => cross.add(c)));
      if (cross.size !== size) continue;
      const baseCells = new Set(combo.flatMap((x) => x.cells));
      const crossUnits = [...cross].map((ci) =>
        orientation === 'row' ? COL_UNITS[ci] : ROW_UNITS[ci],
      );
      const eliminations = crossUnits
        .flat()
        .filter((c) => !baseCells.has(c) && grid[c] === 0 && hasCandidate(candidates[c], n))
        .map((c) => ({ cell: c, value: n }));
      if (eliminations.length > 0) {
        return {
          technique,
          placements: [],
          eliminations,
          highlights: [...baseCells],
          reason: `Jellyfish on ${n} across four ${
            orientation === 'row' ? 'rows' : 'columns'
          } removes ${n} from the crossing ${orientation === 'row' ? 'columns' : 'rows'}.`,
        };
      }
    }
  }
  return null;
};

/**
 * XY-Wing: a pivot cell {X,Y} with two bivalue "wing" peers {X,Z} and {Y,Z}.
 * Any cell seeing both wings cannot be Z.
 */
const xyWing = ({ grid, candidates }: SolveState): Step | null => {
  const bivalue: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 0 && popcount(candidates[i]) === 2) bivalue.push(i);
  }

  for (const pivot of bivalue) {
    const [x, y] = candidatesToArray(candidates[pivot]);
    const wings = bivalue.filter((c) => c !== pivot && PEERS[pivot].includes(c));
    for (let a = 0; a < wings.length; a++) {
      for (let b = a + 1; b < wings.length; b++) {
        const wa = wings[a];
        const wb = wings[b];
        const ca = candidatesToArray(candidates[wa]);
        const cb = candidatesToArray(candidates[wb]);
        for (const [p1, p2] of [
          [x, y],
          [y, x],
        ]) {
          if (!ca.includes(p1)) continue;
          const z = ca.find((v) => v !== p1);
          if (z == null || z === p2) continue;
          if (!cb.includes(p2) || !cb.includes(z)) continue;
          const targets = PEERS[wa].filter(
            (c) =>
              c !== pivot &&
              c !== wa &&
              c !== wb &&
              PEERS[wb].includes(c) &&
              grid[c] === 0 &&
              hasCandidate(candidates[c], z),
          );
          if (targets.length > 0) {
            return {
              technique: 'xy-wing',
              placements: [],
              eliminations: targets.map((c) => ({ cell: c, value: z })),
              highlights: [pivot, wa, wb],
              reason: `XY-Wing with pivot ${cellName(
                pivot,
              )} removes ${z} from cells that see both wings.`,
            };
          }
        }
      }
    }
  }
  return null;
};

/**
 * XYZ-Wing: like an XY-Wing but the pivot is trivalue {X,Y,Z}. With bivalue
 * wings {X,Z} and {Y,Z}, any cell seeing the pivot AND both wings can't be Z.
 */
const xyzWing = ({ grid, candidates }: SolveState): Step | null => {
  for (let pivot = 0; pivot < grid.length; pivot++) {
    if (grid[pivot] !== 0 || popcount(candidates[pivot]) !== 3) continue;
    const wings = PEERS[pivot].filter(
      (c) =>
        grid[c] === 0 &&
        popcount(candidates[c]) === 2 &&
        (candidates[c] & candidates[pivot]) === candidates[c],
    );
    for (let a = 0; a < wings.length; a++) {
      for (let b = a + 1; b < wings.length; b++) {
        const wa = wings[a];
        const wb = wings[b];
        if ((candidates[wa] | candidates[wb]) !== candidates[pivot]) continue;
        const common = candidates[wa] & candidates[wb];
        if (popcount(common) !== 1) continue;
        const z = singleValue(common);
        const targets = PEERS[pivot].filter(
          (c) =>
            c !== wa &&
            c !== wb &&
            PEERS[wa].includes(c) &&
            PEERS[wb].includes(c) &&
            grid[c] === 0 &&
            hasCandidate(candidates[c], z),
        );
        if (targets.length > 0) {
          return {
            technique: 'xyz-wing',
            placements: [],
            eliminations: targets.map((c) => ({ cell: c, value: z })),
            highlights: [pivot, wa, wb],
            reason: `XYZ-Wing with pivot ${cellName(
              pivot,
            )} removes ${z} from cells that see the pivot and both wings.`,
          };
        }
      }
    }
  }
  return null;
};

/**
 * W-Wing: two non-seeing bivalue cells with the same pair {X,Y}, joined by a
 * strong link on X. Then Y is eliminated from cells that see both.
 */
const wWing = ({ grid, candidates }: SolveState): Step | null => {
  const bivalue: number[] = [];
  for (let i = 0; i < grid.length; i++)
    if (grid[i] === 0 && popcount(candidates[i]) === 2) bivalue.push(i);

  for (let a = 0; a < bivalue.length; a++) {
    for (let b = a + 1; b < bivalue.length; b++) {
      const wa = bivalue[a];
      const wb = bivalue[b];
      if (candidates[wa] !== candidates[wb]) continue;
      if (PEERS[wa].includes(wb)) continue;
      const [d1, d2] = candidatesToArray(candidates[wa]);
      for (const [linkDigit, elimDigit] of [
        [d1, d2],
        [d2, d1],
      ]) {
        let linkCells: number[] | null = null;
        for (const unit of UNITS) {
          const cells = unit.filter(
            (c) => grid[c] === 0 && hasCandidate(candidates[c], linkDigit),
          );
          if (cells.length !== 2) continue;
          const [p, q] = cells;
          if (p === wa || p === wb || q === wa || q === wb) continue;
          if (
            (PEERS[wa].includes(p) && PEERS[wb].includes(q)) ||
            (PEERS[wa].includes(q) && PEERS[wb].includes(p))
          ) {
            linkCells = cells;
            break;
          }
        }
        if (!linkCells) continue;
        const targets = PEERS[wa].filter(
          (c) =>
            c !== wb &&
            PEERS[wb].includes(c) &&
            grid[c] === 0 &&
            hasCandidate(candidates[c], elimDigit),
        );
        if (targets.length > 0) {
          return {
            technique: 'w-wing',
            placements: [],
            eliminations: targets.map((c) => ({ cell: c, value: elimDigit })),
            highlights: [wa, wb, ...linkCells],
            reason: `W-Wing on {${d1}, ${d2}}: ${cellName(wa)} and ${cellName(
              wb,
            )} are joined by a strong link on ${linkDigit}, so ${elimDigit} is removed from cells seeing both.`,
          };
        }
      }
    }
  }
  return null;
};

/** Skyscraper: two single-digit strong links sharing a base line. */
const skyscraper = (state: SolveState): Step | null =>
  skyscraperOriented(state, 'row') ?? skyscraperOriented(state, 'col');

const skyscraperOriented = (
  { grid, candidates }: SolveState,
  orientation: 'row' | 'col',
): Step | null => {
  const lines = orientation === 'row' ? ROW_UNITS : COL_UNITS;
  const crossOf = (c: number) => (orientation === 'row' ? colOf(c) : rowOf(c));
  for (let n = 1; n <= 9; n++) {
    const strong = lines
      .map((line) => line.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], n)))
      .filter((cells) => cells.length === 2);
    for (let i = 0; i < strong.length; i++) {
      for (let j = i + 1; j < strong.length; j++) {
        const ci = strong[i].map(crossOf);
        const cj = strong[j].map(crossOf);
        const base = ci.find((x) => cj.includes(x));
        if (base === undefined) continue;
        const roofI = strong[i][ci[0] === base ? 1 : 0];
        const roofJ = strong[j][cj[0] === base ? 1 : 0];
        if (crossOf(roofI) === crossOf(roofJ)) continue; // X-Wing, not skyscraper
        const pattern = [...strong[i], ...strong[j]];
        const targets = PEERS[roofI].filter(
          (c) =>
            !pattern.includes(c) &&
            PEERS[roofJ].includes(c) &&
            grid[c] === 0 &&
            hasCandidate(candidates[c], n),
        );
        if (targets.length > 0) {
          return {
            technique: 'skyscraper',
            placements: [],
            eliminations: targets.map((c) => ({ cell: c, value: n })),
            highlights: pattern,
            reason: `Skyscraper on ${n}: two ${
              orientation === 'row' ? 'rows' : 'columns'
            } share a base, so ${n} is removed from cells seeing both roof cells.`,
          };
        }
      }
    }
  }
  return null;
};

/** Two-String Kite: a row string and a column string linked through a box. */
const twoStringKite = ({ grid, candidates }: SolveState): Step | null => {
  for (let n = 1; n <= 9; n++) {
    const rowStrings = ROW_UNITS.map((line) =>
      line.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], n)),
    ).filter((cells) => cells.length === 2);
    const colStrings = COL_UNITS.map((line) =>
      line.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], n)),
    ).filter((cells) => cells.length === 2);

    for (const rs of rowStrings) {
      for (const cs of colStrings) {
        if (rs.some((c) => cs.includes(c))) continue;
        for (const rConn of rs) {
          for (const cConn of cs) {
            if (boxOf(rConn) !== boxOf(cConn)) continue;
            const rFree = rs[0] === rConn ? rs[1] : rs[0];
            const cFree = cs[0] === cConn ? cs[1] : cs[0];
            const target = cellIndex(rowOf(rFree), colOf(cFree));
            if (rs.includes(target) || cs.includes(target)) continue;
            if (grid[target] === 0 && hasCandidate(candidates[target], n)) {
              return {
                technique: 'two-string-kite',
                placements: [],
                eliminations: [{ cell: target, value: n }],
                highlights: [...rs, ...cs],
                reason: `Two-String Kite on ${n}: a row and a column of ${n}s meet in box ${
                  boxOf(rConn) + 1
                }, so ${n} is removed from ${cellName(target)}.`,
              };
            }
          }
        }
      }
    }
  }
  return null;
};

/**
 * Simple colouring: colour a single digit's conjugate-pair chain, then apply
 * the colour-trap (a cell seeing both colours) and colour-wrap (two same-colour
 * cells in one unit) rules.
 */
const simpleColoring = ({ grid, candidates }: SolveState): Step | null => {
  for (let n = 1; n <= 9; n++) {
    const adj = new Map<number, number[]>();
    const addEdge = (a: number, b: number) => {
      (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
      (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
    };
    for (const unit of UNITS) {
      const cells = unit.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], n));
      if (cells.length === 2) addEdge(cells[0], cells[1]);
    }
    if (adj.size === 0) continue;

    const seen = new Set<number>();
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      const color = new Map<number, 0 | 1>([[start, 0]]);
      seen.add(start);
      const queue = [start];
      while (queue.length) {
        const c = queue.shift()!;
        for (const nb of adj.get(c) ?? []) {
          if (!color.has(nb)) {
            color.set(nb, color.get(c) === 0 ? 1 : 0);
            seen.add(nb);
            queue.push(nb);
          }
        }
      }
      const buckets: [number[], number[]] = [[], []];
      for (const [cell, col] of color) buckets[col].push(cell);
      const all = [...buckets[0], ...buckets[1]];

      // Colour wrap: two same-colour cells sharing a unit ⇒ that colour is false.
      for (const col of [0, 1] as const) {
        const cells = buckets[col];
        const clash = cells.some((a, i) =>
          cells.slice(i + 1).some((b) => PEERS[a].includes(b)),
        );
        if (clash) {
          return {
            technique: 'simple-coloring',
            placements: [],
            eliminations: cells.map((c) => ({ cell: c, value: n })),
            highlights: all,
            reason: `Simple colouring on ${n}: two same-colour cells share a unit, so that colour is impossible and ${n} is removed from all of them.`,
          };
        }
      }

      // Colour trap: an outside cell seeing both colours can't be n.
      const inChain = new Set(color.keys());
      const targets: { cell: number; value: number }[] = [];
      for (let c = 0; c < grid.length; c++) {
        if (grid[c] !== 0 || inChain.has(c) || !hasCandidate(candidates[c], n)) continue;
        const seesA = buckets[0].some((x) => PEERS[c].includes(x));
        const seesB = buckets[1].some((x) => PEERS[c].includes(x));
        if (seesA && seesB) targets.push({ cell: c, value: n });
      }
      if (targets.length > 0) {
        return {
          technique: 'simple-coloring',
          placements: [],
          eliminations: targets,
          highlights: all,
          reason: `Simple colouring on ${n}: these cells see both colours of the chain, so ${n} can be removed.`,
        };
      }
    }
  }
  return null;
};

/**
 * Unique Rectangle (Type 1): three corners of a two-box rectangle share a
 * bivalue pair; to avoid two solutions the fourth corner can't be that pair.
 */
const uniqueRectangle = ({ grid, candidates }: SolveState): Step | null => {
  for (let r1 = 0; r1 < 9; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 9; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const sameBand = Math.floor(r1 / 3) === Math.floor(r2 / 3);
          const sameStack = Math.floor(c1 / 3) === Math.floor(c2 / 3);
          if (sameBand === sameStack) continue; // must span exactly two boxes
          const corners = [
            cellIndex(r1, c1),
            cellIndex(r1, c2),
            cellIndex(r2, c1),
            cellIndex(r2, c2),
          ];
          if (corners.some((c) => grid[c] !== 0)) continue;
          const biv = corners.filter((c) => popcount(candidates[c]) === 2);
          if (biv.length !== 3) continue;
          const pair = candidates[biv[0]];
          if (!biv.every((c) => candidates[c] === pair)) continue;
          const roof = corners.find((c) => !biv.includes(c))!;
          if ((candidates[roof] & pair) !== pair || popcount(candidates[roof]) <= 2) continue;
          const digits = candidatesToArray(pair);
          return {
            technique: 'unique-rectangle',
            placements: [],
            eliminations: digits.map((n) => ({ cell: roof, value: n })),
            highlights: corners,
            reason: `Unique Rectangle: three corners share {${digits.join(
              ', ',
            )}}; to keep the solution unique, ${cellName(
              roof,
            )} can't be either, so both are removed.`,
          };
        }
      }
    }
  }
  return null;
};

/**
 * BUG+1: if every unsolved cell is bivalue except one trivalue cell, the digit
 * in that cell appearing three times in a unit must be the answer.
 */
const bug = ({ grid, candidates }: SolveState): Step | null => {
  let tri = -1;
  for (let c = 0; c < grid.length; c++) {
    if (grid[c] !== 0) continue;
    const pc = popcount(candidates[c]);
    if (pc === 2) continue;
    if (pc === 3 && tri === -1) {
      tri = c;
      continue;
    }
    return null; // a second non-bivalue cell ⇒ not a BUG+1 position
  }
  if (tri === -1) return null;

  for (const d of candidatesToArray(candidates[tri])) {
    const units = [ROW_UNITS[rowOf(tri)], COL_UNITS[colOf(tri)], BOX_UNITS[boxOf(tri)]];
    const tripled = units.some(
      (unit) =>
        unit.filter((c) => grid[c] === 0 && hasCandidate(candidates[c], d)).length === 3,
    );
    if (tripled) {
      return {
        technique: 'bug',
        placements: [{ cell: tri, value: d }],
        eliminations: [],
        highlights: [tri],
        reason: `BUG+1: every cell but ${cellName(
          tri,
        )} is down to two candidates, so to keep the grid uniquely solvable ${cellName(
          tri,
        )} must be ${d}.`,
      };
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
  { name: 'hidden-triple', rank: 4, run: hiddenTriple },
  { name: 'naked-quad', rank: 5, run: (s) => nakedSubset(s, 4, 'naked-quad') },
  { name: 'hidden-quad', rank: 5, run: (s) => hiddenSubset(s, 4, 'hidden-quad') },
  { name: 'x-wing', rank: 5, run: xWing },
  { name: 'skyscraper', rank: 6, run: skyscraper },
  { name: 'two-string-kite', rank: 6, run: twoStringKite },
  { name: 'swordfish', rank: 6, run: swordfish },
  { name: 'xy-wing', rank: 6, run: xyWing },
  { name: 'xyz-wing', rank: 6, run: xyzWing },
  { name: 'w-wing', rank: 6, run: wWing },
  { name: 'jellyfish', rank: 7, run: jellyfish },
  { name: 'simple-coloring', rank: 7, run: simpleColoring },
  { name: 'unique-rectangle', rank: 7, run: uniqueRectangle },
  { name: 'bug', rank: 7, run: bug },
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

/**
 * Find the easiest applicable next step, or null if none of the techniques fire.
 * An explicit candidate state may be supplied (e.g. a mid-solve pencil-mark state
 * for a lesson); otherwise candidates are derived from the grid values.
 */
export const findStep = (
  grid: Grid,
  candidates?: CandidateMask[],
): Step | null => {
  const state: SolveState = {
    grid: cloneGrid(grid),
    candidates: candidates ? candidates.slice() : computeCandidates(grid),
  };
  for (const technique of TECHNIQUES) {
    const step = technique.run(state);
    if (step) return step;
  }
  return null;
};

/** Apply a step's placements and eliminations to a solver state (exported for
 * build-time lesson harvesting). */
export const applyStepToState = (
  grid: Grid,
  candidates: CandidateMask[],
  step: Step,
): void => {
  applyStep({ grid, candidates }, step);
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
