/**
 * Ephemeral state for the "you banned this digit here — place it anyway?"
 * confirmation. Kept out of the game store so the modal is pure UI; confirming
 * simply forwards to the game store's inputDigit.
 */

import { create } from 'zustand';

export interface BanPromptState {
  /** Digit awaiting confirmation, or null when the prompt is closed. */
  digit: number | null;
  ask: (digit: number) => void;
  confirm: () => void;
  cancel: () => void;
}

/** Dependency injected by the app: how to place a confirmed digit. */
export interface BanPromptDeps {
  placeDigit: (digit: number) => void;
}

export const createBanPromptStore = (deps: BanPromptDeps) =>
  create<BanPromptState>()((set, get) => ({
    digit: null,
    ask: (digit) => set({ digit }),
    confirm: () => {
      const { digit } = get();
      if (digit != null) deps.placeDigit(digit);
      set({ digit: null });
    },
    cancel: () => set({ digit: null }),
  }));
