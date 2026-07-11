// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { __resetDbForTests, type GameRecord } from './idb';
import { computeStats, getStats, recordGame } from './stats';

const game = (over: Partial<GameRecord>): GameRecord => ({
  mode: 'good',
  difficulty: 'easy',
  timeMs: 60_000,
  mistakes: 0,
  hints: 0,
  score: 100,
  won: true,
  completedAt: 1,
  ...over,
});

describe('computeStats', () => {
  it('reports zeros for an empty history', () => {
    const s = computeStats([]);
    expect(s.totalGames).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.topScores).toEqual([]);
    expect(s.fastest).toEqual([]);
  });

  it('computes win rate, totals, and losses', () => {
    const s = computeStats([
      game({ won: true, score: 300 }),
      game({ won: false, score: 0 }),
      game({ won: true, score: 500 }),
    ]);
    expect(s.totalGames).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBeCloseTo(2 / 3);
    expect(s.totalScore).toBe(800);
  });

  it('tracks current (trailing) and best streaks chronologically', () => {
    const s = computeStats([
      game({ completedAt: 1, won: true }),
      game({ completedAt: 2, won: true }),
      game({ completedAt: 3, won: false }),
      game({ completedAt: 4, won: true }),
      game({ completedAt: 5, won: true }),
      game({ completedAt: 6, won: true }),
    ]);
    expect(s.bestStreak).toBe(3);
    expect(s.currentStreak).toBe(3);
  });

  it('current streak is 0 when the latest game is a loss', () => {
    const s = computeStats([
      game({ completedAt: 1, won: true }),
      game({ completedAt: 2, won: false }),
    ]);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(1);
  });

  it('aggregates best/avg time and best score per difficulty', () => {
    const s = computeStats([
      game({ difficulty: 'hard', won: true, timeMs: 300_000, score: 800 }),
      game({ difficulty: 'hard', won: true, timeMs: 500_000, score: 1200 }),
      game({ difficulty: 'hard', won: false, timeMs: 10_000, score: 0 }),
    ]);
    const hard = s.perDifficulty.find((d) => d.difficulty === 'hard')!;
    expect(hard.games).toBe(3);
    expect(hard.wins).toBe(2);
    expect(hard.bestTimeMs).toBe(300_000);
    expect(hard.avgTimeMs).toBe(400_000);
    expect(hard.bestScore).toBe(1200);
  });

  it('ranks the top 5 scores and 5 fastest wins', () => {
    const games = Array.from({ length: 8 }, (_, i) =>
      game({ score: (i + 1) * 100, timeMs: (8 - i) * 10_000, won: true }),
    );
    const s = computeStats(games);
    expect(s.topScores).toHaveLength(5);
    expect(s.topScores[0].score).toBe(800);
    expect(s.topScores.map((e) => e.score)).toEqual([800, 700, 600, 500, 400]);
    expect(s.fastest).toHaveLength(5);
    expect(s.fastest[0].timeMs).toBe(10_000);
  });

  it('excludes losses from fastest solves', () => {
    const s = computeStats([
      game({ won: false, timeMs: 1_000 }),
      game({ won: true, timeMs: 50_000 }),
    ]);
    expect(s.fastest).toHaveLength(1);
    expect(s.fastest[0].timeMs).toBe(50_000);
  });
});

describe('getStats over IndexedDB', () => {
  beforeEach(() => {
    __resetDbForTests();
    globalThis.indexedDB = new IDBFactory();
  });

  it('aggregates recorded games', async () => {
    await recordGame(game({ score: 200, won: true, completedAt: 1 }));
    await recordGame(game({ score: 0, won: false, completedAt: 2 }));
    const s = await getStats();
    expect(s.totalGames).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.totalScore).toBe(200);
  });
});
