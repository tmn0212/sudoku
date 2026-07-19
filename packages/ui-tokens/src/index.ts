/**
 * `@sudoku/ui-tokens` — the portable design-token registries: color themes and
 * font choices (ids, labels, and picker swatches/stacks), with zero DOM/CSS
 * dependency. The web app renders these as CSS custom properties (`themes.css` +
 * the `data-theme` attribute; the `--app-font` var); a future native app reads
 * the same registries into a style-object provider.
 */

export * from './themes';
export * from './fonts';
export * from './animations';
export * from './audio';
