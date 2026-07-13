/**
 * Generation worker: runs puzzle generation off the main thread so the UI stays
 * responsive even for the slowest tiers. The engine is pure and DOM-free, so it
 * runs unchanged here.
 */
import { generatePuzzle } from '../engine/generator';
import type { Difficulty } from '../engine/types';

interface Request {
  id: number;
  difficulty: Difficulty;
  seed?: number;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, difficulty, seed } = e.data;
  const puzzle = generatePuzzle(difficulty, seed !== undefined ? { seed } : {});
  (self as unknown as Worker).postMessage({ id, puzzle });
};
