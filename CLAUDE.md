# CLAUDE.md

Guidance for working in this repo.

## What this is

An offline-first **Sudoku PWA**: React + TypeScript + Vite, a hand-written Sudoku
engine, Zustand for state, and `vite-plugin-pwa` (Workbox) for offline/install.

## Commands

- `npm run dev` — dev server
- `npm test` — run all tests once (Vitest). `npm run test:watch` for watch mode.
- `npm run typecheck` — `tsc -b --noEmit`
- `npm run build` — typecheck + production build (emits the service worker + manifest)
- `npm run preview` — serve the build (the **only** way to exercise the service worker)
- `node scripts/generate-icons.mjs` — regenerate PWA icons (pure-JS PNG encoder)

## Testing notes

- Engine tests run in the **node** environment (fast). Store/component tests opt
  into jsdom with a `// @vitest-environment jsdom` pragma on line 1.
- Vitest's default reporter buffers output until the run ends in non-TTY shells —
  a run that only shows the `RUN` header is still working, not hung. Give it time.
- Puzzle generation is seedable (`generatePuzzle(difficulty, { seed })`) so tests
  are deterministic.

## Architecture

- `src/engine/` — pure, dependency-free, React-agnostic. Board geometry & bitmask
  candidates (`board.ts`), backtracking solver + uniqueness counter (`solver.ts`),
  human-technique solver used for grading + hints (`techniques.ts`), generation +
  grading (`generator.ts`), seedable RNG (`rng.ts`).
- `src/game/store.ts` — Zustand store, persisted to `localStorage` (key
  `sudoku-game`) so games survive reload/relaunch offline.
- `src/components/`, `src/hooks/` — UI and input.

## Conventions

- Keep the engine free of framework/DOM dependencies so it stays unit-testable.
- Difficulty is **technique-based**, not clue-count based. If you add a solving
  technique to `techniques.ts`, wire its rank into `TECHNIQUES` and re-check the
  grade mapping in `generator.ts`.
- Make small, focused git commits per milestone.
