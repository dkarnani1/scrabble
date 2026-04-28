import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Single-project config. The unit / integration split is done via the workspace file
// (`vitest.workspace.ts`) which extends this base for shared aliases and reporters.

export default defineConfig({
  test: {
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@rules': resolve(__dirname, 'src/rules'),
      '@orchestration': resolve(__dirname, 'src/orchestration'),
      '@persistence': resolve(__dirname, 'src/persistence'),
      '@auth': resolve(__dirname, 'src/auth'),
      '@realtime': resolve(__dirname, 'src/realtime'),
      '@dictionary': resolve(__dirname, 'src/dictionary'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@tests': resolve(__dirname, 'tests'),
    },
  },
});
