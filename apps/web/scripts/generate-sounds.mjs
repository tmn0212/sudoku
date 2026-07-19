/**
 * Procedurally generates the SFX packs (no external/licensed audio). Every pack
 * plays the SAME musical cues (so each is recognisable) with a different timbre,
 * written to apps/web/src/assets/audio/sfx/<pack>/<cue>.ogg. Re-run with:
 *
 *   node apps/web/scripts/generate-sounds.mjs
 *
 * Cues: place, note, erase, error, complete, win, lose — all on a C-major
 * pentatonic so they stay consonant. Swap in produced audio later by replacing
 * the .ogg files (same layout); the player loads them by URL via import.meta.glob.
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

const F = {
  D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33,
  E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5, Eb4: 311.13, A2: 110,
};

// A pack is a timbre: how one note is voiced. Musical content is shared below.
const PACKS = {
  chime: { harms: [1, 0.35, 0.14], decay: 16, detune: 0, soft: 1 }, // warm bell plucks
  arcade: { harms: [1, 0, 0.34, 0, 0.2, 0, 0.13], decay: 11, detune: 0, soft: 0.8 }, // square blips
  pop: { harms: [1, 0.5, 0.3, 0.16], decay: 13, detune: 1.008, soft: 0.9 }, // bright detuned synth
  wood: { harms: [1, 0, 0, 0.7, 0, 0.15], decay: 26, detune: 0, soft: 1 }, // marimba (strong 4th)
};

/** Render one note of `pack`'s timbre into buf at startSec. */
const note = (buf, pack, startSec, freq, durSec, gain = 0.9) => {
  const p = PACKS[pack];
  const start = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t * p.decay) * Math.min(1, t / 0.004);
    let s = 0;
    for (let h = 0; h < p.harms.length; h++) {
      const a = p.harms[h];
      if (!a) continue;
      s += a * Math.sin(2 * Math.PI * freq * (h + 1) * t);
      if (p.detune) s += a * 0.5 * Math.sin(2 * Math.PI * freq * (h + 1) * p.detune * t);
    }
    const j = start + i;
    if (j < buf.length) buf[j] += gain * p.soft * env * s;
  }
};
const chirp = (buf, pack, startSec, f0, f1, durSec, gain = 0.6) => {
  const start = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  let ph = 0;
  const buzz = pack === 'arcade' ? 0.4 : 0.15;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = f0 + (f1 - f0) * (i / len);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.003) * Math.exp(-t * 10);
    const j = start + i;
    if (j < buf.length) buf[j] += gain * PACKS[pack].soft * env * (Math.sin(ph) + buzz * Math.sin(3 * ph));
  }
};
const buf = (durSec) => new Float32Array(Math.ceil(durSec * SR));

// Shared musical cues — a function of the pack (timbre) only.
const CUES = {
  place: (p) => { const b = buf(0.22); note(b, p, 0, F.E5, 0.22, 0.9); return b; },
  note: (p) => { const b = buf(0.16); note(b, p, 0, F.A5, 0.16, 0.55); return b; },
  error: (p) => {
    const b = buf(0.32);
    note(b, p, 0, F.D4, 0.16, 0.7);
    note(b, p, 0.1, 220.0, 0.22, 0.7);
    return b;
  },
  erase: (p) => { const b = buf(0.14); chirp(b, p, 0, 520, 190, 0.12, 0.5); return b; },
  complete: (p) => {
    const b = buf(0.5);
    [F.C5, F.E5, F.G5].forEach((f, i) => note(b, p, i * 0.06, f, 0.4, 0.8));
    note(b, p, 0.12, F.C6, 0.42, 0.5);
    return b;
  },
  win: (p) => {
    const b = buf(0.95);
    [F.C5, F.E5, F.G5, F.C6].forEach((f, i) => note(b, p, i * 0.1, f, 0.6, 0.85));
    note(b, p, 0.4, F.E6, 0.55, 0.4);
    return b;
  },
  lose: (p) => {
    const b = buf(0.7);
    [F.G4, F.Eb4, 261.63].forEach((f, i) => note(b, p, i * 0.14, f, 0.5, 0.75));
    return b;
  },
};

const toWav = (samples) => {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const norm = peak > 0 ? 0.92 / peak : 1;
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * norm));
    b.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  return b;
};

rmSync(ROOT, { recursive: true, force: true });
for (const pack of Object.keys(PACKS)) {
  const dir = join(ROOT, pack);
  mkdirSync(dir, { recursive: true });
  for (const [cue, gen] of Object.entries(CUES)) {
    const wav = join(TMP, `${pack}-${cue}.wav`);
    writeFileSync(wav, toWav(gen(pack)));
    execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-qscale:a', '3', join(dir, `${cue}.ogg`)]);
  }
  console.log(`✓ pack ${pack}`);
}
rmSync(TMP, { recursive: true, force: true });
console.log(`Done -> ${ROOT}`);
