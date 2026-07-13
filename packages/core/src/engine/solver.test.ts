import { describe, it, expect } from 'vitest';
import { isSolved, parseGrid, stringifyGrid } from './board';
import { countSolutions, generateSolvedGrid, hasUniqueSolution, solve } from './solver';
import { createRng } from './rng';

// The classic Norvig sample puzzle and its unique solution.
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

describe('solve', () => {
  it('solves a valid puzzle to the correct solution', () => {
    const solved = solve(parseGrid(SOLUTION.slice(0, 30) + '.'.repeat(51)));
    expect(solved).not.toBeNull();
    expect(isSolved(solved!)).toBe(true);
  });

  it('solves the classic puzzle', () => {
    const solved = solve(parseGrid(CLASSIC));
    expect(solved).not.toBeNull();
    expect(stringifyGrid(solved!)).toBe(SOLUTION);
  });

  it('returns null for an unsolvable grid', () => {
    const bad = parseGrid('.'.repeat(81));
    bad[0] = 1;
    bad[1] = 1; // duplicate makes it unsolvable
    expect(solve(bad)).toBeNull();
  });
});

describe('countSolutions / uniqueness', () => {
  it('counts exactly one solution for a proper puzzle', () => {
    const puzzle = parseGrid(CLASSIC);
    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(hasUniqueSolution(puzzle)).toBe(true);
  });

  it('finds multiple solutions for an underspecified grid', () => {
    const empty = parseGrid('.'.repeat(81));
    expect(countSolutions(empty, 2)).toBe(2); // capped at 2
    expect(hasUniqueSolution(empty)).toBe(false);
  });

  it('stops counting at the limit', () => {
    const empty = parseGrid('.'.repeat(81));
    expect(countSolutions(empty, 5)).toBe(5);
  });
});

describe('generateSolvedGrid', () => {
  it('produces a fully valid solved grid', () => {
    const rng = createRng(123);
    const grid = generateSolvedGrid(rng);
    expect(isSolved(grid)).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    const a = generateSolvedGrid(createRng(42));
    const b = generateSolvedGrid(createRng(42));
    expect(a).toEqual(b);
  });

  it('produces different grids for different seeds', () => {
    const a = generateSolvedGrid(createRng(1));
    const b = generateSolvedGrid(createRng(2));
    expect(a).not.toEqual(b);
  });
});
