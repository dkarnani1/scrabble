// T807 — repo hygiene: ensure `playwright-report/` and `test-results/` are gitignored
// so we never accidentally commit screenshots or videos that may contain real-looking
// test fixture data.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('repo hygiene', () => {
  const gitignorePath = join(process.cwd(), '.gitignore');
  const gitignore = readFileSync(gitignorePath, 'utf8');

  it('.gitignore covers playwright-report/', () => {
    expect(gitignore).toMatch(/playwright-report\//);
  });

  it('.gitignore covers test-results/', () => {
    expect(gitignore).toMatch(/test-results\//);
  });

  it('.gitignore covers .env*.local', () => {
    expect(gitignore).toMatch(/\.env\*\.local|\.env\.local/);
  });

  it('.gitignore covers .vercel/', () => {
    expect(gitignore).toMatch(/\.vercel\//);
  });

  it('.gitignore covers node_modules/', () => {
    expect(gitignore).toMatch(/node_modules/);
  });
});
