# 01 · Codebase Overview

The real, current architecture of the Sudoku PWA. Read this first.

## What the app actually is

An offline-first Sudoku PWA with far more than the core game: **5 difficulties**
(`easy / medium / hard / pro / impossible` — note the top-level README still says four and
names a non-existent `expert`), two play modes (`good` / `arcade` with 3 lives), a
challenge-pack system (240 puzzles × 2 modes), a Learn/Tutorial system with step-through
technique lessons, stats + scoring, 8 themes, drag-multi-select with a radial mode picker,
and a "ban" tool. Generation runs off the main thread in a Web Worker with a synchronous
fallback.

## Layering (dependency flows top → bottom)

```
src/engine/       pure domain — board · solver · techniques(1026L) · generator · rng   [zero deps, RN-safe]
src/scoring/      score.ts — pure, BUT imports Mode from db/idb  ⚠ layering inversion
src/data/         challenge packs (lazy JSON) · lessons
      │
src/game/store.ts the game reducer — 575L, 27 state fields, 20 actions   [persist → localStorage]
src/state/        4 more Zustand stores: uiStore(router) · settings · fx · banPrompt
      │
src/db/           IndexedDB via `idb` — savedGames · games(stats) · challengeProgress · learned  [web-only]
src/workers/      off-thread generation + graceful sync fallback   [web-only]
      │
src/hooks/        9 side-effect hooks (timer · haptics · save · record · pops · completion fx)
src/components/   17 components — Board.tsx does DOM hit-testing   [web-welded]
src/screens/      9 screens — currently reach directly into stores + engine + db
src/theme/        themes.ts (registry) + themes.css (values)
App.css (2627L)   one global stylesheet + index.css + themes.css   [web-only]
```

**The golden rule to preserve:** `src/engine` and `src/scoring` must stay pure — no React,
no DOM, no `window`/`localStorage`/`idb`. This is what makes the core testable and portable.
Verified clean today (every `engine/` file imports only sibling engine files). Don't
regress it.

## Directory reference

| Dir | Role | Portable to React Native? |
|-----|------|---------------------------|
| `src/engine/` | Pure Sudoku logic (geometry, solver, techniques, generator, RNG) | ✅ as-is |
| `src/scoring/` | Score computation | ✅ (after moving `Mode` out of `db/`) |
| `src/data/` | Challenge packs (JSON) + lesson content | ✅ data; loader needs adapting |
| `src/game/store.ts` | Main game reducer (Zustand + `persist`) | ✅ logic; swap storage adapter |
| `src/state/` | `uiStore` (router), `settingsStore`, `fxStore`, `banPromptStore` | ✅ logic; swap storage/DOM bits |
| `src/db/` | IndexedDB persistence (roster, stats, progress, learned) | ❌ rewrite (see seams) |
| `src/workers/` | Off-thread generation + fallback | ⚠ swap the one client file |
| `src/hooks/` | Side-effect hooks (6–7 of 9 portable) | ⚠ rewire event sources |
| `src/components/`, `src/screens/` | React view layer | ❌ full rewrite in RN |
| `src/theme/` | Theme registry + CSS values | ⚠ extract values to a JS token map |

## Health scorecard

| Layer | Grade | One-line |
|-------|-------|----------|
| engine / scoring | **A** | Pure, DAG-clean, seeded, soundness-swept. Ports as-is. |
| state / stores | **B+** | 5 stores split by lifetime — coherent; minor cross-store leaks. |
| persistence | **C** | Active game written twice; per-second localStorage churn; `games` store unbounded. |
| components / screens | **B** | Clean React, but no container/presentational split. |
| styling (CSS) | **C−** | 2,627-line monolith edited by override-by-append. |
| build / PWA | **B** | Healthy pipeline; a few config smells (`test:ui`, coverage scope). |
| docs (`CLAUDE.md`) | **D** | Significantly stale — the top AI-legibility fix (Phase 0). |

## What's already right (do not regress)

- **Engine purity is real.** No framework/DOM/storage anywhere in `engine/`; data model is
  `Grid = number[]` + a bitmask for candidates — JSON-serializable, no `any`.
- **Platform boundaries funnel through single files.** IndexedDB is only opened in
  `db/idb.ts`; the worker lives behind `workers/client.ts` with a working sync fallback;
  haptics is one `navigator.vibrate` call in `utils/haptics.ts`. These are ready-made seams.
- **Stores split by lifetime, not at random** (persisted game / persisted settings /
  ephemeral fx+prompt / in-memory router). The router (`state/uiStore.ts`) is hand-rolled and
  DOM-free, so it ports directly — there is **no** react-router; don't look for one.
- **The engine is seriously tested** — a 120-seed × 5-difficulty soundness sweep
  (`techniques.correctness.test.ts`) asserts no technique ever places a wrong digit or
  eliminates a true candidate.
- **Render hygiene is good** — `Cell` is `memo`-ized, hooks clean up their listeners/timers,
  the worker is reused (not re-spawned), code-splitting is real (screens + challenge packs
  are lazy chunks).

## Known cross-cutting issues (detailed in the area docs)

- **`Mode` type lives in `db/idb.ts`** and is imported by pure `scoring`/`store` code — a
  layering inversion. Fix: move it to `engine/types.ts`. (Phase 2)
- **The active game is persisted twice** — localStorage (full state incl. undo stacks) and
  IndexedDB (subset). Divergent shapes; roster-resume drops undo history. (Phase 2)
- **`App.css` defines the same selectors up to 4×** via append-and-override. (Phase 3)
- **No container/presentational split** — screens run the solver inline and import `db/`
  directly. (Phase 4+)
