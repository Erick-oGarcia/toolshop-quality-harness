import { test, expect } from '../fixtures';
import { mustExist } from './database';

const ORDERED_QUANTITY = 3;
const PAYMENT_METHOD = 'cash-on-delivery';

/**
 * Money is compared in whole cents. `14.15 * 3` is not `42.45` in binary
 * floating point, and the driver hands DECIMAL back as a string precisely so
 * that precision is not lost before the test sees it — turning both sides into
 * integers keeps it that way.
 */
function cents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

type ItemRow = { unit_price: string; quantity: number; product_id: string };
type PaymentRow = { payment_method: string };

test('an order is recorded coherently across invoice, items and payment', async ({
  catalog,
  productDetail,
  cart,
  checkout,
  db,
}) => {
  await catalog.open();

  const listed = await catalog.listedProducts();
  const product = listed[0];
  mustExist(product, 'the storefront listed no products');

  await catalog.products.first().click();
  await productDetail.increaseQuantity.click();
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

  await checkout.paymentMethod.selectOption(PAYMENT_METHOD);
  await checkout.finish.click();
  await expect(checkout.paymentSuccessMessage).toBeVisible();
  await checkout.finish.click();
  await expect(checkout.confirmation).toBeVisible();

  const invoiceNumber = await checkout.invoiceNumber();

  const [invoice] = await db.rows<{ total: string; subtotal: string }>(
    'SELECT total, subtotal FROM invoices WHERE invoice_number = ?',
    [invoiceNumber],
  );
  mustExist(invoice, `${invoiceNumber} was confirmed on screen but no such invoice exists`);

  const items = await db.rows<ItemRow>(
    `SELECT it.unit_price, it.quantity, it.product_id
       FROM invoice_items it
       JOIN invoices i ON i.id = it.invoice_id
      WHERE i.invoice_number = ?`,
    [invoiceNumber],
  );

  expect(
    items,
    `${invoiceNumber} should have one line for the single product ordered`,
  ).toHaveLength(1);
  const [line] = items;
  mustExist(line, `${invoiceNumber} has no invoice line`);

  // The line has to point at the product that was clicked, not merely at *a*
  // product: an invoice that charges the right amount for the wrong item is
  // indistinguishable from a correct one until someone ships it.
  expect(line.product_id, `${invoiceNumber} billed a different product`).toBe(product.id);
  expect(Number(line.quantity), `${invoiceNumber} billed the wrong quantity`).toBe(
    ORDERED_QUANTITY,
  );

  // The price the storefront advertised is the price that must be billed.
  expect(
    cents(line.unit_price),
    `${invoiceNumber} billed a price the storefront never showed`,
  ).toBe(cents(product.price));

  // The arithmetic every downstream report depends on.
  expect(cents(invoice.total), `${invoiceNumber} total does not match its lines`).toBe(
    cents(line.unit_price) * ORDERED_QUANTITY,
  );
  expect(cents(invoice.subtotal), `${invoiceNumber} subtotal does not match its lines`).toBe(
    cents(line.unit_price) * ORDERED_QUANTITY,
  );

  const payments = await db.rows<PaymentRow>(
    `SELECT p.payment_method
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
      WHERE i.invoice_number = ?`,
    [invoiceNumber],
  );

  expect(payments, `${invoiceNumber} should have exactly one payment`).toHaveLength(1);
  expect(payments[0]?.payment_method, `${invoiceNumber} recorded a different payment method`).toBe(
    PAYMENT_METHOD,
  );
});

/**
 * The check above proves one order was recorded correctly. This one asks the
 * same question of every invoice already in the database, which is a different
 * guarantee: a bug that ran last month leaves no failing test behind, only rows.
 *
 * It needs no browser — Playwright only starts one when a test asks for `page`.
 */
test('no invoice in the database disagrees with the sum of its lines', async ({ db }) => {
  const drifted = await db.rows<{ invoice_number: string; total: string; line_total: string }>(
    `SELECT i.invoice_number,
            i.total,
            COALESCE(SUM(it.unit_price * it.quantity), 0) AS line_total
       FROM invoices i
       LEFT JOIN invoice_items it ON it.invoice_id = i.id
      GROUP BY i.id, i.invoice_number, i.total
     HAVING ABS(i.total - line_total) > 0.005`,
  );

  // The tolerance is half a cent, not zero: the comparison happens in SQL over
  // DECIMAL, and a threshold below the smallest representable difference would
  // be a promise the type cannot keep.
  expect(
    drifted.map((row) => `${row.invoice_number}: total ${row.total} vs lines ${row.line_total}`),
    'invoices whose total disagrees with their own lines',
  ).toEqual([]);
});
