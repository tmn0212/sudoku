# 05 · Testing Strategy

Goal (owner's words): **not** "run as much test as possible" — that's inefficient. Run the
**right** amount, fast, targeting the bugs that actually slip through, so a Claude session
catches them before the owner has to on a physical iPhone.

The full suite today is **~210 tests / 17 files, ~4.8s** (`npm test`).

## What actually slips past Claude

From the project's own Claude session transcripts (parsed for owner-typed corrections;
~24 distinct bug/correction items), classified:

| Class | Rough fraction | Why it slipped |
|-------|---------------|----------------|
| **(iii) Device-visual / layout / responsive** | **~50%** | Not unit-testable — needs a real viewport / iPhone |
| **(ii) Component / interaction** | **~25%** | Partly testable in jsdom; mostly caught by hand |
| **(i) Pure game-logic / state** | **~15%** | Fully unit-testable — the highest-ROI gap |
| **(iv) PWA / offline / serving** | **~10%** | Needs `preview` + real install |

Representative slips (map to real git fixes):
- iOS-standalone `dvh` / safe-area / "grid grows and cuts when I add notes" — the single
  biggest time sink (one session had 177 mentions of `dvh`). **(iii)**
- Dark-theme crossroad-scan highlight — reported **twice**, still wrong after the first fix. **(iii)**
- Header overflow on long mode names ("Impossible"/"Difficult"). **(iii)**
- Ban-vs-lock regression: a fix broke the ban-confirm popup (git `6a3623e`). **(i)**
- Notes 2 overwriting Notes 1 (git `f6d7176`). **(i)**
- Multi-select: clicking a cell inside the selection should just select that cell. **(ii)**

**The strategic takeaway:** ~half of what reached the owner is device-visual and
**structurally not unit-testable**. Piling on unit tests won't move that. The wins are (a) a
small fixed set of logic/state tests for the bugs that DID slip, and (b) a low-effort visual
smoke harness for the iPhone/dark/short-screen class.

## Current suite & gaps

**Well-covered (fast, node):** `engine/*` (board, solver, techniques + correctness sweep,
generator), `scoring`, `data/lessons` + `challenges`, `utils/haptics`.
**Covered (jsdom):** `game/store.test.ts` (note-layer exclusivity, autoBan → lockedBans,
locked-ban survives undo, multi-select collapse, arcade loss, win-sets-score), `db/*`,
`state/uiStore` + `settingsStore`, `components/game.test.tsx`.

**Gaps, ranked by the bug class they'd guard:**

| Gap | Guards | Today |
|-----|--------|-------|
| Ban-confirm gate (`inputActions.requestDigit` + `banPromptStore`) | (i) — the ban/lock regression | **0 tests** |
| Win/score finalize across all 3 completion paths (`inputDigit`/`applyHint`/`redo`) | (i) — the live `redo` bug | redo path untested |
| Undo/redo invariants for `score`/`mistakes`/`status` | (i) | only `values` tested |
| Bridge hooks `useSaveRoster`, `useRecordGame` | (i)/(ii) — silent resume/record loss | **0 tests** |
| `useCompletionFx` digit/unit-done detection | (ii) | **0 tests** |
| Any viewport/layout/theme assertion | (iii) — half of all slips | **0** |

> **Confirmed live bug (verified in source):** `redo()` (`store.ts:427-443`) recomputes
> `status` but never `score`; `Snapshot` (`store.ts:48-53`) excludes `score/status/mistakes`.
> So win → undo → advance timer → redo restores a stale score. Fixed in
> [Phase 2](phases/phase-2-correctness-and-memory.md); the guarding test is added in Phase 1.

## The tiered testing model

Three tiers so a session runs the cheap, high-signal set by default and only pays for the
rest when relevant.

- **Tier 1 — `test:fast` (default after any logic change).** Pure, node-env, sub-second:
  `engine`, `scoring`, `data`.
- **Tier 2 — `test:ui` (when touching store / state / hooks / components / db).** jsdom, ~3s.
- **Tier 3 — `test:all` + coverage + visual (pre-commit / milestone).**

Wiring (Vitest `projects`) and scripts are specified in
[Phase 1](phases/phase-1-testing-scaffolding.md). Zero-config fallback that works **today**
(the per-file `@vitest-environment jsdom` pragma already routes env):
- Tier 1: `npx vitest run src/engine src/scoring src/data`
- Tier 2: `npx vitest run src/game src/state src/db src/hooks src/components`

## The device-visual gap (be honest)

jsdom has no layout engine (`getBoundingClientRect` returns zeros), so it **cannot** catch
the iOS-standalone / safe-area / short-screen / dark-theme-contrast bugs that dominate the
slips. Minimum viable mitigation (≈1 hour, Phase 1):
1. A tiny Playwright screenshot script (`scripts/visual-smoke.mjs`) using the existing
   harness — 4 fixed shots: iPhone 14 Plus **428×926**, a **short screen** (390×667), **dark
   theme** with crossroad scan, and the **notes/bans-entered** board. Assert 0 console
   errors while capturing. Have the session *look* at the shots.
2. A few headless DOM-layout assertions (Chromium, not jsdom): board is square (±1px), board
   fits within `visualViewport.height`, top bar doesn't overflow with "Impossible".
3. A short on-device checklist (`docs/architecture/ios-checklist.md`) the owner runs after
   layout changes.

## What NOT to test (protect efficiency)

- **Don't** add more engine/solver/technique tests — best-covered area, least likely to reach
  the owner.
- **Don't** snapshot-test render trees / full DOM — brittle, breaks on every restyle, catches
  ~nothing real.
- **Don't** unit-test pixel sizes, animation durations, or FX timings in jsdom — test the
  *decision* (which cells flash), not the duration.
- **Don't** test Zustand/`idb`/Workbox internals — that's library behavior.
- **Don't** chase 100% coverage — it's a map of gaps, not a target. Cover the bridge hooks and
  the ban gate; ignore the rest.

## Change-type → test-tier decision table

| You changed… | Run | Also |
|--------------|-----|------|
| `src/engine/**`, `src/scoring/**`, `src/data/**` | **Tier 1** `test:fast` | If technique ranks changed, re-check `generator.ts` grade mapping |
| `src/game/store.ts`, `inputActions.ts`, `src/state/*Store.ts` | **Tier 2** `test:ui` | If you touched win/score/undo/redo/ban paths, extend the finalize tests |
| `src/hooks/**` | **Tier 2** `test:ui` | These are the untested gap — write the bridge-hook test alongside |
| `src/db/**` | **Tier 2** `test:ui` (fake-indexeddb) | |
| `src/components/**` (behavior) | **Tier 2** `test:ui` | |
| `Board` input / `boardGestures.ts` (tap/drag/long-press/double-tap) | **Tier 1** `boardGestures.test.ts` (reducer) | **+ `test:gestures`** — jsdom can't hit-test, so the adapter needs a real browser |
| `src/platform/**` (seams) | **Tier 1** `test:fast` | Web adapters over navigator/localStorage/DOM |
| `*.css`, `themes.css`, layout/theme in `Board`/`TopBar`/`Cell` | **Tier 3 visual** `test:visual` | Look at the 4 screenshots; check dark + 428×926 + short screen |
| iOS-standalone / `dvh` / `safe-area` / board sizing | `test:visual` **+ on-device checklist** | Unit tests can't see this |
| PWA config / service worker / offline | `npm run build` + `npm run preview` | The only way to exercise the SW |
| Pre-commit / milestone (anything non-trivial) | **Tier 3** `test:all` + coverage + `test:visual` | |

**Rule of thumb:** logic change → `test:fast`. Touch store/hooks/components → `test:ui`.
Touch anything the iPhone renders → screenshots, because that's the half of bugs unit tests
structurally cannot catch.
