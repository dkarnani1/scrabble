import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
          isolate: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          isolate: true,
          hookTimeout: 30_000,
          testTimeout: 30_000,
        },
      },
    ],
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
