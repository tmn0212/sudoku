/**
 * Web adapter for the `FontApplier` port (defined in @sudoku/state).
 *
 * The font *registry* (ids, labels, family stacks) is portable and lives in
 * `@sudoku/ui-tokens`. Actually *applying* a font is platform-specific: on web it
 * pushes the chosen stack into the `--app-font` CSS custom property on <html>
 * (which `index.css` references via `font-family: var(--app-font)`), so every
 * glyph — board digits included — re-renders instantly with no download. A native
 * app would instead swap the font-family in a style-object provider. Injected into
 * the settings store by the wiring in src/state/settingsStore.ts.
 */

import type { FontApplier } from '@sudoku/state';
import { FONTS } from '@sudoku/ui-tokens';

/** Web adapter: set/clear the `--app-font` var on the document root. No-op off-DOM.
 *  `system` clears the override so the `:root` fallback stack applies. */
export const webFontApplier: FontApplier = {
  apply: (id) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const font = FONTS.find((f) => f.id === id);
    if (!font || id === 'system') root.style.removeProperty('--app-font');
    else root.style.setProperty('--app-font', font.stack);
  },
};
