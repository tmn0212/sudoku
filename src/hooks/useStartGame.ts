import { useState, useCallback } from 'react';
import { generatePuzzleAsync } from '../workers/client';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';
import type { Difficulty } from '../engine/types';
import type { Mode } from '../db/idb';

/**
 * Starts a new game: generates a puzzle off the main thread, loads it into the
 * game store, and navigates to the Game screen. Exposes a `generating` flag so
 * callers can show a loading state for slower difficulties.
 */
export const useStartGame = () => {
  const [generating, setGenerating] = useState(false);

  const start = useCallback(
    async (difficulty: Difficulty, mode: Mode = 'good') => {
      setGenerating(true);
      try {
        const puzzle = await generatePuzzleAsync(difficulty);
        useGame.getState().startGame(puzzle, mode);
        useUi.getState().navigate('game');
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  return { start, generating };
};
