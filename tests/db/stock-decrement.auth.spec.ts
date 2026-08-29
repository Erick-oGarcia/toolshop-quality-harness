import { test, expect, type Fixtures } from '../fixtures';
import { mustExist } from './database';

const ORDERED_QUANTITY = 2;

/**
 * How long the queue worker is given to consume the job. Not a guess at how fast
 * it usually is: it is the point past which "eventually" stops being an
 * explanation and becomes a defect worth failing over.
 */
const SETTLES_WITHIN = 20_000;

async function stockOf({ db }: Pick<Fixtures, 'db'>, productId: string): Promise<number> {
  const stock = await db.value<number>('SELECT stock FROM products WHERE id = ?', [productId]);
  mustExist(stock, `product ${productId} disappeared from the database mid-test`);

  return Number(stock);
}

test('ordering decrements the stock of the product that was bought', async ({
  catalog,
  productDetail,
  cart,
  checkout,
  db,
}) => {
  await catalog.open();

  const [product] = await catalog.listedProducts();
  mustExist(product, 'the storefront listed no products');

  const before = await stockOf({ db }, product.id);

  await catalog.products.first().click();
  await productDetail.increaseQuantity.click();
  await expect(productDetail.quantity).toHaveValue(String(ORDERED_QUANTITY));
  await productDetail.addToCart.click();
  await expect(cart.quantityBadge).toHaveText(String(ORDERED_QUANTITY));

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
  await expect(checkout.paymentSuccessMessage).toBeVisible();
  await checkout.finish.click();
  await expect(checkout.confirmation).toBeVisible();

  // The order is confirmed, and the stock has not moved yet: POST /invoices
  // answers 201 while a queued job does the decrement afterwards — measured at
  // ~390 ms and still 25 in ADR-0001. Asserting the new value straight away
  // would pass or fail on timing, and sleeping would only pick a number that is
  // wrong on a slower day. Re-reading until it settles is the honest shape.
  //
  // The assertion is a difference, not a value. `toBe(23)` would also pass on a
  // stock that was already 23 before the order — a test that proves nothing
  // about the order it just placed.
  await expect
    .poll(() => stockOf({ db }, product.id), {
      timeout: SETTLES_WITHIN,
      message: `stock for ${product.name} never settled at ${before - ORDERED_QUANTITY}`,
    })
    .toBe(before - ORDERED_QUANTITY);
});
