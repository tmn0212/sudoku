/**
 * Background-music port.
 *
 * A single looping `<audio>` element (built-in gapless-enough looping + trivial
 * pause/resume-at-position, which is what music wants — unlike the low-latency
 * Web Audio path the SFX use). The track is the self-hosted, procedurally
 * generated loop (scripts/generate-music.mjs — no licensed audio). Playback still
 * needs a user gesture; `play()` rejects silently until then and the useMusic hook
 * retries on the next gesture. A native port swaps this binding.
 */

import trackUrl from '../assets/audio/music.ogg';

export interface Music {
  play(): void;
  pause(): void;
  setVolume(v: number): void;
}

let el: HTMLAudioElement | null = null;

const ensure = (): HTMLAudioElement | null => {
  if (el) return el;
  if (typeof Audio === 'undefined') return null;
  el = new Audio(trackUrl);
  el.loop = true;
  el.volume = 0.32;
  el.preload = 'auto';
  return el;
};

/** Web adapter over a looping <audio> element. */
export const webMusic: Music = {
  play: () => {
    const a = ensure();
    // Rejects if no user gesture yet / element not ready — the hook retries.
    if (a) void a.play().catch(() => {});
  },
  pause: () => el?.pause(),
  setVolume: (v) => {
    const a = ensure();
    if (a) a.volume = Math.max(0, Math.min(1, v));
  },
};

/** The active music implementation (web today; a native port swaps this binding). */
export const music: Music = webMusic;
