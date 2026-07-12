/**
 * Game state, powered by Zustand with localStorage persistence so an in-progress
 * game survives reloads and app relaunches (essential for an offline PWA).
 *
 * Per-cell state is kept as parallel flat arrays (cheap to clone/diff):
 *   values   — placed digit (0 = empty)
 *   notes    — blue pencil marks (candidate bitmask)
 *   notesAlt — grey pencil marks (a second candidate set)
 *   bans     — red "cannot be" marks (negative candidates)
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
import { useSettings } from '../state/settingsStore';
import { computeScore } from '../scoring/score';
import type { Difficulty, Grid, Puzzle, Step } from '../engine/types';
import type { Mode, SavedGame } from '../db/idb';

/** What a digit press does to the selected cells. */
export type InputMode = 'normal' | 'note' | 'noteAlt' | 'ban';

/** Mistakes allowed in Arcade mode before the game ends. */
export const ARCADE_LIVES = 3;

export type GameStatus = 'playing' | 'won' | 'lost';

export interface HintState {
  message: string;
  cells: number[];
  step: Step | null;
}

/** Identifies which challenge-bank puzzle is being played (null for free play). */
export interface ChallengeRef {
  difficulty: Difficulty;
  index: number;
}

interface Snapshot {
  values: Grid;
  notes: number[];
  notesAlt: number[];
  bans: number[];
}

export interface GameState {
  // --- puzzle data ---
  /** Stable id used to key this game in the saved-games roster. */
  gameId: string;
  puzzle: Grid;
  solution: Grid;
  given: boolean[];
  difficulty: Difficulty;
  mode: Mode;
  /** Set when playing a challenge-bank puzzle; null for free play. */
  challenge: ChallengeRef | null;

  // --- player state ---
  values: Grid;
  notes: number[];
  notesAlt: number[];
  bans: number[];
  /** Selected cells (supports drag multi-select); last entry is the anchor. */
  selection: number[];
  /** Convenience anchor = last selected cell (or null). */
  selected: number | null;
  inputMode: InputMode;

  // --- meta ---
  status: GameStatus;
  elapsedMs: number;
  mistakes: number;
  hints: number;
  /** Final score, set when the game ends (0 while playing). */
  score: number;
  autoCheck: boolean;
  hint: HintState | null;

  // --- undo/redo ---
  past: Snapshot[];
  future: Snapshot[];

  // --- actions ---
  newGame: (difficulty: Difficulty, mode?: Mode) => void;
  startGame: (puzzle: Puzzle, mode?: Mode) => void;
  startChallenge: (puzzle: Puzzle, ref: ChallengeRef, mode?: Mode) => void;
  /** Replay the current puzzle from scratch (same givens, mode, challenge). */
  restartGame: () => void;
  /** Resume a previously-saved game from the roster. */
  loadGame: (game: SavedGame) => void;
  selectCell: (index: number | null) => void;
  setSelection: (cells: number[]) => void;
  addToSelection: (index: number) => void;
  inputDigit: (digit: number) => void;
  /** Convert a lingering wrong entry into a ban (fired ~1s after it's placed). */
  autoBanWrong: (cell: number, digit: number) => void;
  erase: () => void;
  setInputMode: (mode: InputMode) => void;
  cycleInputMode: () => void;
  undo: () => void;
  redo: () => void;
  requestHint: () => void;
  applyHint: () => void;
  clearHint: () => void;
  setAutoCheck: (on: boolean) => void;
  tick: (ms: number) => void;
}

const MAX_HISTORY = 200;
const zeros = (): number[] => new Array(CELL_COUNT).fill(0);

/** A short, unique-enough id for a game slot. */
const newId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const snapshot = (s: GameState): Snapshot => ({
  values: s.values.slice(),
  notes: s.notes.slice(),
  notesAlt: s.notesAlt.slice(),
  bans: s.bans.slice(),
});

const isWin = (values: Grid, solution: Grid): boolean =>
  values.every((v, i) => v === solution[i]);

const buildGame = (
  { puzzle, solution, difficulty }: Pick<Puzzle, 'puzzle' | 'solution' | 'difficulty'>,
  mode: Mode,
) => ({
  gameId: newId(),
  puzzle,
  solution,
  given: puzzle.map((v) => v !== 0),
  difficulty,
  mode,
  challenge: null as ChallengeRef | null,
  values: puzzle.slice(),
  notes: zeros(),
  notesAlt: zeros(),
  bans: zeros(),
  selection: [] as number[],
  selected: null as number | null,
  inputMode: 'normal' as InputMode,
  status: 'playing' as GameStatus,
  elapsedMs: 0,
  mistakes: 0,
  hints: 0,
  score: 0,
  hint: null as HintState | null,
  past: [] as Snapshot[],
  future: [] as Snapshot[],
});

/**
 * A correctly-filled cell locks once the game is validating entries (Arcade
 * always, Good when auto-check is on): you can't overwrite or erase it, and the
 * number pad greys out every other digit. Givens are handled separately.
 */
export const isCellLocked = (s: GameState, i: number): boolean =>
  (s.autoCheck || s.mode === 'arcade') &&
  !s.given[i] &&
  s.values[i] !== 0 &&
  s.values[i] === s.solution[i];

/** Cells a digit/erase acts on: the multi-selection, or the single anchor.
 *  Givens and locked-correct cells are never editable, so they're filtered out. */
export const targetCells = (s: GameState): number[] => {
  const cells = s.selection.length
    ? s.selection
    : s.selected != null
      ? [s.selected]
      : [];
  return cells.filter((i) => !s.given[i] && !isCellLocked(s, i));
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...buildGame(generatePuzzle('easy'), 'good'),
      autoCheck: true,

      newGame: (difficulty, mode = 'good') =>
        set((s) => ({
          ...buildGame(generatePuzzle(difficulty), mode),
          autoCheck: s.autoCheck,
        })),

      startGame: (puzzle, mode = 'good') =>
        set((s) => ({ ...buildGame(puzzle, mode), autoCheck: s.autoCheck })),

      startChallenge: (puzzle, ref, mode = 'good') =>
        set((s) => ({
          ...buildGame(puzzle, mode),
          challenge: ref,
          autoCheck: s.autoCheck,
        })),

      restartGame: () =>
        set((s) => ({
          ...buildGame(
            { puzzle: s.puzzle, solution: s.solution, difficulty: s.difficulty },
            s.mode,
          ),
          challenge: s.challenge,
          autoCheck: s.autoCheck,
        })),

      loadGame: (g) =>
        set((s) => ({
          gameId: g.id,
          puzzle: g.puzzle,
          solution: g.solution,
          given: g.given,
          difficulty: g.difficulty as Difficulty,
          mode: g.mode,
          challenge: g.challenge as ChallengeRef | null,
          values: g.values.slice(),
          notes: g.notes.slice(),
          notesAlt: g.notesAlt.slice(),
          bans: g.bans.slice(),
          selection: [],
          selected: null,
          inputMode: g.inputMode as InputMode,
          status: g.status as GameStatus,
          elapsedMs: g.elapsedMs,
          mistakes: g.mistakes,
          hints: g.hints,
          score: g.score,
          hint: null,
          past: [],
          future: [],
          autoCheck: s.autoCheck,
        })),

      selectCell: (index) =>
        set({
          selection: index == null ? [] : [index],
          selected: index,
          hint: null,
        }),

      setSelection: (cells) =>
        set({
          selection: cells,
          selected: cells.length ? cells[cells.length - 1] : null,
          hint: null,
        }),

      addToSelection: (index) =>
        set((s) => {
          if (s.selection.includes(index)) return { selected: index };
          return { selection: [...s.selection, index], selected: index };
        }),

      setInputMode: (mode) => set({ inputMode: mode }),
      cycleInputMode: () =>
        set((s) => {
          const order: InputMode[] = ['normal', 'note', 'noteAlt', 'ban'];
          const next = order[(order.indexOf(s.inputMode) + 1) % order.length];
          return { inputMode: next };
        }),

      setAutoCheck: (on) => set({ autoCheck: on }),
      clearHint: () => set({ hint: null }),

      inputDigit: (digit) => {
        const s = get();
        if (s.status !== 'playing') return;
        const targets = targetCells(s);
        if (targets.length === 0) return;

        const past = [...s.past, snapshot(s)].slice(-MAX_HISTORY);
        const values = s.values.slice();
        const notes = s.notes.slice();
        const notesAlt = s.notesAlt.slice();
        const bans = s.bans.slice();
        const autoClean = useSettings.getState().autoCleanupNotes;
        let mistakes = s.mistakes;

        // Arcade always validates entries (that's the mode); Good respects the
        // auto-check setting.
        const checking = s.autoCheck || s.mode === 'arcade';

        if (s.inputMode === 'normal') {
          for (const i of targets) {
            if (values[i] === digit && targets.length === 1) {
              values[i] = 0; // tapping the same digit clears it
            } else {
              values[i] = digit;
              notes[i] = 0;
              notesAlt[i] = 0;
              bans[i] = 0;
              if (autoClean) {
                for (const p of PEERS[i]) {
                  if (notes[p]) notes[p] = removeCandidate(notes[p], digit);
                }
              }
              if (checking && values[i] !== s.solution[i]) mistakes++;
            }
          }
        } else {
          // note / noteAlt / ban share a digit exclusively: a mark lives in at
          // most one layer, so switching mode and tapping the same digit MOVES
          // it (e.g. a blue note becomes a grey note) instead of being hidden
          // behind another layer.
          for (const i of targets) {
            if (values[i] !== 0) continue; // marks only make sense on empty cells
            const current =
              s.inputMode === 'note' ? notes : s.inputMode === 'noteAlt' ? notesAlt : bans;
            const alreadyHere = hasCandidate(current[i], digit);
            notes[i] = removeCandidate(notes[i], digit);
            notesAlt[i] = removeCandidate(notesAlt[i], digit);
            bans[i] = removeCandidate(bans[i], digit);
            if (!alreadyHere) current[i] = addCandidate(current[i], digit);
          }
        }

        const lost = s.mode === 'arcade' && mistakes >= ARCADE_LIVES;
        const won = isWin(values, s.solution);
        const score =
          won || lost
            ? computeScore({
                difficulty: s.difficulty,
                mode: s.mode,
                timeMs: s.elapsedMs,
                mistakes,
                hints: s.hints,
                won,
              })
            : 0;
        set({
          values,
          notes,
          notesAlt,
          bans,
          past,
          future: [],
          hint: null,
          mistakes,
          score,
          status: lost ? 'lost' : won ? 'won' : 'playing',
        });
      },

      autoBanWrong: (cell, digit) => {
        const s = get();
        if (s.status !== 'playing') return;
        // Bail if it was changed, corrected, or cleared in the meantime.
        if (s.given[cell] || s.values[cell] !== digit || digit === s.solution[cell]) {
          return;
        }
        const values = s.values.slice();
        const bans = s.bans.slice();
        values[cell] = 0; // pops the wrong entry out
        bans[cell] = addCandidate(bans[cell], digit); // ...and remembers it's banned
        set({ values, bans, hint: null });
      },

      erase: () => {
        const s = get();
        if (s.status !== 'playing') return;
        const targets = targetCells(s);
        const dirty = targets.filter(
          (i) => s.values[i] || s.notes[i] || s.notesAlt[i] || s.bans[i],
        );
        if (dirty.length === 0) return;

        const past = [...s.past, snapshot(s)].slice(-MAX_HISTORY);
        const values = s.values.slice();
        const notes = s.notes.slice();
        const notesAlt = s.notesAlt.slice();
        const bans = s.bans.slice();
        for (const i of dirty) {
          values[i] = 0;
          notes[i] = 0;
          notesAlt[i] = 0;
          bans[i] = 0;
        }
        set({ values, notes, notesAlt, bans, past, future: [], hint: null });
      },

      undo: () => {
        const s = get();
        if (s.past.length === 0) return;
        const previous = s.past[s.past.length - 1];
        set({
          ...previous,
          values: previous.values.slice(),
          notes: previous.notes.slice(),
          notesAlt: previous.notesAlt.slice(),
          bans: previous.bans.slice(),
          past: s.past.slice(0, -1),
          future: [snapshot(s), ...s.future].slice(0, MAX_HISTORY),
          status: 'playing',
          hint: null,
        });
      },

      redo: () => {
        const s = get();
        if (s.future.length === 0) return;
        const next = s.future[0];
        const won = isWin(next.values, s.solution);
        set({
          ...next,
          values: next.values.slice(),
          notes: next.notes.slice(),
          notesAlt: next.notesAlt.slice(),
          bans: next.bans.slice(),
          past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
          future: s.future.slice(1),
          status: won ? 'won' : 'playing',
          hint: null,
        });
      },

      requestHint: () => {
        const s = get();
        if (s.status !== 'playing') return;

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
            selection: [wrongCells[0]],
            selected: wrongCells[0],
          });
          return;
        }

        const step = findStep(s.values);
        if (!step) {
          set({
            hint: {
              message:
                'No simple next step from here. This position needs a more advanced technique.',
              cells: [],
              step: null,
            },
          });
          return;
        }
        const target = step.placements[0]?.cell ?? step.highlights[0];
        set({
          hint: { message: step.reason, cells: step.highlights, step },
          selection: target != null ? [target] : s.selection,
          selected: target ?? s.selected,
          hints: s.hints + 1,
        });
      },

      applyHint: () => {
        const s = get();
        const step = s.hint?.step;
        if (!step || step.placements.length === 0) return;
        const past = [...s.past, snapshot(s)].slice(-MAX_HISTORY);
        const values = s.values.slice();
        const notes = s.notes.slice();
        const notesAlt = s.notesAlt.slice();
        const bans = s.bans.slice();
        for (const { cell, value } of step.placements) {
          values[cell] = value;
          notes[cell] = 0;
          notesAlt[cell] = 0;
          bans[cell] = 0;
          for (const p of PEERS[cell]) {
            if (notes[p]) notes[p] = removeCandidate(notes[p], value);
          }
        }
        const won = isWin(values, s.solution);
        const score = won
          ? computeScore({
              difficulty: s.difficulty,
              mode: s.mode,
              timeMs: s.elapsedMs,
              mistakes: s.mistakes,
              hints: s.hints,
              won: true,
            })
          : 0;
        set({
          values,
          notes,
          notesAlt,
          bans,
          past,
          future: [],
          hint: null,
          score,
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
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // Older saves predate gameId; give them one so the roster can key them.
      migrate: (persisted, version) => {
        const p = persisted as Partial<GameState>;
        if (version < 3 && !p.gameId) p.gameId = newId();
        return p as GameState;
      },
      // Persist the game, not transient UI (selection/hint).
      partialize: (s) => ({
        gameId: s.gameId,
        puzzle: s.puzzle,
        solution: s.solution,
        given: s.given,
        difficulty: s.difficulty,
        mode: s.mode,
        challenge: s.challenge,
        values: s.values,
        notes: s.notes,
        notesAlt: s.notesAlt,
        bans: s.bans,
        inputMode: s.inputMode,
        status: s.status,
        elapsedMs: s.elapsedMs,
        mistakes: s.mistakes,
        hints: s.hints,
        score: s.score,
        autoCheck: s.autoCheck,
        past: s.past,
        future: s.future,
      }),
    },
  ),
);
