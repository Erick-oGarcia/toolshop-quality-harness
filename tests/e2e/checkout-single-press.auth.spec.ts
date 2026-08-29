import { test, expect } from '../fixtures';

/**
 * Documents a defect: pressing Confirm once should place the order. It does not
 * — see docs/findings/confirm-needs-two-clicks.md. The expectation below is what
 * the application *should* do, so when the defect is fixed Playwright reports an
 * unexpected pass and this file becomes a normal test.
 */
test('pressing Confirm once places the order', async ({
  catalog,
  productDetail,
  cart,
  checkout,
}) => {
  // Expected to fail until the defect is fixed. When it starts passing,
  // Playwright reports an unexpected pass — which is the alert that the
  // application changed and this file should become a normal test.
  test.fail();

  await catalog.open();
  await catalog.products.first().click();
  await productDetail.addToCart.click();
  await expect(cart.quantityBadge).toHaveText('1');

  await cart.open();
  await cart.proceed.click();
  await checkout.proceedAfterSignIn.click();

  await checkout.country.selectOption('AT');
  await checkout.postalCode.fill('1050');
  await checkout.houseNumber.fill('98');
  await expect(checkout.proceedAfterAddress).toBeEnabled();
  await checkout.proceedAfterAddress.click();

  await checkout.paymentMethod.selectOption('cash-on-delivery');
  await checkout.finish.click();

  await expect(checkout.confirmation).toBeVisible();
});
