# CLAUDE.md

Guidance for working in this repo.

## What this is

An offline-first **Sudoku PWA**: React 19 + TypeScript + Vite, a hand-written,
dependency-free Sudoku engine, Zustand for state, IndexedDB (`idb`) for durable
records, and `vite-plugin-pwa` (Workbox) for offline/install. It's grown well beyond
a bare game: 5 difficulties, two modes (Good / Arcade with 3 lives), challenge packs,
a Learn/Tutorial system, stats + scoring, 8 themes, drag-multi-select with a radial
mode picker, and a Ban tool.

It's a **pnpm + Turborepo monorepo** (prep for a shared-core native app): the portable
logic lives in `packages/` and the web app is `apps/web`. **Use `pnpm`, not `npm`** (a
`pnpm` shim must be on PATH — `corepack enable --install-directory ~/.local/bin pnpm`).

```
packages/core/       @sudoku/core      engine + scoring + types (pure, zero-dep, own tests)
packages/state/      @sudoku/state     Zustand stores as DI factories + KeyValueStore/ThemeApplier ports
packages/ui-tokens/  @sudoku/ui-tokens portable theme registry
apps/web/            @sudoku/web       the Vite PWA = web adapters + views + thin store-wiring files
```

Packages export **raw TS source** (Vite/tsc bundle them — no build step). `apps/web` keeps
thin wiring files at the original store paths (`src/game/store.ts`, `src/state/*Store.ts`) that
instantiate the shared factories with web adapters, so **consumer imports are unchanged**.

> **The full, current architecture map and a phased improvement roadmap live in
> [`docs/architecture/`](docs/architecture/README.md).** Read `01-overview.md` there
> before a nontrivial change. This file is the quick reference.

## Commands

Run from the repo root (Turborepo fans out across packages; `pnpm --filter @sudoku/web` targets
just the app). Paths below are relative to `apps/web/` unless under `packages/`.

- `pnpm dev` — dev server (http://localhost:5173)
- `pnpm build` — `turbo run build`: typecheck + production build (emits the service worker + manifest)
- `pnpm preview` — serve the build (the **only** way to exercise the service worker)
- `pnpm typecheck` — `turbo run typecheck` across every package
- `pnpm lint` — `turbo run lint` (oxlint)
- `node apps/web/scripts/generate-icons.mjs` — regenerate PWA icons (pure-JS PNG encoder)
- `pnpm gen:challenges` / `pnpm gen:lessons` — regenerate the challenge/lesson data

### Tests — run the tier that matches your change (don't run everything every time)

- `pnpm test:fast` — `turbo run test:fast`: pure logic, **node**. `@sudoku/core` (engine +
  scoring) runs via its own vitest; `apps/web`'s fast tier covers data / utils / platform +
  colocated `*.test.ts` component logic like the board gesture reducer. The default after any
  logic change.
- `pnpm test:ui` — store / state / db / hooks / components in `apps/web`, **jsdom**.
- `pnpm test` (= `turbo run test`) — the whole suite across packages. `pnpm test:coverage` for coverage.
- `pnpm test:visual` — Playwright screenshot smoke + layout assertions (needs `pnpm dev`
  running). Unit tests **cannot** see layout; use this for anything that renders on the phone.
- `pnpm test:gestures` — Playwright **interaction** smoke for the board (tap / double-tap /
  drag / long-press; needs `pnpm dev`). Run it when you touch board input or `boardGestures.ts`
  — jsdom can't hit-test, so this is the only coverage of the reducer↔DOM adapter wiring.

See the full **change-type → test-tier decision table** in
[`docs/architecture/05-testing.md`](docs/architecture/05-testing.md#change-type--test-tier-decision-table).
Rule of thumb: logic change → `test:fast`; store/hooks/components → `test:ui`; layout/theme →
`test:visual` + look at the screenshots; board input → `test:gestures`.

### Testing notes

- `@sudoku/core` tests run **node** (its own `packages/core/vitest.config.ts`). In `apps/web`,
  the fast/ui tier split is in `apps/web/vite.config.ts` under `test.projects`; a
  `// @vitest-environment jsdom` pragma on line 1 also works and is used by existing files.
- Vitest's default reporter buffers output until the run ends in non-TTY shells — a run that
  only shows the `RUN` header is still working, not hung. Give it time.
- Puzzle generation is seedable (`generatePuzzle(difficulty, { seed })`) so tests are
  deterministic. DB tests use `fake-indexeddb` + `__resetDbForTests()`.

## Architecture (the real tree)

Dependency flows top → bottom; the top is pure (shared `packages/`), the bottom is
platform-coupled (`apps/web`). A native app would add `apps/mobile` consuming the same packages.

**`packages/core` (`@sudoku/core`) — pure, dependency-free, React/DOM-agnostic.** Board geometry
& bitmask candidates (`engine/board.ts`), backtracking solver + uniqueness counter
(`engine/solver.ts`), human-technique solver for grading + hints (`engine/techniques.ts`),
generation + grading (`engine/generator.ts`), seedable RNG (`engine/rng.ts`), shared types
(`engine/types.ts` incl. `Mode`/`Difficulty`), pure score computation (`scoring/score.ts`). One
barrel: `@sudoku/core`. Keep it pure — no framework/DOM/storage ever.

**`packages/state` (`@sudoku/state`) — the Zustand stores + the ports they need.** The game
reducer, settings, and ban-confirm are **DI factories** (`createGameStore`/`createSettingsStore`/
`createBanPromptStore`) taking `KeyValueStore`/`ThemeApplier`/`placeDigit` deps; the router
(`uiStore`, a `Screen` enum + back stack — **no react-router**) and `fxStore` (animations) are
dep-free singletons. `SavedGame` (the serialization shape) + `ports.ts` live here. `react` is a
peerDependency.

**`packages/ui-tokens` (`@sudoku/ui-tokens`)** — the portable theme registry (`themes.ts`).

**`apps/web` (`@sudoku/web`) — the Vite PWA: web adapters, views, and store wiring.**
- `src/game/store.ts`, `src/state/*Store.ts` — **thin wiring**: instantiate the `@sudoku/state`
  factories with web adapters (or re-export the singletons). Consumer import paths are unchanged.
  `game/inputActions.ts` holds the shared ban-confirm input gate.
- `src/db/` — **IndexedDB** via `idb` (DB `sudoku`): `savedGames` (resume roster, capped 10),
  `games` (history), `challengeProgress`, `learned`. Only `db/idb.ts` opens the DB (everything
  else uses `getDb()`); `db/repositories.ts` exposes the storage-repo interfaces.
- `src/platform/` — **web adapters implementing the seams a native port swaps**: `haptics.ts`,
  `keyValueStore.ts` + `theme.ts` (implement the `@sudoku/state` ports), `visibility.ts`
  (`AppVisibility`). The generation seam is `workers/client.ts` (`PuzzleGenerator`) — off-thread
  with a sync fallback; the UI calls `generatePuzzleAsync`, never main-thread generation.
- `src/data/` — challenge packs (`challenges/*.json`, lazy) + lesson content.
- `src/screens/` (9 screens), `src/components/` (`Board.tsx` does DOM hit-testing; gesture
  *policy* is the pure `boardGestures.ts` reducer), `src/hooks/` (timer, haptics, save, record,
  fx), `src/theme/themes.css`, `src/utils/`.

## Conventions

- **Keep the engine (and scoring) free of framework/DOM/storage dependencies** so they stay
  unit-testable and portable (a React Native app is a future goal — see
  `docs/architecture/06-ios-migration.md`).
- Difficulty is **technique-based**, not clue-count based (`easy / medium / hard / pro /
  impossible`). If you add a technique to `techniques.ts`, wire its rank into `TECHNIQUES` and
  re-check the grade mapping in `generator.ts`.
- **Styling: one CSS file per component/screen, colocated and imported by it.** A class's
  home is its BEM prefix (`numberpad__*` → `components/NumberPad.css`, `walk__*` →
  `styles/walkthrough.css`). Cross-cutting rules live in `src/styles/`: `base.css` (user-select
  guard, global reduced-motion, shared `fade`/`pop` keyframes), `shell.css` (the game shell +
  docked tray: `.app*`/`.pad-row`), `screens.css` (screen nav chrome: `.screen*`, spinner,
  `screenIn`), `walkthrough.css` (shared `.walk*`). These four load once from `main.tsx`;
  everything else imports its own `.css`. **Never re-declare a selector to override it — edit
  the existing block** (past appends created 4× duplicate selectors). Because selectors are now
  unique per file, cascade is specificity-driven, so import order doesn't matter. Prefer theme
  tokens over hex literals. The old monolithic `App.css` is gone; see
  `docs/architecture/04-styling.md`.
- Make small, focused git commits per milestone.

## Silent-coupling gotchas (easy to break)

- **Challenge progress is keyed by array index** (`${mode}:${difficulty}:${index}`). Regenerating
  the challenge packs (`gen:challenges`) reshuffles indices and **invalidates users' saved
  progress**. Don't regenerate casually.
- **The active-game shape is hand-maintained in three places** that must stay in sync:
  `packages/state/src/game/store.ts` `partialize`, `apps/web/src/hooks/useSaveRoster.ts`
  `serialize`, and the `SavedGame` interface (now in `packages/state`, re-exported by
  `apps/web/src/db/idb.ts`). Adding a field means editing all three.
- **The store cluster is split across the package boundary:** the reducer *logic* + factories
  live in `packages/state`; `apps/web/src/game/store.ts` + `src/state/*Store.ts` are thin wiring
  that inject the web adapters. Change reducer behavior in `packages/state`; change what's
  injected in the `apps/web` wiring. `react` stays a peerDependency there — never a dependency.
