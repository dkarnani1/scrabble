// T602 — Playwright: opponent-disconnected indicator after >5s. Skipped without
// Supabase test creds.

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional('PresenceIndicator surfaces disconnected state', async ({ browser }) => {
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

    // Close opponent's tab; A's PresenceIndicator should flip to "disconnected"
    // within 5 seconds (the heartbeat threshold).
    await b.page.close();
    await expect(a.page.getByText(/disconnected/i)).toBeVisible({ timeout: 30_000 });
    await a.page.screenshot({ path: 'test-results/reconnect/disconnect-indicator.png' });
  } finally {
    await session.cleanup();
  }
});
