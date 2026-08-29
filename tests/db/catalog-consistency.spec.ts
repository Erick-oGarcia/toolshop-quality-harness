import { test, expect } from '../fixtures';
import { mustExist } from './database';

/**
 * The founding invariant of this suite: what the storefront shows has to exist
 * in the database, with the same values.
 *
 * A UI test and an API test both read their answer from the application, so when
 * the application is wrong they agree with it — which is exactly how week 1's
 * cache defect served products whose `COUNT(*)` was already 0. This check reads
 * from the other side.
 */
test('every product on the storefront exists in the database with the same name and price', async ({
  catalog,
  db,
}) => {
  await catalog.open();
  await expect(catalog.products).toHaveCount(9);

  const listed = await catalog.listedProducts();

  for (const product of listed) {
    const [row] = await db.rows<{ name: string; price: string }>(
      'SELECT name, price FROM products WHERE id = ?',
      [product.id],
    );

    mustExist(row, `product ${product.id} is on the storefront but not in the database`);
    expect(row.name, `name mismatch for ${product.id}`).toBe(product.name);

    // DECIMAL comes back from the driver as a string to avoid float rounding, so
    // it is normalised to the two decimals the storefront renders rather than
    // compared as a number.
    expect(Number(row.price).toFixed(2), `price mismatch for ${product.id}`).toBe(product.price);
  }
});
