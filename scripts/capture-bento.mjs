import { chromium } from 'playwright';

const BASE = process.env.SCRABBLE_BASE ?? 'http://localhost:3000';

const errors = [];

async function shot(browser, name, url, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'warning' || t === 'error') errors.push(`[${name}-${t}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[${name}-pageerror] ${e.message}`));
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  // Let the entrance stagger settle.
  await page.waitForTimeout(900);
  await page.screenshot({ path: `./scrabble-${name}.png`, type: 'png' });
  console.log(`captured ${name}.png at ${viewport.width}x${viewport.height}`);
  await ctx.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'landing-desktop', '/', { width: 1440, height: 900 });
  await shot(browser, 'landing-mobile', '/', { width: 390, height: 844 });
  await shot(browser, 'home-desktop', '/home?demo=1', { width: 1440, height: 900 });
  await shot(browser, 'home-empty', '/home?demo=empty', { width: 1440, height: 900 });
  await shot(browser, 'home-mobile', '/home?demo=1', { width: 390, height: 844 });
} finally {
  await browser.close();
}
console.log('---console errors/warnings---');
for (const e of errors) console.log(e);
