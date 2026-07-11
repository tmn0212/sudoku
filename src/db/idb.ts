/**
 * IndexedDB schema and connection (via `idb`, a ~3KB promise wrapper).
 *
 * Anything that grows unbounded lives here — completed-game history, challenge
 * progress, learned techniques — so it never sits in memory or localStorage.
 * Reads are query-on-demand (see stats.ts / progress.ts).
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type Mode = 'good' | 'arcade';

export interface GameRecord {
  id?: number;
  mode: Mode;
  difficulty: string;
  timeMs: number;
  mistakes: number;
  hints: number;
  score: number;
  won: boolean;
  completedAt: number;
}

export interface ChallengeProgress {
  key: string; // `${mode}:${difficulty}:${index}`
  mode: Mode;
  difficulty: string;
  index: number;
  solved: boolean;
  bestScore: number;
  bestTimeMs: number;
  attempts: number;
}

export interface LearnedTechnique {
  id: string;
  learnedAt: number;
}

interface SudokuDB extends DBSchema {
  games: {
    key: number;
    value: GameRecord;
    indexes: {
      'by-completedAt': number;
      'by-mode-difficulty': [string, string];
      'by-score': number;
    };
  };
  challengeProgress: {
    key: string;
    value: ChallengeProgress;
    indexes: { 'by-mode-difficulty': [string, string] };
  };
  learned: {
    key: string;
    value: LearnedTechnique;
  };
}

const DB_NAME = 'sudoku';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SudokuDB>> | null = null;

export const getDb = (): Promise<IDBPDatabase<SudokuDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<SudokuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const games = db.createObjectStore('games', {
          keyPath: 'id',
          autoIncrement: true,
        });
        games.createIndex('by-completedAt', 'completedAt');
        games.createIndex('by-mode-difficulty', ['mode', 'difficulty']);
        games.createIndex('by-score', 'score');

        const progress = db.createObjectStore('challengeProgress', {
          keyPath: 'key',
        });
        progress.createIndex('by-mode-difficulty', ['mode', 'difficulty']);

        db.createObjectStore('learned', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

/**
 * Ask the browser not to evict our data. Chrome grants this automatically for
 * installed PWAs; other browsers may prompt. Best-effort, never throws.
 */
export const requestPersistentStorage = async (): Promise<void> => {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* not supported — ignore */
  }
};

/** Test helper: reset the memoized connection. */
export const __resetDbForTests = (): void => {
  dbPromise = null;
};
