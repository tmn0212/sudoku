import { describe, it, expect } from 'vitest';
import { LESSONS, TIERS } from './lessons';
import { parseGrid } from '@sudoku/core';
import { solve } from '@sudoku/core';
import { runTechnique, solveLogically } from '@sudoku/core';

describe('lesson catalog', () => {
  it('covers all 21 techniques with complete prose', () => {
    expect(LESSONS.length).toBe(21);
    for (const l of LESSONS) {
      expect(l.title.length).toBeGreaterThan(0);
      expect(l.summary.length).toBeGreaterThan(0);
      expect(l.steps.length).toBeGreaterThanOrEqual(3);
      expect(TIERS).toContain(l.tier);
    }
  });

  it('provides an interactive example for every technique', () => {
    expect(LESSONS.every((l) => l.example)).toBe(true);
  });

  for (const lesson of LESSONS) {
    describe(lesson.id, () => {
      it('has teaching prose', () => {
        expect(lesson.steps.every((s) => s.length > 0)).toBe(true);
      });

      if (lesson.example) {
        it('technique fires on its example state (for the walkthrough)', () => {
          const grid = parseGrid(lesson.example!.values);
          const step = runTechnique(lesson.id, grid, lesson.example!.candidates);
          expect(step).not.toBeNull();
          expect(step!.technique).toBe(lesson.id);
        });
      }

      if (lesson.practice) {
        it('practice puzzle is uniquely solvable and needs the technique', () => {
          const grid = parseGrid(lesson.practice!);
          expect(solve(grid)).not.toBeNull();
          const res = solveLogically(grid);
          expect(res.solved).toBe(true);
          expect(res.techniquesUsed.has(lesson.id)).toBe(true);
        });
      }
    });
  }
});
