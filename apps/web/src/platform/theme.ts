/**
 * Theme-applier port.
 *
 * The theme *registry* (ids, labels, swatches) is portable and lives in
 * `theme/themes.ts`. Actually *applying* a theme is platform-specific: on web it
 * flips one `data-theme` attribute on <html> (CSS custom properties in
 * `themes.css` do the rest); a native app would instead push token values into a
 * style-object provider. Consumers (the settings store) depend on this interface,
 * so the native port swaps the applier without touching preference logic.
 */

import type { ThemeId } from '../theme/themes';

export interface ThemeApplier {
  /** Apply a theme (or clear to the system default for `system`). */
  apply(id: ThemeId): void;
}

/** Web adapter: set/clear `data-theme` on the document root. No-op off-DOM. */
export const webThemeApplier: ThemeApplier = {
  apply: (id) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (id === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', id);
  },
};

/** The active theme applier (web today; a native port swaps this binding). */
export const themeApplier: ThemeApplier = webThemeApplier;
