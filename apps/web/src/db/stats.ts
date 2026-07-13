/**
 * Read/write helpers over the `games` object store, plus the aggregate queries
 * behind the Statistics screen. Aggregation is a pure function of the records
 * (computeStats) so it's unit-testable without a database.
 */

import { getDb, type GameRecord } from './idb';
import { DIFFICULTIES, type Difficulty } from '@sudoku/core';

/** Keep completed-game history bounded on the device. Years of play stays well
 *  under this; the oldest records are evicted first. */
export const MAX_GAME_RECORDS = 2000;

/** Persist a completed (won or lost) game. Returns the new record id. */
export const recordGame = async (record: GameRecord): Promise<number> => {
  const db = await getDb();
  const id = await db.add('games', record);

  const total = await db.count('games');
  if (total > MAX_GAME_RECORDS) {
    const tx = db.transaction('games', 'readwrite');
    // Oldest-first via the completedAt index; drop just enough to hit the cap.
    let cursor = await tx.store.index('by-completedAt').openCursor();
    let toDelete = total - MAX_GAME_RECORDS;
    while (cursor && toDelete > 0) {
      await cursor.delete();
      toDelete--;
      cursor = await cursor.continue();
    }
    await tx.done;
  }
  return id;
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

export interface DifficultyStat {
  difficulty: Difficulty;
  games: number;
  wins: number;
  bestTimeMs: number | null;
  avgTimeMs: number | null;
  bestScore: number;
}

export interface ScoreEntry {
  score: number;
  difficulty: string;
  timeMs: number;
  completedAt: number;
}

export interface TimeEntry {
  timeMs: number;
  difficulty: string;
  completedAt: number;
}

export interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  /** 0–1. */
  winRate: number;
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
  totalTimeMs: number;
  perDifficulty: DifficultyStat[];
  topScores: ScoreEntry[];
  fastest: TimeEntry[];
}

/** Aggregate a list of game records into everything the Stats screen shows. */
export const computeStats = (games: GameRecord[]): Stats => {
  const wins = games.filter((g) => g.won);
  const totalGames = games.length;

  // Streaks are chronological runs of wins; current = the trailing run.
  const chrono = [...games].sort((a, b) => a.completedAt - b.completedAt);
  let currentStreak = 0;
  let bestStreak = 0;
  for (const g of chrono) {
    if (g.won) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const perDifficulty: DifficultyStat[] = DIFFICULTIES.map((difficulty) => {
    const inTier = games.filter((g) => g.difficulty === difficulty);
    const tierWins = inTier.filter((g) => g.won);
    const winTimes = tierWins.map((g) => g.timeMs);
    return {
      difficulty,
      games: inTier.length,
      wins: tierWins.length,
      bestTimeMs: winTimes.length ? Math.min(...winTimes) : null,
      avgTimeMs: winTimes.length
        ? Math.round(winTimes.reduce((a, b) => a + b, 0) / winTimes.length)
        : null,
      bestScore: inTier.reduce((max, g) => Math.max(max, g.score), 0),
    };
  });

  const topScores: ScoreEntry[] = games
    .filter((g) => g.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((g) => ({
      score: g.score,
      difficulty: g.difficulty,
      timeMs: g.timeMs,
      completedAt: g.completedAt,
    }));

  const fastest: TimeEntry[] = wins
    .slice()
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, 5)
    .map((g) => ({
      timeMs: g.timeMs,
      difficulty: g.difficulty,
      completedAt: g.completedAt,
    }));

  return {
    totalGames,
    wins: wins.length,
    losses: totalGames - wins.length,
    winRate: totalGames ? wins.length / totalGames : 0,
    totalScore: games.reduce((sum, g) => sum + g.score, 0),
    currentStreak,
    bestStreak,
    totalTimeMs: games.reduce((sum, g) => sum + g.timeMs, 0),
    perDifficulty,
    topScores,
    fastest,
  };
};

/** Read every game record and aggregate. Records are small; realistic history
 * fits comfortably in memory. */
export const getStats = async (): Promise<Stats> => {
  const db = await getDb();
  const games = await db.getAll('games');
  return computeStats(games);
};
