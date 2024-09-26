// @ts-check

import eslint from '@eslint/js'
import * as importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import rootConfig from '../eslint.config.mjs'

export default tseslint.config(
  {
    ignores: ['public/build', '.cache', '.wrangler', 'coverage', 'functions'],
  },
  eslint.configs.recommended,
  ...rootConfig,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    // react
    files: ['**/*.(j|t)sx?'],
    plugins: {
      react: react,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
      formComponents: ['Form'],
      linkComponents: [
        { name: 'Link', linkAttribute: 'to' },
        { name: 'NavLink', linkAttribute: 'to' },
      ],
      'import/resolver': { typescript: {} },
    },
  },
  {
    // typescript
    files: ['**/*.tsx?'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    settings: {
      'import/internal-regex': '^~/',
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx'] },
        typescript: { alwaysTryTypes: true },
      },
    },
  },
  {
    files: ['**/eslint.config.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
)
