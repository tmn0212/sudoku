/**
 * Background-music port.
 *
 * A single looping `<audio>` element whose source is the selected, self-hosted
 * track (scripts/generate-music.mjs — no licensed audio). The active track +
 * volume come from settings (pushed in via setTrack/setVolume). Playback needs a
 * user gesture; `play()` rejects silently until then and the useAudio hook retries
 * on the next gesture. A native port swaps this binding.
 */

import type { MusicTrackId } from '@sudoku/ui-tokens';

// { "<track>": url } from ../assets/audio/music/<track>.ogg
const FILES = import.meta.glob('../assets/audio/music/*.ogg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(FILES)) {
  URLS[path.split('/').pop()!.replace('.ogg', '')] = url;
}

export interface Music {
  play(): void;
  pause(): void;
  setTrack(id: MusicTrackId): void;
  setVolume(v: number): void;
}

let el: HTMLAudioElement | null = null;
let track = 'lofi';
let volume = 0.5;
let playing = false;

const ensure = (): HTMLAudioElement | null => {
  if (el) return el;
  if (typeof Audio === 'undefined') return null;
  el = new Audio(URLS[track]);
  el.loop = true;
  el.volume = volume;
  el.preload = 'auto';
  return el;
};

/** Web adapter over a looping <audio> element. */
export const webMusic: Music = {
  play: () => {
    const a = ensure();
    if (!a) return;
    playing = true;
    void a.play().catch(() => {}); // rejects until a gesture — useAudio retries
  },
  pause: () => {
    playing = false;
    el?.pause();
  },
  setTrack: (id) => {
    if (id === track) return;
    track = id;
    if (!el) return;
    el.src = URLS[track];
    if (playing) void el.play().catch(() => {}); // swap live
  },
  setVolume: (v) => {
    volume = Math.max(0, Math.min(1, v));
    if (el) el.volume = volume;
  },
};

/** The active music implementation (web today; a native port swaps this binding). */
export const music: Music = webMusic;
