/**
 * Tracks which Learn-tab techniques the player has marked as learned. Small and
 * bounded, but kept in IndexedDB alongside the other progress data for a single
 * source of truth.
 */

import { getDb } from './idb';

/** Set of technique ids the player has marked learned. */
export const getLearned = async (): Promise<Set<string>> => {
  const db = await getDb();
  const rows = await db.getAll('learned');
  return new Set(rows.map((r) => r.id));
};

export const markLearned = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.put('learned', { id, learnedAt: Date.now() });
};

export const unmarkLearned = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete('learned', id);
};
