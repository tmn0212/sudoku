/**
 * Challenge progress: per-puzzle solved state and personal bests, stored in
 * IndexedDB so it survives offline and never sits in memory. Keyed by
 * `${mode}:${difficulty}:${index}` (see the `challengeProgress` store).
 */

import { getDb, type ChallengeProgress, type Mode } from './idb';

const keyOf = (mode: Mode, difficulty: string, index: number): string =>
  `${mode}:${difficulty}:${index}`;

/** All recorded progress for a mode+difficulty, keyed by puzzle index. */
export const getChallengeProgress = async (
  mode: Mode,
  difficulty: string,
): Promise<Map<number, ChallengeProgress>> => {
  const db = await getDb();
  const rows = await db.getAllFromIndex(
    'challengeProgress',
    'by-mode-difficulty',
    [mode, difficulty],
  );
  return new Map(rows.map((r) => [r.index, r]));
};

export interface ChallengeResult {
  mode: Mode;
  difficulty: string;
  index: number;
  score: number;
  timeMs: number;
  won: boolean;
}

/**
 * Record one attempt at a challenge, upserting personal bests. `solved` latches
 * true once won; best score/time only improve on a win.
 */
export const recordChallengeResult = async (
  r: ChallengeResult,
): Promise<ChallengeProgress> => {
  const db = await getDb();
  const key = keyOf(r.mode, r.difficulty, r.index);
  const tx = db.transaction('challengeProgress', 'readwrite');
  const prev = await tx.store.get(key);

  const next: ChallengeProgress = {
    key,
    mode: r.mode,
    difficulty: r.difficulty,
    index: r.index,
    solved: (prev?.solved ?? false) || r.won,
    bestScore: Math.max(prev?.bestScore ?? 0, r.won ? r.score : 0),
    bestTimeMs: r.won
      ? prev?.bestTimeMs
        ? Math.min(prev.bestTimeMs, r.timeMs)
        : r.timeMs
      : (prev?.bestTimeMs ?? 0),
    attempts: (prev?.attempts ?? 0) + 1,
  };

  await tx.store.put(next);
  await tx.done;
  return next;
};
