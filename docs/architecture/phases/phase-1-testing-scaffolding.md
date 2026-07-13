# Phase 1 · Testing Scaffolding

**Status:** DONE (2026-07-12, in working tree — not yet committed)
**Risk:** low · **Effort:** ~half a day · **Depends on:** Phase 0 (recommended)

> Done: three-tier split wired via Vitest `projects` (`test:fast` node / `test:ui` jsdom /
> `test:all`) + coverage widened. Added `src/game/inputActions.test.ts` (ban-confirm gate,
> incl. lockedBans != user-bans), extended `store.test.ts` with the win-score guard and an
> `it.fails` marker for the `redo` rescore bug (flip to `it` when Phase 2 lands),
> `useSaveRoster.test.tsx` + `useRecordGame.test.tsx` (bridge hooks), and `scripts/visual-smoke.mjs`
> (4 viewport screenshots + layout tripwires, verified green against the dev server). Suite:
> 211 → 223 tests. `docs/architecture/ios-checklist.md` was already filled in.

## Goal

Build an **efficient** test setup: tiered so sessions run cheap high-signal tests by default,
plus ~6 targeted tests that would have caught the bugs that actually slipped, plus a
low-effort visual smoke harness for the device-visual class. Full rationale and the transcript
findings are in [`05-testing.md`](../05-testing.md).

## Why

~50% of bugs that reached the owner are device-visual (not unit-testable), ~15% are pure
logic/state that were fully testable but untested. This phase targets both without bloating
the suite — respecting the owner's "don't run everything every time" constraint.

## Steps

### 1. Split the suite into tiers via Vitest `projects` — **needs care (config)**
Replace the single-env `test` block in `vite.config.ts`. Keep the per-file
`@vitest-environment jsdom` pragma working, but make the split explicit and glob-addressable:

```ts
test: {
  globals: true,
  css: true,
  projects: [
    { extends: true, test: {
      name: 'fast', environment: 'node',
      include: ['src/engine/**/*.test.ts', 'src/scoring/**/*.test.ts', 'src/data/**/*.test.{ts,tsx}'],
    }},
    { extends: true, test: {
      name: 'ui', environment: 'jsdom', setupFiles: ['./src/test/setup.ts'],
      include: ['src/game/**/*.test.{ts,tsx}', 'src/state/**/*.test.ts',
                'src/db/**/*.test.ts', 'src/hooks/**/*.test.{ts,tsx}',
                'src/components/**/*.test.tsx', 'src/utils/**/*.test.ts'],
    }},
  ],
  coverage: {
    provider: 'v8',
    include: ['src/engine/**', 'src/game/**', 'src/scoring/**', 'src/hooks/**', 'src/state/**'],
    reporter: ['text', 'html'],
  },
},
```

Add scripts to `package.json`:
```jsonc
"test:fast":  "vitest run --project fast",
"test:ui":    "vitest run --project ui",
"test:all":   "vitest run",
"test:cov":   "vitest run --coverage",
"test:visual":"node scripts/visual-smoke.mjs"
```
Rename the existing Vitest-UI script to `"test:watch:ui": "vitest --ui"` to free the name.

Verify: `npm run test:fast` runs only engine/scoring/data in node (sub-second);
`npm run test:ui` runs the rest in jsdom; `npm run test:all` matches the old count (~210).

### 2. Add the high-value logic/state tests — **safe (additive)**
Each is sub-second. Write the test **first** where it exposes a live bug (it should fail),
then Phase 2 makes it pass.

- **`src/game/inputActions.test.ts`** (jsdom) — the ban-confirm gate:
  - user ban on target cell + `warnOnBanned` on + mode ≠ ban → `requestDigit(d)` does **not**
    place; `useBanPrompt.getState().digit === d`; `confirm()` then places it.
  - `warnOnBanned` off → places immediately, no prompt.
  - in `ban` mode → never prompts.
  - **lockedBan** on the cell → digit blocked with **no** prompt (proves lockedBans ≠ user
    bans at the gate).
- **Extend `src/game/store.test.ts`** — win/score finalize across all three completion paths
  (`inputDigit`, `applyHint`, and **`redo`** via win → undo → redo). Assert `status==='won'`
  **and** `score>0` in all three. **The `redo` case fails today** (live bug) — leave it
  failing until Phase 2, or mark `.fails`/`todo` and flip it in Phase 2.
  - Also pin undo invariants: win → undo ⇒ `status==='playing'` and `score===0`; document
    whether undo restores `mistakes` (it currently does not).
- **`src/hooks/useSaveRoster.test.tsx`** (jsdom + `fake-indexeddb/auto`, mirror
  `db/savedGames.test.ts`): pristine game saves nothing; after a real entry + debounce flush,
  `listSavedGames()` has it; `playing→won` deletes it from the roster.
- **`src/hooks/useRecordGame.test.tsx`**: records exactly once on end; does not re-record on
  re-render while ended; resets and can record again after `newGame`; challenge game also
  calls `recordChallengeResult`.
- **(Optional) `useCompletionFx`** — extract the pure `digitDone`/`unitDone` predicates and
  test them directly (a digit with one wrong copy is not done; last correct copy flips
  false→true once).

### 3. Add the visual smoke harness — **safe (new script)**
Create `scripts/visual-smoke.mjs` using the existing Playwright setup (see the
`visual-verification-harness` project memory: chromium path, `window.__stores`, seeding).
Against `npm run dev`, drive the stores and capture **4 shots** to the scratchpad:
1. iPhone 14 Plus **428×926** — Game screen (seed a medium arcade game).
2. Short screen **390×667** — assert the board isn't cut off.
3. **Dark theme** with the crossroad scan active (the thing that regressed twice).
4. Board after entering notes + bans (the "grid grows and cuts" case).

While capturing, assert `pageerror`/console-error count is 0. The script's job is to produce
images a session can *look at* — pixel-diffing is optional.

### 4. Add headless DOM-layout assertions — **safe**
A small Playwright/Chromium check (not jsdom): board is square (`width===height` ±1px), board
fits within `visualViewport.height`, top-bar text doesn't overflow (`scrollWidth<=clientWidth`)
with the longest mode name ("Impossible"). Wire into `test:visual`.

### 5. Fill in the on-device checklist — **safe**
Complete `docs/architecture/ios-checklist.md`: install to home screen, rotate, enter notes
(grid must not grow/cut), no dead space at bottom, no text selection on long-press, dark-theme
crossroad visible, header not clipped on "Impossible".

## Verification

- `npm run test:fast` sub-second, node only.
- `npm run test:ui` green (except the intentionally-failing `redo` test if you left it red).
- `npm run test:all` ≈ prior count + new tests.
- `npm run test:visual` produces 4 screenshots + 0 console errors.

## Acceptance criteria

- [ ] Three tiers wired (`test:fast` / `test:ui` / `test:all`) + coverage widened.
- [ ] Ban-confirm gate tests exist and pass (after Phase 2 or with the gate already correct).
- [ ] `redo` rescore test exists (red now, flips green in Phase 2).
- [ ] `useSaveRoster` + `useRecordGame` bridge-hook tests exist and pass.
- [ ] `scripts/visual-smoke.mjs` produces the 4 shots and asserts 0 console errors.
- [ ] `docs/architecture/ios-checklist.md` is filled in.

## Suggested commits

1. `test: split suite into fast/ui tiers + widen coverage`
2. `test: add ban-gate, finalize, and bridge-hook tests`
3. `test: add Playwright visual smoke harness + layout assertions`
