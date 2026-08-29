import { type Locator, type Page } from '@playwright/test';

/**
 * Each product card carries the product ULID in its `data-test` attribute, and
 * the seed generates new ULIDs on every run. Matching a fixed id would couple
 * the suite to generated data, so cards are matched by pattern.
 */
const PRODUCT_CARD = /^product-[0-9A-Z]{26}$/;

/** What the catalog claims about a product, read from the card itself. */
export type ProductSummary = {
  name: string;
  /** Price without the currency symbol, as rendered: `14.15`. */
  price: string;
};

export class CatalogPage {
  readonly products: Locator;

  constructor(private readonly page: Page) {
    this.products = page.getByTestId(PRODUCT_CARD);
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Reads a card so the next page can be asserted against the application's own
   * data instead of a value hardcoded in the test. The catalog renders the price
   * as `$14.15` and the detail page renders `14.15`: same field, different
   * decoration, so the symbol is stripped here.
   */
  async summaryOf(card: Locator): Promise<ProductSummary> {
    const name = await card.getByTestId('product-name').innerText();
    const price = await card.getByTestId('product-price').innerText();

    return {
      name: name.trim(),
      price: price.trim().replace(/^\$/, ''),
    };
  }
}
