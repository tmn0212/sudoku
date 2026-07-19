/**
 * Sound-effect port.
 *
 * Like `haptics`, consumers depend on the `Sound` interface with semantic verbs
 * (`place()`, `error()`, `win()`, …), never on Web Audio directly. The web adapter
 * plays the bundled, self-hosted SFX packs (scripts/generate-sounds.mjs — no
 * licensed assets); every pack holds the same cues in a different timbre. The
 * active pack + volume come from settings (pushed in via setPack/setVolume).
 *
 * Web Audio can only start after a user gesture, so the context is created +
 * unlocked (and every pack decoded) on the first pointer/key event; calls before
 * that are silent no-ops. Muting/volume is applied here via a master gain.
 */

import type { SfxStyleId } from '@sudoku/ui-tokens';

// All pack cues as fingerprinted URLs: ../assets/audio/sfx/<pack>/<cue>.ogg
const FILES = import.meta.glob('../assets/audio/sfx/*/*.ogg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

type Cue = 'place' | 'note' | 'erase' | 'error' | 'complete' | 'win' | 'lose';

// { "<pack>/<cue>": url }
const URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(FILES)) {
  const parts = path.split('/');
  const pack = parts[parts.length - 2];
  const cue = parts[parts.length - 1].replace('.ogg', '');
  URLS[`${pack}/${cue}`] = url;
}

export interface Sound {
  place(): void;
  note(): void;
  erase(): void;
  error(): void;
  complete(): void;
  win(): void;
  lose(): void;
  /** Switch the active pack (timbre). */
  setPack(id: SfxStyleId): void;
  /** Set the master volume, 0–1. */
  setVolume(v: number): void;
  /** Play a representative cue in the current pack (for the settings preview). */
  preview(): void;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.7;
let pack = 'chime';
const buffers = new Map<string, AudioBuffer>();

const ensureCtx = (): AudioContext | null => {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  // Decode every pack's cues once (each a few KB) so pack + preview switches are
  // instant.
  for (const [key, url] of Object.entries(URLS)) {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx!.decodeAudioData(b))
      .then((buf) => buffers.set(key, buf))
      .catch(() => {
        /* a missing/undecodable cue stays silent */
      });
  }
  return ctx;
};

const unlock = (): void => {
  const c = ensureCtx();
  if (c && c.state === 'suspended') void c.resume();
};
if (typeof window !== 'undefined') {
  const opts = { once: true, passive: true } as const;
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
}

const play = (cue: Cue): void => {
  if (!ctx || ctx.state !== 'running' || !master) return;
  const buf = buffers.get(`${pack}/${cue}`);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(master);
  try {
    src.start();
  } catch {
    /* ignore */
  }
};

/** Web adapter over the Web Audio API. */
export const webSound: Sound = {
  place: () => play('place'),
  note: () => play('note'),
  erase: () => play('erase'),
  error: () => play('error'),
  complete: () => play('complete'),
  win: () => play('win'),
  lose: () => play('lose'),
  setPack: (id) => {
    pack = id;
  },
  setVolume: (v) => {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = volume;
  },
  preview: () => play('complete'),
};

/** The active sound implementation (web today; a native port swaps this binding). */
export const sound: Sound = webSound;
