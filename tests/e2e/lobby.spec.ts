// Playwright E2E: create + join lobby in two browser contexts with screenshots. T104.

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const conditional = SHOULD_RUN ? test : test.skip;

conditional('two browsers reach a ready-to-start lobby via invite link', async ({ browser }) => {
  const session = await openTwoPlayerSession(browser);
  try {
    const { a, b } = session;

    await a.page.goto('/home');
    await a.page.getByRole('link', { name: /new game/i }).click();
    await expect(a.page.getByRole('heading', { name: /create a game/i })).toBeVisible();
    await a.page.getByRole('button', { name: /create game/i }).click();

    // Lobby renders an invite code panel.
    await expect(a.page.getByTestId('invite-code-box')).toBeVisible();
    const inviteCode = (await a.page.getByTestId('invite-code-value').textContent())?.trim() ?? '';
    expect(inviteCode.length).toBeGreaterThan(4);

    await a.page.screenshot({
      path: 'test-results/lobby/host-lobby-pre-join.png',
      fullPage: true,
    });

    // Second player joins via the invite link.
    await b.page.goto(`/games/join/${inviteCode}`);
    await b.page.getByRole('button', { name: /join game/i }).click();

    await expect(b.page.getByText(/waiting for host/i)).toBeVisible();
    await b.page.screenshot({
      path: 'test-results/lobby/guest-joined.png',
      fullPage: true,
    });

    // Host sees both players in the lobby and the start button activates.
    await expect(a.page.getByText('Player B')).toBeVisible();
    const startButton = a.page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeEnabled();

    await a.page.screenshot({
      path: 'test-results/lobby/host-lobby-ready.png',
      fullPage: true,
    });
  } finally {
    await session.cleanup();
  }
});
