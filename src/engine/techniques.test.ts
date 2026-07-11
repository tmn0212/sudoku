import { describe, it, expect } from 'vitest';
import { parseGrid, stringifyGrid } from './board';
import { solve } from './solver';
import { findStep, solveLogically } from './techniques';

const CLASSIC =
  '53..7....' +
  '6..195...' +
  '.98....6.' +
  '8...6...3' +
  '4..8.3..1' +
  '7...2...6' +
  '.6....28.' +
  '...419..5' +
  '....8..79';
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('findStep (hint engine)', () => {
  it('finds a naked single when a cell has one candidate', () => {
    // A full solution with exactly one blank -> that blank is a naked single.
    const grid = parseGrid(SOLUTION);
    grid[40] = 0;
    const step = findStep(grid);
    expect(step).not.toBeNull();
    expect(step!.technique).toBe('naked-single');
    expect(step!.placements).toEqual([{ cell: 40, value: Number(SOLUTION[40]) }]);
  });

  it('finds a hidden single when a digit fits only one cell in a unit', () => {
    // Place a 1 in every column 1-8 (distinct rows and boxes), leaving R0C0 as
    // the only spot for 1 in row 0 — while R0C0 still has many candidates.
    const grid = parseGrid('.'.repeat(81));
    const ones: [number, number][] = [
      [3, 1],
      [6, 2],
      [1, 3],
      [4, 4],
      [7, 5],
      [2, 6],
      [5, 7],
      [8, 8],
    ];
    for (const [r, c] of ones) grid[r * 9 + c] = 1;

    const step = findStep(grid);
    expect(step).not.toBeNull();
    expect(step!.technique).toBe('hidden-single');
    expect(step!.placements).toEqual([{ cell: 0, value: 1 }]);
  });

  it('returns null when the grid is already solved', () => {
    expect(findStep(parseGrid(SOLUTION))).toBeNull();
  });

  it('never suggests a placement that contradicts the solution', () => {
    // Walk the classic puzzle and check every hinted placement is correct.
    let grid = parseGrid(CLASSIC);
    for (let guard = 0; guard < 81; guard++) {
      const step = findStep(grid);
      if (!step || step.placements.length === 0) break;
      for (const { cell, value } of step.placements) {
        expect(value).toBe(Number(SOLUTION[cell]));
        grid = grid.slice();
        grid[cell] = value;
      }
    }
  });
});

describe('solveLogically', () => {
  it('solves the classic puzzle with human techniques', () => {
    const result = solveLogically(parseGrid(CLASSIC));
    expect(result.solved).toBe(true);
    expect(stringifyGrid(result.grid)).toBe(SOLUTION);
  });

  it('reports the techniques it used', () => {
    const result = solveLogically(parseGrid(CLASSIC));
    expect(result.techniquesUsed.size).toBeGreaterThan(0);
    expect(result.hardestRank).toBeGreaterThanOrEqual(1);
  });

  it('never diverges from the true solution on solvable puzzles', () => {
    const result = solveLogically(parseGrid(CLASSIC));
    const truth = solve(parseGrid(CLASSIC))!;
    // Every cell it filled matches the real solution.
    result.grid.forEach((v, i) => {
      if (v !== 0) expect(v).toBe(truth[i]);
    });
  });

  it('stops (does not loop) on a puzzle needing guessing', () => {
    // The empty grid can't be reduced by these techniques.
    const result = solveLogically(parseGrid('.'.repeat(81)));
    expect(result.solved).toBe(false);
    expect(result.steps.length).toBe(0);
  });
});
