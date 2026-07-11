# Sudoku solving techniques — catalog & app coverage

A reference for the human solving techniques that exist, and which ones this app
**uses** (in the solver, hint engine, and difficulty grading) and **teaches**
(as interactive Learn-tab lessons).

The canonical references are HoDoKu (≈70 techniques) and Andrew Stuart's
SudokuWiki (grouped into Basic / Tough / Diabolical / Extreme families). See
Sources at the bottom.

## What the app implements (21 techniques)

Every technique below is used by the engine — it drives hints and the
technique-based difficulty grade — and, except for two rare patterns, ships as an
interactive lesson with an engine-verified example plus a practice puzzle.

Difficulty rank drives the 5 tiers: rank 1 = easy, 2–3 = medium, 4–5 = hard,
6 = pro, 7 = impossible. (A puzzle that needs something beyond this set is also
graded "impossible".)

| Technique | Family | Rank | Lesson |
| --- | --- | --- | --- |
| Naked Single | Singles | 1 | ✅ interactive |
| Hidden Single | Singles | 1 | ✅ interactive |
| Pointing (Locked Candidates 1) | Intersections | 2 | ✅ interactive |
| Claiming (Locked Candidates 2) | Intersections | 2 | ✅ interactive |
| Naked Pair | Subsets | 3 | ✅ interactive |
| Hidden Pair | Subsets | 3 | ✅ interactive |
| Naked Triple | Subsets | 4 | ✅ interactive |
| Hidden Triple | Subsets | 4 | ✅ interactive |
| Naked Quad | Subsets | 5 | ✅ interactive |
| Hidden Quad | Subsets | 5 | 📖 prose only |
| X-Wing | Basic Fish | 5 | ✅ interactive |
| Skyscraper | Single-digit | 6 | ✅ interactive |
| Two-String Kite | Single-digit | 6 | 📖 prose only |
| Swordfish | Basic Fish | 6 | ✅ interactive |
| XY-Wing (Y-Wing) | Wings | 6 | ✅ interactive |
| XYZ-Wing | Wings | 6 | ✅ interactive |
| W-Wing | Wings | 6 | ✅ interactive |
| Jellyfish | Basic Fish | 7 | ✅ interactive |
| Simple Colouring | Colouring | 7 | ✅ interactive |
| Unique Rectangle (Type 1) | Uniqueness | 7 | ✅ interactive |
| BUG + 1 | Uniqueness | 7 | ✅ interactive |

- **✅ interactive** — the Learn lesson shows a real mid-solve board (the actual
  pencil-mark state) where the engine's `findStep` returns exactly that
  technique, highlights the deduction, and links a practice puzzle that requires
  it.
- **📖 prose only** — a written tutorial ships, but the pattern is rare enough
  that the build-time harvester (`scripts/generate-lessons.ts`) has not yet
  captured a clean example board. The technique is still fully **used** by the
  solver.

Correctness is guarded by a property test
(`src/engine/techniques.correctness.test.ts`) that logically solves hundreds of
puzzles and asserts no technique ever places a wrong digit or eliminates a
candidate that truly belongs — a single bad elimination anywhere trips it.

## Documented but not yet implemented

These exist in the wider literature and are on the map for future work. They are
mostly chaining, Almost-Locked-Set, and complex-fish methods — powerful but
intricate, and beyond what a puzzle in this app currently needs (such puzzles
grade "impossible").

**Single-digit / fish**
- Empty Rectangle
- Turbot Fish (generalises Skyscraper + 2-String Kite)
- Finned / Sashimi X-Wing, Swordfish, Jellyfish
- Franken Fish, Mutant Fish, Siamese Fish

**Wings / uniqueness**
- WXYZ-Wing
- Unique Rectangle Types 2–6, Hidden Rectangle, Avoidable Rectangle

**Colouring / chains**
- Multi-Colouring, 3D Medusa
- Remote Pairs
- X-Chain, XY-Chain
- Nice Loops / Alternating Inference Chains (AIC), Grouped AIC
- X-Cycles

**Almost Locked Sets (ALS)**
- ALS-XZ, ALS-XY-Wing, ALS Chain, Death Blossom
- Sue de Coq

**Last resort**
- Forcing Chains, Forcing Nets, Digit/Cell/Unit Forcing Chains, Nishio
- Templates, Pattern Overlay, Kraken Fish, Exocet
- Brute force (the app's backtracking solver already provides this for
  uniqueness checking; it is deliberately not used for hints)

## How to add a technique

1. Implement the finder in `src/engine/techniques.ts` returning a `Step`
   (placements and/or eliminations, with `highlights` and a human `reason`).
2. Register it in `TECHNIQUES` with an appropriate `rank` (see the table) and
   add its name to `TechniqueName` in `src/engine/types.ts`.
3. Re-check the grade mapping in `src/engine/generator.ts`.
4. Regenerate the fixtures so it becomes usable and learnable:
   `npm run gen:challenges` and `npx tsx scripts/generate-lessons.ts`.
5. Add teaching prose in `src/data/lessons.ts`.
6. `npm test` — the correctness property test guards against bad deductions.

## Sources

- [HoDoKu — Human-Style Solving Techniques](https://hodoku.sourceforge.net/en/techniques.php)
- [HoDoKu — Fish](https://hodoku.sourceforge.net/en/tech_fishg.php),
  [Chains & Loops](https://hodoku.sourceforge.net/en/tech_chains.php),
  [Last Resort](https://hodoku.sourceforge.net/en/tech_last.php)
- [SudokuWiki — Strategy Families](https://www.sudokuwiki.org/Strategy_Families)
