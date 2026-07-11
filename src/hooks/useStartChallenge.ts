import { useState, useCallback } from 'react';
import { loadChallengePack } from '../data/challenges';
import { parseGrid } from '../engine/board';
import { solve } from '../engine/solver';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';
import type { Difficulty, Puzzle } from '../engine/types';

/**
 * Loads a challenge-bank puzzle, derives its solution with the engine, and
 * starts it as a game. Solving a known-unique puzzle is fast (a few ms), so it
 * runs on the main thread — no worker needed.
 */
export const useStartChallenge = () => {
  const [loading, setLoading] = useState(false);

  const startChallenge = useCallback(
    async (difficulty: Difficulty, index: number) => {
      setLoading(true);
      try {
        const pack = await loadChallengePack(difficulty);
        const str = pack.puzzles[index];
        if (!str) return;

        const grid = parseGrid(str);
        const solution = solve(grid);
        if (!solution) return; // packs are verified, so this shouldn't happen

        const puzzle: Puzzle = {
          puzzle: grid,
          solution,
          difficulty,
          givens: grid.reduce((n, v) => (v !== 0 ? n + 1 : n), 0),
        };
        useGame.getState().startChallenge(puzzle, { difficulty, index });
        useUi.getState().navigate('game');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { startChallenge, loading };
};
