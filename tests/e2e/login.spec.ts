import { test, expect } from '../fixtures';
import { SEEDED_USERS } from '../data/users';

test('a seeded customer can sign in', async ({ login, page }) => {
  await login.open();

  await login.signIn(SEEDED_USERS.customer.email, SEEDED_USERS.customer.password);

  // The session lives in a token the app writes to localStorage, so the URL
  // alone does not prove much: assert the account page actually rendered.
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByTestId('nav-invoices')).toBeVisible();
});

test('signing in with a wrong password is rejected', async ({ login, page }) => {
  await login.open();

  await login.signIn(SEEDED_USERS.customer.email, 'wrong-password');

  // The failure path matters as much as the happy path: a login form that
  // accepts anything would still pass the test above.
  await expect(login.error).toBeVisible();
  await expect(page).not.toHaveURL(/\/account/);
});
