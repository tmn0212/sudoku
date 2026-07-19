/**
 * Platform ports the shared stores depend on. The interfaces live here (portable);
 * the web adapters that implement them live in `apps/web/src/platform/*` and are
 * injected when the app instantiates each store. A native app injects its own.
 */

import type { ThemeId, FontId } from '@sudoku/ui-tokens';

/** Synchronous key/value store backing the Zustand `persist` middleware. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Applies a theme (web: sets `data-theme`; native: swaps a style provider). */
export interface ThemeApplier {
  apply(id: ThemeId): void;
}

/** Applies a font choice (web: sets the `--app-font` var; native: swaps the
 *  font-family in a style provider). */
export interface FontApplier {
  apply(id: FontId): void;
}
