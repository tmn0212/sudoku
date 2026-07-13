# Phase 2 · Correctness & Memory

**Status:** DONE (2026-07-12, in working tree) — steps 1,2,3,5,6 landed; steps 4 & 7 deferred (optional)
**Risk:** low · **Effort:** ~half a day · **Depends on:** Phase 1 (for the guarding tests)

> Done: `finalizeIfDone()` is now the single win/score reducer, called from `inputDigit`,
> `applyHint`, `undo`, and `redo` — the `redo` rescore bug is fixed and `undo` no longer leaves
> a stale finished score (it also no longer lets you undo out of an arcade loss). Undo history
> is dropped from `partialize` (no more per-tick re-serialize of up to 200 snapshots) and
> `MAX_HISTORY` lowered 200 → 50. `games` history is capped at `MAX_GAME_RECORDS = 2000` with
> oldest-eviction. `Mode` moved to `engine/types.ts` (pure code no longer imports it from
> `db/idb`). Deferred as optional: step 4 (single-pass `getStats` — pruning already bounds it)
> and step 7 (passing `autoCleanupNotes` in as an arg).

## Goal

Fix a confirmed live bug, stop the per-second localStorage churn, bound the database growth,
and remove the layering inversion — all small, high-value, low-risk changes. Background in
[`02-state-and-persistence.md`](../02-state-and-persistence.md) and
[`03-memory-and-database.md`](../03-memory-and-database.md).

## Steps

### 1. Fix the `redo` rescore bug + de-duplicate finalize — **needs care (logic)**
Confirmed in source: `redo()` (`store.ts:427-443`) recomputes `status` from `isWin` but never
`score`; `undo()` (410-425) leaves `score` stale; the same finalize logic is copy-pasted in
`inputDigit` (344-368) and `applyHint` (509-531). Extract one pure helper and call it from all
three sites:

```ts
// returns the win/score fields to merge into state after a board change
function finalizeIfDone(values: Grid, solution: Grid, meta: {
  elapsedMs: number; mistakes: number; hints: number; difficulty: Difficulty; mode: Mode;
}): { status: Status; score: number } { /* isWin → computeScore, else status:'playing' */ }
```

- `inputDigit`, `applyHint`, `redo` all call it after computing new `values`.
- Decide undo semantics explicitly and encode them: win → undo ⇒ `status:'playing'`,
  `score:0`. (Currently score is left stale.)
- This makes the Phase 1 `redo` finalize test go **green**.

**Guard:** `npm run test:ui` (touches the store). The finalize tests from Phase 1 must pass.

### 2. Single-source the active game + stop persisting undo stacks — **needs care**
The active game is written to **both** localStorage (full state incl. `past`/`future`) and
IndexedDB `savedGames` (subset). Pick one source of truth. Recommended minimal change that
also fixes the memory issue:

- **Drop `past` and `future` from `partialize`** (`store.ts:570-571`). Undo-across-reload is a
  rarely-expected feature; if you want to keep a little, cap the persisted history to ~10–20.
- **Stop the per-tick write:** remove `elapsedMs` from `partialize` and instead persist
  elapsed time only on `visibilitychange`/`pagehide` (where `useSaveRoster` already flushes),
  or wrap the storage in a debounce. This kills the ~1 write/sec of the whole state.
- Result: `sudoku-game` payload drops from up-to-453 KB to ~2.5 KB and stops churning.

If you go further and make IndexedDB `savedGames` the **only** source of truth for
in-progress games (dropping `persist` from `useGame` entirely), also remove the
`Home.tsx:56-98` merge/dedupe workaround and reconcile the two migration systems. That's a
bigger change — the minimal version above captures most of the value.

**Guard:** `npm run test:ui`. Add/keep a test asserting the persisted payload excludes
`past`/`future`. Manually verify reload still restores an in-progress game.

### 3. Bound the `games` (stats history) store — **safe**
`games` is never pruned (`stats.ts`). Add eviction on insert: after `recordGame`, if the store
exceeds N (e.g. 2,000), delete the oldest by the `by-completedAt` index — mirror the
`savedGames` trim in `savedGames.ts:17-22`. Bump `DB_VERSION` only if you change the schema
(you don't need to for pruning).

**Guard:** `npm run test:ui` (extend `db/stats.test.ts`): inserting N+K records leaves exactly
N, oldest gone.

### 4. Make `getStats` cheaper — **safe (optional, do if stats feel slow)**
`getStats` (`stats.ts:138-142, 67-134`) does `getAll` + ~8–10 passes. Either single-pass
`computeStats`, or maintain a rolling aggregate updated in `recordGame`. Low urgency below a
few thousand games; pruning (step 3) caps the worst case anyway.

### 5. Lower `MAX_HISTORY` — **safe**
`store.ts:122`: 200 → ~50. No UX loss; quarters worst-case undo heap (~1.5 MB → ~0.4 MB).

**Guard:** `npm run test:ui` — undo/redo tests still pass.

### 6. Move `Mode` out of the persistence layer — **safe (mechanical)**
`Mode = 'good' | 'arcade'` is declared in `db/idb.ts:11` and imported by pure code
(`scoring/score.ts:8`, `game/store.ts:26`, `useStartChallenge.ts:8`). Move it to
`src/engine/types.ts` (next to `Difficulty`) and have `idb.ts` import it from there. Removes
the layering inversion and unblocks lifting `scoring` into a shared package (Phase 5).

**Guard:** `npm run typecheck` + `npm run test:fast` (scoring) + `npm run test:ui`.

### 7. (Optional) Pass `autoCleanupNotes` in as an argument — **safe**
`inputDigit` reaches into `useSettings.getState().autoCleanupNotes` (`store.ts:301`) — a
hidden cross-store dependency. Pass it from the `inputActions` orchestration layer instead, so
the game store stays self-contained and unit-testable.

## Verification

- `npm run test:ui` green, including the Phase 1 `redo` finalize test (now passing) and the
  new persisted-payload + stats-pruning tests.
- `npm run test:fast` green (scoring unaffected by the `Mode` move).
- Manual: play a game, reload → it restores; win → undo → redo → score is correct and status
  is `won`.
- Optional: in devtools, confirm `localStorage['sudoku-game']` no longer grows with undo depth
  and isn't rewritten every second.

## Acceptance criteria

- [ ] `finalizeIfDone()` exists and is the only place win/score is computed; `redo` rescores.
- [ ] `past`/`future` are no longer persisted; localStorage isn't rewritten every tick.
- [ ] `games` store is capped with oldest-eviction.
- [ ] `MAX_HISTORY` lowered.
- [ ] `Mode` lives in `engine/types.ts`; `db/idb.ts` imports it.

## Suggested commits

1. `fix(store): rescore on redo via a single finalizeIfDone helper`
2. `perf(store): stop persisting undo stacks and per-tick state to localStorage`
3. `perf(db): cap completed-games history with oldest-eviction`
4. `refactor: move Mode type into engine/types.ts (fix layering inversion)`
