import { chromium } from 'playwright';

const BASE = process.env.SCRABBLE_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/demo-board`;

const out = [];
const errors = [];
function record(msg) {
  console.log(msg);
  out.push(msg);
}

async function shotAt(browser, name, viewport, action) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'warning' || t === 'error') {
      errors.push(`[${name}-${t}] ${m.text()}`);
    }
  });
  page.on('pageerror', (e) => errors.push(`[${name}-pageerror] ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  if (action) await action(page);
  await page.screenshot({ path: `./scrabble-${name}.png`, type: 'png' });
  // Verify rack tile count + horizontal scroll
  const measure = await page.evaluate(() => {
    const rack = document.querySelector('[aria-label="Your tile rack"]');
    if (!rack) return { found: false };
    const r = rack.getBoundingClientRect();
    const tiles = Array.from(rack.querySelectorAll('button[aria-roledescription], div[aria-label="placed on board"]'));
    return {
      found: true,
      width: r.width,
      childWidth: rack.scrollWidth,
      overflows: rack.scrollWidth > r.width + 1,
      childCount: tiles.length,
      childTops: Array.from(new Set(tiles.map((t) => t.getBoundingClientRect().top.toFixed(1)))).length,
    };
  });
  record(`${name}: ${JSON.stringify(measure)}`);
  await ctx.close();
}

async function clickAllSoundButtons(page) {
  // Wait for the sound test panel to be present
  await page.waitForSelector('[aria-label="Sound test"] button');
  const buttons = await page.locator('[aria-label="Sound test"] button').all();
  for (const b of buttons) {
    await b.click({ delay: 30 });
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({ headless: true });
try {
  await shotAt(browser, 'rack-360', { width: 360, height: 800 });
  await shotAt(browser, 'rack-390', { width: 390, height: 844 });
  await shotAt(browser, 'rack-768', { width: 768, height: 900 });
  // Sound panel screenshot at 1280×800 with all buttons clicked to verify graceful 404 handling.
  await shotAt(browser, 'sound-panel', { width: 1280, height: 800 }, clickAllSoundButtons);
} finally {
  await browser.close();
}
console.log('---measurements---');
for (const l of out) console.log(l);
console.log('---console errors/warnings---');
for (const e of errors) console.log(e);
