/**
 * Procedurally generates the SFX packs (no external/licensed audio). Unlike a
 * plain timbre swap, EACH pack has its own sound design — different articulation,
 * pitch sweeps, transients and motifs — so the packs sound genuinely distinct.
 * Written to apps/web/src/assets/audio/sfx/<pack>/<cue>.ogg. Re-run with:
 *
 *   node apps/web/scripts/generate-sounds.mjs
 *
 * Cues: place, note, erase, error, complete, win, lose. Swap in produced audio
 * later by replacing the .ogg files; the player loads via import.meta.glob.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SR = 44100;
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', 'src', 'assets', 'audio', 'sfx');
const TMP = join(HERE, '..', '..', 'node_modules', '.cache', 'sfx');
mkdirSync(TMP, { recursive: true });
let seed = 0x9e3779b9;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 0xffffffff) * 2 - 1; };

const N = {
  A3: 220, C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392, A4: 440,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760, B6: 1975.53,
};
const osc = (w, ph) =>
  w === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) :
  w === 'saw' ? 2 * ((ph / (2 * Math.PI)) % 1) - 1 :
  w === 'square' ? (Math.sin(ph) >= 0 ? 1 : -1) :
  w === 'pulse' ? (((ph / (2 * Math.PI)) % 1) < 0.28 ? 1 : -1) : Math.sin(ph);

// --- three synthesis primitives, driven by event objects ---
const synthTone = (buf, e) => {
  const { t, f, to = f, dur, g = 0.8, decay = 14, attack = 0.004, wave = 'sine', harms = [1], vib = 0 } = e;
  const start = Math.floor(t * SR), len = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, k = i / len;
    let fr = f + (to - f) * k;
    if (vib) fr *= 1 + vib * Math.sin(2 * Math.PI * 6 * tt);
    ph += (2 * Math.PI * fr) / SR;
    const env = Math.exp(-tt * decay) * Math.min(1, tt / attack);
    let s = 0;
    for (let h = 0; h < harms.length; h++) if (harms[h]) s += harms[h] * osc(wave, ph * (h + 1));
    const j = start + i;
    if (j < buf.length) buf[j] += g * env * s;
  }
};
const BELL = [[1, 1, 3], [2.01, 0.6, 4], [2.79, 0.4, 5], [4.16, 0.24, 6], [5.43, 0.12, 7.5]];
const synthBell = (buf, e) => {
  const { t, f, dur, g = 0.8 } = e;
  const start = Math.floor(t * SR), len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let s = 0;
    for (const [r, a, d] of BELL) s += a * Math.exp(-tt * d) * Math.sin(2 * Math.PI * f * r * tt);
    const j = start + i;
    if (j < buf.length) buf[j] += g * 0.5 * Math.min(1, tt / 0.002) * s;
  }
};
const synthNoise = (buf, e) => {
  const { t, dur, g = 0.5, decay = 60, tone = 0 } = e;
  const start = Math.floor(t * SR), len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let v = rnd();
    if (tone) v = 0.5 * v + 0.5 * Math.sin(2 * Math.PI * tone * tt);
    const j = start + i;
    if (j < buf.length) buf[j] += g * Math.exp(-tt * decay) * v;
  }
};
const render = (events) => {
  let end = 0;
  for (const e of events) end = Math.max(end, e.t + e.dur);
  const buf = new Float32Array(Math.ceil((end + 0.05) * SR));
  for (const e of events) (e.type === 'bell' ? synthBell : e.type === 'noise' ? synthNoise : synthTone)(buf, e);
  return buf;
};

// --- helpers for composite voices ---
const marimba = (t, f, dur = 0.26, g = 0.85) => [
  { type: 'noise', t, dur: 0.02, g: 0.18, decay: 180, tone: f * 2 }, // mallet knock
  { t, f, dur, g, decay: 24, wave: 'sine', harms: [1, 0, 0, 0.55] },
];
const cbell = (t, f, dur, g) => [ // detuned shimmer bell
  { type: 'bell', t, f, dur, g },
  { type: 'bell', t, f: f * 1.005, dur, g: g * 0.6 },
];
const bloop = (t, f0, f1, dur, g) => [{ t, f: f0, to: f1, dur, g, decay: 13, wave: 'sine' }];
// Warm music-box / celesta voice: HARMONIC partials (not metallic), a smooth
// ~12ms attack (no harsh transient), a gentle decay, and a faint fast-decaying
// octave for soft sparkle. Kept in a mid register so it never gets piercing.
const mbox = (t, f, dur, g = 0.7) => [
  { t, f, dur, g, wave: 'sine', harms: [1, 0.26, 0.11, 0.05], attack: 0.012, decay: 7.5 },
  { t, f: f * 2, dur: dur * 0.55, g: g * 0.11, wave: 'sine', attack: 0.012, decay: 12 },
];

// --- the six packs: each its own sound design ---
const PACKS = {
  // Warm music-box / celesta — soft attack, harmonic (not metallic), gentle.
  chime: {
    place: () => mbox(0, N.C5, 0.34, 0.7),
    note: () => mbox(0, N.G5, 0.24, 0.48),
    erase: () => mbox(0, N.G4, 0.24, 0.48),
    error: () => [...mbox(0, N.E4, 0.3, 0.55), ...mbox(0.11, N.C4, 0.36, 0.5)],
    complete: () => [N.C5, N.E5, N.G5].flatMap((f, i) => mbox(i * 0.08, f, 0.42, 0.58)),
    win: () => [N.C5, N.E5, N.G5, N.C6].flatMap((f, i) => mbox(i * 0.1, f, 0.5, 0.58)),
    lose: () => [N.G4, N.E4, N.C4].flatMap((f, i) => mbox(i * 0.13, f, 0.42, 0.5)),
  },
  // Warm marimba + woodblock knock.
  wood: {
    place: () => marimba(0, N.E5, 0.28, 0.85),
    note: () => marimba(0, N.A5, 0.2, 0.6),
    erase: () => marimba(0, N.A4, 0.18, 0.6),
    error: () => [...marimba(0, N.D4, 0.3, 0.7), ...marimba(0.12, N.A3, 0.35, 0.7)],
    complete: () => [N.C5, N.E5, N.G5, N.C6].flatMap((f, i) => marimba(i * 0.06, f, 0.35, 0.75)),
    win: () => [N.C5, N.E5, N.G5, N.C6, N.E6].flatMap((f, i) => marimba(i * 0.09, f, 0.4, 0.8)),
    lose: () => [N.G4, N.Eb4, N.C4].flatMap((f, i) => marimba(i * 0.13, f, 0.4, 0.65)),
  },
  // Bouncy synth "boops" with a pitch bend + tick.
  pop: {
    place: () => [{ wave: 'tri', t: 0, f: 720, to: 520, dur: 0.12, g: 0.7, decay: 10 }, { type: 'noise', t: 0, dur: 0.02, g: 0.14, decay: 200, tone: 1400 }],
    note: () => [{ wave: 'tri', t: 0, f: 980, to: 820, dur: 0.09, g: 0.5, decay: 12 }],
    erase: () => [{ wave: 'tri', t: 0, f: 520, to: 320, dur: 0.1, g: 0.5, decay: 12 }],
    error: () => [{ wave: 'tri', t: 0, f: 320, to: 200, dur: 0.2, g: 0.6, decay: 6 }, { wave: 'tri', t: 0.08, f: 260, to: 170, dur: 0.2, g: 0.5, decay: 6 }],
    complete: () => [520, 660, 880].map((f, i) => ({ wave: 'tri', t: i * 0.07, f, to: f * 1.12, dur: 0.14, g: 0.5, decay: 9 })),
    win: () => [523, 659, 784, 1047].map((f, i) => ({ wave: 'tri', t: i * 0.09, f, to: f * 1.1, dur: 0.18, g: 0.55, decay: 7 })),
    lose: () => [520, 392, 300].map((f, i) => ({ wave: 'tri', t: i * 0.12, f, to: f * 0.85, dur: 0.22, g: 0.5, decay: 6 })),
  },
  // Playful water-droplet pops (fast upward pitch bend).
  bubble: {
    place: () => [...bloop(0, 500, 1100, 0.08, 0.6), { wave: 'sine', t: 0.05, f: 1100, dur: 0.08, g: 0.3, decay: 16 }],
    note: () => bloop(0, 700, 1300, 0.06, 0.45),
    erase: () => bloop(0, 900, 400, 0.08, 0.45),
    error: () => [...bloop(0, 400, 220, 0.18, 0.55), ...bloop(0.09, 320, 180, 0.2, 0.45)],
    complete: () => [[500, 900], [700, 1100], [900, 1400]].flatMap(([a, b], i) => bloop(i * 0.07, a, b, 0.1, 0.5)),
    win: () => [[523, 900], [659, 1100], [784, 1300], [1047, 1600]].flatMap(([a, b], i) => bloop(i * 0.09, a, b, 0.12, 0.55)),
    lose: () => [[600, 400], [450, 300], [350, 220]].flatMap(([a, b], i) => bloop(i * 0.12, a, b, 0.2, 0.5)),
  },
  // High shimmering detuned bells — ethereal / magical.
  crystal: {
    place: () => cbell(0, N.E6, 0.7, 0.5),
    note: () => cbell(0, N.A6, 0.5, 0.35),
    erase: () => cbell(0, N.A5, 0.4, 0.4),
    error: () => [...cbell(0, N.E5, 0.5, 0.4), ...cbell(0.12, N.C5, 0.6, 0.4)],
    complete: () => [N.E6, N.G6, N.B6].flatMap((f, i) => cbell(i * 0.09, f, 0.7, 0.42)),
    win: () => [N.C6, N.E6, N.G6, N.B6].flatMap((f, i) => cbell(i * 0.1, f, 0.8, 0.42)),
    lose: () => [N.G5, N.E5, N.C5].flatMap((f, i) => cbell(i * 0.13, f, 0.6, 0.36)),
  },
  // Punchy 8-bit square blips with pitch sweeps.
  arcade: {
    place: () => [{ wave: 'square', t: 0, f: N.C5, to: N.G5, dur: 0.06, g: 0.5, decay: 6 }, { wave: 'square', t: 0.06, f: N.G5, dur: 0.07, g: 0.5, decay: 8 }],
    note: () => [{ wave: 'square', t: 0, f: N.G5, to: N.C6, dur: 0.05, g: 0.4, decay: 10 }],
    erase: () => [{ wave: 'square', t: 0, f: N.G4, to: N.C4, dur: 0.09, g: 0.4, decay: 8 }],
    error: () => [{ wave: 'square', t: 0, f: N.E4, to: N.C4, dur: 0.12, g: 0.5, decay: 5 }, { wave: 'square', t: 0.1, f: N.C4, to: 174.61, dur: 0.16, g: 0.5, decay: 4 }],
    complete: () => [N.C5, N.E5, N.G5, N.C6].map((f, i) => ({ wave: 'square', t: i * 0.06, f, dur: 0.08, g: 0.4, decay: 9 })),
    win: () => [[N.G4, 0.1], [N.C5, 0.1], [N.E5, 0.1], [N.G5, 0.14], [N.C6, 0.3]].map(([f, d], i, a) => ({ wave: 'square', t: a.slice(0, i).reduce((s, x) => s + x[1], 0), f, dur: d, g: 0.45, decay: d > 0.2 ? 3 : 6 })),
    lose: () => [[N.C5, 0.12], [N.G4, 0.12], [N.E4, 0.12], [N.C4, 0.3]].map(([f, d], i, a) => ({ wave: 'square', t: a.slice(0, i).reduce((s, x) => s + x[1], 0), f, to: i === 3 ? 130.81 : f, dur: d, g: 0.4, decay: d > 0.2 ? 3 : 6 })),
  },
};

const CUES = ['place', 'note', 'erase', 'error', 'complete', 'win', 'lose'];

const toWav = (samples) => {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const norm = peak > 0 ? 0.9 / peak : 1;
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE((Math.max(-1, Math.min(1, samples[i] * norm)) * 32767) | 0, 44 + i * 2);
  return b;
};

// Only (re)generate the synth packs below — the `clean` pack is committed static
// Kenney CC0 assets (see assets/audio/CREDITS.md), so it is left untouched.
for (const [pack, cues] of Object.entries(PACKS)) {
  const dir = join(ROOT, pack);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const cue of CUES) {
    seed = 0x9e3779b9;
    const wav = join(TMP, `${pack}-${cue}.wav`);
    writeFileSync(wav, toWav(render(cues[cue]())));
    execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-qscale:a', '3', join(dir, `${cue}.ogg`)]);
  }
  console.log(`✓ pack ${pack}`);
}
rmSync(TMP, { recursive: true, force: true });
console.log(`Done -> ${ROOT}`);
