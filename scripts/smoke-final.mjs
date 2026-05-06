import { chromium } from 'playwright';

const BASE = process.env.SCRABBLE_BASE ?? 'http://localhost:3001';
const out = [];
const log = (line) => { out.push(line); console.log(line); };

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

  // 1. /home?demo=1 renders without auth
  await page.goto(`${BASE}/home?demo=1`, { waitUntil: 'networkidle' });
  const h1Demo1 = await page.evaluate(() => document.querySelector('h1')?.textContent);
  log(`/home?demo=1 → status reachable, h1="${h1Demo1}"`);

  // 2. /home?demo=empty renders
  await page.goto(`${BASE}/home?demo=empty`, { waitUntil: 'networkidle' });
  const h1Empty = await page.evaluate(() => document.querySelector('h1')?.textContent);
  log(`/home?demo=empty → status reachable, h1="${h1Empty}"`);

  // 3. Palette open via Cmd+K, type "shuffle", expect empty (demo route doesn't register it),
  //    close via Esc, reopen, type something else
  await page.goto(`${BASE}/demo-board`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.keyboard.press('Meta+K');
  await page.waitForTimeout(250);
  let dialogVisible = await page.evaluate(() => !!document.querySelector('[role="dialog"] [cmdk-input]'));
  log(`Palette open after Meta+K (Cmd+K) on /demo-board: ${dialogVisible}`);

  // Try Control+K too in case OS detection differs
  if (!dialogVisible) {
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(250);
    dialogVisible = await page.evaluate(() => !!document.querySelector('[role="dialog"] [cmdk-input]'));
    log(`Palette open after Control+K on /demo-board: ${dialogVisible}`);
  }

  if (dialogVisible) {
    await page.keyboard.type('shuffle', { delay: 30 });
    await page.waitForTimeout(150);
    const itemTexts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[cmdk-item]')).map((n) => n.textContent?.trim()),
    );
    const emptyShown = await page.evaluate(() => !!document.querySelector('[cmdk-empty]') &&
      window.getComputedStyle(document.querySelector('[cmdk-empty]')).display !== 'none');
    log(`Palette filtered "shuffle" → ${itemTexts.length} items: ${JSON.stringify(itemTexts)} | empty visible: ${emptyShown}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const dialogClosed = await page.evaluate(() => !document.querySelector('[role="dialog"] [cmdk-input]'));
    log(`Palette closed after Esc: ${dialogClosed}`);

    // Reopen, search 'home', confirm match
    await page.keyboard.press('Meta+K');
    await page.waitForTimeout(200);
    await page.keyboard.type('home', { delay: 30 });
    await page.waitForTimeout(150);
    const homeItems = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[cmdk-item]')).map((n) => n.textContent?.trim()),
    );
    log(`Palette filtered "home" → items: ${JSON.stringify(homeItems)}`);
    await page.keyboard.press('Escape');
  }

  // 4. Endgame overlay: open twice on demo route (manual reopen via the demo controls;
  //    note the demo uses EndgameOverlay direct, not Mount, so sessionStorage de-dup is
  //    NOT exercised here — verify by code path only)
  await page.goto(`${BASE}/demo-board?endgame=win`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const overlayVisible1 = await page.evaluate(() =>
    !!document.querySelector('[role="dialog"]'),
  );
  log(`Endgame win overlay open on first load: ${overlayVisible1}`);

  // Click "Dismiss" then re-pick "win" to reopen
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const dismiss = btns.find((b) => b.textContent?.trim() === 'Dismiss');
    if (dismiss) dismiss.click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const winRadio = document.querySelector('input[name="endgame-outcome"][value="win"]');
    if (winRadio) winRadio.click();
  });
  await page.waitForTimeout(400);
  const overlayVisible2 = await page.evaluate(() =>
    !!document.querySelector('[role="dialog"]'),
  );
  log(`Endgame overlay reopens after dismiss + re-pick: ${overlayVisible2}`);

  log(`Page errors collected: ${errs.length}`);
  for (const e of errs) log(`  ${e}`);
} finally {
  await browser.close();
}
