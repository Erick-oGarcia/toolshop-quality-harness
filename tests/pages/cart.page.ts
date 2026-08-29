import { type Locator, type Page } from '@playwright/test';

export class CartPage {
  /** Badge in the header; also the signal that the cart write landed. */
  readonly quantityBadge: Locator;
  readonly productTitles: Locator;
  readonly total: Locator;
  readonly proceed: Locator;

  constructor(private readonly page: Page) {
    this.quantityBadge = page.getByTestId('cart-quantity');
    this.productTitles = page.getByTestId('product-title');
    this.total = page.getByTestId('cart-total');
    this.proceed = page.getByTestId('proceed-1');
  }

  async open(): Promise<void> {
    await this.page.getByTestId('nav-cart').click();
  }
}
