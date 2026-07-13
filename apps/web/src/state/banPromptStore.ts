/**
 * Ephemeral state for the "you banned this digit here — place it anyway?"
 * confirmation. Kept out of the game store so the modal is pure UI; confirming
 * simply forwards to the game store's inputDigit.
 */

import { create } from 'zustand';
import { useGame } from '../game/store';

interface BanPromptState {
  /** Digit awaiting confirmation, or null when the prompt is closed. */
  digit: number | null;
  ask: (digit: number) => void;
  confirm: () => void;
  cancel: () => void;
}

export const useBanPrompt = create<BanPromptState>()((set, get) => ({
  digit: null,
  ask: (digit) => set({ digit }),
  confirm: () => {
    const { digit } = get();
    if (digit != null) useGame.getState().inputDigit(digit);
    set({ digit: null });
  },
  cancel: () => set({ digit: null }),
}));
