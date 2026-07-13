// Web wiring: the ban-confirm store places a confirmed digit via the game store.
import { createBanPromptStore } from '@sudoku/state';
import { useGame } from '../game/store';

export const useBanPrompt = createBanPromptStore({
  placeDigit: (digit) => useGame.getState().inputDigit(digit),
});
export type { BanPromptState } from '@sudoku/state';
