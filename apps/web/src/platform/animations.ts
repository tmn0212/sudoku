/**
 * Web adapter for the `AnimApplier` port (defined in @sudoku/state).
 *
 * The animation-style *registry* (ids, labels) is portable and lives in
 * `@sudoku/ui-tokens`. Applying a style on web is a single `data-anim` attribute
 * on <html> (the alternate keyframes in `theme/animations.css` do the rest), so
 * switching is instant and adds no runtime cost. `classic` is the built-in default
 * and clears the attribute. Injected into the settings store by the wiring in
 * src/state/settingsStore.ts.
 */

import type { AnimApplier } from '@sudoku/state';

/** Web adapter: set/clear `data-anim` on the document root. No-op off-DOM. */
export const webAnimApplier: AnimApplier = {
  apply: (id) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (id === 'classic') root.removeAttribute('data-anim');
    else root.setAttribute('data-anim', id);
  },
};
