/**
 * Animation-style registry. A style is just a set of alternate keyframes applied
 * to the board's placement (`.cell--pop`) and completion (`.cell--flash`) effects,
 * selected by a `data-anim` attribute on <html> (like `data-theme` / the font
 * var). `classic` is the built-in default and sets no attribute. DOM-free registry
 * — the web app renders the keyframes in `theme/animations.css`.
 */

export type AnimStyleId =
  | 'classic'
  | 'bouncy'
  | 'confetti'
  | 'glow'
  | 'flip'
  | 'minimal';

export interface AnimStyleDef {
  id: AnimStyleId;
  label: string;
  /** One-line description for the settings picker. */
  blurb: string;
}

export const ANIM_STYLES: AnimStyleDef[] = [
  { id: 'classic', label: 'Classic', blurb: 'The original green completion wave' },
  { id: 'bouncy', label: 'Bouncy', blurb: 'Springy, elastic pops' },
  { id: 'confetti', label: 'Confetti', blurb: 'A celebratory particle burst' },
  { id: 'glow', label: 'Glow', blurb: 'Neon glow pulses' },
  { id: 'flip', label: 'Flip', blurb: 'Digits flip in 3D' },
  { id: 'minimal', label: 'Minimal', blurb: 'Calm, subtle fades' },
];

export const isAnimStyleId = (value: string): value is AnimStyleId =>
  ANIM_STYLES.some((a) => a.id === value);
