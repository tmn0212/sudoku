import { describe, it, expect } from 'vitest';
import {
  PEERS,
  UNITS,
  ALL_CANDIDATES,
  boxOf,
  candidatesToArray,
  cellIndex,
  colOf,
  computeCandidates,
  findConflicts,
  hasCandidate,
  isSolved,
  isValidPlacement,
  parseGrid,
  popcount,
  rowOf,
  singleValue,
  stringifyGrid,
} from './board';

const SOLVED =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('board geometry', () => {
  it('has 27 units of 9 cells each', () => {
    expect(UNITS).toHaveLength(27);
    for (const unit of UNITS) expect(unit).toHaveLength(9);
  });

  it('gives every cell exactly 20 peers', () => {
    expect(PEERS).toHaveLength(81);
    for (const peers of PEERS) expect(peers).toHaveLength(20);
  });

  it('maps row/col/box/index consistently', () => {
    expect(rowOf(0)).toBe(0);
    expect(colOf(0)).toBe(0);
    expect(cellIndex(4, 5)).toBe(41);
    expect(rowOf(41)).toBe(4);
    expect(colOf(41)).toBe(5);
    expect(boxOf(0)).toBe(0);
    expect(boxOf(41)).toBe(4);
    expect(boxOf(80)).toBe(8);
  });

  it('peers are symmetric', () => {
    for (let i = 0; i < 81; i++) {
      for (const p of PEERS[i]) {
        expect(PEERS[p]).toContain(i);
      }
    }
  });
});

describe('candidate bitmask helpers', () => {
  it('ALL_CANDIDATES holds digits 1-9', () => {
    expect(candidatesToArray(ALL_CANDIDATES)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(popcount(ALL_CANDIDATES)).toBe(9);
  });

  it('reads single values and membership', () => {
    const mask = (1 << 3) | (1 << 7);
    expect(hasCandidate(mask, 3)).toBe(true);
    expect(hasCandidate(mask, 4)).toBe(false);
    expect(popcount(mask)).toBe(2);
    expect(singleValue(1 << 5)).toBe(5);
  });
});

describe('serialization', () => {
  it('round-trips a grid', () => {
    const grid = parseGrid(SOLVED);
    expect(grid).toHaveLength(81);
    expect(stringifyGrid(grid)).toBe(SOLVED);
  });

  it('treats . 0 and - as empty', () => {
    const g = parseGrid('.'.repeat(80) + '5');
    expect(g[0]).toBe(0);
    expect(g[80]).toBe(5);
    expect(parseGrid('0'.repeat(81)).every((v) => v === 0)).toBe(true);
  });

  it('rejects wrong length or bad chars', () => {
    expect(() => parseGrid('123')).toThrow();
    expect(() => parseGrid('x'.repeat(81))).toThrow();
  });
});

describe('validity and conflicts', () => {
  it('recognizes a solved grid', () => {
    expect(isSolved(parseGrid(SOLVED))).toBe(true);
  });

  it('rejects a grid with a duplicate as unsolved', () => {
    const bad = parseGrid(SOLVED);
    bad[1] = bad[0]; // create a duplicate in row 0
    expect(isSolved(bad)).toBe(false);
  });

  it('detects placement validity against peers', () => {
    const grid = parseGrid('.'.repeat(81));
    grid[0] = 5;
    expect(isValidPlacement(grid, 1, 5)).toBe(false); // same row
    expect(isValidPlacement(grid, 9, 5)).toBe(false); // same column
    expect(isValidPlacement(grid, 10, 5)).toBe(false); // same box
    expect(isValidPlacement(grid, 80, 5)).toBe(true);
  });

  it('flags both cells of a conflict', () => {
    const grid = parseGrid('.'.repeat(81));
    grid[0] = 7;
    grid[8] = 7; // same row
    const conflicts = findConflicts(grid);
    expect(conflicts.has(0)).toBe(true);
    expect(conflicts.has(8)).toBe(true);
    expect(conflicts.size).toBe(2);
  });

  it('reports no conflicts for a solved grid', () => {
    expect(findConflicts(parseGrid(SOLVED)).size).toBe(0);
  });
});

describe('computeCandidates', () => {
  it('assigns 0 to filled cells and legal candidates to empty ones', () => {
    const grid = parseGrid('.'.repeat(81));
    grid[0] = 5;
    const cands = computeCandidates(grid);
    expect(cands[0]).toBe(0);
    // cell 1 (same row) cannot be 5
    expect(hasCandidate(cands[1], 5)).toBe(false);
    expect(hasCandidate(cands[1], 4)).toBe(true);
  });
});
