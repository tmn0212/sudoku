/**
 * Client wrapper around the generation worker. Falls back to synchronous
 * main-thread generation when Workers aren't available (tests, SSR, older
 * environments), so callers get a uniform Promise API.
 */
import { generatePuzzle } from '../engine/generator';
import type { Difficulty, Puzzle } from '../engine/types';

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 1;
const pending = new Map<number, (puzzle: Puzzle) => void>();

const getWorker = (): Worker | null => {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./generate.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (e: MessageEvent<{ id: number; puzzle: Puzzle }>) => {
        const resolve = pending.get(e.data.id);
        if (resolve) {
          pending.delete(e.data.id);
          resolve(e.data.puzzle);
        }
      };
      worker.onerror = () => {
        // Give up on the worker and fall back to sync generation next time.
        workerFailed = true;
        worker = null;
      };
    } catch {
      workerFailed = true;
      worker = null;
    }
  }
  return worker;
};

/** Generate a puzzle, off the main thread when possible. */
export const generatePuzzleAsync = (
  difficulty: Difficulty,
  seed?: number,
): Promise<Puzzle> => {
  const w = getWorker();
  if (!w) {
    return Promise.resolve(
      generatePuzzle(difficulty, seed !== undefined ? { seed } : {}),
    );
  }
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    w.postMessage({ id, difficulty, seed });
  });
};

/**
 * Puzzle-generation port. The web binding runs generation in a Worker with a
 * synchronous main-thread fallback; a native app can drop in a JS-thread or
 * native impl of the same interface.
 */
export interface PuzzleGenerator {
  generateAsync(difficulty: Difficulty, seed?: number): Promise<Puzzle>;
}

/** The active generator (web today; a native port swaps this binding). */
export const puzzleGenerator: PuzzleGenerator = {
  generateAsync: generatePuzzleAsync,
};
