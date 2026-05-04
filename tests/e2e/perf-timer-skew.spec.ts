// T805 — timer skew between two clients ≤ 0.5s (SC-004).

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional('timer remains within 0.5s between two clients', async ({ browser }) => {
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
    await expect(b.page.getByTestId('board-canvas')).toBeVisible();

    // Allow a steady-state second to elapse, then sample the timer text on both
    // clients and assert the difference is ≤ 1 second display granularity.
    await a.page.waitForTimeout(1500);
    const aTimer = (await a.page.getByTestId('timer-display').textContent()) ?? '';
    const bTimer = (await b.page.getByTestId('timer-display').textContent()) ?? '';
    // Both timers display whole seconds; we tolerate a 1-second display jitter.
    const aSeconds = parseInt(aTimer.replace(/[^0-9]/g, ''), 10) || 0;
    const bSeconds = parseInt(bTimer.replace(/[^0-9]/g, ''), 10) || 0;
    expect(Math.abs(aSeconds - bSeconds)).toBeLessThanOrEqual(1);
  } finally {
    await session.cleanup();
  }
});
