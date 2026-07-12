import { useEffect } from 'react';
import { useGame, type GameState } from '../game/store';
import { saveGame, deleteSavedGame } from '../db/savedGames';
import type { SavedGame } from '../db/idb';

const SAVE_DEBOUNCE_MS = 700;

/** A pristine game (no user entries, no marks, barely any time) isn't worth
 *  saving — it would clutter the Continue list with untouched puzzles. */
const hasProgress = (s: GameState): boolean =>
  s.values.some((v, i) => v !== 0 && !s.given[i]) ||
  s.notes.some(Boolean) ||
  s.notesAlt.some(Boolean) ||
  s.bans.some(Boolean) ||
  s.elapsedMs >= 3000;

const serialize = (s: GameState): SavedGame => ({
  id: s.gameId,
  mode: s.mode,
  difficulty: s.difficulty,
  challenge: s.challenge,
  puzzle: s.puzzle,
  solution: s.solution,
  given: s.given,
  values: s.values,
  notes: s.notes,
  notesAlt: s.notesAlt,
  bans: s.bans,
  inputMode: s.inputMode,
  status: s.status,
  elapsedMs: s.elapsedMs,
  mistakes: s.mistakes,
  hints: s.hints,
  score: s.score,
  updatedAt: Date.now(),
});

/**
 * Keeps the saved-games roster in sync with the active game: debounced saves as
 * you play, an immediate save when the app is hidden or you leave the screen,
 * and removal once a game is finished.
 */
export const useSaveRoster = (): void => {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      const s = useGame.getState();
      if (s.status === 'playing' && hasProgress(s)) void saveGame(serialize(s));
    };

    const unsub = useGame.subscribe((s, prev) => {
      if (s.status !== 'playing' && prev.status === 'playing') {
        void deleteSavedGame(prev.gameId); // finished — drop from Continue
        return;
      }
      if (s.status === 'playing' && s.values !== prev.values) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
      }
    });

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      flush();
      unsub();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
};
