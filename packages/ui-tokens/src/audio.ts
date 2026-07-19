/**
 * Audio registries: the selectable SFX packs + background-music tracks (ids +
 * labels + blurbs). DOM/asset-free — the web app maps these ids to the bundled
 * .ogg files (apps/web/src/assets/audio/{sfx/<pack>,music}) via import.meta.glob,
 * and stores the choice in settings like theme/font. Ids must match the asset
 * folder / file names.
 */

export type SfxStyleId = 'chime' | 'arcade' | 'pop' | 'wood';

export interface SfxStyleDef {
  id: SfxStyleId;
  label: string;
  blurb: string;
}

export const SFX_STYLES: SfxStyleDef[] = [
  { id: 'chime', label: 'Chime', blurb: 'Warm bell plucks' },
  { id: 'arcade', label: 'Arcade', blurb: 'Chiptune blips' },
  { id: 'pop', label: 'Pop', blurb: 'Bright synth' },
  { id: 'wood', label: 'Wood', blurb: 'Mellow marimba' },
];

export const isSfxStyleId = (v: string): v is SfxStyleId =>
  SFX_STYLES.some((s) => s.id === v);

export type MusicTrackId = 'lofi' | 'jazz' | 'arcade' | 'synthwave';

export interface MusicTrackDef {
  id: MusicTrackId;
  label: string;
  blurb: string;
}

export const MUSIC_TRACKS: MusicTrackDef[] = [
  { id: 'lofi', label: 'Lo-fi', blurb: 'Mellow, chilled' },
  { id: 'jazz', label: 'Jazz', blurb: 'Swing, walking bass' },
  { id: 'arcade', label: 'Arcade', blurb: 'Upbeat chiptune' },
  { id: 'synthwave', label: 'Synthwave', blurb: 'Driving retro' },
];

export const isMusicTrackId = (v: string): v is MusicTrackId =>
  MUSIC_TRACKS.some((t) => t.id === v);
