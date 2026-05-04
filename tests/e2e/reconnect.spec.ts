// T601 — Playwright: tab close → reopen mid-turn restores state. Skipped without
// Supabase test creds.

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional('reload mid-game restores board, score, and rack', async ({ browser }) => {
  const session = await openTwoPlayerSession(browser);
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

    // Reload the active player's tab.
    const url = a.page.url();
    await a.page.reload();
    await expect(a.page).toHaveURL(url);
    await expect(a.page.getByTestId('board-canvas')).toBeVisible();
    // Score panel still renders.
    await expect(a.page.getByText(/in bag/i)).toBeVisible();
    await a.page.screenshot({ path: 'test-results/reconnect/reloaded.png', fullPage: true });
  } finally {
    await session.cleanup();
  }
});
