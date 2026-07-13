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
import { keyValueStore } from '../platform/keyValueStore';
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
import type { Difficulty, Grid, Mode, Puzzle, Step } from '../engine/types';
import type { SavedGame } from '../db/idb';

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
  /** User "cannot be" marks (the Ban tool) — undoable, overridable with a prompt. */
  bans: number[];
  /** Digits permanently blocked in a cell after a wrong attempt. Not undoable and
   *  never overridable; only a restart/new game clears them. */
  lockedBans: number[];
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

const MAX_HISTORY = 50;
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

/** Meta a finished game needs to compute its final score. */
interface FinalizeMeta {
  solution: Grid;
  difficulty: Difficulty;
  mode: Mode;
  elapsedMs: number;
  mistakes: number;
  hints: number;
}

/**
 * The single source of truth for "is this game over, and what's the score".
 * Every board mutation (place, hint, redo) — and undo, which reverts one — runs
 * through this so status and score can never drift apart. A game that is still
 * `playing` always has score 0.
 */
const finalizeIfDone = (
  values: Grid,
  m: FinalizeMeta,
): { status: GameStatus; score: number } => {
  const won = isWin(values, m.solution);
  const lost = m.mode === 'arcade' && m.mistakes >= ARCADE_LIVES;
  const score =
    won || lost
      ? computeScore({
          difficulty: m.difficulty,
          mode: m.mode,
          timeMs: m.elapsedMs,
          mistakes: m.mistakes,
          hints: m.hints,
          won,
        })
      : 0;
  return { status: lost ? 'lost' : won ? 'won' : 'playing', score };
};

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
  lockedBans: zeros(),
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
          lockedBans: g.lockedBans?.slice() ?? zeros(),
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

      // Switching to Digit collapses a multi-selection back to the cell the drag
      // started from — you can't place one final digit across many cells.
      setInputMode: (mode) =>
        set((s) =>
          mode === 'normal' && s.selection.length > 1
            ? { inputMode: mode, selection: [s.selection[0]], selected: s.selection[0] }
            : { inputMode: mode },
        ),
      cycleInputMode: () =>
        set((s) => {
          const order: InputMode[] = ['normal', 'note', 'noteAlt', 'ban'];
          const next = order[(order.indexOf(s.inputMode) + 1) % order.length];
          return next === 'normal' && s.selection.length > 1
            ? { inputMode: next, selection: [s.selection[0]], selected: s.selection[0] }
            : { inputMode: next };
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
            if (hasCandidate(s.lockedBans[i], digit)) continue; // permanently blocked
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
            if (hasCandidate(s.lockedBans[i], digit)) continue; // permanently blocked
            const current =
              s.inputMode === 'note' ? notes : s.inputMode === 'noteAlt' ? notesAlt : bans;
            const alreadyHere = hasCandidate(current[i], digit);
            notes[i] = removeCandidate(notes[i], digit);
            notesAlt[i] = removeCandidate(notesAlt[i], digit);
            bans[i] = removeCandidate(bans[i], digit);
            if (!alreadyHere) current[i] = addCandidate(current[i], digit);
          }
        }

        const { status, score } = finalizeIfDone(values, {
          solution: s.solution,
          difficulty: s.difficulty,
          mode: s.mode,
          elapsedMs: s.elapsedMs,
          mistakes,
          hints: s.hints,
        });
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
          status,
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
        const lockedBans = s.lockedBans.slice();
        values[cell] = 0; // pops the wrong entry out
        // Recorded in the permanent layer (survives undo) so the same wrong entry
        // can never be repeated for this cell.
        lockedBans[cell] = addCandidate(lockedBans[cell], digit);
        set({ values, lockedBans, hint: null });
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
        const { status, score } = finalizeIfDone(previous.values, {
          solution: s.solution,
          difficulty: s.difficulty,
          mode: s.mode,
          elapsedMs: s.elapsedMs,
          mistakes: s.mistakes,
          hints: s.hints,
        });
        set({
          ...previous,
          values: previous.values.slice(),
          notes: previous.notes.slice(),
          notesAlt: previous.notesAlt.slice(),
          bans: previous.bans.slice(),
          past: s.past.slice(0, -1),
          future: [snapshot(s), ...s.future].slice(0, MAX_HISTORY),
          status,
          score,
          hint: null,
        });
      },

      redo: () => {
        const s = get();
        if (s.future.length === 0) return;
        const next = s.future[0];
        const { status, score } = finalizeIfDone(next.values, {
          solution: s.solution,
          difficulty: s.difficulty,
          mode: s.mode,
          elapsedMs: s.elapsedMs,
          mistakes: s.mistakes,
          hints: s.hints,
        });
        set({
          ...next,
          values: next.values.slice(),
          notes: next.notes.slice(),
          notesAlt: next.notesAlt.slice(),
          bans: next.bans.slice(),
          past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
          future: s.future.slice(1),
          status,
          score,
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
        const { status, score } = finalizeIfDone(values, {
          solution: s.solution,
          difficulty: s.difficulty,
          mode: s.mode,
          elapsedMs: s.elapsedMs,
          mistakes: s.mistakes,
          hints: s.hints,
        });
        set({
          values,
          notes,
          notesAlt,
          bans,
          past,
          future: [],
          hint: null,
          score,
          status,
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
      version: 4,
      storage: createJSONStorage(() => keyValueStore),
      migrate: (persisted, version) => {
        const p = persisted as Partial<GameState>;
        if (version < 3 && !p.gameId) p.gameId = newId(); // gameId added in v3
        if (version < 4 && !p.lockedBans) p.lockedBans = new Array(CELL_COUNT).fill(0);
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
        lockedBans: s.lockedBans,
        inputMode: s.inputMode,
        status: s.status,
        elapsedMs: s.elapsedMs,
        mistakes: s.mistakes,
        hints: s.hints,
        score: s.score,
        autoCheck: s.autoCheck,
        // Undo/redo history is intentionally NOT persisted: including it made the
        // whole state (up to MAX_HISTORY snapshots) re-serialize to localStorage on
        // every change, including the 1s timer tick. Undo-across-reload isn't
        // expected, and the board itself still restores fully.
      }),
    },
  ),
);
