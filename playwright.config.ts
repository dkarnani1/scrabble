import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const baseConfig: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  outputDir: './test-results',
  snapshotDir: './tests/e2e/__screenshots__',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};

if (!process.env.PLAYWRIGHT_SKIP_WEBSERVER) {
  baseConfig.webServer = {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  };
}

export default defineConfig(baseConfig);
