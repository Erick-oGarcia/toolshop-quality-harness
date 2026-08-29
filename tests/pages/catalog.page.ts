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

/** A card plus the primary key it carries, for joining against the database. */
export type ListedProduct = ProductSummary & { id: string };

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

  /**
   * Every card currently listed, with the ULID taken from `data-test`. The id is
   * what lets a database check join on the primary key instead of on a name,
  /**
   * Every card currently listed, with the ULID taken from `data-test`. The id is
   * what lets a database check join on the primary key instead of on a name,
   * which is neither unique nor stable.
   *
   * The wait is here rather than in the callers because `locator.all()` is the
   * one locator method that does not auto-wait: it returns whatever matches at
   * that instant, so on a slow render it hands back an empty list and the caller
   * fails with something that looks like missing data rather than a race.
   */
  async listedProducts(): Promise<ListedProduct[]> {
    await this.products.first().waitFor();
    const cards = await this.products.all();

    return Promise.all(
      cards.map(async (card) => {
        const testId = (await card.getAttribute('data-test')) ?? '';
        return { id: testId.replace(/^product-/, ''), ...(await this.summaryOf(card)) };
      }),
    );
  }
}
