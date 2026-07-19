/**
 * Procedurally generates the background music loop (no licensed audio). Synthesizes
 * a calm lofi/ambient progression (Am - F - C - G, twice) as stereo PCM, then
 * encodes a small seamless-looping .ogg into apps/web/src/assets/audio/music.ogg.
 *
 *   node apps/web/scripts/generate-music.mjs
 *
 * A-minor / C-pentatonic so it sits consonantly under the SFX. Deliberately gentle
 * (soft pads + light arpeggio + soft bass, no drums) so it never distracts from
 * solving. Replace music.ogg with a produced track later — the player loads by URL.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SR = 44100;
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'assets', 'audio');
const TMP = join(HERE, '..', '..', 'node_modules', '.cache', 'sfx');
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const BEAT = 0.8; // 75 BPM
const N = { // frequencies
  A2: 110, C3: 130.81, F2: 87.31, G2: 98, E3: 164.81,
  A3: 220, C4: 261.63, E4: 329.63, F3: 174.61, G3: 196, B3: 246.94, D4: 293.66,
  A4: 440, C5: 523.25, E5: 659.25, F4: 349.23, G4: 392, B4: 493.88, D5: 587.33,
};
// vi - IV - I - V in A minor, 4 beats each, played twice for a ~25.6s loop.
const PROG = [
  { bass: N.A2, triad: [N.A3, N.C4, N.E4], arp: [N.A4, N.C5, N.E5, N.C5] },
  { bass: N.F2, triad: [N.F3, N.A3, N.C4], arp: [N.F4, N.A4, N.C5, N.A4] },
  { bass: N.C3, triad: [N.C4, N.E4, N.G4], arp: [N.C5, N.E5, N.G4, N.E5] },
  { bass: N.G2, triad: [N.G3, N.B3, N.D4], arp: [N.G4, N.B4, N.D5, N.B4] },
];
const CHORD_BEATS = 4;
const LOOPS = 2;
const totalSec = PROG.length * LOOPS * CHORD_BEATS * BEAT;
const L = new Float32Array(Math.ceil(totalSec * SR));
const R = new Float32Array(L.length);

const add = (start, dur, freq, gain, attack, release, harms, pan) => {
  const s = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  const rel = release * SR;
  const gl = gain * (0.5 - pan * 0.5) * 2 * 0.5; // simple constant-power-ish pan
  const gr = gain * (0.5 + pan * 0.5) * 2 * 0.5;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let env;
    if (t < attack) env = t / attack;
    else if (i > len - rel) env = Math.max(0, (len - i) / rel);
    else env = 1;
    let v = 0;
    for (let h = 0; h < harms.length; h++) v += harms[h] * Math.sin(2 * Math.PI * freq * (h + 1) * t);
    const j = s + i;
    if (j < L.length) { L[j] += gl * env * v; R[j] += gr * env * v; }
  }
};
const pluck = (start, freq, dur, gain, decay, pan) => {
  const s = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  const gl = gain * (0.5 - pan * 0.5);
  const gr = gain * (0.5 + pan * 0.5);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t * decay) * Math.min(1, t / 0.005);
    const v = Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2 * t);
    const j = s + i;
    if (j < L.length) { L[j] += gl * env * v; R[j] += gr * env * v; }
  }
};

let t = 0;
for (let loop = 0; loop < LOOPS; loop++) {
  for (const chord of PROG) {
    const chordDur = CHORD_BEATS * BEAT;
    // Soft sustained pad (triad), gentle attack/release so chord changes are smooth.
    chord.triad.forEach((f, k) =>
      add(t, chordDur + 0.05, f, 0.15, 0.35, 0.5, [1, 0, 0.25], (k - 1) * 0.3));
    // Soft bass on beats 1 and 3.
    pluck(t, chord.bass, 1.4, 0.5, 2.2, 0);
    pluck(t + 2 * BEAT, chord.bass, 1.2, 0.36, 2.4, 0);
    // Light arpeggio, one note per beat, panned gently, alternating.
    chord.arp.forEach((f, k) =>
      pluck(t + k * BEAT + 0.02, f, 0.7, 0.16, 5, k % 2 === 0 ? -0.4 : 0.4));
    t += chordDur;
  }
}

// Normalize the stereo pair together to keep the image, target ~0.85 peak.
let peak = 0;
for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = peak > 0 ? 0.85 / peak : 1;

const wav = Buffer.alloc(44 + L.length * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + L.length * 4, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(L.length * 4, 40);
for (let i = 0; i < L.length; i++) {
  const l = Math.max(-1, Math.min(1, L[i] * norm));
  const r = Math.max(-1, Math.min(1, R[i] * norm));
  wav.writeInt16LE((l * 32767) | 0, 44 + i * 4);
  wav.writeInt16LE((r * 32767) | 0, 44 + i * 4 + 2);
}
const wavPath = join(TMP, 'music.wav');
writeFileSync(wavPath, wav);
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wavPath, '-c:a', 'libvorbis', '-qscale:a', '4', join(OUT, 'music.ogg')]);
rmSync(wavPath, { force: true });
console.log(`✓ music.ogg (${totalSec.toFixed(1)}s loop) -> ${OUT}`);
