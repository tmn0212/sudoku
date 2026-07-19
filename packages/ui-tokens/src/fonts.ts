/**
 * Font registry. A font choice is just a `font-family` stack; switching fonts
 * pushes that stack into the `--app-font` CSS custom property (see the
 * `FontApplier` port), so it's instant and adds no runtime cost.
 *
 * `system` is the built-in sans; the rest are self-hosted display faces bundled
 * for offline use (registered in apps/web/src/theme/fonts.ts). Each `stack`
 * leads with a bundled family name and falls back to a system generic so text
 * stays readable before the face loads. This is the single source of truth for
 * the stacks: the applier reads `stack` to set `--app-font`, and the settings
 * picker reads it to preview each option.
 */

export type FontId =
  | 'system'
  | 'rounded'
  | 'handwritten'
  | 'display'
  | 'arcade'
  | 'mono';

export interface FontDef {
  id: FontId;
  label: string;
  /** The CSS `font-family` value applied when this font is chosen. */
  stack: string;
}

/** The default sans stack — kept identical to `index.css`'s `:root` fallback. */
const SYSTEM_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const FONTS: FontDef[] = [
  { id: 'system', label: 'System', stack: SYSTEM_STACK },
  {
    id: 'rounded',
    label: 'Rounded',
    stack: "'Fredoka Variable', Fredoka, ui-rounded, 'Segoe UI', system-ui, sans-serif",
  },
  {
    id: 'handwritten',
    label: 'Handwritten',
    stack: "'Caveat Variable', Caveat, 'Segoe Print', 'Comic Sans MS', cursive",
  },
  {
    id: 'display',
    label: 'Display',
    stack: "Bungee, Impact, 'Arial Black', system-ui, sans-serif",
  },
  {
    id: 'arcade',
    label: 'Arcade',
    stack: "VT323, ui-monospace, 'Courier New', monospace",
  },
  {
    id: 'mono',
    label: 'Mono',
    stack: "'Space Mono', ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace",
  },
];

export const isFontId = (value: string): value is FontId =>
  FONTS.some((f) => f.id === value);

// Applying a font is a platform concern (web sets the `--app-font` var behind the
// FontApplier port in `platform/font.ts`), so this module stays a portable,
// DOM-free registry — mirroring `themes.ts`.
