import { describe, it, expect } from 'vitest';
import { LESSONS, TIERS } from './lessons';
import { parseGrid } from '../engine/board';
import { solve } from '../engine/solver';
import { findStep, solveLogically } from '../engine/techniques';

describe('lesson catalog', () => {
  it('ships all nine lessons with complete prose', () => {
    expect(LESSONS.length).toBe(9);
    for (const l of LESSONS) {
      expect(l.title.length).toBeGreaterThan(0);
      expect(l.summary.length).toBeGreaterThan(0);
      expect(l.steps.length).toBeGreaterThanOrEqual(3);
      expect(TIERS).toContain(l.tier);
    }
  });

  for (const lesson of LESSONS) {
    describe(lesson.id, () => {
      it('example board exhibits the technique via findStep', () => {
        const step = findStep(parseGrid(lesson.example));
        expect(step).not.toBeNull();
        expect(step!.technique).toBe(lesson.id);
      });

      it('practice puzzle is uniquely solvable and needs the technique', () => {
        const grid = parseGrid(lesson.practice);
        expect(solve(grid)).not.toBeNull();
        const res = solveLogically(grid);
        expect(res.solved).toBe(true);
        expect(res.techniquesUsed.has(lesson.id)).toBe(true);
      });
    });
  }
});
