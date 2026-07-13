/**
 * Storage repository ports — the intent-level contract a persistence backend must
 * satisfy, decoupled from any particular database.
 *
 * The interfaces are the portable contract; the exported `*Repo` objects are the
 * active binding, currently the IndexedDB driver (the free functions in the
 * sibling `db/*.ts` modules, which own the `idb`-shaped queries). Screens and
 * hooks depend on these repo objects, never on raw `idb` queries, so a native app
 * swaps the binding for an expo-sqlite/op-sqlite implementation of the same
 * interfaces without touching a single call site.
 *
 * (Pure helpers like `computeStats` are NOT storage ops and stay free functions.)
 */

import type { SavedGame, GameRecord, ChallengeProgress, Mode } from './idb';
import { listSavedGames, saveGame, deleteSavedGame } from './savedGames';
import { recordGame, bestScore, getStats, type Stats } from './stats';
import {
  getChallengeProgress,
  recordChallengeResult,
  type ChallengeResult,
} from './progress';
import { getLearned, markLearned, unmarkLearned } from './learned';

/** Roster of resumable in-progress games (capped; oldest evicted). */
export interface SavedGamesRepo {
  list(): Promise<SavedGame[]>;
  save(game: SavedGame): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Completed-game history + the aggregate queries behind the Stats screen. */
export interface StatsRepo {
  record(record: GameRecord): Promise<number>;
  bestScore(mode: GameRecord['mode'], difficulty: string): Promise<number>;
  getStats(): Promise<Stats>;
}

/** Per-puzzle challenge progress + personal bests, keyed by mode+difficulty+index. */
export interface ProgressRepo {
  get(mode: Mode, difficulty: string): Promise<Map<number, ChallengeProgress>>;
  record(result: ChallengeResult): Promise<ChallengeProgress>;
}

/** Which Learn-tab techniques the player has marked learned. */
export interface LearnedRepo {
  list(): Promise<Set<string>>;
  mark(id: string): Promise<void>;
  unmark(id: string): Promise<void>;
}

// --- Active binding: the IndexedDB web driver ---
// `satisfies` compile-checks that the idb functions match each contract, so a
// signature drift between a repo and its driver is caught at build time.

export const savedGamesRepo = {
  list: listSavedGames,
  save: saveGame,
  delete: deleteSavedGame,
} satisfies SavedGamesRepo;

export const statsRepo = {
  record: recordGame,
  bestScore,
  getStats,
} satisfies StatsRepo;

export const progressRepo = {
  get: getChallengeProgress,
  record: recordChallengeResult,
} satisfies ProgressRepo;

export const learnedRepo = {
  list: getLearned,
  mark: markLearned,
  unmark: unmarkLearned,
} satisfies LearnedRepo;
