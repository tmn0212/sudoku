# Phase 0 · Docs & Config Hygiene

**Status:** DONE (2026-07-12, in working tree — not yet committed)
**Risk:** none · **Effort:** hours · **Depends on:** nothing

> Done: CLAUDE.md + README rewritten to match the real tree; `test:ui` repurposed to the
> jsdom tier and the broken `vitest --ui` script removed; `scripts/` now type-checked via
> `tsconfig.scripts.json` (wired into `npm run typecheck`); coverage widened; PWA update model
> set to `prompt` (keeps the reload toast — safer than mid-game auto-reload) and `json` added
> to the Workbox precache glob; the two silent-coupling gotchas documented in CLAUDE.md.

## Goal

Make the repo legible to fresh humans and Claude sessions, and remove build/config
papercuts. This is the single highest-ROI, lowest-risk work — it compounds across every
future task because sessions start from `CLAUDE.md`.

## Why

`CLAUDE.md` and `README.md` describe a smaller, earlier app. A fresh session gets a wrong
mental model: it thinks state is only in localStorage (there's a whole IndexedDB layer), that
there's one store (there are five), and it will hunt for react-router (there isn't one — the
router is `state/uiStore.ts`). See [`01-overview.md`](../01-overview.md).

## Steps

### 1. Rewrite the `CLAUDE.md` Architecture section — **safe**
Replace the `## Architecture` section so it enumerates the real tree. It must mention:
- `src/engine/` (pure) and the rule that it stays framework/DOM-free.
- `src/scoring/`, `src/data/` (challenge packs + lessons).
- `src/game/store.ts` **and** the four `src/state/` stores (`uiStore` = the router, plus
  `settingsStore`, `fxStore`, `banPromptStore`). Explicitly: **no react-router.**
- `src/db/` = IndexedDB (roster, stats, challenge progress, learned) — persistence is **not**
  localStorage-only.
- `src/workers/` = off-thread generation with a sync fallback (UI calls
  `generatePuzzleAsync`, not `generatePuzzle` directly — don't reintroduce main-thread gen).
- `src/screens/`, `src/components/`, `src/hooks/`, `src/theme/`, `src/utils/`.
- A pointer to `docs/architecture/` for the full map.

Add a short **Styling** note and **Testing** note pointing at
[`04-styling.md`](../04-styling.md) and the
[test decision table](../05-testing.md#change-type--test-tier-decision-table) (so sessions
run the right tier, not everything).

### 2. Fix `README.md` difficulties — **safe**
It says "four difficulties (easy / medium / hard / expert)". The real set is **five**:
`easy / medium / hard / pro / impossible` (`src/engine/types.ts`, `DIFFICULTIES`). Fix the
count and names; `expert` does not exist. Also correct the Architecture tree (same missing
dirs as CLAUDE.md) and the "localStorage persistence" line (add IndexedDB).

### 3. Fix `npm run test:ui` — **safe**
`package.json` defines `"test:ui": "vitest --ui"` but `@vitest/ui` is not a devDependency, so
it fails. Either `npm i -D @vitest/ui`, or remove the script. (Note: Phase 1 repurposes the
name `test:ui` for the jsdom tier — if you do Phase 1 soon, rename this one to
`test:watch:ui` instead.)

### 4. Type-check the `scripts/` — **safe**
`scripts/generate-challenges.ts` and `scripts/generate-lessons.ts` import from `src/engine/*`
but are never type-checked (they're transpile-only via `tsx`), so an engine API change breaks
them silently. Add them to `tsconfig.node.json`'s `include` (or a new `tsconfig.scripts.json`
referenced from the root `tsconfig.json`). Confirm `npm run typecheck` covers them.

### 5. Widen coverage scope — **safe**
`vite.config.ts` sets `coverage.include: ['src/engine/**/*.ts']`, so tested `scoring`,
`store`, `db`, and `state` code reports as 0%. Widen to include those dirs (Phase 1 finalizes
this alongside the tier split).

### 6. Pick one PWA update model — **needs a small decision**
`vite.config.ts` uses `registerType: 'autoUpdate'` (silent skip-waiting reload) but
`ReloadPrompt.tsx` renders a manual "New version → Reload" toast (the `prompt` pattern). They
can fight. Choose one:
- Keep the toast → set `registerType: 'prompt'`.
- Keep auto-update → drop the `needRefresh` branch from `ReloadPrompt.tsx`, keep only the
  "Ready to play offline" notice.

### 7. (Optional) Add an on-device checklist stub — **safe**
Create `docs/architecture/ios-checklist.md` with the ~10-item manual list from
[`05-testing.md`](../05-testing.md#the-device-visual-gap-be-honest). Phase 1 fills it in.

### 8. Document the two silent-coupling gotchas — **safe**
In `CLAUDE.md` (or `docs/architecture/01-overview.md`), note:
- Challenge progress is keyed by array index (`${mode}:${difficulty}:${index}`), so
  **regenerating the challenge packs invalidates users' saved progress**.
- The active-game shape is hand-maintained in three places (`store.ts` partialize,
  `useSaveRoster` serialize, `idb.ts` `SavedGame`) that must stay in sync.

## Verification

- `npm run typecheck` passes (now including `scripts/`).
- `npm run build` passes.
- `npm test` still green.
- Re-read the new `CLAUDE.md` as if fresh: could a new session navigate the tree from it alone?

## Acceptance criteria

- [ ] `CLAUDE.md` Architecture section lists every `src/` dir and names all 5 stores + the
      custom router, and points to `docs/architecture/`.
- [ ] `README.md` shows 5 correct difficulties and mentions IndexedDB.
- [ ] `npm run test:ui` either works or is removed/renamed.
- [ ] `scripts/` are type-checked by `npm run typecheck`.
- [ ] Coverage config includes `scoring`/`game`/`state`/`hooks`.
- [ ] One PWA update model is chosen and the other path removed.

## Suggested commits

1. `docs: rewrite CLAUDE.md + README architecture to match current tree`
2. `chore: fix test:ui dep, type-check scripts, widen coverage scope`
3. `fix(pwa): reconcile update model (autoUpdate vs reload prompt)`
