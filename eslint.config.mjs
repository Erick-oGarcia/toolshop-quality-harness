import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  { ignores: ['node_modules', 'playwright-report', 'test-results', 'blob-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Utility scripts run on plain Node (no TS), so they need the Node globals.
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // D6: raw locators (CSS/XPath) are not allowed — use getByTestId/getByRole.
      'playwright/no-raw-locators': 'error',
    },
  },
  {
    // k6 scripts run inside k6, not Node: `__ENV` and friends are injected by
    // the runtime, and the modules resolve from k6 itself rather than from
    // node_modules. Declaring the environment beats sprinkling eslint-disable
    // over a file that is perfectly correct for where it runs.
    files: ['perf/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
      },
    },
  },
);
