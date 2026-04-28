// Playwright E2E: sign-in flow with screenshot. T103.

import { test, expect } from '@playwright/test';

test.describe('sign-in flow', () => {
  test('marketing landing → sign-in form renders and accepts an email', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('player@example.test');
    await expect(emailInput).toHaveValue('player@example.test');

    await page.screenshot({
      path: 'test-results/auth/sign-in-form.png',
      fullPage: true,
    });

    // We don't submit the form (real magic-link flow would round-trip an inbox); the
    // sign-in *page* rendering is the screenshot artifact this spec captures.
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
  });
});
