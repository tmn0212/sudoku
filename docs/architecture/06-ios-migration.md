# 06 · iOS / React Native Migration

The owner wants this to become an iOS app "doing React Native or something." This doc is the
grounded strategy. The decision hinges on one measured fact about **this** codebase: the
value-per-line is overwhelmingly in CSS + DOM view code that React Native cannot reuse,
wrapped around a small, clean core that ports untouched.

## What travels, and what doesn't

| Layer | ~LOC | Fate under React Native |
|-------|------|-------------------------|
| `engine/` + `scoring/` + types | ~2,000 | ✅ **Reuse as-is** (pure, zero-dep) |
| Zustand reducers (`store.ts`, `state/`) | ~800 | ✅ **Reuse logic**, swap the storage adapter |
| Hook *logic* (6–7 of 9) | ~350 | ⚠ **Rewire event source** (timers/haptics/save) |
| `App.css` + `index.css` + `themes.css` | ~2,900 | ❌ **Rewrite** (no CSS in RN) |
| `Board.tsx` gesture/hit-test | ~253 | ❌ **Rewrite** (gesture-handler + measured layout) |
| Components + screens (JSX) | ~2,500 | ❌ **Rewrite** (RN primitives) |
| `icons.tsx` (inline SVG) | ~236 | ⚠ **Mechanical port** (react-native-svg) |

Under **Capacitor**, all of the above is reused as-is (it's the same web app in a native
WebView shell).

## The decision

**Ship on Capacitor now. Do the shared-core extraction regardless. Reach for Expo/RN only if
native feel becomes a real product goal.**

| Option | Effort | Reuse | When |
|--------|--------|-------|------|
| **Capacitor shell** (recommended first) | days | ~100% | Get into the App Store now; a 9×9 tap grid is not WebView-hostile UI |
| **Expo / React Native** | weeks | core only | Only if you specifically want native navigation/animations/feel — not to escape a WebView |
| **Stay a PWA** | zero | 100% | Fine baseline while doing the seam work; no App Store, subject to iOS PWA limits |

Rationale: RN means rewriting ~5,000 lines of CSS + JSX to reuse a ~2,000-line core you've
**already** isolated cleanly. Capacitor reuses everything in a WKWebView in days. The seam
work below makes either path cheaper and improves the web app on its own.

## Target architecture — shared-core monorepo

Do this regardless of the native path. pnpm workspaces + Turborepo; Expo has first-class
monorepo support (SDK 53+). **Pitfall:** keep `react` a **peerDependency** in shared
packages, never a dependency, or you get duplicate-React "Invalid hook call".

```
sudoku/
  packages/
    core/         MOVE engine + scoring + types here — pure, zero-dep, carries its tests
    state/        Zustand reducers + PORT INTERFACES (no concrete adapters)
      src/ports/  StoragePort · HapticsPort · ThemePort · GeneratorPort ...
    ui-tokens/    theme registry + JS token map, shared by web & native
  apps/
    web/          today's Vite app = the WEB ADAPTERS (localStorage, idb, DOM theme, PWA)
    mobile/       Expo app (only if Track B) = NATIVE ADAPTERS + RN views
```

## Platform seams to introduce now (while still web-only)

Each is cheap to add today and already 80–90% funneled through one file. Introducing the
interface now means the future port swaps an implementation instead of hunting call sites.

| Seam | Web-welded today | Interface to add | Native adapter |
|------|-----------------|------------------|----------------|
| **Key-value storage** | `createJSONStorage(()=>localStorage)` in `store.ts`, `settingsStore.ts` | `KeyValueStore{get,set,remove}` behind `persist` | MMKV / AsyncStorage |
| **Structured storage** | `db/*.ts` call `getDb()` directly | `SavedGamesRepo`, `StatsRepo`, `ProgressRepo`, `LearnedRepo` | expo-sqlite / op-sqlite |
| **Haptics** | `navigator.vibrate` in `utils/haptics.ts` (already isolated) | `Haptics{tap,error,success}` | expo-haptics |
| **Generation** | Web Worker + sync fallback in `workers/client.ts` (already isolated) | `PuzzleGenerator.generateAsync()` | sync / JS-thread |
| **Theme** | `applyTheme` sets `data-theme`; values in `themes.css` | JS token map (`ui-tokens`) | style-object provider |
| **Navigation** | `state/uiStore.ts` `Screen` enum + stack | keep the enum as the shared contract | react-navigation / expo-router |
| **Visibility/timer** | `document.hidden`, `pagehide` in `useGameTimer`/`useSaveRoster` | `AppVisibility` hook | RN `AppState` |

Cheapest, highest-value first: **Haptics** (90% isolated) and **KeyValueStore** (just change
what you hand `persist`). These are in [Phase 4](phases/phase-4-platform-seams.md).

## What will NOT port (RN only; all reused under Capacitor)

- `App.css` (2,627 lines) — largest single rewrite; 0% reusable in RN.
- `Board.tsx` (253 lines) — DOM pointer/hit-test → gesture-handler + measured layout.
- All components + screens (~2,500 lines JSX) → RN primitives.
- `icons.tsx` (236 lines SVG) → mechanical `react-native-svg` port.
- `index.html` splash, `main.tsx` viewport hacks, `themes.css` — web-only, discarded.

Net for RN: budget a near-total view-layer rewrite (~5,000 lines) to reuse ~2,600 lines of
logic you've already isolated. That asymmetry is exactly why Capacitor is the pragmatic first
move — and why the Phase 4–5 seam work is worth doing regardless of which native path you
pick.
