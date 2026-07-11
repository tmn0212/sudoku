import { describe, it, expect } from 'vitest';
import { DIFFICULTIES, type Difficulty } from '../../engine/types';
import { parseGrid } from '../../engine/board';
import { hasUniqueSolution } from '../../engine/solver';
import { gradeDifficulty } from '../../engine/generator';
import easy from './easy.json';
import medium from './medium.json';
import hard from './hard.json';
import pro from './pro.json';
import impossible from './impossible.json';

interface Pack {
  difficulty: Difficulty;
  puzzles: string[];
}

const PACKS: Record<Difficulty, Pack> = {
  easy: easy as Pack,
  medium: medium as Pack,
  hard: hard as Pack,
  pro: pro as Pack,
  impossible: impossible as Pack,
};

describe('challenge bank', () => {
  it('ships a pack for every difficulty', () => {
    for (const d of DIFFICULTIES) {
      expect(PACKS[d].difficulty).toBe(d);
      expect(PACKS[d].puzzles.length).toBeGreaterThanOrEqual(30);
    }
  });

  it('has ~240 puzzles total', () => {
    const total = DIFFICULTIES.reduce((n, d) => n + PACKS[d].puzzles.length, 0);
    expect(total).toBeGreaterThanOrEqual(200);
  });

  for (const d of DIFFICULTIES) {
    describe(`pack: ${d}`, () => {
      const pack = PACKS[d];

      it('every puzzle is 81 valid cells with some blanks', () => {
        for (const p of pack.puzzles) {
          expect(p).toHaveLength(81);
          expect(p).toMatch(/^[.1-9]+$/);
          expect(p).toContain('.'); // must have blanks to solve
        }
      });

      it('has no duplicate puzzles', () => {
        expect(new Set(pack.puzzles).size).toBe(pack.puzzles.length);
      });

      // Solving/grading is the expensive part — sample a handful per pack so the
      // suite stays fast while still catching a corrupt or mis-tiered bank.
      it('sampled puzzles are uniquely solvable and correctly tiered', () => {
        const sample = pack.puzzles.filter((_, i) => i % 10 === 0).slice(0, 6);
        for (const str of sample) {
          const grid = parseGrid(str);
          expect(hasUniqueSolution(grid)).toBe(true);
          expect(gradeDifficulty(grid)).toBe(d);
        }
      });
    });
  }
});
