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
} from '@sudoku/core';
import { findStep } from '@sudoku/core';
import { generatePuzzle } from '@sudoku/core';
import { computeScore } from '@sudoku/core';
import type { CandidateMask, Difficulty, Grid, Mode, Puzzle, Step } from '@sudoku/core';
import type { KeyValueStore } from '../ports';

/**
 * A resumable in-progress game — the game store's serialization shape (the
 * saved-games roster in the web app's IndexedDB stores these). Board state is
 * plain arrays; the store re-hydrates it on resume.
 */
export interface SavedGame {
  id: string;
  mode: Mode;
  difficulty: string;
  challenge: { difficulty: string; index: number } | null;
  puzzle: number[];
  solution: number[];
  given: boolean[];
  values: number[];
  notes: number[];
  notesAlt: number[];
  bans: number[];
  /** Optional for backward compat with saves made before wrong-entry locks. */
  lockedBans?: number[];
  inputMode: string;
  /** The committed tool (mode-bar choice). Optional for saves made before the
   *  committed/active split; falls back to `inputMode`. */
  committedMode?: string;
  status: string;
  elapsedMs: number;
  mistakes: number;
  hints: number;
  score: number;
  updatedAt: number;
}

/**
 * Platform dependencies injected when the app instantiates the game store, so
 * the reducer itself stays free of storage/settings coupling.
 */
export interface GameStoreDeps {
  /** Backs the Zustand `persist` middleware (web: localStorage). */
  storage: KeyValueStore;
  /** Reads the current settings that affect gameplay (auto-clean notes, and
   *  whether a gesture-picked tool snaps back to the committed one after entry). */
  getSettings: () => { autoCleanupNotes: boolean; autoRevertMode: boolean };
}

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

/**
 * A note that couldn't stick (a peer already resolves the digit) so the UI should
 * bounce it back out of `cells`. Ephemeral fx signal — set by `inputDigit`, read
 * by the web `useBounceFx` hook, never persisted.
 */
export interface BounceFx {
  cells: number[];
  digit: number;
  layer: 'note' | 'noteAlt';
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
  /** A multi-selection stashed while Digit mode shows only its first cell, so a
   *  mode cycle can pass through Digit and restore the group (null when none). */
  savedSelection: number[] | null;
  /** What a digit press does right now — may be a transient gesture override. */
  inputMode: InputMode;
  /** The user's chosen tool (mode-bar buttons). A transient gesture leaves this
   *  alone so the next digit entry can snap `inputMode` back to it. */
  committedMode: InputMode;

  // --- meta ---
  status: GameStatus;
  elapsedMs: number;
  mistakes: number;
  hints: number;
  /** Final score, set when the game ends (0 while playing). */
  score: number;
  autoCheck: boolean;
  hint: HintState | null;
  /** Ephemeral: cells that just bounced a note back out (peer-resolved digit). */
  bounce: BounceFx | null;

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
  /** A gesture-driven mode change (drag / radial): transient unless auto-revert
   *  is off, in which case it commits like a mode-bar tap. */
  setInputModeTransient: (mode: InputMode) => void;
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
  savedSelection: null as number[] | null,
  inputMode: 'normal' as InputMode,
  committedMode: 'normal' as InputMode,
  status: 'playing' as GameStatus,
  elapsedMs: 0,
  mistakes: 0,
  hints: 0,
  score: 0,
  hint: null as HintState | null,
  bounce: null as BounceFx | null,
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

/**
 * Digits already resolved in cell `i`'s row, column, or box: a peer holds that
 * digit and that peer is *confirmed correct* — a given, or (while the game is
 * validating) a player entry that matches the solution. Such a digit can no
 * longer legally be placed, noted, or banned in cell `i`. Returned as a
 * candidate bitmask.
 *
 * Gated on `checking` (auto-check on, or Arcade) so Good mode with auto-check
 * off never leaks whether one of *your* entries is right — only givens, which
 * are known-correct clues, count there.
 */
export const resolvedPeerDigits = (s: GameState, i: number): CandidateMask => {
  const checking = s.autoCheck || s.mode === 'arcade';
  let mask = 0;
  for (const p of PEERS[i]) {
    const v = s.values[p];
    if (v === 0) continue;
    if (s.given[p] || (checking && v === s.solution[p])) mask = addCandidate(mask, v);
  }
  return mask;
};

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

/**
 * A mode change carrying the committed/active split and the multi-selection rule.
 *
 * `commit` marks this as the user's chosen tool (a mode-bar tap, or any gesture
 * when auto-revert is off) so it becomes the new "home"; a transient gesture
 * leaves `committedMode` untouched so the next digit entry can snap back to it.
 *
 * Selection: entering Digit with a multi-selection collapses to the first-picked
 * cell (you can't place one digit across many) but *stashes* the group; leaving
 * Digit restores it. That lets a double-tap cycle pass through Digit without
 * losing the multi-selection.
 */
const modeChange = (
  s: GameState,
  next: InputMode,
  commit: boolean,
): Partial<GameState> => {
  const committedMode = commit ? next : s.committedMode;
  // The group in play is either one stashed earlier or the current live multi.
  const multi = s.savedSelection ?? (s.selection.length > 1 ? s.selection : null);
  if (next === 'normal') {
    return multi
      ? {
          inputMode: next,
          committedMode,
          selection: [multi[0]],
          selected: multi[0],
          savedSelection: multi,
        }
      : { inputMode: next, committedMode, savedSelection: null };
  }
  // Leaving Digit with a stashed group restores it; otherwise leave selection be.
  return s.savedSelection
    ? {
        inputMode: next,
        committedMode,
        selection: s.savedSelection,
        selected: s.savedSelection[s.savedSelection.length - 1],
        savedSelection: null,
      }
    : { inputMode: next, committedMode };
};

export const createGameStore = (deps: GameStoreDeps) =>
  create<GameState>()(
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
          savedSelection: null,
          // No transient state survives a reload, so the active tool comes back as
          // the committed one (falling back to `inputMode` for pre-split saves).
          inputMode: (g.committedMode ?? g.inputMode) as InputMode,
          committedMode: (g.committedMode ?? g.inputMode) as InputMode,
          status: g.status as GameStatus,
          elapsedMs: g.elapsedMs,
          mistakes: g.mistakes,
          hints: g.hints,
          score: g.score,
          hint: null,
          bounce: null,
          past: [],
          future: [],
          autoCheck: s.autoCheck,
        })),

      selectCell: (index) =>
        set({
          selection: index == null ? [] : [index],
          selected: index,
          savedSelection: null,
          hint: null,
        }),

      setSelection: (cells) =>
        set((s) => {
          // Collapsing a multi-selection down to one of its own cells (a plain tap
          // inside the group) stashes the group so a follow-up double-tap cycle can
          // restore it; any other selection change drops the stash.
          const collapsingMember =
            cells.length === 1 && s.selection.length > 1 && s.selection.includes(cells[0]);
          return {
            selection: cells,
            selected: cells.length ? cells[cells.length - 1] : null,
            savedSelection: collapsingMember ? s.selection : null,
            hint: null,
          };
        }),

      addToSelection: (index) =>
        set((s) => {
          if (s.selection.includes(index)) return { selected: index };
          // Extending into a fresh group invalidates any stashed one.
          return { selection: [...s.selection, index], selected: index, savedSelection: null };
        }),

      // A mode-bar tap commits the tool. Switching to Digit collapses a
      // multi-selection back to its first cell (see modeChange).
      setInputMode: (mode) => set((s) => modeChange(s, mode, true)),
      // Drag / radial: transient unless auto-revert is off (then it sticks).
      setInputModeTransient: (mode) =>
        set((s) => modeChange(s, mode, !deps.getSettings().autoRevertMode)),
      cycleInputMode: () =>
        set((s) => {
          const order: InputMode[] = ['normal', 'note', 'noteAlt', 'ban'];
          const next = order[(order.indexOf(s.inputMode) + 1) % order.length];
          return modeChange(s, next, !deps.getSettings().autoRevertMode);
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
        const settings = deps.getSettings();
        const autoClean = settings.autoCleanupNotes;
        let mistakes = s.mistakes;
        // Cells that refused a note because a peer already resolves the digit — the
        // UI bounces the mark back out of them (see useBounceFx).
        const bounced: number[] = [];

        // Arcade always validates entries (that's the mode); Good respects the
        // auto-check setting.
        const checking = s.autoCheck || s.mode === 'arcade';

        if (s.inputMode === 'normal') {
          for (const i of targets) {
            if (hasCandidate(s.lockedBans[i], digit)) continue; // permanently blocked
            if (values[i] === digit && targets.length === 1) {
              values[i] = 0; // tapping the same digit clears it (even a wrong one)
            } else {
              // A peer already resolves this digit (a given, or a validated
              // correct entry), so it can never go here — refuse the placement.
              if (hasCandidate(resolvedPeerDigits(s, i), digit)) continue;
              values[i] = digit;
              notes[i] = 0;
              notesAlt[i] = 0;
              bans[i] = 0;
              // A confirmed-correct placement resolves this digit for the whole
              // row/column/box, so sweep it out of every peer's notes, alt-notes,
              // and bans. Gated on `checking` so an unvalidated Good-mode entry
              // (which we can't know is right) never silently rewrites peers.
              if (autoClean && checking && digit === s.solution[i]) {
                for (const p of PEERS[i]) {
                  notes[p] = removeCandidate(notes[p], digit);
                  notesAlt[p] = removeCandidate(notesAlt[p], digit);
                  bans[p] = removeCandidate(bans[p], digit);
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
          const isBan = s.inputMode === 'ban';
          for (const i of targets) {
            if (values[i] !== 0) continue; // marks only make sense on empty cells
            if (hasCandidate(s.lockedBans[i], digit)) continue; // permanently blocked
            // A peer already resolves this digit. It can't be *noted* here — that
            // pencil mark would be provably false — so the note bounces back out
            // as feedback instead of sticking (collected for the UI). But you may
            // still BAN it: a ban is your own "not here" mark, valid even when the
            // engine already knows the digit is impossible here.
            if (!isBan && hasCandidate(resolvedPeerDigits(s, i), digit)) {
              bounced.push(i);
              continue;
            }
            const current = isBan ? bans : s.inputMode === 'note' ? notes : notesAlt;
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
        // Finalizing an entry snaps a transient gesture tool back to the committed
        // one (collapsing a lingering multi-selection if that lands on Digit).
        const revert = settings.autoRevertMode ? modeChange(s, s.committedMode, false) : null;
        // A fresh object each time (or null) so the fx hook fires once per bounce.
        const bounce: BounceFx | null = bounced.length
          ? { cells: bounced, digit, layer: s.inputMode === 'noteAlt' ? 'noteAlt' : 'note' }
          : null;
        set({
          ...revert,
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
          bounce,
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
            savedSelection: null,
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
          savedSelection: target != null ? null : s.savedSelection,
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
        const autoClean = deps.getSettings().autoCleanupNotes;
        for (const { cell, value } of step.placements) {
          values[cell] = value;
          notes[cell] = 0;
          notesAlt[cell] = 0;
          bans[cell] = 0;
          // A hint always places a correct digit, so it resolves `value` for the
          // whole row/column/box — sweep it from every peer's marks.
          if (autoClean) {
            for (const p of PEERS[cell]) {
              notes[p] = removeCandidate(notes[p], value);
              notesAlt[p] = removeCandidate(notesAlt[p], value);
              bans[p] = removeCandidate(bans[p], value);
            }
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
      version: 5,
      storage: createJSONStorage(() => deps.storage),
      migrate: (persisted, version) => {
        const p = persisted as Partial<GameState>;
        if (version < 3 && !p.gameId) p.gameId = newId(); // gameId added in v3
        if (version < 4 && !p.lockedBans) p.lockedBans = new Array(CELL_COUNT).fill(0);
        // committedMode added in v5: seed it from the old single input mode.
        if (version < 5 && !p.committedMode) p.committedMode = p.inputMode ?? 'normal';
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
        // A reload has no transient state, so persist the active tool as the
        // committed one — both rehydrate to the committed choice.
        inputMode: s.committedMode,
        committedMode: s.committedMode,
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
