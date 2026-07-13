# Architecture & Maintenance Docs

This folder is the **accurate, current** map of the Sudoku PWA codebase and a sequenced
plan for improving it. It exists because the app roughly doubled in size while the
top-level `CLAUDE.md` / `README.md` still describe an earlier, smaller version. When those
disagree with these docs, **these docs are newer** — but always verify against the source
before acting (line numbers drift).

Produced 2026-07-12 from a multi-agent audit of ~11.3k LOC / 90 files.

## How to use these docs

- **New to the codebase (human or Claude session)?** Read [`01-overview.md`](01-overview.md)
  first — it's the real module map and layering. Then read the reference doc for whatever
  area you're touching.
- **About to implement an improvement?** Go to [`phases/`](phases/README.md). Each phase is
  a self-contained work-order: goal, files, concrete steps, verification, and acceptance
  criteria. Do them roughly in order; each is sequenced so the PWA keeps working throughout.
- **Making any change?** Check the "change-type → which tests to run" table in
  [`05-testing.md`](05-testing.md#change-type--test-tier-decision-table). The project owner
  explicitly does **not** want the full suite run on every change — run the cheap,
  high-signal tier that matches what you touched.

## Reference docs (the "what is")

| Doc | Covers |
|-----|--------|
| [`01-overview.md`](01-overview.md) | The real layering, module map, health scorecard, what's already good |
| [`02-state-and-persistence.md`](02-state-and-persistence.md) | The 5 Zustand stores, the router, and exactly what's persisted where |
| [`03-memory-and-database.md`](03-memory-and-database.md) | Memory footprint on a phone, IndexedDB schema & growth, render efficiency |
| [`04-styling.md`](04-styling.md) | CSS architecture, the `App.css` monolith, duplicate/override inventory, tokens |
| [`05-testing.md`](05-testing.md) | What bugs slip through, the current suite, the tiered testing model, decision table |
| [`06-ios-migration.md`](06-ios-migration.md) | Portability, Capacitor-vs-RN decision, target monorepo, platform seams |

## Phase plan (the "what to do")

See [`phases/README.md`](phases/README.md). Summary:

0. **Docs & config hygiene** — make the repo legible to fresh sessions; fix build papercuts.
1. **Testing scaffolding** — tiered test split + high-value tests + a visual smoke harness.
2. **Correctness & memory** — fix the confirmed `redo` bug; stop the per-second localStorage churn; bound the DB.
3. **Styling consolidation** — dedupe overrides, single-source theme tokens, split `App.css`.
4. **Platform seams** — introduce storage/haptics/theme/gesture ports (cheap now, pays off at port time).
5. **Shared-core monorepo** — extract `packages/core` + `packages/state`.
6. **Native app** — Capacitor (recommended default) or Expo/React Native.

## Conventions for editing these docs

- Keep line-number references but treat them as hints, not gospel — grep to confirm.
- When a phase is completed, note it at the top of that phase doc (e.g. `Status: DONE <commit>`).
- If you discover a doc is stale, fix it in the same PR as the code change that made it stale.
