# 03 · Memory & Frontend Database

Focus: memory footprint on the owner's iPhone (Safari + installed PWA) and how the
IndexedDB "database" operates. Figures below are measured (gzip of real `dist/` chunks,
`JSON.stringify` byte counts of modeled payloads) or computed from the code.

## Verdict

**Healthy for a phone, with one wasteful hot path and one unbounded store to watch.**
Nothing here will OOM an iPhone or blow the ~5MB localStorage cap. The two things worth
fixing: (1) the game store rewrites the **entire undo history** to localStorage roughly
**once per second** during play, and (2) the completed-`games` IndexedDB store is **never
pruned** and `getStats` loads the whole thing into memory. Both are trivially bounded. See
[Phase 2](phases/phase-2-correctness-and-memory.md).

## Runtime memory findings

### HIGH (waste): undo stacks persisted to localStorage every ~1s
- `MAX_HISTORY = 200` (`store.ts:122`). Each `Snapshot` = 4 arrays × 81 entries
  (`values/notes/notesAlt/bans`; `lockedBans` is not snapshotted).
- Both `past` and `future` are in `partialize` (`store.ts:570-571`) → localStorage carries up
  to **400 snapshots**.
- Measured serialized `sudoku-game` payload: fresh ≈ **2.47 KB**; per snapshot ≈ **1.13 KB**;
  realistic mid-game (~40 undo steps) ≈ **47.5 KB**; worst case (200+200) ≈ **453 KB**.
- **The frequency is the real cost:** Zustand `persist` writes the full partialized state
  synchronously on every `set()`, and `tick` (`store.ts:533-537`) calls `set({elapsedMs})`
  every 1s (`useGameTimer.ts:16`). So the whole undo history is re-`JSON.stringify`-d and
  written to localStorage **~1×/sec** even though a tick changes nothing in it.
- Cap risk: **none** (worst case ~0.45 MB « 5 MB). Runtime heap for 400 snapshots ≈ **1–1.5 MB**.

### LOW: worker held alive for app lifetime
- `client.ts` creates **one** module-level worker and reuses it (good — no per-generation
  spawn), but never `terminate()`s it. A second JS realm (~17KB chunk) stays resident. A few
  MB; acceptable.

### CLEAN: listener/timer hygiene
- `useKeyboard`, `useSaveRoster`, `useGameTimer`, `useAutoBanWrong` all clean up their
  listeners/timers on unmount. `fxStore` timeouts self-clear and the `ghosts` array is
  filtered back down. `main.tsx` singleton listeners live for app lifetime (fine). **No leaks
  found.**

## Render efficiency

- **`Cell` is memoized** (`Cell.tsx:120`, `memo`) with all-primitive props → shallow compare
  works. A single digit entry does **not** blindly re-render all 81 cells' DOM.
- Board legitimately re-renders dozens of cells because same-number highlight, cross-hatch
  (`crossSet`), and note highlight all key off the selected digit — inherent to those
  features, not waste.
- Per-keystroke work in Board is O(81) and cheap, `useMemo`-gated on `values`
  (`findConflicts`, the two `crossSet` loops). **No per-render puzzle solve** — `findStep`
  runs only on explicit hint request. NumberPad `remaining` is a single memoized 81-cell pass.
- Minor: `stats.ts` exports `bestScore` with no live caller (dead-ish; harmless).

## IndexedDB schema

DB `sudoku`, **`DB_VERSION = 2`** (`idb.ts:95-96`). Four object stores:

| Store | Key | Indexes | Written by | Growth | Bound |
|-------|-----|---------|-----------|--------|-------|
| **`games`** (completed history) | `id` autoInc | `by-completedAt`, `by-mode-difficulty`, `by-score` | `recordGame` on every win/loss | **UNBOUNDED — never pruned** | ❌ none |
| **`savedGames`** (resume roster) | `id` (string) | `by-updatedAt` | `saveGame` (debounced) | BOUNDED — `MAX_SAVED_GAMES=10`, oldest evicted | ~24 KB |
| **`challengeProgress`** | `mode:diff:index` | `by-mode-difficulty` | `recordChallengeResult` | BOUNDED — 1 row/puzzle/mode | ≤ 480 rows |
| **`learned`** | `id` (technique) | — | `markLearned` | BOUNDED — 1 row/technique | tiny |

**Only `games` is unbounded.** Per-record ≈ **133 B**. A heavy player at 10 games/day ≈
3,650/yr ≈ **~0.5 MB/yr** serialized — storage is a non-issue for years. The cost surfaces in
**queries**, not storage:

- `getStats` (`stats.ts:138-142, 67-134`) does `getAll` then ~8–10 passes (sort-copy + per-
  difficulty filters + reduces) over the **whole** store. At ~10k records that's ~1.37 MB
  loaded transiently per stats view. Fine below a few thousand games; only ever grows.

## Persistence / eviction

- `requestPersistentStorage()` (`idb.ts:134-142`) is called once on mount (`App.tsx:48-51`)
  as best-effort protection against eviction of the user's stats/history. Good.

## Bundle / parse cost (mobile)

Main JS ≈ **255 KB** (~80 KB gzipped), CSS ≈ **43 KB**, a lazy `learned` lesson chunk ≈
**24 KB**, worker ≈ **17 KB**. Code-splitting is real: all secondary screens and the 5
challenge packs are lazy chunks. Initial parse is a non-issue on modern hardware.

## Prioritized fixes (→ Phase 2)

1. **Stop persisting undo stacks to localStorage** — drop `past`/`future` from `partialize`
   (biggest win, tiny change). Shrinks payload from ≤453 KB to ~2.5 KB and kills the
   per-second history re-serialize.
2. **Don't persist-write on every tick** — exclude `elapsedMs` from `partialize` (persist
   elapsed only on `visibilitychange`/`pagehide`, where the roster already flushes), or
   debounce the storage adapter.
3. **Cap/prune the `games` store** — keep the most recent N (e.g. 2,000) and evict oldest by
   `by-completedAt` on insert (mirror the `savedGames` trim), or maintain a rolling aggregate.
4. **Make `getStats` single-pass / incremental** — or read via the `by-completedAt` index
   with a cap. Not urgent below a few thousand games.
5. **Lower `MAX_HISTORY`** 200 → ~50 — no UX loss; quarters the worst-case heap and payload.
