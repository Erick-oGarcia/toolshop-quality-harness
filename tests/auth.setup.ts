import { test as setup, expect } from './fixtures';
import { SEEDED_USERS } from './data/users';
import { STORAGE_STATE } from './storage-state';

/**
 * Signs in once and saves the session for the specs that need one. The login
 * flow itself is covered by `login.spec.ts`; repeating it before every
 * authenticated test would buy no coverage and pay for it on every run.
 */
setup('authenticate as a seeded customer', async ({ page, login }) => {
  await login.open();
  await login.signIn(SEEDED_USERS.customer.email, SEEDED_USERS.customer.password);

  // Save only after the account page proves the session exists — writing the
  // file on a failed login would hand every downstream spec an empty session
  // and turn one failure into a suite-wide mystery.
  await expect(page.getByTestId('nav-invoices')).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
