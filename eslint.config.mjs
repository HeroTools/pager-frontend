import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { configs as tsConfigs } from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginNext from '@next/eslint-plugin-next';

const compat = new FlatCompat({
  baseDirectory: import.meta.url, // enables compatibility with old-style configs
  recommendedConfig: js.configs.recommended,
});

export default [
  // Apply core Next.js + TS + Prettier rules
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),

  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
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
      // Next.js specific
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      // TypeScript ESLint
      ...tsConfigs.recommended,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // React
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Code hygiene
      'no-console': 'warn',
      'no-debugger': 'warn',
    },
  },

  // (Optional) ignore patterns
  {
    ignores: ['node_modules/', '.next/', 'public/', 'dist/', 'build/'],
  },
];
