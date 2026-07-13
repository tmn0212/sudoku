/**
 * Visual smoke test — the honest backstop for device-visual bugs that unit tests
 * cannot see (iOS-standalone height, safe-area, short-screen board sizing, dark-theme
 * contrast, header overflow). Historically ~half of the bugs that reached the owner.
 *
 * It drives the running dev server via the dev-only `window.__stores`, captures a few
 * fixed viewport screenshots to `.visual-smoke/`, asserts there are zero console/page
 * errors, and runs a handful of headless layout assertions (a real browser has a layout
 * engine; jsdom does not).
 *
 * Usage:
 *   1. npm run dev            # in one terminal (http://localhost:5173)
 *   2. npm run test:visual    # in another
 *
 * Then LOOK at the PNGs in .visual-smoke/ — the assertions are tripwires, not a
 * substitute for eyes on the dark/short/notes cases. See docs/architecture/05-testing.md
 * and docs/architecture/ios-checklist.md.
 */

import { readdirSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.visual-smoke');
const URL = process.env.SMOKE_URL ?? 'http://localhost:5173';

// playwright-core must be imported by absolute path from here, and it's CommonJS.
const pw = (await import(join(ROOT, 'node_modules/playwright-core/index.js'))).default;
const { chromium } = pw;

/** Locate the cached Chromium the harness installed (version dir varies). */
const findChromium = () => {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const base = join(homedir(), '.cache/ms-playwright');
  let dirs = [];
  try {
    dirs = readdirSync(base).filter((d) => d.startsWith('chromium'));
  } catch {
    throw new Error(`No Playwright cache at ${base}. Install a browser or set PLAYWRIGHT_CHROMIUM.`);
  }
  for (const d of dirs.sort().reverse()) {
    const p = join(base, d, 'chrome-linux64/chrome');
    try {
      readdirSync(dirname(p));
      return p;
    } catch {
      /* try the next version dir */
    }
  }
  throw new Error(`Found ${base} but no chrome-linux64/chrome inside. Set PLAYWRIGHT_CHROMIUM.`);
};

// Each scenario seeds state via the dev-only window.__stores, then we screenshot it.
const scenarios = [
  {
    name: '01-game-iphone14plus',
    viewport: { width: 428, height: 926 },
    seed: () => {
      const { game, ui, settings } = window.__stores;
      settings.getState().setTheme('light');
      game.getState().newGame('medium', 'arcade');
      ui.getState().navigate('game');
    },
  },
  {
    name: '02-game-short-screen',
    viewport: { width: 390, height: 667 },
    seed: () => {
      const { game, ui } = window.__stores;
      game.getState().newGame('medium', 'good');
      ui.getState().navigate('game');
    },
  },
  {
    name: '03-dark-crosshatch',
    viewport: { width: 428, height: 926 },
    seed: () => {
      const { game, ui, settings } = window.__stores;
      settings.getState().setTheme('dark');
      game.getState().newGame('hard', 'good');
      // Select a given cell so the same-digit + crosshatch highlight renders — the
      // "crossroad scan" that regressed twice on dark themes.
      const gi = game.getState().given.findIndex(Boolean);
      game.getState().selectCell(gi);
      ui.getState().navigate('game');
    },
  },
  {
    name: '04-notes-and-bans',
    viewport: { width: 428, height: 926 },
    seed: () => {
      const { game, ui, settings } = window.__stores;
      settings.getState().setTheme('light');
      game.getState().newGame('impossible', 'arcade'); // longest label -> header overflow check
      const empties = game.getState().given.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      game.getState().setSelection(empties.slice(0, 3));
      game.getState().setInputMode('note');
      game.getState().inputDigit(1);
      game.getState().inputDigit(2);
      game.getState().setSelection([empties[4]]);
      game.getState().setInputMode('ban');
      game.getState().inputDigit(9);
      game.getState().setInputMode('normal');
      ui.getState().navigate('game');
    },
  },
];

// Layout tripwires that need a real layout engine (evaluated in-page).
const layoutChecks = () => {
  const out = [];
  const board = document.querySelector('.board');
  if (!board) {
    out.push({ ok: false, msg: '.board not found' });
    return out;
  }
  const r = board.getBoundingClientRect();
  const vh = window.visualViewport?.height ?? window.innerHeight;
  out.push({ ok: Math.abs(r.width - r.height) <= 2, msg: `board square (w=${Math.round(r.width)} h=${Math.round(r.height)})` });
  out.push({ ok: r.top >= -1 && r.bottom <= vh + 2, msg: `board within viewport (bottom=${Math.round(r.bottom)} vh=${Math.round(vh)})` });
  const tb = document.querySelector('.topbar');
  if (tb) out.push({ ok: tb.scrollWidth <= tb.clientWidth + 1, msg: `topbar no h-overflow (scroll=${tb.scrollWidth} client=${tb.clientWidth})` });
  return out;
};

const run = async () => {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let failures = 0;
  for (const sc of scenarios) {
    const ctx = await browser.newContext({ viewport: sc.viewport, deviceScaleFactor: 2 });
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
    await page.evaluate(sc.seed);
    await page.waitForTimeout(350); // let the entrance animation settle
    await page.screenshot({ path: join(OUT, `${sc.name}.png`) });

    const checks = await page.evaluate(layoutChecks);
    const bad = checks.filter((c) => !c.ok);
    if (errors.length || bad.length) {
      failures++;
      console.error(`\n✖ ${sc.name}`);
      errors.forEach((e) => console.error(`    console/page error: ${e}`));
      bad.forEach((c) => console.error(`    layout: ${c.msg}`));
    } else {
      console.log(`✓ ${sc.name}  (${checks.length} layout checks, 0 errors)`);
    }
    await ctx.close();
  }

  await browser.close();
  console.log(`\nScreenshots written to ${OUT} — open them and eyeball the dark / short / notes cases.`);
  if (failures) {
    console.error(`\n${failures} scenario(s) had errors or failed layout checks.`);
    process.exit(1);
  }
  console.log('\nAll visual smoke scenarios passed.');
};

run().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
