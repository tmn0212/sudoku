/**
 * Build-time challenge-bank generator.
 *
 * Generates a fixed, reproducible set of puzzles per difficulty and writes them
 * as compact JSON packs (81-char given-strings only — the solution is derived
 * at play time by the engine, keeping each pack tiny). Run with:
 *
 *   npx tsx scripts/generate-challenges.ts          # full bank
 *   CHALLENGE_PROBE=3 npx tsx scripts/generate-challenges.ts   # quick timing probe
 *
 * Determinism: each pack walks a fixed seed range, so re-running produces the
 * same bank. Every puzzle is verified to grade at its target tier (impossible
 * accepts the engine's hardest output) and to be unique within its pack.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generatePuzzle, gradeDifficulty } from '../src/engine/generator';
import { hasUniqueSolution } from '../src/engine/solver';
import { stringifyGrid } from '../src/engine/board';
import { DIFFICULTIES, type Difficulty } from '../src/engine/types';

/** How many puzzles per tier (≈250 total). Overridable via CHALLENGE_PROBE. */
const COUNTS: Record<Difficulty, number> = {
  easy: 60,
  medium: 60,
  hard: 50,
  pro: 40,
  impossible: 30,
};

/** Distinct seed bases keep tiers from sharing puzzles. */
const SEED_BASE: Record<Difficulty, number> = {
  easy: 1_000_000,
  medium: 2_000_000,
  hard: 3_000_000,
  pro: 4_000_000,
  impossible: 5_000_000,
};

const probe = Number(process.env.CHALLENGE_PROBE) || 0;

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/challenges',
);
mkdirSync(outDir, { recursive: true });

let grandTotal = 0;
const startedAll = Date.now();

for (const difficulty of DIFFICULTIES) {
  const target = probe || COUNTS[difficulty];
  const seen = new Set<string>();
  const puzzles: string[] = [];
  let seed = SEED_BASE[difficulty];
  let attempts = 0;
  const started = Date.now();

  while (puzzles.length < target) {
    attempts++;
    const p = generatePuzzle(difficulty, { seed: seed++, maxAttempts: 24 });
    const graded = gradeDifficulty(p.puzzle);
    const ok =
      difficulty === 'impossible'
        ? graded === 'impossible'
        : graded === difficulty;
    if (!ok) continue;

    const str = stringifyGrid(p.puzzle);
    if (seen.has(str)) continue;
    // Defensive: the generator guarantees this, but the bank must never ship a
    // puzzle with multiple solutions.
    if (!hasUniqueSolution(p.puzzle)) continue;

    seen.add(str);
    puzzles.push(str);
  }

  const file = join(outDir, `${difficulty}.json`);
  writeFileSync(file, JSON.stringify({ difficulty, puzzles }));
  grandTotal += puzzles.length;

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const hit = ((puzzles.length / attempts) * 100).toFixed(0);
  console.log(
    `${difficulty.padEnd(11)} ${String(puzzles.length).padStart(3)} puzzles  ` +
      `${secs.padStart(6)}s  (${attempts} attempts, ${hit}% hit)`,
  );
}

console.log(
  `\nTotal: ${grandTotal} puzzles in ${((Date.now() - startedAll) / 1000).toFixed(1)}s → ${outDir}`,
);
