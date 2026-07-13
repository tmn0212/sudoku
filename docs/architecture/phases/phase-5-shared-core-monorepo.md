# Phase 5 · Shared-Core Monorepo

**Status:** TODO
**Risk:** medium (build-system change) · **Depends on:** Phase 4 (seams in place)

## Goal

Extract the portable logic into shared packages behind package boundaries, so a future native
app consumes the same core and the boundaries are enforced by the module graph (not just
convention). This pays off on the web app alone: cleaner boundaries, faster targeted tests.
Target layout in [`06-ios-migration.md`](../06-ios-migration.md#target-architecture--shared-core-monorepo).

Do this **only** after Phases 2 and 4 (Mode moved out of `db/`, seams introduced) — otherwise
you'll drag the persistence layer into `core`.

## Target

```
sudoku/
  package.json / pnpm-workspace.yaml / turbo.json
  packages/
    core/         engine + scoring + types (pure, zero-dep, carries its tests)
    state/        Zustand reducers + the port interfaces from Phase 4
    ui-tokens/    theme registry + tokens.ts
  apps/
    web/          today's Vite app = the web adapters + views
```

## Steps

### 1. Set up the workspace — **needs care**
- Add `pnpm-workspace.yaml` (`packages: ['packages/*', 'apps/*']`) and `turbo.json`
  (pipelines for `build`, `test`, `typecheck`, `lint`).
- Move the current app under `apps/web/` (keep it building at every step — do the move first,
  confirm `npm/pnpm run dev` + `build` + `test` still work, then extract packages).

### 2. Extract `packages/core` — **safe (move + re-point imports)**
Move `src/engine/*` and `src/scoring/*` and the shared `types` into `packages/core/src`. Carry
their `*.test.ts` along. Export a clean public API from `packages/core/src/index.ts` (include
`runTechnique`, `applyStepToState` — the current `engine/index.ts` barrel omits them and is
unused). Re-point `apps/web` imports to `@sudoku/core`.

**Guard:** `core` tests run in node standalone; `apps/web` builds.

### 3. Extract `packages/state` — **needs care**
Move the Zustand reducers (`store.ts`, `state/*`) + the Phase 4 port interfaces into
`packages/state`. The **web adapters stay in `apps/web`** (localStorage, idb, DOM theme) and
are injected. `state` depends on `core` + the port interfaces only.

### 4. Extract `packages/ui-tokens` — **safe**
Move `theme/tokens.ts` + the registry. `apps/web` generates `themes.css` from it; a future
`apps/mobile` reads it directly.

### 5. Peer-dependency hygiene — **needs care (classic pitfall)**
In `packages/state` (and any package importing React), `react` must be a **peerDependency**,
never a dependency — otherwise you get duplicate-React "Invalid hook call" once a second app
consumes it. `core` should have **no** React dependency at all.

## Verification

- `turbo run build test typecheck` green across the workspace.
- `apps/web` runs and behaves identically; the PWA still builds its service worker.
- `packages/core` has zero non-dev dependencies and no React/DOM imports.

## Acceptance criteria

- [ ] Workspace builds via pnpm + Turborepo; `apps/web` unchanged behaviorally.
- [ ] `packages/core` (pure), `packages/state` (reducers + ports), `packages/ui-tokens` exist.
- [ ] `react` is a peerDependency in shared packages; `core` has no React.
- [ ] Tests run per-package; the fast/ui tiers still work (or are re-expressed per package).

## Notes

This is the highest-effort maintainability phase and is **optional if you stay web-only** —
but it's a prerequisite for a clean React Native app (Phase 6, Track B). If you're going the
Capacitor route (Track A), you can skip straight from Phase 3/4 to Phase 6; the monorepo isn't
required for a WebView shell.

## Suggested commits

1. `chore: set up pnpm workspace + turborepo, move app to apps/web`
2. `refactor: extract packages/core (engine + scoring + types)`
3. `refactor: extract packages/state (reducers + ports) and ui-tokens`
