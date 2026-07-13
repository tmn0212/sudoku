/**
 * Web adapter for the `KeyValueStore` port (defined in @sudoku/state) that backs
 * the Zustand `persist` stores (`sudoku-game`, `sudoku-settings`). Wraps
 * `localStorage`, and is safe in non-DOM environments (tests/SSR): it no-ops when
 * `localStorage` is absent rather than throwing. Injected into the store factories
 * by the wiring in src/game|state/*. A native app swaps in an MMKV/AsyncStorage impl.
 *
 * NOTE: durable records (saved games, stats, progress) do NOT go here — those use
 * the IndexedDB repositories in `src/db/`. This port is only for the small blobs.
 */

import type { KeyValueStore } from '@sudoku/state';

const hasLocalStorage = (): boolean => typeof localStorage !== 'undefined';

export const webKeyValueStore: KeyValueStore = {
  getItem: (key) => (hasLocalStorage() ? localStorage.getItem(key) : null),
  setItem: (key, value) => {
    if (hasLocalStorage()) localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (hasLocalStorage()) localStorage.removeItem(key);
  },
};
