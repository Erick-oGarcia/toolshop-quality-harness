import { type Locator, type Page } from '@playwright/test';

export class ProductDetailPage {
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly quantity: Locator;
  readonly increaseQuantity: Locator;
  readonly addToCart: Locator;

  constructor(page: Page) {
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.quantity = page.getByTestId('quantity');
    this.increaseQuantity = page.getByTestId('increase-quantity');
    this.addToCart = page.getByTestId('add-to-cart');
  }
}
