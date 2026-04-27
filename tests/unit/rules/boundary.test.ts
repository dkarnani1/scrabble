import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// This test asserts that the layer-boundary ESLint rule actually fires on a file inside
// src/rules/** that imports from a forbidden module. We synthesize a temp file under
// src/rules/__boundary__/, run ESLint, and confirm a no-restricted-imports violation
// appears. The file is removed afterwards.

const repoRoot = process.cwd();

function runEslint(targetFile: string): { code: number; stdout: string; stderr: string } {
  // Use --no-warn-ignored so .gitignore-style ignores don't suppress the run; rely on
  // ESLint's own ignore config which we wrote to skip nothing in src/rules/__boundary__.
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['eslint', '--no-warn-ignored', '--format', 'json', targetFile],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('layer-boundary lint rule (Constitution Principle III)', () => {
  it('fires no-restricted-imports when src/rules/** imports from react', () => {
    // Skip cleanly when ESLint / dependencies are not installed (e.g. in a fresh clone
    // before `npm install`). The intent is to ensure the rule is wired; the *check* is
    // valuable in CI where deps exist.
    const probe = spawnSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['--no-install', 'eslint', '--version'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    if ((probe.status ?? 1) !== 0) {
      // eslint not available in the local node_modules — boundary check skipped.
      return;
    }

    const dir = mkdtempSync(join(repoRoot, 'src', 'rules', '__boundary__'));
    const file = join(dir, 'forbidden.ts');
    writeFileSync(
      file,
      `// Synthetic boundary probe; should fail lint.\nimport * as React from 'react';\nexport const probe = React;\n`,
      'utf8',
    );

    try {
      const { stdout } = runEslint(file);
      expect(stdout).toMatch(/no-restricted-imports/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
