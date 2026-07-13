/**
 * Roster of resumable in-progress games, stored in IndexedDB so several games
 * survive offline (not just the single last game in localStorage). Capped so it
 * never grows unbounded: adding an 11th evicts the least-recently-updated one.
 */

import { getDb, type SavedGame } from './idb';

export const MAX_SAVED_GAMES = 10;

/** Upsert one game and trim the roster back to MAX_SAVED_GAMES (oldest out). */
export const saveGame = async (game: SavedGame): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction('savedGames', 'readwrite');
  await tx.store.put(game);
  const all = await tx.store.getAll();
  if (all.length > MAX_SAVED_GAMES) {
    all
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, all.length - MAX_SAVED_GAMES)
      .forEach((g) => void tx.store.delete(g.id));
  }
  await tx.done;
};

/** All saved games, most-recently-updated first. */
export const listSavedGames = async (): Promise<SavedGame[]> => {
  const db = await getDb();
  const all = await db.getAllFromIndex('savedGames', 'by-updatedAt');
  return all.reverse();
};

export const deleteSavedGame = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete('savedGames', id);
};
