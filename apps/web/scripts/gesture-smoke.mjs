/**
 * Gesture interaction smoke — validates the board's *pointer* handling in a real
 * browser: tap, double-tap-to-cycle-mode, drag-to-multi-select, and
 * hold-to-open-radial. Unit tests cover the pure gesture reducer
 * (src/components/boardGestures.test.ts); this covers the web adapter around it
 * (DOM hit-testing, the long-press timer, effect interpretation) — the seam that
 * jsdom can't exercise because it has no layout for `elementFromPoint`.
 *
 * Not part of `npm test`. Run it when you touch board input or the gesture
 * reducer (see docs/architecture/05-testing.md):
 *   1. npm run dev            # http://localhost:5173
 *   2. npm run test:gestures
 */

import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.SMOKE_URL ?? 'http://localhost:5173';

// Resolve playwright-core wherever the package manager hoists it (see visual-smoke.mjs).
const require = createRequire(import.meta.url);
const pw = (await import(require.resolve('playwright-core'))).default;

const findChromium = () => {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const base = join(homedir(), '.cache/ms-playwright');
  for (const d of readdirSync(base).filter((x) => x.startsWith('chromium')).sort().reverse()) {
    const p = join(base, d, 'chrome-linux64/chrome');
    try { readdirSync(dirname(p)); return p; } catch { /* next */ }
  }
  throw new Error(`No Playwright Chromium under ${base}. Set PLAYWRIGHT_CHROMIUM.`);
};

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`);
};

const run = async () => {
  const browser = await pw.chromium.launch({
    executablePath: findChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ viewport: { width: 428, height: 926 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    console.error(`\n✖ Could not reach ${URL}. Is \`npm run dev\` running?`);
    await browser.close();
    process.exit(1);
  }
  await page.waitForFunction(() => window.__stores?.game, { timeout: 10000 });
  await page.evaluate(() => {
    window.__stores.settings.getState().setTheme('light');
    window.__stores.game.getState().newGame('medium', 'good');
    window.__stores.ui.getState().navigate('game');
  });
  await page.waitForSelector('.board');
  await page.evaluate(() => document.getElementById('splash')?.remove()); // don't let it eat pointers
  await page.waitForTimeout(200);

  const g = () => page.evaluate(() => {
    const s = window.__stores.game.getState();
    return { selected: s.selected, selection: s.selection, inputMode: s.inputMode };
  });
  const centre = async (i) => {
    const box = await page.locator(`.cell[data-index="${i}"]`).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const reset = () => page.evaluate(() => {
    window.__stores.game.getState().setInputMode('normal');
    window.__stores.game.getState().setSelection([]);
  });

  // Two empty, same-row, adjacent cells for the drag.
  const { a, b } = await page.evaluate(() => {
    const given = window.__stores.game.getState().given;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 8; c++) {
      const i = r * 9 + c;
      if (!given[i] && !given[i + 1]) return { a: i, b: i + 1 };
    }
    return { a: 0, b: 1 };
  });

  // 1) Tap selects the single cell.
  await reset();
  let p = await centre(a);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up();
  let st = await g();
  check('tap selects the cell', st.selected === a && st.selection.length === 1, `selected=${st.selected} len=${st.selection.length}`);

  // 2) Double-tap cycles the input mode (normal -> note).
  await page.waitForTimeout(400); await reset();
  p = await centre(a);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(60);
  await page.mouse.down(); await page.mouse.up();
  st = await g();
  check('double-tap cycles mode', st.inputMode === 'note', `inputMode=${st.inputMode}`);

  // 3) Drag across two cells multi-selects and switches to notes.
  await page.waitForTimeout(400); await reset();
  const pa = await centre(a), pb = await centre(b);
  await page.mouse.move(pa.x, pa.y); await page.mouse.down();
  await page.mouse.move(pb.x, pb.y, { steps: 8 }); await page.mouse.up();
  st = await g();
  check('drag multi-selects + switches to notes', st.selection.length >= 2 && st.inputMode === 'note', `len=${st.selection.length} mode=${st.inputMode}`);

  // 4) Long-press opens the radial; release closes it.
  await page.waitForTimeout(400); await reset();
  p = await centre(a);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.waitForTimeout(560);
  const radialOpen = await page.locator('.radial').count();
  await page.mouse.up();
  await page.waitForTimeout(100);
  const radialClosed = await page.locator('.radial').count();
  check('long-press opens radial, release closes it', radialOpen === 1 && radialClosed === 0, `open=${radialOpen} closed=${radialClosed}`);

  // 5) Holding a cell inside a multi-selection offers Deselect (down-left), which
  //    drops just that cell. Seed a 3-cell selection, then hold+drag the middle
  //    one toward the down-left option.
  await page.waitForTimeout(400); await reset();
  const trio = await page.evaluate(() => {
    const given = window.__stores.game.getState().given;
    const out = [];
    for (let i = 0; i < 81 && out.length < 3; i++) if (!given[i]) out.push(i);
    window.__stores.game.getState().setSelection(out);
    return out;
  });
  const pm = await centre(trio[1]);
  await page.mouse.move(pm.x, pm.y); await page.mouse.down();
  await page.waitForTimeout(560);
  const deselectShown = await page.locator('.radial__opt--danger').count();
  // Drag toward down-left (dx<0, dy>0) past the dead zone to arm Deselect.
  await page.mouse.move(pm.x - 55, pm.y + 55, { steps: 6 });
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const sel = (await g()).selection;
  check(
    'hold in multi-selection deselects just the held cell',
    deselectShown === 1 && sel.length === 2 && !sel.includes(trio[1]),
    `shown=${deselectShown} sel=[${sel}] removed=${trio[1]}`,
  );

  await browser.close();

  const failed = results.filter((ok) => !ok).length;
  if (errors.length) console.error(`\nconsole/page errors: ${errors.join(' | ')}`);
  console.log(`\n${results.length - failed}/${results.length} gesture checks passed${errors.length ? `, ${errors.length} console errors` : ''}`);
  if (failed || errors.length) process.exit(1);
  console.log('\nAll gesture smoke checks passed.');
};

run().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
