// T703 — Playwright a11y audit using axe-core. Skipped without test creds.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openTwoPlayerSession } from '@tests/helpers/playwright-setup';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const conditional = SHOULD_RUN ? test : test.skip;

conditional('home page passes basic axe-core a11y checks', async ({ browser }) => {
  const session = await openTwoPlayerSession(browser);
  try {
    const { a } = session;
    await a.page.goto('/home');
    const results = await new AxeBuilder({ page: a.page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    // Allow contrast warnings on the dev fixture; assert serious + critical only.
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
  } finally {
    await session.cleanup();
  }
});
