/**
 * Web adapter for the `ThemeApplier` port (defined in @sudoku/state).
 *
 * The theme *registry* (ids, labels, swatches) is portable and lives in
 * `@sudoku/ui-tokens`. Actually *applying* a theme is platform-specific: on web it
 * flips one `data-theme` attribute on <html> (CSS custom properties in
 * `themes.css` do the rest); a native app would instead push token values into a
 * style-object provider. Injected into the settings store by the wiring in
 * src/state/settingsStore.ts.
 */

import type { ThemeApplier } from '@sudoku/state';

/** Web adapter: set/clear `data-theme` on the document root. No-op off-DOM. */
export const webThemeApplier: ThemeApplier = {
  apply: (id) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (id === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', id);
  },
};
