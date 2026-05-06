import { chromium } from 'playwright';

const BASE = process.env.SCRABBLE_BASE ?? 'http://localhost:3000';

const errors = [];

async function shot(browser, name, url, viewport, action) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'warning' || t === 'error') errors.push(`[${name}-${t}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[${name}-pageerror] ${e.message}`));
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  if (action) await action(page);
  await page.screenshot({ path: `./final-${name}.png`, type: 'png' });
  console.log(`captured final-${name}.png at ${viewport.width}x${viewport.height}`);
  await ctx.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'landing-desktop', '/', { width: 1440, height: 900 });
  await shot(browser, 'home-desktop', '/home?demo=1', { width: 1440, height: 900 });

  // Board demo at desktop — scroll to show HUD + board + rack.
  await shot(
    browser,
    'board-desktop',
    '/demo-board',
    { width: 1440, height: 900 },
    async (page) => {
      await page.evaluate(() => window.scrollTo(0, 360));
      await page.waitForTimeout(250);
    },
  );

  await shot(browser, 'board-mobile', '/demo-board', { width: 390, height: 844 });

  // Endgame win — open via the deep-link query param so confetti is captured
  // mid-burst.
  await shot(
    browser,
    'endgame-win',
    '/demo-board?endgame=win',
    { width: 1440, height: 900 },
    async (page) => {
      await page.waitForTimeout(450);
    },
  );

  // Command palette — open via the global Cmd+K (Meta+K) shortcut. We capture
  // unfiltered so the Navigation + Settings + Help sections are visible. The
  // Game section is registered by PlayClient on the real play route; here on
  // /demo-board it's intentionally empty.
  await shot(
    browser,
    'command-palette',
    '/demo-board',
    { width: 1440, height: 900 },
    async (page) => {
      await page.keyboard.press('Meta+K');
      await page.waitForTimeout(280);
    },
  );

  // App shell header crop — full landing, then we crop in post via Playwright's
  // clip option to focus on the header band.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/home?demo=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Crop the top 96px so the header (h-14 = 56px) plus a little of the
    // page below shows the felt seam.
    await page.screenshot({
      path: './final-app-shell.png',
      type: 'png',
      clip: { x: 0, y: 0, width: 1440, height: 96 },
    });
    console.log('captured final-app-shell.png (header crop 1440x96)');
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log('---console errors/warnings---');
for (const e of errors) console.log(e);
