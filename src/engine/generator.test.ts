import { describe, it, expect } from 'vitest';
import { DIFFICULTIES, type Difficulty } from './types';
import { hasUniqueSolution, solve } from './solver';
import { solveLogically } from './techniques';
import { generatePuzzle, gradeDifficulty } from './generator';
import { stringifyGrid } from './board';

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

describe('gradeDifficulty', () => {
  it('returns a valid difficulty for a real puzzle', () => {
    const grade = gradeDifficulty(
      CLASSIC.split('').map((c) => (c === '.' ? 0 : Number(c))),
    );
    expect(DIFFICULTIES).toContain(grade);
  });
});

describe('generatePuzzle', () => {
  for (const difficulty of DIFFICULTIES) {
    describe(`difficulty: ${difficulty}`, () => {
      const puzzle = generatePuzzle(difficulty, { seed: 20260711 });

      it('has a unique solution', () => {
        expect(hasUniqueSolution(puzzle.puzzle)).toBe(true);
      });

      it("the reported solution actually solves the puzzle", () => {
        const solved = solve(puzzle.puzzle)!;
        expect(stringifyGrid(solved)).toBe(stringifyGrid(puzzle.solution));
      });

      it('every given cell matches the solution', () => {
        puzzle.puzzle.forEach((v, i) => {
          if (v !== 0) expect(v).toBe(puzzle.solution[i]);
        });
      });

      it('has a sane number of givens', () => {
        expect(puzzle.givens).toBeGreaterThanOrEqual(17);
        expect(puzzle.givens).toBeLessThan(81);
      });

      it('is labelled with the requested difficulty', () => {
        expect(puzzle.difficulty).toBe(difficulty);
      });
    });
  }

  it('is deterministic for a fixed seed', () => {
    const a = generatePuzzle('medium', { seed: 7 });
    const b = generatePuzzle('medium', { seed: 7 });
    expect(stringifyGrid(a.puzzle)).toBe(stringifyGrid(b.puzzle));
  });

  it('produces different puzzles for different seeds', () => {
    const a = generatePuzzle('medium', { seed: 1 });
    const b = generatePuzzle('medium', { seed: 2 });
    expect(stringifyGrid(a.puzzle)).not.toBe(stringifyGrid(b.puzzle));
  });

  it('easy and medium puzzles are solvable by human logic', () => {
    for (const difficulty of ['easy', 'medium'] as Difficulty[]) {
      const { puzzle, solution } = generatePuzzle(difficulty, { seed: 99 });
      const result = solveLogically(puzzle);
      expect(result.solved).toBe(true);
      expect(stringifyGrid(result.grid)).toBe(stringifyGrid(solution));
    }
  });

  it('fewer clues trend harder (easy has more givens than impossible)', () => {
    const easy = generatePuzzle('easy', { seed: 555 });
    const impossible = generatePuzzle('impossible', { seed: 555 });
    expect(easy.givens).toBeGreaterThan(impossible.givens);
  });

  it('grades to valid tiers; the full technique stack never diverges', () => {
    for (const d of DIFFICULTIES) {
      const { puzzle, solution } = generatePuzzle(d, { seed: 4242 });
      expect(DIFFICULTIES).toContain(gradeDifficulty(puzzle));
      const r = solveLogically(puzzle);
      if (r.solved) expect(stringifyGrid(r.grid)).toBe(stringifyGrid(solution));
    }
  });
});
