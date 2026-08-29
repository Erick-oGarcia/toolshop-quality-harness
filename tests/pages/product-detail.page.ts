import { type Locator, type Page } from '@playwright/test';

export class ProductDetailPage {
  readonly name: Locator;
  readonly unitPrice: Locator;

  constructor(page: Page) {
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
  }
}
