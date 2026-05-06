import { chromium } from 'playwright';

const BASE = process.env.SCRABBLE_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/demo-board`;
const errors = [];

async function shotOutcome(browser, outcome, name, viewport, options = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'warning' || t === 'error') errors.push(`[${name}-${t}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[${name}-pageerror] ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Probe before clicking so failures are descriptive.
  const probe = await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('input[name="endgame-outcome"]'));
    return {
      count: radios.length,
      values: radios.map((r) => r.value),
    };
  });
  if (probe.count === 0) {
    throw new Error(`no endgame radios on page; probe=${JSON.stringify(probe)}`);
  }

  await page.evaluate((o) => {
    const radios = Array.from(document.querySelectorAll('input[name="endgame-outcome"]'));
    const radio = radios.find((r) => r.value === o);
    if (!radio) throw new Error(`radio for ${o} not found; values=${radios.map((r) => r.value).join(',')}`);
    radio.click();
  }, outcome);

  // Wait for confetti + animations to start; capture mid-burst for win/draw.
  await page.waitForTimeout(options.delay ?? 500);
  await page.screenshot({ path: `./scrabble-${name}.png`, type: 'png' });
  console.log(`captured ${name}.png at ${viewport.width}x${viewport.height}`);
  await ctx.close();
}

async function verifySessionStorageDedup(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[dedup-pageerror] ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle' });
  // Manually set the de-dup key to simulate "already fired", then verify
  // that mounting EndgameOverlayMount with that key doesn't fire confetti.
  await page.evaluate(() => {
    window.sessionStorage.setItem('endgame-confetti:test-game-1', '1');
  });
  // Open the demo overlay (sets fireConfetti=true on the demo path) — that
  // path doesn't use the storage gate, so this just verifies the key persists.
  const stored = await page.evaluate(() =>
    window.sessionStorage.getItem('endgame-confetti:test-game-1'),
  );
  console.log(`sessionStorage de-dup key persisted: ${stored === '1' ? 'yes' : 'no'}`);
  // Reload and verify the key still exists in same session.
  await page.reload();
  await page.waitForLoadState('networkidle');
  const afterReload = await page.evaluate(() =>
    window.sessionStorage.getItem('endgame-confetti:test-game-1'),
  );
  console.log(`sessionStorage key after reload: ${afterReload === '1' ? 'yes' : 'no'}`);
  await ctx.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await shotOutcome(browser, 'win', 'endgame-win', { width: 1440, height: 900 });
  await shotOutcome(browser, 'lose', 'endgame-lose', { width: 1440, height: 900 });
  await shotOutcome(browser, 'draw', 'endgame-draw', { width: 1440, height: 900 });
  await shotOutcome(browser, 'win', 'endgame-mobile', { width: 390, height: 844 });
  await verifySessionStorageDedup(browser);
} finally {
  await browser.close();
}
console.log('---console errors/warnings---');
for (const e of errors) console.log(e);
