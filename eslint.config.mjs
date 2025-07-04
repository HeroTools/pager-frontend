// eslint.config.mjs

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptParser from '@typescript-eslint/parser'; // ✅ actual parser module
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginNext from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

const compat = new FlatCompat({
  baseDirectory: import.meta.url,
  recommendedConfig: js.configs.recommended,
});

export default [
  // 1. Built-in Next.js + TypeScript rules
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // 2. Prettier styling overrides
  eslintConfigPrettier,

  // 3. Custom project-level rules
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      parser: typescriptParser, // ✅ parser module, not string
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      '@next/next': pluginNext,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-html-link-for-pages': 'off',
      'no-console': 'warn',
      'no-debugger': 'warn',
    },
  },

  // 4. Global ignore patterns
  {
    ignores: ['node_modules/', '.next/', 'public/', 'dist/', 'build/'],
  },
];
