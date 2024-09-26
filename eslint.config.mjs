// @ts-check

import eslint from '@eslint/js'
import * as importPlugin from 'eslint-plugin-import'
import sortExports from 'eslint-plugin-sort-exports'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      'webapp/functions',
      'webapp/public/build',
      'webapp/.cache',
      'webapp/.wrangler',
      'webapp/coverage',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.strict,
  {
    plugins: {
      'unused-imports': unusedImports,
      import: importPlugin,
      'sort-exports': sortExports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'import/order': [
        'error',
        {
          pathGroups: [
            {
              pattern: 'react**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@remix-run/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'parent',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
            orderImportKind: 'asc',
          },
        },
      ],
      'sort-exports/sort-exports': [
        'error',
        {
          sortDir: 'asc',
          sortExportKindFirst: 'value',
        },
      ],
    },
  },
)
