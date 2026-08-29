import { test, expect } from '../fixtures';

test('@smoke the home page lists the first page of products', async ({ catalog }) => {
  await catalog.open();

  // The seed is deterministic and the catalog paginates at 9, so an exact count
  // fails on both sides: a short seed and a broken pagination that renders every
  // product at once. `toBeVisible()` on the first card would pass on both.
  await expect(catalog.products).toHaveCount(9);
});

test('@smoke opening a card shows that same product', async ({ catalog, productDetail }) => {
  await catalog.open();

  const card = catalog.products.first();
  const expected = await catalog.summaryOf(card);

  await card.click();

  // Asserting against what the card announced — instead of a literal price —
  // also covers the card pointing at the wrong product.
  //
  // The heading is matched loosely on purpose: the detail page renders the ECO
  // badge inside the same `h1`, while the card keeps it outside the title, so an
  // exact match would fail for eco-friendly products only. The price stays exact:
  // both views print the same `product.price` field.
  await expect(productDetail.name).toContainText(expected.name);
  await expect(productDetail.unitPrice).toHaveText(expected.price);
});
