/**
 * Procedurally generates the game's sound-effect files (no external/licensed
 * audio). Each SFX is synthesized as PCM, written to a temp WAV, then encoded to
 * a small .ogg with ffmpeg into apps/web/src/assets/audio/. Re-run with:
 *
 *   node apps/web/scripts/generate-sounds.mjs
 *
 * The palette is a C-major pentatonic so every cue is consonant, using soft
 * pluck envelopes (exponential decay) with a couple of harmonics for warmth.
 * These are deliberately gentle/musical, not harsh "beeps". Swap in produced
 * audio later by replacing the .ogg files (same names) — the player loads by URL.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'audio');
const TMP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'node_modules', '.cache', 'sfx');
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

// Pentatonic-ish note frequencies (Hz).
const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5,
};

/** One decaying pluck: fundamental + soft harmonics, exp amplitude decay. */
const pluck = (buf, startSec, freq, durSec, gain = 0.9, decay = 16, harms = [1, 0.35, 0.14]) => {
  const start = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t * decay) * Math.min(1, t / 0.004); // 4ms attack, no click
    let s = 0;
    for (let h = 0; h < harms.length; h++) s += harms[h] * Math.sin(2 * Math.PI * freq * (h + 1) * t);
    const j = start + i;
    if (j < buf.length) buf[j] += gain * env * s;
  }
};

/** A short frequency glide (chirp), triangle-ish. */
const chirp = (buf, startSec, f0, f1, durSec, gain = 0.7) => {
  const start = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const k = i / len;
    const f = f0 + (f1 - f0) * k;
    phase += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.003) * Math.exp(-t * 10);
    const j = start + i;
    if (j < buf.length) buf[j] += gain * env * (Math.sin(phase) + 0.18 * Math.sin(3 * phase));
  }
};

const buffer = (durSec) => new Float32Array(Math.ceil(durSec * SR));

// ---- the sound set -------------------------------------------------------
const SOUNDS = {
  // A soft, bright pluck when a digit lands.
  place: () => { const b = buffer(0.22); pluck(b, 0, N.E5, 0.22, 0.9, 18); return b; },
  // Lighter, higher tick for a pencil note / ban mark.
  note: () => { const b = buffer(0.16); pluck(b, 0, N.A5, 0.16, 0.55, 26, [1, 0.25]); return b; },
  // Two gentle descending tones — a "not quite" rather than a harsh error.
  error: () => {
    const b = buffer(0.32);
    pluck(b, 0, N.D4, 0.16, 0.7, 16, [1, 0.5, 0.25]);
    pluck(b, 0.1, 220.0, 0.22, 0.7, 14, [1, 0.5, 0.25]);
    return b;
  },
  // Soft downward blip when clearing a cell.
  erase: () => { const b = buffer(0.14); chirp(b, 0, 520, 190, 0.12, 0.5); return b; },
  // Rising major arpeggio — a unit or digit is complete.
  complete: () => {
    const b = buffer(0.5);
    [N.C5, N.E5, N.G5].forEach((f, i) => pluck(b, i * 0.06, f, 0.4, 0.8, 9));
    pluck(b, 0.12, N.C6, 0.42, 0.5, 8, [1, 0.3]); // a little sparkle on top
    return b;
  },
  // Triumphant four-note run for a solved puzzle.
  win: () => {
    const b = buffer(0.95);
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => pluck(b, i * 0.1, f, 0.6, 0.85, 6));
    pluck(b, 0.4, N.E6, 0.55, 0.4, 6, [1, 0.4, 0.15]);
    return b;
  },
  // Gentle descending minor — arcade run out of lives.
  lose: () => {
    const b = buffer(0.7);
    [N.G4, 311.13, N.C4].forEach((f, i) => pluck(b, i * 0.14, f, 0.5, 0.75, 8, [1, 0.4]));
    return b;
  },
};

/** Float32 [-inf,inf] -> normalized 16-bit WAV Buffer (mono). */
const toWav = (samples) => {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const norm = peak > 0 ? 0.92 / peak : 1;
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * norm));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  return buf;
};

for (const [name, gen] of Object.entries(SOUNDS)) {
  const wav = join(TMP, `${name}.wav`);
  const ogg = join(OUT, `${name}.ogg`);
  writeFileSync(wav, toWav(gen()));
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-qscale:a', '3', ogg]);
  console.log(`✓ ${name}.ogg`);
}
rmSync(TMP, { recursive: true, force: true });
console.log(`Done -> ${OUT}`);
