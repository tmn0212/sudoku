/**
 * Synchronous key/value store port for small, hot persisted state (the Zustand
 * `persist` stores: `sudoku-game`, `sudoku-settings`).
 *
 * The shape matches Zustand's `StateStorage`, so it drops straight into
 * `createJSONStorage(() => keyValueStore)`. The web adapter wraps `localStorage`
 * and is safe in non-DOM environments (tests/SSR): it no-ops when `localStorage`
 * is absent rather than throwing. A native app swaps in an MMKV/AsyncStorage impl.
 *
 * NOTE: durable records (saved games, stats, progress) do NOT go here — those use
 * the IndexedDB repositories in `src/db/`. This port is only for the small blobs.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const hasLocalStorage = (): boolean => typeof localStorage !== 'undefined';

/** Web adapter over `localStorage`. */
export const webKeyValueStore: KeyValueStore = {
  getItem: (key) => (hasLocalStorage() ? localStorage.getItem(key) : null),
  setItem: (key, value) => {
    if (hasLocalStorage()) localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (hasLocalStorage()) localStorage.removeItem(key);
  },
};

/** The active key/value store (web today; a native port swaps this binding). */
export const keyValueStore: KeyValueStore = webKeyValueStore;
