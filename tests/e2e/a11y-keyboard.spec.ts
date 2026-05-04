// T701 — Playwright a11y: keyboard-only flow places + submits a tile.
// (Stub: drives focus through the board and rack via keyboard only. Full e2e play
// requires Supabase test creds, so the spec skips when those aren't set.)

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional('keyboard navigation moves the board cursor', async ({ browser }) => {
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

    const board = a.page.getByTestId('board-canvas');
    await expect(board).toBeVisible();

    // Move focus to the center cell, then press arrow keys to navigate.
    await a.page.locator('[data-board-cursor="7-7"]').focus();
    await a.page.keyboard.press('ArrowRight');
    await expect(a.page.locator('[data-board-cursor="7-8"]')).toBeFocused();
    await a.page.keyboard.press('ArrowDown');
    await expect(a.page.locator('[data-board-cursor="8-8"]')).toBeFocused();
  } finally {
    await session.cleanup();
  }
});
