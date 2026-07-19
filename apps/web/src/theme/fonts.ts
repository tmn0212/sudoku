/**
 * Self-hosted display faces for the Typeface setting (Settings → Typeface).
 *
 * Each import registers a family's `@font-face` rules. The fonts are self-hosted
 * (fontsource, OFL-licensed) — no runtime request to Google Fonts — so they work
 * offline: Vite fingerprints each woff2 into the build, and the service worker
 * precaches them (woff2 is in `globPatterns`, see vite.config.ts). The browser
 * only *downloads* a face when a glyph actually paints in it, so importing them
 * all here is cheap until the user picks one.
 *
 * The variable faces (Fredoka, Caveat) ship every weight in one axis file, so the
 * app's 500–900 weights render without faux-bold; they're declared latin-only in
 * fonts.css to keep the precache lean. Bungee and VT323 are single-weight display
 * faces (latin subset only). Family names must match the `stack` values in
 * `@sudoku/ui-tokens` (fonts.ts).
 */

import './fonts.css'; // 'Fredoka Variable' + 'Caveat Variable' (latin subset)
import '@fontsource/bungee/latin.css'; // 'Bungee'
import '@fontsource/vt323/latin.css'; // 'VT323'
import '@fontsource/space-mono/latin.css'; // 'Space Mono' 400
import '@fontsource/space-mono/latin-700.css'; // 'Space Mono' 700
