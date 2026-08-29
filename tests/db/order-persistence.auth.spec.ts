import { test, expect, type Fixtures } from '../fixtures';
import { SEEDED_USERS } from '../data/users';
import { mustExist } from './database';

type InvoiceRow = {
  billing_country: string;
  billing_city: string;
  billing_state: string;
  user_id: string;
};

const SELECT_INVOICE =
  'SELECT billing_country, billing_city, billing_state, user_id FROM invoices WHERE invoice_number = ?';

/**
 * The checkout flow is written out in each spec rather than hidden behind one
 * helper with flags. The variants differ in the single thing each spec is about
 * — every step asserted, one Confirm press, an untouched country — and a
 * parameterised helper would bury exactly that difference. Only the stretch that
 * is identical everywhere is shared.
 */
async function reachAddressStep({
  catalog,
  productDetail,
  cart,
  checkout,
}: Pick<Fixtures, 'catalog' | 'productDetail' | 'cart' | 'checkout'>): Promise<void> {
  await catalog.open();
  await catalog.products.first().click();
  await productDetail.addToCart.click();
  await expect(cart.quantityBadge).toHaveText('1');
  await cart.open();
  await cart.proceed.click();
  await checkout.proceedAfterSignIn.click();
}

async function payAndConfirm({ checkout }: Pick<Fixtures, 'checkout'>): Promise<string> {
  await checkout.paymentMethod.selectOption('cash-on-delivery');
  await checkout.finish.click();
  // Confirm answers twice: see docs/findings/confirm-needs-two-clicks.md.
  await expect(checkout.paymentSuccessMessage).toBeVisible();
  await checkout.finish.click();
  await expect(checkout.confirmation).toBeVisible();

  return checkout.invoiceNumber();
}

test('an order confirmed on screen exists in the database, against the right customer', async ({
  catalog,
  productDetail,
  cart,
  checkout,
  db,
}) => {
  await reachAddressStep({ catalog, productDetail, cart, checkout });

  await checkout.country.selectOption('AT');
  await checkout.postalCode.fill('1050');
  await checkout.houseNumber.fill('98');
  await expect(checkout.proceedAfterAddress).toBeEnabled();
  await checkout.proceedAfterAddress.click();

  const invoiceNumber = await payAndConfirm({ checkout });

  const [invoice] = await db.rows<InvoiceRow>(SELECT_INVOICE, [invoiceNumber]);
  mustExist(invoice, `${invoiceNumber} was confirmed on screen but no such invoice exists`);

  // A confirmation proves the browser was told an order exists. Whether it was
  // written, and against whom, is a different question — and the second half is
  // the interesting one: an order billed to the wrong account looks identical
  // from the outside.
  const customerId = await db.value<string>('SELECT id FROM users WHERE email = ?', [
    SEEDED_USERS.customer.email,
  ]);

  expect(invoice.user_id, `${invoiceNumber} is not attributed to the signed-in customer`).toBe(
    customerId,
  );
});

test('an order stores the country as the code the checkout form offers', async ({
  catalog,
  productDetail,
  cart,
  checkout,
  db,
}) => {
  // Expected to fail: the profile stores the country name, the select is keyed
  // by ISO code, and nothing reconciles the two.
  // See docs/findings/country-code-mismatch.md.
  test.fail();

  await reachAddressStep({ catalog, productDetail, cart, checkout });

  // The dropdown is deliberately left alone — the path of a customer who does
  // not notice it is blank. The form is valid without it, because the control
  // holds a value no option matches.
  await checkout.postalCode.fill('1050');
  await checkout.houseNumber.fill('98');
  await expect(checkout.proceedAfterAddress).toBeEnabled();
  await checkout.proceedAfterAddress.click();

  const invoiceNumber = await payAndConfirm({ checkout });

  const [invoice] = await db.rows<InvoiceRow>(SELECT_INVOICE, [invoiceNumber]);
  mustExist(invoice, `${invoiceNumber} was confirmed on screen but no such invoice exists`);

  expect(
    invoice.billing_country,
    `${invoiceNumber} stored a country the form cannot produce`,
  ).toMatch(/^[A-Z]{2}$/);
});
