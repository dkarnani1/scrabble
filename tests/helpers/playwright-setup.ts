// Two-context Playwright auth helper. Each test gets two independent BrowserContexts
// — one per simulated player — with cookies/storage isolated. Sign-in runs once per
// fresh test using the magic-link bypass that integration test fixtures stand up
// against the local Supabase project.
//
// Real magic-link email flows are slow and require an inbox; for E2E we use the service
// role to mint a session for a known user and inject the cookies directly. This is a
// test-only path and lives outside production code.

import { type BrowserContext, type Page, type Browser } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export type TestPlayer = {
  userId: string;
  email: string;
  displayName: string;
};

export type TwoPlayerSession = {
  a: { context: BrowserContext; page: Page; player: TestPlayer };
  b: { context: BrowserContext; page: Page; player: TestPlayer };
  cleanup: () => Promise<void>;
};

const ADMIN_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function admin() {
  if (!ADMIN_URL || !ADMIN_KEY) {
    throw new Error(
      'Playwright auth helper requires NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY in the test environment.',
    );
  }
  return createClient(ADMIN_URL, ADMIN_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Create a fresh user in the test Supabase project and inject session cookies into
 * the given BrowserContext so subsequent navigation is authenticated. */
export async function signInAs(context: BrowserContext, player: TestPlayer): Promise<void> {
  const sb = admin();
  const { data, error } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email: player.email,
  });
  if (error) throw error;
  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    throw new Error('Supabase did not return an action_link for the magic-link generation.');
  }
  // Navigate the helper page through the action link — Supabase redirects to the
  // configured callback, which sets the session cookies on the BrowserContext.
  const page = await context.newPage();
  await page.goto(actionLink);
  await page.close();
}

export async function openTwoPlayerSession(browser: Browser): Promise<TwoPlayerSession> {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const playerA: TestPlayer = {
    userId: 'fixture-a',
    email: `playera+${Date.now()}@example.test`,
    displayName: 'Player A',
  };
  const playerB: TestPlayer = {
    userId: 'fixture-b',
    email: `playerb+${Date.now()}@example.test`,
    displayName: 'Player B',
  };
  await signInAs(a, playerA);
  await signInAs(b, playerB);
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  return {
    a: { context: a, page: pageA, player: playerA },
    b: { context: b, page: pageB, player: playerB },
    cleanup: async () => {
      await a.close();
      await b.close();
    },
  };
}
