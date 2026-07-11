# Sudoku PWA

A clean, offline-first Sudoku game built as an installable Progressive Web App —
inspired by *Good Sudoku*. Play on your phone with no network connection, get
teaching hints that explain the logic, and pick up where you left off.

Built with **React + TypeScript + Vite**, a hand-written, fully-tested Sudoku
engine, and `vite-plugin-pwa` (Workbox) for offline support.

## Features

- **Real puzzle generation** with a guaranteed *unique* solution, at four
  difficulties (easy / medium / hard / expert).
- **Technique-based difficulty grading** — difficulty reflects the hardest human
  technique a puzzle requires (naked/hidden singles, locked candidates, pairs,
  triples, X-Wing), not just the clue count.
- **Teaching hints** — the hint engine finds the *easiest* next deduction and
  explains *why*, then can place it for you. It also flags incorrect entries.
- **Pencil marks** (notes) with auto-cleanup of peers when you place a digit.
- **Same-number, row/column/box, and conflict highlighting.**
- **Undo / redo, erase, mistake counter, timer** (auto-pauses when backgrounded).
- **Auto-save** — an in-progress game is persisted to `localStorage` and restored
  on relaunch (works fully offline).
- **Mobile-first, iOS-friendly**: safe-area insets, no rubber-band scroll, no
  double-tap zoom, light & dark themes, keyboard support on desktop.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Command                 | What it does                                              |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                     |
| `npm run build`         | Type-check and build for production (generates the PWA)   |
| `npm run preview`       | Serve the production build (needed to test the service worker) |
| `npm test`              | Run the full test suite once (Vitest)                    |
| `npm run test:watch`    | Run tests in watch mode                                  |
| `npm run test:coverage` | Run tests with coverage of the engine                    |
| `npm run typecheck`     | Type-check without emitting                              |
| `npm run lint`          | Lint with oxlint                                         |
| `node scripts/generate-icons.mjs` | Regenerate the PWA icons                        |

## Testing

The engine is covered by unit tests (run in Node for speed); the store and UI are
covered by tests in jsdom via React Testing Library.

```bash
npm test
```

Key invariants under test: the solver always finds the correct unique solution,
generated puzzles are uniquely solvable and match the requested difficulty band,
hints never contradict the true solution, and the game store handles input,
notes, undo/redo, mistakes, and win detection correctly.

## Installing as an app (iOS)

1. `npm run build && npm run preview` (or deploy the `dist/` folder to any static
   host — Netlify, Vercel, GitHub Pages, etc.). The service worker only runs in a
   production build, and iOS requires **HTTPS** (or `localhost`) to install.
2. Open the site in **Safari** on your iPhone.
3. Tap the **Share** button → **Add to Home Screen**.
4. Launch it from the home screen — it runs full-screen and works with no network.

> On iOS the app is cached by the service worker on first load, so after that it
> opens and plays entirely offline.

## Architecture

```
src/
  engine/        Pure, dependency-free Sudoku engine (unit-tested)
    board.ts       Geometry, peers/units, candidate bitmasks, (de)serialization
    solver.ts      Backtracking solver + solution counter (uniqueness)
    techniques.ts  Human-technique logical solver — grading + hints
    generator.ts   Puzzle generation + difficulty grading
    rng.ts         Seedable PRNG (deterministic, testable generation)
  game/
    store.ts       Zustand store with localStorage persistence
  components/      React UI (Board, Cell, NumberPad, Controls, ...)
  hooks/           Timer + keyboard input
```

The engine has **no dependencies** and knows nothing about React, so it can be
tested in isolation and reused anywhere.
