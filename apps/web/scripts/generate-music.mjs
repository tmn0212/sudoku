/**
 * Procedurally generates the background-music tracks (no licensed audio). Each
 * style is a distinct arrangement (progression / tempo / timbres / drums) sharing
 * the low-level synth helpers, encoded to a small seamless-loop .ogg at
 * apps/web/src/assets/audio/music/<style>.ogg. Re-run with:
 *
 *   node apps/web/scripts/generate-music.mjs
 *
 * Styles: lofi (mellow pads), jazz (ii-V-I swing, walking bass), arcade (upbeat
 * chiptune), synthwave (driving retro). Deliberately loop-friendly and not too
 * busy. Replace an .ogg with a produced track later — the player loads by URL.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SR = 44100;
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'assets', 'audio', 'music');
const TMP = join(HERE, '..', '..', 'node_modules', '.cache', 'sfx');
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
// Seeded RNG so noise (drums) is reproducible across regenerations.
let seed = 0x2545f491;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 0xffffffff) * 2 - 1; };

const wave = (type, ph) => {
  if (type === 'sine') return Math.sin(ph);
  if (type === 'tri') return (2 / Math.PI) * Math.asin(Math.sin(ph));
  if (type === 'saw') { const x = (ph / (2 * Math.PI)) % 1; return 2 * x - 1; }
  if (type === 'square') return Math.sin(ph) >= 0 ? 1 : -1;
  if (type === 'pulse') return (ph / (2 * Math.PI)) % 1 < 0.3 ? 1 : -1;
  return Math.sin(ph);
};

let L, R;
const addNote = (start, dur, freq, o = {}) => {
  const { type = 'sine', gain = 0.2, attack = 0.01, release = 0.08, decay = 0, detune = 0, pan = 0 } = o;
  const s = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  const rel = release * SR;
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2 * 0.5;
  const gr = gain * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2 * 0.5;
  const w = 2 * Math.PI * freq;
  const w2 = 2 * Math.PI * freq * (1 + detune);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let env = t < attack ? t / attack : i > len - rel ? Math.max(0, (len - i) / rel) : 1;
    if (decay) env *= Math.exp(-t * decay);
    let v = wave(type, w * t);
    if (detune) v = 0.6 * v + 0.6 * wave(type, w2 * t);
    const j = s + i;
    if (j < L.length) { L[j] += gl * env * v; R[j] += gr * env * v; }
  }
};
const noise = (start, dur, gain, decay, pan = 0, tone = 0) => {
  const s = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  const gl = gain * (0.5 - pan * 0.5) * 1.4;
  const gr = gain * (0.5 + pan * 0.5) * 1.4;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t * decay) * Math.min(1, t / 0.001);
    let v = rnd();
    if (tone) v = 0.5 * v + 0.5 * Math.sin(2 * Math.PI * tone * t);
    const j = s + i;
    if (j < L.length) { L[j] += gl * env * v; R[j] += gr * env * v; }
  }
};
const kick = (start, gain = 0.7) => {
  const len = Math.floor(0.16 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 120 * Math.exp(-t * 32) + 45;
    const env = Math.exp(-t * 24) * Math.min(1, t / 0.002);
    const v = gain * env * Math.sin(2 * Math.PI * f * t);
    if (start * SR + i < L.length) { L[(start * SR | 0) + i] += v; R[(start * SR | 0) + i] += v; }
  }
};

// Chord tones (semitone offsets) for a root.
const QUAL = { min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10], min: [0, 3, 7], maj: [0, 4, 7] };
const chordMidi = (root, q) => QUAL[q].map((s) => root + s);

// ---- style arrangers -----------------------------------------------------
const STYLES = {
  // Mellow lofi: soft pad 7ths + soft bass + gentle arp, no drums.
  lofi: () => {
    const beat = 0.8, cb = 4, prog = [[57, 'min7'], [53, 'maj7'], [60, 'maj7'], [55, 'dom7']];
    const total = prog.length * 2 * cb * beat; alloc(total);
    let t = 0;
    for (let loop = 0; loop < 2; loop++) for (const [root, q] of prog) {
      const tones = chordMidi(root, q);
      tones.forEach((m, k) => addNote(t, cb * beat + 0.05, midi(m + 12), { type: 'tri', gain: 0.11, attack: 0.35, release: 0.5, pan: (k - 1.5) * 0.25, harms: 1 }));
      addNote(t, 1.4, midi(root - 12), { type: 'sine', gain: 0.42, decay: 2.2, release: 0.2 });
      addNote(t + 2 * beat, 1.2, midi(root - 12), { type: 'sine', gain: 0.3, decay: 2.4, release: 0.2 });
      [0, 2, 3, 2].forEach((idx, k) => addNote(t + k * beat + 0.02, 0.7, midi(tones[idx] + 12), { type: 'tri', gain: 0.1, decay: 4, pan: k % 2 ? 0.4 : -0.4 }));
      t += cb * beat;
    }
    return total;
  },
  // Jazz: ii-V-I-vi with 7th comping, walking bass, brushed hats (swing).
  jazz: () => {
    const beat = 0.5, cb = 4, prog = [[62, 'min7'], [55, 'dom7'], [60, 'maj7'], [57, 'min7']];
    const total = prog.length * 2 * cb * beat; alloc(total);
    let t = 0;
    for (let loop = 0; loop < 2; loop++) for (const [root, q] of prog) {
      const tones = chordMidi(root, q);
      // Walking bass: root, 3rd, 5th, 7th (down an octave), quarter notes.
      [tones[0], tones[1], tones[2], tones[3]].forEach((m, k) =>
        addNote(t + k * beat, beat * 0.9, midi(m - 24), { type: 'tri', gain: 0.36, decay: 3, release: 0.05 }));
      // Comping stabs on the swung "and" of 2 and 4.
      [1, 3].forEach((bt) => tones.forEach((m, k) =>
        addNote(t + bt * beat + beat * 0.66, 0.28, midi(m + 12), { type: 'tri', gain: 0.09, decay: 6, pan: (k - 1.5) * 0.2 })));
      // Soft brushed ride: swing eighths.
      for (let bt = 0; bt < cb; bt++) { noise(t + bt * beat, 0.09, 0.05, 60, 0.3); noise(t + bt * beat + beat * 0.66, 0.06, 0.035, 70, 0.3); }
      t += cb * beat;
    }
    return total;
  },
  // Arcade: upbeat chiptune — square bass eighths, pulse lead arp, kick+hat.
  arcade: () => {
    const beat = 0.4545, cb = 4, prog = [[48, 'maj'], [43, 'maj'], [45, 'min'], [41, 'maj']]; // C G Am F
    const total = prog.length * 2 * cb * beat; alloc(total);
    let t = 0;
    for (let loop = 0; loop < 2; loop++) for (const [root, q] of prog) {
      const tones = chordMidi(root, q);
      for (let e = 0; e < cb * 2; e++) { // eighth-note square bass
        addNote(t + e * beat / 2, beat / 2 * 0.9, midi(root), { type: 'square', gain: 0.13, decay: 4, release: 0.02 });
      }
      const arp = [tones[0], tones[1], tones[2], tones[1], tones[0], tones[2], tones[1], tones[2]];
      arp.forEach((m, e) => addNote(t + e * beat / 2, beat / 2 * 0.85, midi(m + 24), { type: 'pulse', gain: 0.12, decay: 5, pan: e % 2 ? 0.25 : -0.25 }));
      for (let bt = 0; bt < cb; bt++) { kick(t + bt * beat, 0.6); noise(t + bt * beat + beat / 2, 0.05, 0.06, 90, 0, 0); }
      t += cb * beat;
    }
    return total;
  },
  // Synthwave: driving saw bass, lush saw pad, bright arp, kick + snare 2&4.
  synthwave: () => {
    const beat = 0.5555, cb = 4, prog = [[45, 'min'], [41, 'maj'], [48, 'maj'], [43, 'maj']]; // Am F C G
    const total = prog.length * 2 * cb * beat; alloc(total);
    let t = 0;
    for (let loop = 0; loop < 2; loop++) for (const [root, q] of prog) {
      const tones = chordMidi(root, q);
      tones.forEach((m, k) => addNote(t, cb * beat + 0.05, midi(m + 12), { type: 'saw', gain: 0.06, attack: 0.15, release: 0.4, detune: 0.008, pan: (k - 1) * 0.3 }));
      for (let e = 0; e < cb * 2; e++) addNote(t + e * beat / 2, beat / 2 * 0.95, midi(root - 12), { type: 'saw', gain: 0.16, decay: 2, release: 0.03 }); // driving bass
      const arp = [tones[0], tones[2], tones[1], tones[2]];
      for (let bt = 0; bt < cb; bt++) addNote(t + bt * beat, 0.5, midi(arp[bt % arp.length] + 24), { type: 'square', gain: 0.07, decay: 3, pan: 0.15 });
      for (let bt = 0; bt < cb; bt++) { kick(t + bt * beat, 0.55); if (bt % 2 === 1) noise(t + bt * beat, 0.14, 0.14, 26, 0, 180); noise(t + bt * beat + beat / 2, 0.05, 0.03, 90, 0.2); }
      t += cb * beat;
    }
    return total;
  },
};

function alloc(totalSec) { L = new Float32Array(Math.ceil(totalSec * SR)); R = new Float32Array(L.length); }

const writeOgg = (name, totalSec) => {
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = peak > 0 ? 0.85 / peak : 1;
  const w = Buffer.alloc(44 + L.length * 4);
  w.write('RIFF', 0); w.writeUInt32LE(36 + L.length * 4, 4); w.write('WAVE', 8);
  w.write('fmt ', 12); w.writeUInt32LE(16, 16); w.writeUInt16LE(1, 20);
  w.writeUInt16LE(2, 22); w.writeUInt32LE(SR, 24); w.writeUInt32LE(SR * 4, 28);
  w.writeUInt16LE(4, 32); w.writeUInt16LE(16, 34);
  w.write('data', 36); w.writeUInt32LE(L.length * 4, 40);
  for (let i = 0; i < L.length; i++) {
    w.writeInt16LE((Math.max(-1, Math.min(1, L[i] * norm)) * 32767) | 0, 44 + i * 4);
    w.writeInt16LE((Math.max(-1, Math.min(1, R[i] * norm)) * 32767) | 0, 44 + i * 4 + 2);
  }
  const wav = join(TMP, `${name}.wav`);
  writeFileSync(wav, w);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-qscale:a', '4', join(OUT, `${name}.ogg`)]);
  rmSync(wav, { force: true });
  console.log(`✓ ${name}.ogg (${totalSec.toFixed(1)}s)`);
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const [name, arrange] of Object.entries(STYLES)) { seed = 0x2545f491; writeOgg(name, arrange()); }
rmSync(TMP, { recursive: true, force: true });
console.log(`Done -> ${OUT}`);
