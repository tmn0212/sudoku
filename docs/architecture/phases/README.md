# Implementation Phases

Sequenced, self-contained work-orders for improving the codebase. Each is designed so the
PWA keeps working throughout, and so a fresh Claude session can pick up a phase and execute
it from the doc alone.

## Sequence

| Phase | Title | Risk | Depends on | Payoff |
|-------|-------|------|-----------|--------|
| [0](phase-0-docs-and-hygiene.md) | Docs & config hygiene | none | — | Legible repo; fewer stale-doc mistakes |
| [1](phase-1-testing-scaffolding.md) | Testing scaffolding | low | 0 | Safety net that makes every later phase verifiable |
| [2](phase-2-correctness-and-memory.md) | Correctness & memory | low | 1 | Fixes a live bug; kills per-second localStorage churn; bounds the DB |
| [3](phase-3-styling-consolidation.md) | Styling consolidation | low (mechanical) | 1 | One small file per component; single-source tokens |
| [4](phase-4-platform-seams.md) | Platform seams | low | 2 | Storage/haptics/theme/gesture ports; RN-ready |
| [5](phase-5-shared-core-monorepo.md) | Shared-core monorepo | medium | 4 | `packages/core` + `state`; enforced boundaries |
| [6](phase-6-native-app.md) | Native app | — | 5 | Capacitor (default) or Expo/RN |

**Phases 0–3 are the maintainability track** and stand on their own — do them even if the
native app never happens. **Phases 4–6 are the iOS track** and build on the seam work.

## How to execute a phase

1. Read the phase doc top to bottom, plus the reference doc(s) it links.
2. Confirm the line-number references against current source (they drift — grep to verify).
3. Do the steps in order. Each step notes whether it's **safe/mechanical** or **needs care**.
4. Run the tests indicated in the phase's "Verification" section — follow the
   [decision table](../05-testing.md#change-type--test-tier-decision-table), not "run everything".
5. Make **small, focused commits per step/milestone** (repo convention). Use the suggested
   commit points in each doc.
6. When the phase is done, set `Status: DONE <short-sha>` at the top of the phase doc.

## Guardrails

- **Never break engine purity.** `src/engine` and `src/scoring` import nothing from React /
  DOM / storage. If a step tempts you to add such an import, that's a design smell — stop.
- **Prefer reversible, incremental steps.** Every phase is ordered so you can stop between
  steps with a working app.
- **Visual changes need eyes, not just green tests.** For anything touching layout/theme, run
  the visual smoke harness (Phase 1) and look at the output; unit tests can't see layout.
