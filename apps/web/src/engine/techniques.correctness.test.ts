import { describe, it, expect } from 'vitest';
import { DIFFICULTIES } from './types';
import { generatePuzzle } from './generator';
import { solveLogically, TECHNIQUES } from './techniques';

/**
 * The strongest guard for the logical solver: across a large, varied sample of
 * real puzzles, no technique may ever place a digit that disagrees with the true
 * solution, nor eliminate a candidate that actually belongs in a cell. A single
 * buggy elimination anywhere in the (now 21) techniques trips this.
 */
describe('technique correctness over many puzzles', () => {
  it('never places a wrong digit or eliminates a true candidate', () => {
    let stepsChecked = 0;
    let badPlacements = 0;
    let badEliminations = 0;

    for (let seed = 700_000; seed < 700_120; seed++) {
      for (const d of DIFFICULTIES) {
        // maxAttempts:1 keeps generation cheap while still producing varied,
        // valid, unique puzzles across the clue-count bands.
        const { puzzle, solution } = generatePuzzle(d, { seed, maxAttempts: 1 });
        const res = solveLogically(puzzle);
        for (const step of res.steps) {
          for (const p of step.placements) {
            if (solution[p.cell] !== p.value) badPlacements++;
          }
          for (const e of step.eliminations) {
            if (solution[e.cell] === e.value) badEliminations++;
          }
          stepsChecked++;
        }
      }
    }

    expect(badPlacements).toBe(0);
    expect(badEliminations).toBe(0);
    expect(stepsChecked).toBeGreaterThan(500);
  }, 60_000);
});

describe('technique registry', () => {
  it('has 21 techniques ordered easiest-first', () => {
    expect(TECHNIQUES.length).toBe(21);
    for (let i = 1; i < TECHNIQUES.length; i++) {
      expect(TECHNIQUES[i].rank).toBeGreaterThanOrEqual(TECHNIQUES[i - 1].rank);
    }
  });

  it('includes the expanded technique set', () => {
    const names = new Set(TECHNIQUES.map((t) => t.name));
    for (const t of [
      'naked-quad',
      'hidden-quad',
      'jellyfish',
      'skyscraper',
      'two-string-kite',
      'xyz-wing',
      'w-wing',
      'simple-coloring',
      'unique-rectangle',
      'bug',
    ] as const) {
      expect(names.has(t)).toBe(true);
    }
  });
});
