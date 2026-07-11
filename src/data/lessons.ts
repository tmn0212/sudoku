/**
 * Learn-tab lesson catalog: hand-written teaching prose merged with
 * engine-harvested example/practice fixtures (lesson-examples.json, produced by
 * scripts/generate-lessons.ts). Each example stores a mid-solve pencil-mark
 * state where findStep(values, candidates) returns the lesson's technique, so
 * the deduction shown is always real. A couple of rare techniques ship prose
 * only (no interactive board yet).
 */

import examples from './lesson-examples.json';
import type { TechniqueName } from '../engine/types';

export type LessonTier = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface LessonExample {
  values: string;
  candidates: number[];
}

export interface Lesson {
  id: TechniqueName;
  title: string;
  tier: LessonTier;
  summary: string;
  /** Teaching paragraphs, shown in order. */
  steps: string[];
  /** Mid-solve state where findStep returns this technique (when available). */
  example?: LessonExample;
  /** A full puzzle that exercises this technique (when available). */
  practice?: string;
}

type Prose = Pick<Lesson, 'id' | 'title' | 'tier' | 'summary' | 'steps'>;

const PROSE: Prose[] = [
  // ---------------- Beginner ----------------
  {
    id: 'naked-single',
    title: 'Naked Single',
    tier: 'Beginner',
    summary: 'A cell with only one candidate left.',
    steps: [
      'A naked single is the most basic move in Sudoku. Look at a single empty cell and cross off every digit that already appears in its row, column, or 3×3 box.',
      'If exactly one digit survives, that digit must go in the cell — there is nowhere else for it to be. It is "naked" because the cell openly shows its one and only option.',
      'Filling naked singles is the fastest way to make progress, and each one you place can create new singles elsewhere, so keep re-scanning after every placement.',
    ],
  },
  {
    id: 'hidden-single',
    title: 'Hidden Single',
    tier: 'Beginner',
    summary: 'A digit that fits only one cell in a unit.',
    steps: [
      'Instead of looking at a cell, look at a whole unit (a row, column, or box) and pick one digit — say a 4.',
      'Check every empty cell in that unit: in how many of them could a 4 legally go? If a 4 fits in only one cell, that cell must be a 4 — even if that cell still has other candidates too.',
      'The single is "hidden" because the target cell may look like it has several options; the deduction comes from the unit as a whole, not the cell.',
      'Hidden singles are the workhorse of easy and medium puzzles. Scan each box for digits that have only one home.',
    ],
  },

  // ---------------- Intermediate ----------------
  {
    id: 'pointing',
    title: 'Pointing Pair / Triple',
    tier: 'Intermediate',
    summary: "A box confines a digit to one line, clearing that line elsewhere.",
    steps: [
      'This is a "locked candidate" technique. Focus on one box and one digit. Find all the cells in the box where that digit can still go.',
      'If every one of those candidates lies in the same row (or the same column), then the digit must be placed somewhere along that line inside the box.',
      'Therefore the digit can be removed from that same row or column in the other two boxes it passes through — it "points" out of the box along the line.',
      'This rarely places a digit by itself, but the eliminations it makes often unlock naked or hidden singles.',
    ],
  },
  {
    id: 'claiming',
    title: 'Claiming (Line → Box)',
    tier: 'Intermediate',
    summary: 'A line confines a digit to one box, clearing the rest of that box.',
    steps: [
      'Claiming is the mirror image of pointing. This time start with a row or column and one digit.',
      'Find every cell on that line where the digit can go. If all of them fall inside a single 3×3 box, then the line "claims" that digit for that box.',
      'The digit can then be eliminated from all the other cells of that box — the ones not on the original line — because the line has to hold the digit somewhere in that box.',
      'Pointing and claiming together are called locked candidates, and spotting both directions is a key intermediate skill.',
    ],
  },
  {
    id: 'naked-pair',
    title: 'Naked Pair',
    tier: 'Intermediate',
    summary: 'Two cells sharing the same two candidates lock those digits.',
    steps: [
      'Look for two cells in the same unit that each have exactly the same two candidates — for example both showing only {3, 7}.',
      'Between them, those two cells must use up the 3 and the 7 (in some order). No other cell in that unit can be a 3 or a 7.',
      'So you may remove 3 and 7 from the candidates of every other cell in that shared row, column, or box.',
      'You do not yet know which cell is the 3 and which is the 7 — but you do not need to. The pair is enough to prune the rest of the unit.',
    ],
  },
  {
    id: 'hidden-pair',
    title: 'Hidden Pair',
    tier: 'Intermediate',
    summary: 'Two digits that fit only the same two cells in a unit.',
    steps: [
      'Pick a unit and look for two digits — say 2 and 6 — that can each only go in the same two cells of that unit.',
      'Those two cells must therefore hold the 2 and the 6 between them, even though they may currently show extra candidates as well.',
      'You can strip every other candidate out of those two cells, leaving just the 2 and 6. The pair was "hidden" behind the extra candidates.',
      'Hidden pairs are harder to spot than naked pairs because you have to count where digits can go, not just read a cell. Practice scanning by digit.',
    ],
  },
  {
    id: 'naked-triple',
    title: 'Naked Triple',
    tier: 'Intermediate',
    summary: 'Three cells sharing three candidates among them.',
    steps: [
      'A naked triple extends the naked pair idea to three cells in a unit. Together the three cells contain only three distinct candidates — for example {1,4}, {4,9}, and {1,9}.',
      'Each cell need not show all three digits; what matters is that the union of their candidates is exactly three digits, and no fourth digit appears.',
      'Those three digits are locked into those three cells, so you can eliminate all three from every other cell in the unit.',
      'Triples hide easily. A good habit is to check any unit that has three cells whose candidates all fall within the same small set of digits.',
    ],
  },
  {
    id: 'hidden-triple',
    title: 'Hidden Triple',
    tier: 'Intermediate',
    summary: 'Three digits confined to the same three cells in a unit.',
    steps: [
      'A hidden triple is three digits — say 2, 5, and 8 — that among them can only be placed in the same three cells of a unit.',
      'Those three cells may still show other candidates, but since the three digits have nowhere else to go in the unit, they must occupy exactly those cells.',
      'Every other candidate can therefore be cleared out of the three cells, leaving only 2, 5, and 8 spread among them.',
      'As with hidden pairs, you find these by counting where digits can go, not by reading cells. Look for three digits sharing the same three homes.',
    ],
  },
  {
    id: 'naked-quad',
    title: 'Naked Quad',
    tier: 'Intermediate',
    summary: 'Four cells sharing four candidates among them.',
    steps: [
      'A naked quad is the four-cell version of the naked pair/triple. Four cells in a unit together contain only four distinct candidates.',
      'No cell needs all four digits; the test is that the union of the four cells’ candidates is exactly four digits.',
      'Those four digits are locked into those four cells, so they can be removed from every other cell in the unit.',
      'Quads are rarer and easy to miss — when a unit is nearly full and progress stalls, scan for four cells whose candidates all live within the same set of four digits.',
    ],
  },
  {
    id: 'hidden-quad',
    title: 'Hidden Quad',
    tier: 'Intermediate',
    summary: 'Four digits confined to the same four cells in a unit.',
    steps: [
      'A hidden quad is four digits that, between them, can only be placed in four cells of a unit — even though those cells may show many other candidates.',
      'Because the four digits have nowhere else to go, they must fill those four cells, so every other candidate can be removed from them.',
      'Hidden quads are among the hardest subsets to spot by eye: you must find four digits sharing exactly four homes while ignoring the clutter of other candidates.',
      'In practice, look for them when several digits in a unit are each limited to the same small group of cells.',
    ],
  },

  // ---------------- Advanced ----------------
  {
    id: 'x-wing',
    title: 'X-Wing',
    tier: 'Advanced',
    summary: 'A rectangle of a digit eliminates it from two lines.',
    steps: [
      'The X-Wing works on a single digit across two rows (or two columns). Find two rows in which a chosen digit can go in exactly two columns — and crucially, the same two columns in both rows.',
      'These four candidate cells form the corners of a rectangle. In each row the digit sits in one of the two columns, and the two choices are locked together diagonally.',
      'Whatever the arrangement, the two columns will end up each holding the digit once. So the digit can be eliminated from those two columns in every other row.',
      'Switch the roles of rows and columns to find column-based X-Wings too. This is your first taste of "fish" patterns.',
    ],
  },
  {
    id: 'swordfish',
    title: 'Swordfish',
    tier: 'Advanced',
    summary: 'A three-line fish that clears a digit from three cross-lines.',
    steps: [
      'A swordfish is an X-Wing grown to three base lines. Pick a digit and three rows in which it appears only within the same three columns (each row using two or three of them).',
      'Those candidates form a 3×3 lattice. Across the three rows, the digit must fill each of the three columns exactly once.',
      'So the digit can be eliminated from those three columns in every other row. As always, the row/column roles can be swapped.',
      'You do not need the digit in all nine lattice cells — two per line is enough, which is what makes swordfish tricky to see.',
    ],
  },
  {
    id: 'jellyfish',
    title: 'Jellyfish',
    tier: 'Advanced',
    summary: 'A four-line fish, the big sibling of X-Wing and Swordfish.',
    steps: [
      'A jellyfish extends the fish idea to four base lines. A digit appears in four rows confined to the same four columns (two to four candidates per row).',
      'Because the digit must occupy each of the four columns once across those rows, it can be removed from those four columns in all other rows.',
      'Jellyfish are the largest fish worth hunting: with nine digits and nine lines, a five-line fish is always mirrored by a smaller one, so four is the practical ceiling.',
      'They are rare and demanding to spot — reach for them only when simpler techniques are exhausted.',
    ],
  },
  {
    id: 'skyscraper',
    title: 'Skyscraper',
    tier: 'Advanced',
    summary: 'Two single-digit strong links sharing a base line.',
    steps: [
      'A skyscraper works on one digit. Find two rows in which the digit has exactly two candidates each, and where one candidate from each row sits in the same column — the shared "base".',
      'The other two candidates are the "roof" cells, in two different columns. Because each row must place the digit in one of its two spots, at least one of the two roof cells ends up holding the digit.',
      'Therefore any cell that can see both roof cells cannot contain the digit, and it can be eliminated there.',
      'Skyscrapers also work with the roles of rows and columns swapped, and they are a gentle introduction to single-digit chaining.',
    ],
  },
  {
    id: 'two-string-kite',
    title: 'Two-String Kite',
    tier: 'Advanced',
    summary: 'A row string and a column string linked through a box.',
    steps: [
      'Pick a digit. Find a row that has exactly two candidates for it (a "string") and a column that also has exactly two candidates for it.',
      'The two strings are linked if one endpoint of the row and one endpoint of the column share a 3×3 box.',
      'Then look at the two free endpoints — the ones not in the shared box. The cell that lies in the free row endpoint’s row and the free column endpoint’s column sees both, so the digit can be removed from it.',
      'It is called a kite because the box connection and the two strings sketch a kite shape across the grid.',
    ],
  },

  // ---------------- Expert ----------------
  {
    id: 'xy-wing',
    title: 'XY-Wing',
    tier: 'Expert',
    summary: 'A pivot and two pincers force a shared elimination.',
    steps: [
      'An XY-Wing uses three bi-value cells (cells with exactly two candidates). One is the pivot, showing candidates {X, Y}. It sees two other cells: one showing {X, Z} and one showing {Y, Z}.',
      'Whatever digit the pivot takes, one of the two "pincer" cells is forced to become Z. So the digit Z appears in one pincer or the other no matter what.',
      'Any cell that is seen by both pincers therefore cannot be Z — it would clash with whichever pincer becomes Z. Remove Z from those shared cells.',
      'XY-Wings require tracking three cells and a chain of logic, so take it slowly: identify the pivot first, then its two pincers sharing a third digit Z.',
    ],
  },
  {
    id: 'xyz-wing',
    title: 'XYZ-Wing',
    tier: 'Expert',
    summary: 'An XY-Wing whose pivot also carries the shared digit.',
    steps: [
      'An XYZ-Wing is like an XY-Wing but the pivot has three candidates {X, Y, Z} instead of two. Its two pincers are bi-value: one {X, Z} and one {Y, Z}.',
      'Now all three cells — pivot and both pincers — can be Z, so one of the three definitely is. That means Z lives somewhere among the pivot and its two pincers.',
      'Any cell that sees all three of them cannot be Z, so Z is eliminated there. (Note the target must see the pivot too, unlike a plain XY-Wing.)',
      'Because the pivot joins the pincers, the eliminations are narrower than an XY-Wing, but the pattern is a little easier to find.',
    ],
  },
  {
    id: 'w-wing',
    title: 'W-Wing',
    tier: 'Expert',
    summary: 'Two matching pairs joined by a strong link.',
    steps: [
      'A W-Wing uses two bi-value cells that show the same pair {X, Y} and do not see each other.',
      'They are connected by a "strong link" on one of the digits, say X: a row, column, or box where X has only two possible cells, one seeing the first pair-cell and the other seeing the second.',
      'Follow the logic: if one pair-cell is not Y then it is X, which forces the far end of the link, which forces the other pair-cell to be Y. Either way, one of the two pair-cells is Y.',
      'So Y can be removed from any cell that sees both pair-cells. W-Wings are elegant once you learn to spot the matching pairs plus a connecting link.',
    ],
  },
  {
    id: 'simple-coloring',
    title: 'Simple Colouring',
    tier: 'Expert',
    summary: 'Two-colour a digit’s chain to force eliminations.',
    steps: [
      'Simple colouring works on one digit. Wherever that digit has exactly two possible cells in a unit, the two cells form a "strong link": one of them is the digit. Chain these links together.',
      'Colour the chain in two alternating colours. Within a chain, all cells of one colour are the digit and all of the other colour are not — you just do not yet know which colour is which.',
      'Two eliminations follow. Colour trap: any cell outside the chain that can see both colours cannot be the digit. Colour wrap: if two cells of the same colour ever share a unit, that colour is impossible, so the digit is removed from every cell of that colour.',
      'Colouring is your entry point into chaining logic, and it can crack puzzles that resist every subset and fish.',
    ],
  },
  {
    id: 'unique-rectangle',
    title: 'Unique Rectangle',
    tier: 'Expert',
    summary: 'Avoid the deadly pattern that would give two solutions.',
    steps: [
      'This technique assumes the puzzle has exactly one solution. Four cells forming a rectangle across two boxes, all holding the same two candidates {X, Y}, would be a "deadly pattern" — the X and Y could be swapped for a second valid solution.',
      'In a Type 1 Unique Rectangle, three of the four corners are exactly {X, Y} and the fourth corner has X and Y plus one or more extra candidates.',
      'If that fourth corner were also just {X, Y}, the deadly pattern would appear and the puzzle would have two solutions. Since it has one, the fourth corner must be one of its extras — so X and Y can be removed from it.',
      'Uniqueness techniques feel like cheating, but for well-formed puzzles they are perfectly valid and often decisive.',
    ],
  },
  {
    id: 'bug',
    title: 'BUG + 1',
    tier: 'Expert',
    summary: 'The one non-pair cell resolves an almost-ambiguous grid.',
    steps: [
      'BUG stands for Bivalue Universal Grave: a state where every unsolved cell has exactly two candidates and every digit appears exactly twice in every unit. Such a grid has two solutions, so a unique puzzle can never actually reach it.',
      'BUG + 1 is one step away: every unsolved cell is bi-value except a single cell that has three candidates.',
      'To avoid falling into the ambiguous grave, that three-candidate cell must take the digit that would otherwise appear three times in one of its units — the "extra" one.',
      'Place that digit and the grid escapes the trap. It is a striking end-game shortcut that, like the unique rectangle, leans on the puzzle having a single solution.',
    ],
  },
];

const FIXTURES = examples as Record<
  string,
  { values?: string; candidates?: number[]; practice?: string }
>;

export const LESSONS: Lesson[] = PROSE.map((p) => {
  const fx = FIXTURES[p.id];
  const lesson: Lesson = { ...p };
  if (fx?.values && fx.candidates) {
    lesson.example = { values: fx.values, candidates: fx.candidates };
  }
  if (fx?.practice) lesson.practice = fx.practice;
  return lesson;
});

export const lessonById = (id: string): Lesson | undefined =>
  LESSONS.find((l) => l.id === id);

export const TIERS: LessonTier[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];
