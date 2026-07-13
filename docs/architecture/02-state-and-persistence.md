# 02 · State & Persistence

There is **no react-router** and there is **more than one store**. This doc is the map.

## The five Zustand stores

| Store | File | Persisted? | Lifetime | Notes |
|-------|------|-----------|----------|-------|
| `useGame` | `game/store.ts` | **localStorage** `sudoku-game` | Active game | 575L, 27 state fields, 20 actions. Reads `useSettings.getState()` at runtime (hidden coupling, `store.ts:301`). |
| `useSettings` | `state/settingsStore.ts` | **localStorage** `sudoku-settings` | Global prefs | Applies theme to DOM (`applyTheme` → `data-theme`). |
| `useUi` | `state/uiStore.ts` | No (in-memory) | Session | **The router.** `Screen` enum + params + back stack. DOM-free, ports directly. |
| `useFx` | `state/fxStore.ts` | No (ephemeral) | Transient | Flash/pop/ghost animation state, module-level timeouts. |
| `useBanPrompt` | `state/banPromptStore.ts` | No (modal) | Transient | Calls `useGame.getState().inputDigit` to confirm a banned entry. |

Cross-store orchestration lives in `game/inputActions.ts` (touches game + settings +
banPrompt) and the bridge hooks `useSaveRoster` / `useRecordGame`.

## What is persisted where

There are **two persistence mechanisms**, and they overlap on the active game.

| Data | localStorage | IndexedDB (`sudoku` db) |
|------|-------------|-------------------------|
| Settings / theme | `sudoku-settings` | — |
| **Active in-progress game** | `sudoku-game` — **full state incl. `past`/`future` undo stacks** (`store.ts:550-572`) | `savedGames` store — **subset, no undo stacks** (`useSaveRoster.ts:18-38`) |
| Saved-game roster (≤10) | — | `savedGames` (cap `MAX_SAVED_GAMES=10`, `savedGames.ts`) |
| Completed-game history | — | `games` (`stats.ts`) |
| Challenge progress / bests | — | `challengeProgress` (`progress.ts`) |
| Learned techniques | — | `learned` (`learned.ts`) |

### Why the double-write is a problem

- **Divergent shapes.** The localStorage copy carries undo/redo history; the IndexedDB copy
  drops it (`loadGame` resets `past:[]`, `future:[]`, `store.ts:245-246`). So **resuming from
  the roster silently loses undo history**, while a page reload (localStorage rehydrate)
  preserves it — inconsistent behavior from the same "resume".
- **Staleness window.** The two can diverge inside the 700ms debounce; `Home.tsx:56-98`
  carries an explicit merge-and-dedupe workaround — a symptom of two sources of truth.
- **Two migration systems.** `persist` version 4 + `migrate` (`store.ts:541-548`) AND IDB
  `DB_VERSION = 2` + `upgrade` (`idb.ts:96-124`). A saved-game shape change must be migrated
  in both.

**Target:** one source of truth for the active game (see Phase 2).

## The game store's responsibilities

`useGame` bundles ~9 concerns. Not a pathological god-object (it's cohesive around one game
session), but large. The `Snapshot` type (`store.ts:48-53`) captures **only**
`values / notes / notesAlt / bans` — **not** `score`, `status`, or `mistakes`. This matters
for undo/redo correctness (see below).

| Concern | State (approx line) | Actions |
|---------|--------------------|---------|
| Puzzle identity/data | `gameId, puzzle, solution, given, difficulty, mode, challenge` (58-65) | `newGame`, `startGame`, `startChallenge`, `restartGame`, `loadGame` |
| Player board (4 layers) | `values, notes, notesAlt, bans, lockedBans` (68-75) | `inputDigit`, `erase`, `autoBanWrong` |
| Selection | `selection, selected` (77-79) | `selectCell`, `setSelection`, `addToSelection` |
| Input mode | `inputMode` (80) | `setInputMode`, `cycleInputMode` |
| Undo/redo | `past, future` (93-94) | `undo` (410), `redo` (427) |
| Hints | `hint` (90) | `requestHint`, `applyHint`, `clearHint` |
| Timer | `elapsedMs` (84) | `tick` (533) |
| Win/loss + scoring | `status, mistakes, hints, score` (83-88) | duplicated inside `inputDigit`, `applyHint`, `redo` |
| Settings mirror | `autoCheck` (89) | `setAutoCheck` |

## Confirmed correctness bug: `redo` doesn't rescore

`redo()` (`store.ts:427-443`) recomputes `won` and sets `status: won ? 'won' : 'playing'` but
**never recomputes `score`**. `undo()` (410-425) sets `status: 'playing'` but also leaves
`score` stale. Because `Snapshot` excludes `score/status/mistakes`, the winning score can be
restored stale (ignoring new elapsed time) on a win → undo → redo sequence. The same
finalize logic is copy-pasted across `inputDigit` (344-368), `applyHint` (509-531), and
`redo` — extract one `finalizeIfDone()` reducer and call it from all three. (Phase 2)

## Platform coupling in this layer (for the RN port)

- **localStorage** — `store.ts:542` and `settingsStore.ts:62` use
  `createJSONStorage(() => localStorage)` (swappable via a storage adapter). But
  `settingsStore.ts:69` reads `localStorage.getItem('sudoku-settings')` **directly** in
  `initSettings()` — not abstracted, will break on RN.
- **IndexedDB** — only `db/idb.ts` imports `idb`/calls `openDB`; every consumer goes through
  `getDb()`. But there's **no repository interface** — IndexedDB-shaped queries
  (`getAllFromIndex`, `transaction().store.put`) leak into all five `db/*.ts` files. Swapping
  to SQLite means rewriting them, not just `idb.ts`. (Phase 4 introduces repos.)
- **Web Worker** — best-isolated boundary; `workers/client.ts` is the sole seam and degrades
  to synchronous `generatePuzzle` when `Worker` is unavailable. One file to swap on RN.
- **DOM** — `settingsStore` → `applyTheme` sets `data-theme`; `useSaveRoster` uses
  `visibilitychange`/`pagehide` (RN uses `AppState`); `fxStore` timings are tuned to CSS
  keyframes.

See [`06-ios-migration.md`](06-ios-migration.md) for the full seam table.
