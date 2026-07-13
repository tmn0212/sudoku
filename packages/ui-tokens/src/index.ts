/**
 * `@sudoku/ui-tokens` — the portable theme registry: theme ids, labels, and picker
 * swatches, with zero DOM/CSS dependency. The web app renders these as CSS custom
 * properties (`themes.css` + the `data-theme` attribute); a future native app reads
 * the same registry into a style-object provider.
 */

export * from './themes';
