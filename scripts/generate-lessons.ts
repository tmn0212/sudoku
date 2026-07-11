/**
 * Build-time harvester for Learn-tab lesson fixtures.
 *
 * For each teaching technique we need two things the engine can verify:
 *  - `example`: a values-only board where `findStep()` returns exactly that
 *    technique (so the lesson can highlight a real deduction). Because findStep
 *    derives candidates purely from the grid values, any board it returns T on
 *    is, by construction, a valid example of T.
 *  - `practice`: a full puzzle whose HARDEST required technique is T, so playing
 *    it actually exercises the move.
 *
 * We step real generated puzzles forward by placement to surface examples, and
 * grade puzzles with solveLogically to find focused practice puzzles.
 *
 *   npx tsx scripts/generate-lessons.ts   (writes src/data/lesson-examples.json)
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generatePuzzle } from '../src/engine/generator';
import { findStep, solveLogically, TECHNIQUES } from '../src/engine/techniques';
import { stringifyGrid } from '../src/engine/board';
import type { Difficulty, Grid, TechniqueName } from '../src/engine/types';

const TARGETS: TechniqueName[] = [
  'naked-single',
  'hidden-single',
  'pointing',
  'claiming',
  'naked-pair',
  'hidden-pair',
  'naked-triple',
  'x-wing',
  'xy-wing',
];

const RANK: Record<string, number> = Object.fromEntries(
  TECHNIQUES.map((t) => [t.name, t.rank]),
);

const examples: Partial<Record<TechniqueName, string>> = {};
const practice: Partial<Record<TechniqueName, string>> = {};

const allFound = () =>
  TARGETS.every((t) => examples[t] && practice[t]);

/** Step a puzzle forward by placement, recording the first board where each
 * technique surfaces as findStep's answer. Stops at an elimination-only wall. */
const harvestExamples = (puzzle: Grid): void => {
  let grid = puzzle.slice();
  for (let guard = 0; guard < 81; guard++) {
    const step = findStep(grid);
    if (!step) break;
    if (!examples[step.technique] && TARGETS.includes(step.technique)) {
      examples[step.technique] = stringifyGrid(grid);
    }
    if (step.placements.length === 0) break; // can't advance in values-space
    grid = grid.slice();
    for (const { cell, value } of step.placements) grid[cell] = value;
  }
};

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'pro'];
const started = Date.now();
let scanned = 0;

outer: for (let seed = 900_000; seed < 900_000 + 6000; seed++) {
  for (const difficulty of DIFFICULTIES) {
    scanned++;
    const puzzle = generatePuzzle(difficulty, { seed, maxAttempts: 8 });

    harvestExamples(puzzle.puzzle);

    const res = solveLogically(puzzle.puzzle);
    if (res.solved) {
      for (const t of TARGETS) {
        if (
          !practice[t] &&
          res.techniquesUsed.has(t) &&
          res.hardestRank === RANK[t]
        ) {
          practice[t] = stringifyGrid(puzzle.puzzle);
        }
      }
    }

    if (allFound()) break outer;
  }
}

const out: Record<string, { example: string; practice: string }> = {};
for (const t of TARGETS) {
  if (examples[t] && practice[t]) {
    out[t] = { example: examples[t]!, practice: practice[t]! };
  }
}

const outFile = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/lesson-examples.json',
);
writeFileSync(outFile, JSON.stringify(out, null, 0));

console.log(`Scanned ${scanned} puzzles in ${((Date.now() - started) / 1000).toFixed(1)}s`);
for (const t of TARGETS) {
  const mark = out[t] ? 'ok ' : (examples[t] ? 'no-practice' : 'no-example');
  console.log(`  ${mark.padEnd(11)} ${t}`);
}
console.log(`Wrote ${Object.keys(out).length}/${TARGETS.length} lessons → ${outFile}`);
