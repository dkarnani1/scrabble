import { defineWorkspace } from 'vitest/config';

// Two named projects so `vitest run --project unit` and `--project integration` filter
// correctly. Each project picks up the shared aliases from `vitest.config.ts` via
// `extends: './vitest.config.ts'`.

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
      isolate: true,
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.ts'],
      environment: 'node',
      isolate: true,
      hookTimeout: 30_000,
      testTimeout: 30_000,
    },
  },
]);
