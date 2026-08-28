import { test, expect } from '@playwright/test';

test('@smoke the home page lists products', async ({ page }) => {
  await page.goto('/');

  // Each card carries the product ULID in its data-test attribute, and the seed
  // generates new ULIDs every run. A fixed string would couple the test to
  // generated data, so we match the pattern instead.
  const productCards = page.getByTestId(/^product-[0-9A-Z]{26}$/);
  await expect(productCards).toHaveCount(9);
});

test('@smoke opening a product shows the detail page', async ({ page }) => {
  await page.goto('/');

  const productCards = page.getByTestId(/^product-[0-9A-Z]{26}$/);
  await productCards.first().click();

  const unitPrice = page.getByTestId('unit-price');
  await expect(unitPrice).toHaveText('14.15');
});
