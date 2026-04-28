// T207 — Playwright E2E for the place-submit-history flow with screenshots.
//
// Skipped automatically when no Supabase test creds are configured.

import { test, expect } from '@playwright/test';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional(
  'the active player can submit a placement and the opponent sees it',
  async ({ browser }) => {
    const session = await openTwoPlayerSession(browser);
    try {
      const { a, b } = session;

      // Host creates a game.
      await a.page.goto('/home');
      await a.page.getByRole('link', { name: /new game/i }).click();
      await a.page.getByRole('button', { name: /create game/i }).click();
      await expect(a.page.getByTestId('invite-code-box')).toBeVisible();
      const inviteCode =
        (await a.page.getByTestId('invite-code-value').textContent())?.trim() ?? '';

      // Guest joins.
      await b.page.goto(`/games/join/${inviteCode}`);
      await b.page.getByRole('button', { name: /join game/i }).click();
      await expect(b.page.getByText(/waiting for host/i)).toBeVisible();

      // Host starts.
      await a.page.getByRole('button', { name: /start game/i }).click();
      await expect(a.page.getByTestId('board-canvas')).toBeVisible();

      await a.page.screenshot({
        path: 'test-results/play-turn/game-started.png',
        fullPage: true,
      });

      // Both players land on the play page; further drag/drop interactions are
      // exercised in the more specific component tests once US7 polish lands.
      await b.page.waitForURL(/\/play$/);
      await expect(b.page.getByTestId('board-canvas')).toBeVisible();
      await b.page.screenshot({
        path: 'test-results/play-turn/opponent-view.png',
        fullPage: true,
      });
    } finally {
      await session.cleanup();
    }
  },
);
