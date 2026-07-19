/**
 * Theme presets — one-tap "vibes" that bundle a colour theme + font + animation
 * style + SFX pack + music track. Applying a preset sets all five at once; the
 * user can still tweak any dimension afterwards (à-la-carte in the Look/Sound
 * tabs). DOM-free registry — ids reference the other registries in this package.
 */

import type { ThemeId } from './themes';
import type { FontId } from './fonts';
import type { AnimStyleId } from './animations';
import type { SfxStyleId, MusicTrackId } from './audio';

export interface ThemePreset {
  id: string;
  name: string;
  blurb: string;
  theme: ThemeId;
  font: FontId;
  anim: AnimStyleId;
  sfx: SfxStyleId;
  music: MusicTrackId;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'classic', name: 'Classic Calm', blurb: 'Clean & focused', theme: 'light', font: 'system', anim: 'classic', sfx: 'clean', music: 'lofi' },
  { id: 'midnight', name: 'Midnight Jazz', blurb: 'Late-night lounge', theme: 'dark', font: 'code', anim: 'minimal', sfx: 'wood', music: 'jazz' },
  { id: 'ocean', name: 'Deep Ocean', blurb: 'Calm & immersive', theme: 'ocean', font: 'system', anim: 'classic', sfx: 'crystal', music: 'ambient' },
  { id: 'forest', name: 'Forest Zen', blurb: 'Warm nature vibes', theme: 'forest', font: 'rounded', anim: 'bouncy', sfx: 'wood', music: 'bossa' },
  { id: 'sepia', name: 'Sepia Study', blurb: 'Old-world study', theme: 'sepia', font: 'handwritten', anim: 'minimal', sfx: 'chime', music: 'piano' },
  { id: 'grape', name: 'Grape Lounge', blurb: 'Moody & smooth', theme: 'grape', font: 'mono', anim: 'glow', sfx: 'pop', music: 'jazz' },
  { id: 'neon', name: 'Neon Nights', blurb: '80s synthwave arcade', theme: 'neon', font: 'retro', anim: 'glow', sfx: 'arcade', music: 'synthwave' },
  { id: 'aurora', name: 'Aurora Dream', blurb: 'Dreamy & ethereal', theme: 'aurora', font: 'code', anim: 'glow', sfx: 'crystal', music: 'ambient' },
  { id: 'sunset', name: 'Sunset Groove', blurb: 'Golden-hour groove', theme: 'sunset', font: 'handwritten', anim: 'bouncy', sfx: 'pop', music: 'bossa' },
  { id: 'candy', name: 'Candy Pop', blurb: 'Sweet & playful', theme: 'candy', font: 'chunky', anim: 'confetti', sfx: 'bubble', music: 'lofi' },
  { id: 'party', name: 'Party Time', blurb: 'Loud & fun', theme: 'candy', font: 'party', anim: 'confetti', sfx: 'bubble', music: 'arcade' },
  { id: 'arcade', name: 'Retro Arcade', blurb: 'Full retro cabinet', theme: 'arcade', font: 'arcade', anim: 'confetti', sfx: 'arcade', music: 'arcade' },
];
