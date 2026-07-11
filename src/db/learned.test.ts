// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { __resetDbForTests } from './idb';
import { getLearned, markLearned, unmarkLearned } from './learned';

const resetDb = (): void => {
  __resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
};

describe('learned techniques', () => {
  beforeEach(() => {
    resetDb();
  });

  it('starts empty', async () => {
    expect((await getLearned()).size).toBe(0);
  });

  it('marks and reports a learned technique', async () => {
    await markLearned('x-wing');
    const learned = await getLearned();
    expect(learned.has('x-wing')).toBe(true);
    expect(learned.size).toBe(1);
  });

  it('is idempotent and can be unmarked', async () => {
    await markLearned('naked-pair');
    await markLearned('naked-pair');
    expect((await getLearned()).size).toBe(1);

    await unmarkLearned('naked-pair');
    expect((await getLearned()).has('naked-pair')).toBe(false);
  });
});
