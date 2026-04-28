// T403 — Playwright: 30s timer expires → forced pass; capture urgent + expired
// screenshots. Skipped automatically without Supabase test creds.

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional('30s timer ticks toward zero and forces a pass on expiry', async ({ browser }) => {
  const session = await openTwoPlayerSession(browser);
  try {
    const { a, b } = session;

    await a.page.goto('/home');
    await a.page.getByRole('link', { name: /new game/i }).click();
    // Choose 30s timer.
    await a.page.getByRole('button', { name: /create game/i }).click();
    const inviteCode = (await a.page.getByTestId('invite-code-value').textContent())?.trim() ?? '';
    await b.page.goto(`/games/join/${inviteCode}`);
    await b.page.getByRole('button', { name: /join game/i }).click();
    await a.page.getByRole('button', { name: /start game/i }).click();
    await expect(a.page.getByTestId('board-canvas')).toBeVisible();

    // Wait for the urgent treatment (last 5s).
    const urgentBadge = a.page.getByTestId('timer-urgent');
    await expect(urgentBadge).toBeVisible({ timeout: 30_000 });
    await a.page.screenshot({ path: 'test-results/timer/urgent.png', fullPage: true });

    // Wait for the forced pass entry to land in history.
    await expect(a.page.locator('text=/timed out|forced/i')).toBeVisible({ timeout: 15_000 });
    await a.page.screenshot({ path: 'test-results/timer/expired.png', fullPage: true });
  } finally {
    await session.cleanup();
  }
});
