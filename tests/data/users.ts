/**
 * Accounts created by `php artisan migrate:fresh --seed` (Toolshop `UserSeeder`).
 *
 * These are demo credentials from the public seeder of a locally hosted sample
 * app, not secrets: the stack is disposable and recreated on every run. Real
 * credentials would come from the CI secret store instead.
 */
export const SEEDED_USERS = {
  customer: {
    email: 'customer@practicesoftwaretesting.com',
    password: 'welcome01',
  },
} as const;
