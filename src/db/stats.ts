/**
 * Read/write helpers over the `games` object store. Aggregate/insight queries
 * are added in the Statistics phase; here we just record completed games and
 * expose the best score per mode+difficulty for the win screen.
 */

import { getDb, type GameRecord } from './idb';

/** Persist a completed (won or lost) game. Returns the new record id. */
export const recordGame = async (record: GameRecord): Promise<number> => {
  const db = await getDb();
  return db.add('games', record);
};

/** Highest score achieved for a mode+difficulty (0 if none yet). */
export const bestScore = async (
  mode: GameRecord['mode'],
  difficulty: string,
): Promise<number> => {
  const db = await getDb();
  const games = await db.getAllFromIndex('games', 'by-mode-difficulty', [
    mode,
    difficulty,
  ]);
  return games.reduce((max, g) => Math.max(max, g.score), 0);
};
