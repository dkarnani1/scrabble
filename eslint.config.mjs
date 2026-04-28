// ESLint 9 flat config. We deliberately do NOT extend `eslint-config-next` from a
// flat-config file: that package targets the legacy `.eslintrc` format and triggers
// `@rushstack/eslint-patch`, which is incompatible with ESLint 9's flat-config loader
// and aborts the lint pipeline (see lint-staged failure on commit). The Next-specific
// rules (react/* and next/*) are exercised at build time via `next build`'s integrated
// type+lint pass on Vercel; this config exists for the constitutional layer-boundary
// rule that protects `src/rules/**`.

import importPlugin from 'eslint-plugin-import';
import tsParser from '@typescript-eslint/parser';

const restrictedRulesEngineImports = [
  'react',
  'react-dom',
  'next',
  'next/*',
  '@supabase/*',
  '@dnd-kit/*',
];

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'src/dictionary/default-list.txt',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    files: ['src/rules/**/*.{ts,tsx}'],
    plugins: { import: importPlugin },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictedRulesEngineImports.map((name) => ({
            name,
            message:
              'src/rules/** must remain framework-free (Constitution Principle III). ' +
              'Move framework-touching code into src/orchestration or src/ui.',
          })),
          patterns: ['react/*', 'next/*', '@supabase/*', '@dnd-kit/*'],
        },
      ],
    },
  },
];
