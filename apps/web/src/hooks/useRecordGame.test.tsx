// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { __resetDbForTests, getDb } from '../db/idb';
import { getChallengeProgress } from '../db/progress';
import { useGame } from '../game/store';
import { useRecordGame } from './useRecordGame';

// Guards the store<->stats bridge: a finished game is recorded exactly once (not
// zero times, not twice on a re-render), records again after a new game, and a
// challenge game updates its per-puzzle progress.

const resetDb = (): void => {
  __resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
};

const countGames = async () => (await getDb()).count('games');

const solveFully = () => {
  const { solution, given } = useGame.getState();
  for (let i = 0; i < 81; i++) {
    if (given[i]) continue;
    useGame.getState().selectCell(i);
    useGame.getState().inputDigit(solution[i]);
  }
};

describe('useRecordGame', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDb();
    useGame.getState().newGame('easy');
  });

  it('records a finished game exactly once, even across re-renders', async () => {
    const { rerender } = renderHook(() => useRecordGame());
    act(() => solveFully());
    await waitFor(async () => expect(await countGames()).toBe(1));

    // Re-rendering while the game is still 'won' must not record a second time.
    act(() => rerender());
    act(() => rerender());
    expect(await countGames()).toBe(1);
  });

  it('records again after a new game is started and finished', async () => {
    renderHook(() => useRecordGame());
    act(() => solveFully());
    await waitFor(async () => expect(await countGames()).toBe(1));

    // Separate act() calls => separate renders, so the "recorded once" ref resets
    // on the transition back to 'playing' before the next win.
    act(() => useGame.getState().newGame('easy'));
    act(() => solveFully());
    await waitFor(async () => expect(await countGames()).toBe(2));
  });

  it('updates challenge progress when a challenge game is won', async () => {
    const { puzzle, solution, given } = useGame.getState();
    useGame.getState().startChallenge(
      { puzzle, solution, difficulty: 'easy', givens: given.filter(Boolean).length },
      { difficulty: 'easy', index: 3 },
    );

    renderHook(() => useRecordGame());
    act(() => solveFully());

    await waitFor(async () => {
      const progress = await getChallengeProgress('relaxed', 'easy');
      expect(progress.get(3)?.solved).toBe(true);
    });
  });
});
