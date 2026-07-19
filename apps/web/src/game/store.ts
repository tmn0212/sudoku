// Web wiring: instantiate the shared game store with the web platform adapters —
// its localStorage-backed persistence and a live read of the settings store.
// Consumers import `useGame` (and the store's types/helpers) from here unchanged.
import { createGameStore } from '@sudoku/state';
import { webKeyValueStore } from '../platform/keyValueStore';
import { useSettings } from '../state/settingsStore';

export const useGame = createGameStore({
  storage: webKeyValueStore,
  getSettings: () => useSettings.getState(),
});

export {
  isCellLocked,
  targetCells,
  resolvedPeerDigits,
  ARCADE_LIVES,
  HINT_LIFE_COST,
  arcadeLivesLeft,
} from '@sudoku/state';
export type {
  GameState,
  InputMode,
  GameStatus,
  HintState,
  BounceFx,
  ChallengeRef,
  SavedGame,
} from '@sudoku/state';
