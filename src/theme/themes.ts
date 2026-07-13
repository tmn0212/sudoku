/**
 * Color-theme registry. A theme is just a set of CSS custom properties defined
 * in `themes.css` under `:root[data-theme="<id>"]`; switching themes only flips
 * one attribute on <html>, so it's instant and adds no JS/runtime cost.
 */

export type ThemeId =
  | 'system'
  | 'light'
  | 'dark'
  | 'sepia'
  | 'ocean'
  | 'forest'
  | 'grape'
  | 'contrast';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  /** A representative swatch [background, accent] for the picker. */
  swatch: [string, string];
}

export const THEMES: ThemeDef[] = [
  { id: 'system', label: 'System', swatch: ['#eef1f6', '#1f6feb'] },
  { id: 'light', label: 'Classic', swatch: ['#ffffff', '#1f6feb'] },
  { id: 'dark', label: 'Dark', swatch: ['#0e1320', '#4f8bff'] },
  { id: 'sepia', label: 'Sepia', swatch: ['#f4ecd8', '#b06a2c'] },
  { id: 'ocean', label: 'Ocean', swatch: ['#0b1a2b', '#35a0e0'] },
  { id: 'forest', label: 'Forest', swatch: ['#eef3ea', '#3a7d44'] },
  { id: 'grape', label: 'Grape', swatch: ['#17111f', '#a56be0'] },
  { id: 'contrast', label: 'High Contrast', swatch: ['#ffffff', '#0033cc'] },
];

export const isThemeId = (value: string): value is ThemeId =>
  THEMES.some((t) => t.id === value);

// Applying a theme is a platform concern (web sets `data-theme`), so it lives
// behind the ThemeApplier port in `platform/theme.ts` — this module stays a
// portable, DOM-free registry.
