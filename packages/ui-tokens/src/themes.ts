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
  | 'contrast'
  | 'neon'
  | 'aurora'
  | 'sunset'
  | 'candy'
  | 'arcade';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  /** A representative swatch [background, accent] for the picker. */
  swatch: [string, string];
}

export const THEMES: ThemeDef[] = [
  { id: 'system', label: 'System', swatch: ['#eef1f6', '#1f6feb'] },
  { id: 'light', label: 'Classic', swatch: ['#ffffff', '#1f6feb'] },
  { id: 'dark', label: 'Dark', swatch: ['#0b1020', '#5b93ff'] },
  { id: 'sepia', label: 'Sepia', swatch: ['#f4ecd8', '#b06a2c'] },
  { id: 'ocean', label: 'Ocean', swatch: ['#06192b', '#22b8f5'] },
  { id: 'forest', label: 'Forest', swatch: ['#eef3ea', '#3a7d44'] },
  { id: 'grape', label: 'Grape', swatch: ['#140d20', '#b46bf2'] },
  { id: 'contrast', label: 'High Contrast', swatch: ['#ffffff', '#0033cc'] },
  // The "fun" set — bold, saturated palettes with theme-matched crosshairs.
  { id: 'neon', label: 'Neon', swatch: ['#100a20', '#ff2e97'] },
  { id: 'aurora', label: 'Aurora', swatch: ['#05161b', '#2fe6a8'] },
  { id: 'sunset', label: 'Sunset', swatch: ['#22101c', '#ff7a4d'] },
  { id: 'candy', label: 'Candy', swatch: ['#fff0f6', '#ff4d94'] },
  { id: 'arcade', label: 'Arcade', swatch: ['#0d1030', '#ffce31'] },
];

export const isThemeId = (value: string): value is ThemeId =>
  THEMES.some((t) => t.id === value);

// Applying a theme is a platform concern (web sets `data-theme`), so it lives
// behind the ThemeApplier port in `platform/theme.ts` — this module stays a
// portable, DOM-free registry.
