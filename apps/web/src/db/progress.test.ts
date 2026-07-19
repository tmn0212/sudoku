// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { __resetDbForTests } from './idb';
import { getChallengeProgress, recordChallengeResult } from './progress';

// Swap in a fresh in-memory factory per test — wipes all data without the
// blocking that deleteDatabase hits while a connection is still open.
const resetDb = (): void => {
  __resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
};

describe('challenge progress', () => {
  beforeEach(() => {
    resetDb();
  });

  it('records a win as solved with a best score', async () => {
    await recordChallengeResult({
      mode: 'relaxed',
      difficulty: 'easy',
      index: 3,
      score: 500,
      timeMs: 120_000,
      won: true,
    });

    const progress = await getChallengeProgress('relaxed', 'easy');
    const p = progress.get(3)!;
    expect(p.solved).toBe(true);
    expect(p.bestScore).toBe(500);
    expect(p.bestTimeMs).toBe(120_000);
    expect(p.attempts).toBe(1);
  });

  it('latches solved and keeps the best score/time across attempts', async () => {
    // A loss first: attempt counted, not solved.
    await recordChallengeResult({
      mode: 'relaxed', difficulty: 'hard', index: 0,
      score: 0, timeMs: 0, won: false,
    });
    // A slow win.
    await recordChallengeResult({
      mode: 'relaxed', difficulty: 'hard', index: 0,
      score: 800, timeMs: 300_000, won: true,
    });
    // A faster, higher win.
    await recordChallengeResult({
      mode: 'relaxed', difficulty: 'hard', index: 0,
      score: 1100, timeMs: 200_000, won: true,
    });
    // A worse win must not regress the bests.
    await recordChallengeResult({
      mode: 'relaxed', difficulty: 'hard', index: 0,
      score: 400, timeMs: 500_000, won: true,
    });

    const p = (await getChallengeProgress('relaxed', 'hard')).get(0)!;
    expect(p.solved).toBe(true);
    expect(p.bestScore).toBe(1100);
    expect(p.bestTimeMs).toBe(200_000);
    expect(p.attempts).toBe(4);
  });

  it('scopes progress by mode and difficulty', async () => {
    await recordChallengeResult({
      mode: 'relaxed', difficulty: 'easy', index: 0,
      score: 200, timeMs: 60_000, won: true,
    });

    expect((await getChallengeProgress('relaxed', 'medium')).size).toBe(0);
    expect((await getChallengeProgress('arcade', 'easy')).size).toBe(0);
    expect((await getChallengeProgress('relaxed', 'easy')).size).toBe(1);
  });
});
