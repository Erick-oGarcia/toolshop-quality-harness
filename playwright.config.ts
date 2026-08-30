import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE } from './tests/storage-state';

/**
 * Specs that need Oracle: kept out of the default projects, not merely given one
 * of their own. The pattern has to end in `.spec.ts`: matching the whole
 * directory makes Playwright treat the connection helper beside them as a test
 * file, and then reject the spec for importing it.
 */
const PACT_SPECS = /pact\/.*\.spec\.ts$/;

const ORACLE_SPECS = /oracle\/.*\.spec\.ts$/;

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
    // Retain on failure, not on first retry: a trace of the attempt that passed
    // explains nothing. The trace of the attempt that failed is the artefact.
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      // Anonymous by default: the catalog and the login form must be reachable
      // without a session, and a suite that is signed in everywhere cannot
      // prove that.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/.*\.auth\.spec\.ts/, ORACLE_SPECS],
    },
    {
      // Specs named `*.auth.spec.ts` start from the session saved by `setup`.
      name: 'chromium-auth',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      testMatch: /.*\.auth\.spec\.ts/,
      testIgnore: [ORACLE_SPECS, PACT_SPECS],
      dependencies: ['setup'],
    },
    {
      // Its own project, selected explicitly, because it needs a database the
      // others do not: a default run would otherwise fail wherever Oracle is not
      // running, which is most places.
      name: 'oracle',
      testMatch: ORACLE_SPECS,
    },
    {
      // Generates the contract. Needs no application: it runs against Pact's own
      // mock server, which is the point — a consumer test that needed the
      // provider running would just be an integration test with extra steps.
      name: 'pact-consumer',
      testMatch: /pact\/.*\.consumer\.spec\.ts$/,
    },
    {
      // Verifies the contract the consumer project just wrote, against the real
      // API. Depending on the consumer rather than committing the pact file
      // keeps the two halves from drifting: the contract verified here is always
      // the one this branch produces.
      name: 'pact-provider',
      testMatch: /pact\/.*\.provider\.spec\.ts$/,
      dependencies: ['pact-consumer'],
    },
  ],
});
