/**
 * Game state, powered by Zustand with localStorage persistence so an in-progress
 * game survives reloads and app relaunches (essential for an offline PWA).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  CELL_COUNT,
  PEERS,
  addCandidate,
  hasCandidate,
  removeCandidate,
} from '../engine/board';
import { findStep } from '../engine/techniques';
import { generatePuzzle } from '../engine/generator';
import type { Difficulty, Grid, Step } from '../engine/types';

export interface HintState {
  message: string;
  /** Cells to highlight while the hint is shown. */
  cells: number[];
  /** The deduction, if it places a digit (so the user can apply it). */
  step: Step | null;
}

interface Snapshot {
  values: Grid;
  notes: number[];
}

export interface GameState {
  // --- puzzle data ---
  puzzle: Grid;
  solution: Grid;
  given: boolean[];
  difficulty: Difficulty;

  // --- player state ---
  values: Grid;
  /** Pencil marks per cell, as a candidate bitmask. */
  notes: number[];
  selected: number | null;
  notesMode: boolean;

  // --- meta ---
  status: 'playing' | 'won';
  elapsedMs: number;
  mistakes: number;
  autoCheck: boolean;
  hint: HintState | null;

  // --- undo/redo ---
  past: Snapshot[];
  future: Snapshot[];

  // --- actions ---
  newGame: (difficulty: Difficulty) => void;
  selectCell: (index: number | null) => void;
  inputDigit: (digit: number) => void;
  erase: () => void;
  toggleNotesMode: () => void;
  setNotesMode: (on: boolean) => void;
  undo: () => void;
  redo: () => void;
  requestHint: () => void;
  applyHint: () => void;
  clearHint: () => void;
  setAutoCheck: (on: boolean) => void;
  tick: (ms: number) => void;
}

const MAX_HISTORY = 200;

const snapshot = (s: GameState): Snapshot => ({
  values: s.values.slice(),
  notes: s.notes.slice(),
});

const isWin = (values: Grid, solution: Grid): boolean =>
  values.every((v, i) => v === solution[i]);

const buildGame = (difficulty: Difficulty) => {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    puzzle,
    solution,
    given: puzzle.map((v) => v !== 0),
    difficulty,
    values: puzzle.slice(),
    notes: new Array(CELL_COUNT).fill(0),
    selected: null as number | null,
    notesMode: false,
    status: 'playing' as const,
    elapsedMs: 0,
    mistakes: 0,
    hint: null,
    past: [] as Snapshot[],
    future: [] as Snapshot[],
  };
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...buildGame('easy'),
      autoCheck: true,

      newGame: (difficulty) =>
        set((s) => ({ ...buildGame(difficulty), autoCheck: s.autoCheck })),

      selectCell: (index) => set({ selected: index, hint: null }),

      toggleNotesMode: () => set((s) => ({ notesMode: !s.notesMode })),
      setNotesMode: (on) => set({ notesMode: on }),
      setAutoCheck: (on) => set({ autoCheck: on }),
      clearHint: () => set({ hint: null }),

      inputDigit: (digit) => {
        const s = get();
        const i = s.selected;
        if (i == null || s.given[i] || s.status === 'won') return;

        const past = [...s.past, snapshot(s)].slice(-MAX_HISTORY);

        if (s.notesMode) {
          // Toggle a pencil mark; notes only make sense on an empty cell.
          const notes = s.notes.slice();
          const values = s.values.slice();
          values[i] = 0;
          notes[i] = hasCandidate(notes[i], digit)
            ? removeCandidate(notes[i], digit)
            : addCandidate(notes[i], digit);
          set({ values, notes, past, future: [], hint: null });
          return;
        }

        const values = s.values.slice();
        const notes = s.notes.slice();

        if (values[i] === digit) {
          // Tapping the same digit clears it.
          values[i] = 0;
        } else {
          values[i] = digit;
          notes[i] = 0;
          // Auto-clean: remove this digit from peers' pencil marks.
          for (const p of PEERS[i]) {
            if (notes[p]) notes[p] = removeCandidate(notes[p], digit);
          }
        }

        const wrong =
          s.autoCheck && values[i] !== 0 && values[i] !== s.solution[i];
        const mistakes = wrong ? s.mistakes + 1 : s.mistakes;
        const won = isWin(values, s.solution);

        set({
          values,
          notes,
          past,
          future: [],
          hint: null,
          mistakes,
          status: won ? 'won' : 'playing',
        });
      },

      erase: () => {
        const s = get();
        const i = s.selected;
        if (i == null || s.given[i] || s.status === 'won') return;
        if (s.values[i] === 0 && s.notes[i] === 0) return;
        const past = [...s.past, snapshot(s)].slice(-MAX_HISTORY);
        const values = s.values.slice();
        const notes = s.notes.slice();
        values[i] = 0;
        notes[i] = 0;
        set({ values, notes, past, future: [], hint: null });
      },

      undo: () => {
        const s = get();
        if (s.past.length === 0) return;
        const previous = s.past[s.past.length - 1];
        set({
          values: previous.values.slice(),
          notes: previous.notes.slice(),
          past: s.past.slice(0, -1),
          future: [snapshot(s), ...s.future].slice(0, MAX_HISTORY),
          status: 'playing',
          hint: null,
        });
      },

      redo: () => {
        const s = get();
        if (s.future.length === 0) return;
        const nextSnap = s.future[0];
        const won = isWin(nextSnap.values, s.solution);
        set({
          values: nextSnap.values.slice(),
          notes: nextSnap.notes.slice(),
          past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
          future: s.future.slice(1),
          status: won ? 'won' : 'playing',
          hint: null,
        });
      },

      requestHint: () => {
        const s = get();
        if (s.status === 'won') return;

        // First, surface any incorrect entry — a hint should catch mistakes.
        const wrongCells: number[] = [];
        for (let i = 0; i < CELL_COUNT; i++) {
          if (s.values[i] !== 0 && !s.given[i] && s.values[i] !== s.solution[i]) {
            wrongCells.push(i);
          }
        }
        if (wrongCells.length > 0) {
          set({
            hint: {
              message: `You have an incorrect entry. Check the highlighted ${
                wrongCells.length === 1 ? 'cell' : 'cells'
              }.`,
              cells: wrongCells,
              step: null,
            },
            selected: wrongCells[0],
          });
          return;
        }

        const step = findStep(s.values);
        if (!step) {
          set({
            hint: {
              message:
                'No simple next step from here — this position needs a more advanced technique.',
              cells: [],
              step: null,
            },
          });
          return;
        }
        const target = step.placements[0]?.cell ?? step.highlights[0];
        set({
          hint: { message: step.reason, cells: step.highlights, step },
          selected: target ?? s.selected,
        });
      },

      applyHint: () => {
        const s = get();
        const step = s.hint?.step;
        if (!step || step.placements.length === 0) return;
        const past = [...s.past, snapshot(s)].slice(-MAX_HISTORY);
        const values = s.values.slice();
        const notes = s.notes.slice();
        for (const { cell, value } of step.placements) {
          values[cell] = value;
          notes[cell] = 0;
          for (const p of PEERS[cell]) {
            if (notes[p]) notes[p] = removeCandidate(notes[p], value);
          }
        }
        const won = isWin(values, s.solution);
        set({
          values,
          notes,
          past,
          future: [],
          hint: null,
          status: won ? 'won' : 'playing',
        });
      },

      tick: (ms) => {
        const s = get();
        if (s.status !== 'playing') return;
        set({ elapsedMs: s.elapsedMs + ms });
      },
    }),
    {
      name: 'sudoku-game',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist the game, not transient UI like the active hint.
      partialize: (s) => ({
        puzzle: s.puzzle,
        solution: s.solution,
        given: s.given,
        difficulty: s.difficulty,
        values: s.values,
        notes: s.notes,
        status: s.status,
        elapsedMs: s.elapsedMs,
        mistakes: s.mistakes,
        autoCheck: s.autoCheck,
        past: s.past,
        future: s.future,
      }),
    },
  ),
);
