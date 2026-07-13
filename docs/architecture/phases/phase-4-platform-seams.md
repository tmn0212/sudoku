# Phase 4 · Platform Seams

**Status:** TODO
**Risk:** low · **Depends on:** Phase 2 (Mode moved), Phase 3 (theme tokens extracted)

## Goal

Introduce the platform-abstraction interfaces **while still web-only**, so a future native
port swaps an implementation instead of hunting call sites. Each seam is already 80–90%
funneled through one file. Full seam table in
[`06-ios-migration.md`](../06-ios-migration.md#platform-seams-to-introduce-now-while-still-web-only).

Nothing here changes user-visible behavior — it's pure indirection. Do the two cheapest first
(**Haptics**, **KeyValueStore**); the rest can follow as you touch those areas.

## Steps

### 1. Haptics port — **safe (already 90% isolated)**
`utils/haptics.ts` is one `navigator.vibrate` call. Define an interface and inject the impl:
```ts
export interface Haptics { tap(): void; error(): void; success(): void }
```
Web impl wraps the current `navigator.vibrate` bodies. Consumers (e.g. `useGameFeedback`)
depend on the `Haptics` interface, not `navigator`. Native later provides an `expo-haptics`
impl.

**Guard:** `npm run test:ui` (haptics test still passes).

### 2. KeyValueStore port — **safe**
Both persisted stores use `createJSONStorage(() => localStorage)` (`store.ts:542`,
`settingsStore.ts:62`). Introduce:
```ts
export interface KeyValueStore { getItem(k): string|null; setItem(k,v): void; removeItem(k): void }
```
Provide a web adapter over `localStorage` and hand it to `createJSONStorage`. Also fix the
one direct read: `settingsStore.ts:69` calls `localStorage.getItem('sudoku-settings')`
directly in `initSettings()` — route it through the adapter. Native later provides
MMKV/AsyncStorage.

**Guard:** `npm run test:ui` (settings + store persistence tests).

### 3. Structured-storage repositories — **needs care**
`db/*.ts` leak IndexedDB-shaped queries (`getAllFromIndex`, `transaction().store.put`) to call
sites. Define intent-level interfaces:
```ts
interface SavedGamesRepo { list(): Promise<SavedGame[]>; upsert(g): Promise<void>; delete(id): Promise<void> }
// + StatsRepo, ProgressRepo, LearnedRepo
```
The current `idb` code implements them (keep `getDb()` as the web driver). Screens/hooks
depend on the repo interface. Native later implements the same interfaces over
expo-sqlite/op-sqlite.

**Guard:** `npm run test:ui` (the `db/*` tests, now exercising the repo methods).

### 4. Generation port — **safe (already isolated)**
`workers/client.ts` already is this seam (uniform `Promise<Puzzle>`, sync fallback). Just
formalize the interface `PuzzleGenerator { generateAsync(difficulty, opts): Promise<Puzzle> }`
so a native impl (sync or JS-thread) can drop in.

### 5. Theme provider port — **safe (builds on Phase 3)**
Phase 3 produced `tokens.ts`. Split `theme/themes.ts` into the portable registry vs. the web
`applyTheme` (which sets `data-theme`). Web reads tokens → CSS; native later reads the same
`tokens.ts` object into a style-object provider.

### 6. Visibility/timer port — **safe**
`useGameTimer` (`document.hidden`, `performance.now`) and `useSaveRoster`
(`visibilitychange`/`pagehide`) are web-bound. Wrap the event source in an `AppVisibility`
hook so the native version swaps to RN `AppState` without touching the timer/save logic.

### 7. (Optional) Extract the Board gesture policy — **needs care**
`Board.tsx` mixes gesture *policy* (450ms long-press, 8px drag threshold, double-tap timing,
the idle/pending/drag/radial state machine) with DOM plumbing (`elementFromPoint`,
`data-index`, `setPointerCapture`). Extract a framework-agnostic gesture reducer that takes a
normalized `{x,y}` + an injectable `hitTest(x,y)→index`. Inject `elementFromPoint` on web now;
this makes the logic unit-testable immediately and swappable for measured-rect hit-testing in
RN. `radial.ts:radialModeFromPointer` is already pure — reuse it.

**Guard:** add a unit test for the gesture reducer (now possible without jsdom).

## Verification

- All existing tests still green — these are behavior-preserving refactors.
- `npm run typecheck` clean.
- App behaves identically (haptics, persistence, theming, generation, timer all unchanged).

## Acceptance criteria

- [ ] `Haptics` and `KeyValueStore` interfaces exist with web adapters; no consumer touches
      `navigator`/`localStorage` directly (including `settingsStore.initSettings`).
- [ ] `db/*` expose repository interfaces; call sites use them, not raw `idb` queries.
- [ ] Generation, theme, and visibility seams are formalized.
- [ ] (Optional) Board gesture policy is a testable reducer with an injected hit-test.

## Suggested commits

1. `refactor: introduce Haptics + KeyValueStore ports (web adapters)`
2. `refactor(db): expose repository interfaces over idb`
3. `refactor: formalize generation/theme/visibility seams`
4. `refactor(board): extract gesture policy into a testable reducer`
