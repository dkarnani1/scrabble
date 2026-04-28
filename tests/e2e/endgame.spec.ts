// T303 — Playwright E2E: drive a game to terminal state and screenshot the result page.
//
// Skipped automatically when no Supabase test creds are configured.

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional(
  'six consecutive passes lands both players on the result screen',
  async ({ browser }) => {
    const session = await openTwoPlayerSession(browser);
    try {
      const { a, b } = session;

      await a.page.goto('/home');
      await a.page.getByRole('link', { name: /new game/i }).click();
      await a.page.getByRole('button', { name: /create game/i }).click();
      const inviteCode =
        (await a.page.getByTestId('invite-code-value').textContent())?.trim() ?? '';

      await b.page.goto(`/games/join/${inviteCode}`);
      await b.page.getByRole('button', { name: /join game/i }).click();
      await a.page.getByRole('button', { name: /start game/i }).click();
      await expect(a.page.getByTestId('board-canvas')).toBeVisible();

      // Six consecutive passes drive the game to a six-pass termination.
      for (let i = 0; i < 6; i++) {
        const activePage = await whichPageHasTurn(a.page, b.page);
        await activePage.getByRole('button', { name: /^pass$/i }).click();
        await activePage.getByRole('button', { name: /confirm pass/i }).click();
      }

      // Both clients land on the result page once the game completes.
      await a.page.waitForURL(/\/result$/);
      await b.page.waitForURL(/\/result$/);

      await expect(a.page.getByText(/game over/i)).toBeVisible();
      await a.page.screenshot({ path: 'test-results/endgame/result.png', fullPage: true });
    } finally {
      await session.cleanup();
    }
  },
);

async function whichPageHasTurn(
  p1: import('@playwright/test').Page,
  p2: import('@playwright/test').Page,
) {
  const passEnabledOnP1 = await p1
    .getByRole('button', { name: /^pass$/i })
    .isEnabled()
    .catch(() => false);
  return passEnabledOnP1 ? p1 : p2;
}
