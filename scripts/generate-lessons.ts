/**
 * Build-time harvester for Learn-tab lesson fixtures.
 *
 * For each teaching technique we capture:
 *  - `example`: a mid-solve state — the grid values plus the pencil-mark
 *    candidate masks — at the moment that technique is the first one that fires.
 *    Storing the candidate state (not just values) is what lets advanced
 *    techniques, which only appear after earlier eliminations, be demonstrated.
 *    By construction findStep(values, candidates) returns exactly that technique.
 *  - `practice`: a full puzzle whose HARDEST required technique is that one.
 *
 * We solve real generated puzzles step by step (applying eliminations, like the
 * real solver) and snapshot the state the first time each target technique wins.
 *
 *   npx tsx scripts/generate-lessons.ts   (writes src/data/lesson-examples.json)
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generatePuzzle } from '../src/engine/generator';
import {
  TECHNIQUES,
  applyStepToState,
  findStep,
  solveLogically,
} from '../src/engine/techniques';
import { computeCandidates, stringifyGrid } from '../src/engine/board';
import type { Difficulty, Grid, TechniqueName } from '../src/engine/types';

const TARGETS: TechniqueName[] = TECHNIQUES.map((t) => t.name);

const RANK: Record<string, number> = Object.fromEntries(
  TECHNIQUES.map((t) => [t.name, t.rank]),
);

interface Example {
  values: string;
  candidates: number[];
}
const examples: Partial<Record<TechniqueName, Example>> = {};
const practice: Partial<Record<TechniqueName, string>> = {};

const allFound = () => TARGETS.every((t) => examples[t] && practice[t]);

/** Solve a puzzle step by step, snapshotting the state the first time each
 * target technique is the one that fires. */
const harvestExample = (puzzle: Grid): void => {
  const grid = puzzle.slice();
  const candidates = computeCandidates(puzzle);
  for (let guard = 0; guard < 200; guard++) {
    let applied = false;
    for (const tech of TECHNIQUES) {
      const step = tech.run({ grid, candidates });
      if (!step) continue;
      if (!examples[tech.name]) {
        examples[tech.name] = {
          values: stringifyGrid(grid),
          candidates: candidates.slice(),
        };
      }
      applyStepToState(grid, candidates, step);
      applied = true;
      break;
    }
    if (!applied) break;
  }
};

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'pro', 'impossible'];
const SEED_BUDGET = Number(process.env.LESSON_SEEDS) || 8000;
const MAX_ATTEMPTS = Number(process.env.LESSON_ATTEMPTS) || 6;
const TIME_LIMIT_MS = (Number(process.env.LESSON_SECONDS) || 240) * 1000;
const started = Date.now();
let scanned = 0;

outer: for (let seed = 900_000; seed < 900_000 + SEED_BUDGET; seed++) {
  if (Date.now() - started > TIME_LIMIT_MS) break;
  for (const difficulty of DIFFICULTIES) {
    scanned++;
    const puzzle = generatePuzzle(difficulty, { seed, maxAttempts: MAX_ATTEMPTS });

    harvestExample(puzzle.puzzle);

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

// Emit whatever was found per technique; example and practice are each optional
// so rare patterns still get a (prose-only, or example-only) lesson.
const out: Record<
  string,
  { values?: string; candidates?: number[]; practice?: string }
> = {};
for (const t of TARGETS) {
  if (!examples[t] && !practice[t]) continue;
  out[t] = {};
  if (examples[t]) {
    out[t].values = examples[t]!.values;
    out[t].candidates = examples[t]!.candidates;
  }
  if (practice[t]) out[t].practice = practice[t];
}

const outFile = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/lesson-examples.json',
);
writeFileSync(outFile, JSON.stringify(out, null, 0));

// Sanity: every emitted example must have findStep return its own technique.
let verified = 0;
for (const [name, ex] of Object.entries(out)) {
  if (!ex.values || !ex.candidates) continue;
  const step = findStep(
    [...ex.values].map((c) => (c === '.' ? 0 : Number(c))),
    ex.candidates,
  );
  if (step?.technique === name) verified++;
  else console.log(`  !! ${name}: findStep returned ${step?.technique ?? 'null'}`);
}

console.log(`Scanned ${scanned} puzzles in ${((Date.now() - started) / 1000).toFixed(1)}s`);
for (const t of TARGETS) {
  const mark = out[t] ? 'ok ' : examples[t] ? 'no-practice' : 'no-example';
  console.log(`  ${mark.padEnd(11)} ${t}`);
}
console.log(
  `Wrote ${Object.keys(out).length}/${TARGETS.length} lessons (${verified} verified) → ${outFile}`,
);
