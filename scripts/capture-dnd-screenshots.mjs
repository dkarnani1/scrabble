import { chromium } from 'playwright';

const BASE = process.env.SCRABBLE_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/demo-board`;

const out = [];
function record(msg) {
  console.log(msg);
  out.push(msg);
}

async function captureMobile(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') {
      record(`[mobile-${m.type()}] ${m.text()}`);
    }
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  // Wait for the controlled snap to settle (vaul applies it after a rAF).
  await page.waitForTimeout(800);

  // Read the dialog's translateY to confirm snap math.
  const expandedInfo = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      y: r.y,
      height: r.height,
      transform: getComputedStyle(el).transform,
      snapVar: getComputedStyle(el).getPropertyValue('--snap-point-height'),
    };
  });
  record(`expanded dialog info: ${JSON.stringify(expandedInfo)}`);
  await page.screenshot({ path: './scrabble-rack-sheet-expanded.png', type: 'png' });

  // Trigger a placement to drop the sheet to peek.
  const rackTile = page.locator('button[aria-roledescription="draggable tile"]').first();
  const rackBox = await rackTile.boundingBox();
  // Find an empty board square — sq-8-8 (Square row 9 column 9)
  const target = page.locator('[aria-label="Square row 9 column 9"]').first();
  const targetBox = await target.boundingBox();
  if (!rackBox || !targetBox) {
    record('cannot find rack tile or target square for placement');
  } else {
    // Use Playwright's dragTo or manual mouse moves. Manual gives us the slow steps.
    await page.mouse.move(rackBox.x + rackBox.width / 2, rackBox.y + rackBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(rackBox.x + rackBox.width / 2 + 12, rackBox.y + rackBox.height / 2 - 12, { steps: 6 });
    await page.waitForTimeout(80);
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 25 });
    await page.waitForTimeout(120);
    await page.mouse.up();
  }
  await page.waitForTimeout(900);

  const peekInfo = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      y: r.y,
      height: r.height,
      snapVar: getComputedStyle(el).getPropertyValue('--snap-point-height'),
    };
  });
  record(`peek dialog info: ${JSON.stringify(peekInfo)}`);
  await page.screenshot({ path: './scrabble-rack-sheet-peek.png', type: 'png' });

  await ctx.close();
}

async function captureDesktopSourceHidden(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') {
      record(`[desktop-${m.type()}] ${m.text()}`);
    }
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // Verify aria-roledescription on a rack tile
  const ariaInfo = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('[aria-roledescription]'));
    const rackTiles = tiles
      .filter((t) => t.tagName === 'BUTTON' && /Tile [A-Z?]/.test(t.getAttribute('aria-label') ?? ''))
      .map((t) => ({
        label: t.getAttribute('aria-label'),
        roledescription: t.getAttribute('aria-roledescription'),
      }));
    return rackTiles.slice(0, 3);
  });
  record(`aria sample: ${JSON.stringify(ariaInfo)}`);

  // Scroll so rack is visible
  await page.evaluate(() => window.scrollTo(0, 380));
  await page.waitForTimeout(200);

  // Begin a drag and screenshot mid-flight, slow steps so React can commit.
  const rackTile = page.locator('button[aria-roledescription]').first();
  const rackBox = await rackTile.boundingBox();
  const target = page.locator('[aria-label="Square row 9 column 9"]').first();
  const targetBox = await target.boundingBox();
  if (!rackBox || !targetBox) {
    record('cannot find rack tile or target for desktop drag');
    await ctx.close();
    return;
  }
  await page.mouse.move(rackBox.x + rackBox.width / 2, rackBox.y + rackBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(rackBox.x + rackBox.width / 2 + 14, rackBox.y + rackBox.height / 2 - 14, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 30 });
  await page.waitForTimeout(250);

  // Read the rack tile's computed opacity to confirm hide
  const sourceOpacity = await page.evaluate(() => {
    const tile = document.querySelector('button[aria-roledescription]');
    if (!tile) return null;
    return {
      opacity: getComputedStyle(tile).opacity,
      classes: tile.className,
      style: tile.getAttribute('style'),
    };
  });
  record(`source-tile state mid-drag: ${JSON.stringify(sourceOpacity)}`);

  await page.screenshot({ path: './scrabble-dnd-source-hidden.png', type: 'png' });
  await page.mouse.up();

  await ctx.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await captureMobile(browser);
  await captureDesktopSourceHidden(browser);
} finally {
  await browser.close();
}
console.log('---');
for (const l of out) console.log(l);
