/**
 * Generates the PWA icons (no native image tooling required) by drawing a
 * simple Sudoku-board icon into an RGBA buffer and encoding it as PNG with
 * Node's built-in zlib. Run with: `node scripts/generate-icons.mjs`.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(OUT, { recursive: true });

const BLUE = [31, 111, 235];
const WHITE = [255, 255, 255];
const GRIDLINE = [206, 214, 226];

// 3x5 bitmap font for digits 0-9.
const FONT = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

// A scattered set of "given" digits, like a partially filled puzzle.
const DIGITS = [
  [0, 0, 5], [0, 4, 3], [1, 1, 8], [2, 7, 6], [3, 3, 2],
  [4, 4, 7], [5, 5, 1], [6, 2, 9], [7, 6, 4], [8, 8, 5],
];

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};

const encodePng = (width, height, rgba) => {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // Raw image data with a filter byte (0) per scanline.
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const draw = (S) => {
  const px = Buffer.alloc(S * S * 4);
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  };
  const rect = (x0, y0, w, h, color) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, color);
  };

  rect(0, 0, S, S, BLUE); // full-bleed background (maskable-friendly)

  const margin = Math.round(S * 0.13);
  const board = S - margin * 2;
  const cell = board / 9;

  rect(margin, margin, board, board, WHITE); // white board panel

  const thin = Math.max(1, Math.round(S / 220));
  const thick = Math.max(2, Math.round(S / 70));
  for (let i = 0; i <= 9; i++) {
    const isBox = i % 3 === 0;
    const t = isBox ? thick : thin;
    const color = isBox ? BLUE : GRIDLINE;
    const pos = Math.round(margin + i * cell - t / 2);
    rect(margin, pos, board, t, color); // horizontal
    rect(pos, margin, t, board, color); // vertical
  }

  // Blocky digits.
  for (const [row, col, digit] of DIGITS) {
    const glyph = FONT[digit];
    const dot = cell / 5.2; // pixel size within the 3x5 glyph
    const gw = dot * 3;
    const gh = dot * 5;
    const ox = margin + col * cell + (cell - gw) / 2;
    const oy = margin + row * cell + (cell - gh) / 2;
    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        if (glyph[gy][gx] === '1') {
          rect(Math.round(ox + gx * dot), Math.round(oy + gy * dot),
               Math.ceil(dot), Math.ceil(dot), BLUE);
        }
      }
    }
  }

  return encodePng(S, S, px);
};

const targets = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
  ['pwa-64x64.png', 64],
];
for (const [name, size] of targets) {
  writeFileSync(join(OUT, name), draw(size));
  console.log(`wrote ${name} (${size}x${size})`);
}
