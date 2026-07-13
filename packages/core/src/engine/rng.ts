/**
 * A tiny, fast, seedable PRNG (mulberry32). We use a seedable generator so that
 * puzzle generation is deterministic and reproducible in tests, while the app
 * seeds it from `Math.random()` for variety.
 */

export interface RNG {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, max). */
  int(max: number): number;
  /** Fisher-Yates shuffle, in place, returning the same array. */
  shuffle<T>(array: T[]): T[];
}

export const createRng = (seed = Math.floor(Math.random() * 2 ** 32)): RNG => {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (max: number): number => Math.floor(next() * max);
  const shuffle = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };
  return { next, int, shuffle };
};
