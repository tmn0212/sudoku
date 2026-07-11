/**
 * Learn-tab lesson catalog: hand-written teaching prose merged with
 * engine-harvested example/practice fixtures (lesson-examples.json, produced by
 * scripts/generate-lessons.ts). Every example is a board where findStep()
 * returns the lesson's technique, so the deduction shown is always real.
 */

import examples from './lesson-examples.json';
import type { TechniqueName } from '../engine/types';

export type LessonTier = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Lesson {
  id: TechniqueName;
  title: string;
  tier: LessonTier;
  summary: string;
  /** Teaching paragraphs, shown in order. */
  steps: string[];
  /** Values-only board where findStep() returns this technique. */
  example: string;
  /** A full puzzle whose hardest required technique is this one. */
  practice: string;
}

type Prose = Omit<Lesson, 'example' | 'practice'>;

const PROSE: Prose[] = [
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
    id: 'xy-wing',
    title: 'XY-Wing',
    tier: 'Advanced',
    summary: 'A pivot and two pincers force a shared elimination.',
    steps: [
      'An XY-Wing uses three bi-value cells (cells with exactly two candidates). One is the pivot, showing candidates {X, Y}. It sees two other cells: one showing {X, Z} and one showing {Y, Z}.',
      'Whatever digit the pivot takes, one of the two "pincer" cells is forced to become Z. So the digit Z appears in one pincer or the other no matter what.',
      'Any cell that is seen by both pincers therefore cannot be Z — it would clash with whichever pincer becomes Z. Remove Z from those shared cells.',
      'XY-Wings require tracking three cells and a chain of logic, so take it slowly: identify the pivot first, then its two pincers sharing a third digit Z.',
    ],
  },
];

const FIXTURES = examples as Record<
  string,
  { example: string; practice: string }
>;

export const LESSONS: Lesson[] = PROSE.filter((p) => FIXTURES[p.id]).map(
  (p) => ({ ...p, ...FIXTURES[p.id] }),
);

export const lessonById = (id: string): Lesson | undefined =>
  LESSONS.find((l) => l.id === id);

export const TIERS: LessonTier[] = ['Beginner', 'Intermediate', 'Advanced'];
