// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { __resetDbForTests, type SavedGame } from './idb';
import {
  saveGame,
  listSavedGames,
  deleteSavedGame,
  MAX_SAVED_GAMES,
} from './savedGames';

const resetDb = (): void => {
  __resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
};

const makeGame = (id: string, updatedAt: number): SavedGame => ({
  id,
  mode: 'good',
  difficulty: 'easy',
  challenge: null,
  puzzle: new Array(81).fill(0),
  solution: new Array(81).fill(1),
  given: new Array(81).fill(false),
  values: new Array(81).fill(0),
  notes: new Array(81).fill(0),
  notesAlt: new Array(81).fill(0),
  bans: new Array(81).fill(0),
  inputMode: 'normal',
  status: 'playing',
  elapsedMs: 1000,
  mistakes: 0,
  hints: 0,
  score: 0,
  updatedAt,
});

describe('saved-games roster', () => {
  beforeEach(() => {
    resetDb();
  });

  it('upserts by id and lists most-recent first', async () => {
    await saveGame(makeGame('a', 100));
    await saveGame(makeGame('b', 300));
    await saveGame(makeGame('a', 200)); // update a

    const list = await listSavedGames();
    expect(list.map((g) => g.id)).toEqual(['b', 'a']);
    expect(list.find((g) => g.id === 'a')!.updatedAt).toBe(200);
  });

  it('caps the roster and evicts the oldest', async () => {
    for (let i = 0; i < MAX_SAVED_GAMES + 3; i++) {
      await saveGame(makeGame(`g${i}`, i));
    }
    const list = await listSavedGames();
    expect(list).toHaveLength(MAX_SAVED_GAMES);
    // The three lowest updatedAt values (g0, g1, g2) should be gone.
    expect(list.some((g) => g.id === 'g0')).toBe(false);
    expect(list.some((g) => g.id === 'g2')).toBe(false);
    expect(list.some((g) => g.id === 'g3')).toBe(true);
  });

  it('deletes a game', async () => {
    await saveGame(makeGame('x', 1));
    await deleteSavedGame('x');
    expect(await listSavedGames()).toHaveLength(0);
  });
});
