import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE } from './tests/storage-state';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4200',
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      // Anonymous by default: the catalog and the login form must be reachable
      // without a session, and a suite that is signed in everywhere cannot
      // prove that.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*\.auth\.spec\.ts/,
    },
    {
      // Specs named `*.auth.spec.ts` start from the session saved by `setup`.
      name: 'chromium-auth',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      testMatch: /.*\.auth\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],
});
