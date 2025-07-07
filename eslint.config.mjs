// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc';
import { fixupConfigRules } from '@eslint/compat';
import typescriptParser from '@typescript-eslint/parser';

const compat = new FlatCompat({
  baseDirectory: import.meta.url,
  recommendedConfig: undefined, // optional
});

const nextConfigs = fixupConfigRules(
  compat.config({ extends: ['next/core-web-vitals', 'next/typescript'] }),
);

const config = [
  ...nextConfigs,

  // your project code
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
      // add your other rules here
    },
  },

  // config file itself
  {
    files: ['eslint.config.mjs'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
  },

  // global ignores
  { ignores: ['node_modules/', '.next/', 'dist/', 'public/', 'build/'] },
];

export default config;
