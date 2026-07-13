# Phase 6 · Native App

**Status:** TODO
**Risk:** — (new surface) · **Depends on:** Phase 3 (Track A) or Phase 5 (Track B)

## Goal

Ship an iOS app. This is a **decision gate**, not a single path. Recommendation and the full
tradeoff analysis are in [`06-ios-migration.md`](../06-ios-migration.md#the-decision).

**Default recommendation: Track A (Capacitor).** A 9×9 tap grid is not WebView-hostile UI,
Capacitor reuses ~100% of the existing app, and it gets you into the App Store in days. Choose
Track B (Expo/React Native) only if native feel (navigation transitions, native animations) is
a real product goal.

---

## Track A — Capacitor (recommended)

**Effort: days. Reuse: ~100%.** Requires only Phases 0–3 (a clean, deduped web app); Phases
4–5 are not needed for a WebView shell.

### Steps
1. `pnpm add @capacitor/core @capacitor/ios` and `npx cap init`.
2. Point `webDir` at the web build output (`apps/web/dist` or `dist`).
3. `npx cap add ios`.
4. Replace the haptics web impl with `@capacitor/haptics` (trivial if Phase 4's `Haptics` port
   exists; otherwise swap the one `utils/haptics.ts` call).
5. Verify offline: the existing Workbox precache works inside the WKWebView. Confirm the app
   launches with no network.
6. Handle iOS specifics: safe-area insets (already handled in CSS via `env(safe-area-inset-*)`),
   status-bar style, splash screen, app icons.
7. Build in Xcode, test on device, submit to the App Store.

### Verification
- App launches offline in the iOS simulator and on a real device.
- Haptics fire natively.
- The [on-device checklist](../ios-checklist.md) passes (layout, notes-don't-grow-grid,
  dark theme, no dead space, no text selection).

### Acceptance criteria
- [ ] iOS app builds and runs from the existing web build.
- [ ] Native haptics work; offline launch works.
- [ ] On-device checklist passes; submitted to TestFlight/App Store.

---

## Track B — Expo / React Native (only if native feel is the goal)

**Effort: weeks. Reuse: core + state only.** Requires Phase 5 (shared-core monorepo). The view
layer is rewritten from scratch; see the
[won't-port list](../06-ios-migration.md#what-will-not-port-rn-only-all-reused-under-capacitor).

### Steps (high level — expand into its own phase set when you commit to this)
1. `apps/mobile` Expo app in the monorepo, consuming `@sudoku/core` + `@sudoku/state` +
   `@sudoku/ui-tokens`.
2. Implement native adapters for the Phase 4 ports: MMKV/AsyncStorage (`KeyValueStore`),
   expo-sqlite/op-sqlite (repos), `expo-haptics` (`Haptics`), a style-object theme provider
   (`ui-tokens`), react-navigation/expo-router mapped to the `Screen` enum, generation via the
   sync path.
3. Rewrite the view layer on RN primitives: `View`/`Text`/`Pressable`, `StyleSheet` from the
   token map, `react-native-gesture-handler` + measured layout for the Board (reuse the Phase 4
   gesture reducer + `radialModeFromPointer`), `Modal` for the radial/overlays,
   `react-native-svg` for `icons.tsx`.
4. Re-express the responsive strategy (container queries + viewport units don't exist in RN) as
   measured layout.

### Verification
- Shared-package tests unchanged; native app drives the same core.
- Feature parity checked against the web app screen by screen.

### Acceptance criteria
- [ ] `apps/mobile` runs on iOS using the shared core/state/tokens.
- [ ] All ports have native adapters; no web APIs referenced in mobile code.
- [ ] Feature parity with the PWA.

---

## Which track?

| If you want… | Pick |
|--------------|------|
| App Store presence fast, minimal new code, keep one codebase | **Track A (Capacitor)** |
| Native navigation/animation feel, willing to spend weeks, dislike WebViews | **Track B (Expo/RN)** |
| To decide later | Do Phases 0–4 now (they help both + the web app), defer the gate |

The web PWA keeps shipping regardless of which track you pick or when.
