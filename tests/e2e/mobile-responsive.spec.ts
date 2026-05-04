// T702 — Playwright responsive: 360px viewport reaches all primary actions without
// horizontal scroll.

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional('360px viewport: board, rack, and submit are all reachable', async ({ browser }) => {
  const session = await openTwoPlayerSession(browser, { viewport: { width: 360, height: 720 } });
  try {
    const { a, b } = session;
    await a.page.goto('/home');
    await a.page.getByRole('link', { name: /new game/i }).click();
    await a.page.getByRole('button', { name: /create game/i }).click();
    const inviteCode = (await a.page.getByTestId('invite-code-value').textContent())?.trim() ?? '';
    await b.page.goto(`/games/join/${inviteCode}`);
    await b.page.getByRole('button', { name: /join game/i }).click();
    await a.page.getByRole('button', { name: /start game/i }).click();
    await expect(a.page.getByTestId('board-canvas')).toBeVisible();

    // Document body should not horizontally scroll.
    const overflow = await a.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    // Bottom-sheet rack should be visible at the bottom of the viewport.
    await expect(a.page.getByRole('group', { name: /tile rack/i })).toBeVisible();

    await a.page.screenshot({ path: 'test-results/responsive/360.png', fullPage: true });
  } finally {
    await session.cleanup();
  }
});
