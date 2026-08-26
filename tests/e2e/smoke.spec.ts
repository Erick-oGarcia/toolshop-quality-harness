import { test, expect } from '@playwright/test';

test('@smoke a home lista produtos', async ({ page }) => {
  await page.goto('/');

  const productCards = page.getByTestId(/^product-[0-9A-Z]{26}$/);
  await expect(productCards).toHaveCount(9);
});

test('@smoke abrir um produto mostra a página de detalhe', async ({ page }) => {
  await page.goto('/');

  const productCards = page.getByTestId(/^product-[0-9A-Z]{26}$/);
  await productCards.first().click();

  // Assertar que a página de detalhe foi aberta
  const unitPrice = page.getByTestId('unit-price');
  await expect(unitPrice).toHaveText('14.15');
});
