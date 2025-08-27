import { FlatCompat } from '@eslint/eslintrc';
import { fixupConfigRules } from '@eslint/compat';
import typescriptParser from '@typescript-eslint/parser';

const compat = new FlatCompat({
  baseDirectory: import.meta.url,
  recommendedConfig: undefined,
});

const nextConfigs = fixupConfigRules(
  compat.config({ extends: ['next/core-web-vitals', 'next/typescript'] }),
);

const config = [
  ...nextConfigs,

  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    ignores: ['eslint.config.mjs'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: 'tsconfig.json',
        tsconfigRootDir: '.',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',

      'no-duplicate-imports': 'warn',
      'sort-imports': [
        'warn',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // '@typescript-eslint/consistent-type-imports': [
      //   'error',
      //   {
      //     prefer: 'type-imports',
      //   },
      // ],

      'no-var': 'error',
      'no-undef': 'off',
      eqeqeq: ['error', 'always'],
      // curly: ['error', 'all'],

      // 'react/jsx-boolean-value': ['error', 'never'],
      // 'react/jsx-curly-brace-presence': [
      //   'error',
      //   {
      //     props: 'never',
      //     children: 'never',
      //   },
      // ],
      // 'react/self-closing-comp': 'error',
      // 'react/jsx-no-useless-fragment': 'error',

      // 'no-nested-ternary': 'warn',
      // 'no-unneeded-ternary': 'error',
      // 'object-shorthand': 'error',
      // 'prefer-template': 'error',
    },
  },

  {
    files: ['eslint.config.mjs'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
  },

  {
    ignores: [
      'node_modules/',
      '.next/',
      'dist/',
      'dist-electron/',
      'public/',
      'build/',
      'electron/',
    ],
  },
];

export default config;
