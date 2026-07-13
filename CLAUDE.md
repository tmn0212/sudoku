# CLAUDE.md

Guidance for working in this repo.

## What this is

An offline-first **Sudoku PWA**: React 19 + TypeScript + Vite, a hand-written,
dependency-free Sudoku engine, Zustand for state, IndexedDB (`idb`) for durable
records, and `vite-plugin-pwa` (Workbox) for offline/install. It's grown well beyond
a bare game: 5 difficulties, two modes (Good / Arcade with 3 lives), challenge packs,
a Learn/Tutorial system, stats + scoring, 8 themes, drag-multi-select with a radial
mode picker, and a Ban tool.

> **The full, current architecture map and a phased improvement roadmap live in
> [`docs/architecture/`](docs/architecture/README.md).** Read `01-overview.md` there
> before a nontrivial change. This file is the quick reference.

## Commands

- `npm run dev` — dev server (http://localhost:5173)
- `npm run build` — typecheck + production build (emits the service worker + manifest)
- `npm run preview` — serve the build (the **only** way to exercise the service worker)
- `npm run typecheck` — `tsc -b --noEmit` for the app + the `scripts/` generators
- `node scripts/generate-icons.mjs` — regenerate PWA icons (pure-JS PNG encoder)
- `npm run gen:challenges` / `npm run gen:lessons` — regenerate the challenge/lesson data

### Tests — run the tier that matches your change (don't run everything every time)

- `npm run test:fast` — pure logic (engine / scoring / data / utils), **node**, the default
  after any logic change.
- `npm run test:ui` — store / state / db / hooks / components, **jsdom**.
- `npm run test:all` (= `npm test`) — the whole suite. `npm run test:coverage` for coverage.
- `npm run test:visual` — Playwright screenshot smoke + layout assertions (needs `npm run dev`
  running). Unit tests **cannot** see layout; use this for anything that renders on the phone.

See the full **change-type → test-tier decision table** in
[`docs/architecture/05-testing.md`](docs/architecture/05-testing.md#change-type--test-tier-decision-table).
Rule of thumb: logic change → `test:fast`; store/hooks/components → `test:ui`; layout/theme →
`test:visual` + look at the screenshots.

### Testing notes

- Engine tests run in the **node** env (fast). Store/component/hook/db tests run in **jsdom**
  (the tier split is in `vite.config.ts` under `test.projects`; a `// @vitest-environment jsdom`
  pragma on line 1 also works and is used by existing files).
- Vitest's default reporter buffers output until the run ends in non-TTY shells — a run that
  only shows the `RUN` header is still working, not hung. Give it time.
- Puzzle generation is seedable (`generatePuzzle(difficulty, { seed })`) so tests are
  deterministic. DB tests use `fake-indexeddb` + `__resetDbForTests()`.

## Architecture (the real tree)

Dependency flows top → bottom; the top is pure, the bottom is platform-coupled.

- `src/engine/` — **pure, dependency-free, React/DOM-agnostic.** Board geometry & bitmask
  candidates (`board.ts`), backtracking solver + uniqueness counter (`solver.ts`),
  human-technique solver for grading + hints (`techniques.ts`), generation + grading
  (`generator.ts`), seedable RNG (`rng.ts`), shared types (`types.ts`). Keep it pure.
- `src/scoring/` — pure score computation (`score.ts`).
- `src/data/` — challenge packs (`challenges/*.json`, lazy-imported) + lesson content.
- `src/game/store.ts` — the main **Zustand** game reducer, persisted to `localStorage`
  (key `sudoku-game`). `inputActions.ts` holds the shared ban-confirm input gate.
- `src/state/` — **four more Zustand stores**: `uiStore.ts` (the in-app router — **there is
  no react-router**; it's a `Screen` enum + back stack), `settingsStore.ts` (prefs + theme),
  `fxStore.ts` (animations), `banPromptStore.ts` (ban-confirm modal).
- `src/db/` — **IndexedDB** via `idb` (DB `sudoku`): `savedGames` (resume roster, capped 10),
  `games` (completed history — used by stats), `challengeProgress`, `learned`. Persistence is
  **not** localStorage-only. Only `db/idb.ts` opens the DB; everything else uses `getDb()`.
- `src/workers/` — off-thread puzzle generation with a **synchronous fallback**. The UI calls
  `generatePuzzleAsync` (`workers/client.ts`) — don't reintroduce main-thread generation.
- `src/screens/` — 9 top-level screens. `src/components/` — 17 components (`Board.tsx` does
  DOM hit-testing). `src/hooks/` — 9 side-effect hooks (timer, haptics, save, record, fx).
- `src/theme/` — theme registry (`themes.ts`) + values (`themes.css`). `src/utils/` — format,
  haptics.

## Conventions

- **Keep the engine (and scoring) free of framework/DOM/storage dependencies** so they stay
  unit-testable and portable (a React Native app is a future goal — see
  `docs/architecture/06-ios-migration.md`).
- Difficulty is **technique-based**, not clue-count based (`easy / medium / hard / pro /
  impossible`). If you add a technique to `techniques.ts`, wire its rank into `TECHNIQUES` and
  re-check the grade mapping in `generator.ts`.
- **Styling:** `src/App.css` is a large global stylesheet — **never re-declare a selector to
  override it; edit the existing block** (past appends created 4× duplicate selectors). See
  `docs/architecture/04-styling.md` for the consolidation plan.
- Make small, focused git commits per milestone.

## Silent-coupling gotchas (easy to break)

- **Challenge progress is keyed by array index** (`${mode}:${difficulty}:${index}`). Regenerating
  the challenge packs (`gen:challenges`) reshuffles indices and **invalidates users' saved
  progress**. Don't regenerate casually.
- **The active-game shape is hand-maintained in three places** that must stay in sync:
  `store.ts` `partialize`, `useSaveRoster.ts` `serialize`, and the `SavedGame` interface in
  `db/idb.ts`. Adding a field means editing all three.
