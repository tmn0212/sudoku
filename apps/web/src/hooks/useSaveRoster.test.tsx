// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { __resetDbForTests, type SavedGame } from '../db/idb';
import { saveGame, listSavedGames } from '../db/savedGames';
import { useGame } from '../game/store';
import { useSaveRoster } from './useSaveRoster';

// Guards the store<->roster bridge: a pristine game shouldn't clutter Continue,
// real progress must persist, and finishing a game must drop it from the roster.
// This hook holds the resume-correctness logic and was previously untested.

const resetDb = (): void => {
  __resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
};

const firstEmptyCell = () => useGame.getState().given.findIndex((g) => !g);

const toSaved = (): SavedGame => {
  const s = useGame.getState();
  return {
    id: s.gameId,
    mode: s.mode,
    difficulty: s.difficulty,
    challenge: s.challenge,
    puzzle: s.puzzle,
    solution: s.solution,
    given: s.given,
    values: s.values,
    notes: s.notes,
    notesAlt: s.notesAlt,
    bans: s.bans,
    lockedBans: s.lockedBans,
    inputMode: s.committedMode,
    committedMode: s.committedMode,
    status: s.status,
    elapsedMs: s.elapsedMs,
    mistakes: s.mistakes,
    hints: s.hints,
    score: s.score,
    updatedAt: 1,
  };
};

const solveFully = () => {
  const { solution, given } = useGame.getState();
  for (let i = 0; i < 81; i++) {
    if (given[i]) continue;
    useGame.getState().selectCell(i);
    useGame.getState().inputDigit(solution[i]);
  }
};

describe('useSaveRoster', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDb();
    useGame.getState().newGame('easy');
  });

  it('does not save a pristine game', async () => {
    const { unmount } = renderHook(() => useSaveRoster());
    unmount(); // cleanup flushes; a pristine game has no progress worth saving
    await waitFor(async () => expect(await listSavedGames()).toHaveLength(0));
  });

  it('persists an in-progress game on flush', async () => {
    const { unmount } = renderHook(() => useSaveRoster());
    const cell = firstEmptyCell();
    const digit = useGame.getState().solution[cell];
    act(() => {
      useGame.getState().selectCell(cell);
      useGame.getState().inputDigit(digit);
    });
    unmount(); // flush-on-unmount writes it immediately

    await waitFor(async () => {
      const list = await listSavedGames();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(useGame.getState().gameId);
      expect(list[0].values[cell]).toBe(digit);
    });
  });

  it('removes a game from the roster once it is finished', async () => {
    // Seed the roster with the current game, then keep the hook mounted so it can
    // observe the playing -> won transition and delete it.
    await saveGame(toSaved());
    expect(await listSavedGames()).toHaveLength(1);

    const { unmount } = renderHook(() => useSaveRoster());
    act(() => solveFully());
    await waitFor(async () => expect(await listSavedGames()).toHaveLength(0));
    unmount();
  });
});
