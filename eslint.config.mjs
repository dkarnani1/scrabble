import nextPlugin from 'eslint-config-next';
import importPlugin from 'eslint-plugin-import';

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
  ...nextPlugin,
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
