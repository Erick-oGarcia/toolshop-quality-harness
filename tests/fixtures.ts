import { test as base } from '@playwright/test';
import { CartPage } from './pages/cart.page';
import { CatalogPage } from './pages/catalog.page';
import { CheckoutPage } from './pages/checkout.page';
import { LoginPage } from './pages/login.page';
import { ProductDetailPage } from './pages/product-detail.page';

type Pages = {
  cart: CartPage;
  catalog: CatalogPage;
  checkout: CheckoutPage;
  login: LoginPage;
  productDetail: ProductDetailPage;
};

/**
 * Tests import `test` from here, not from `@playwright/test`: the page objects
 * arrive typed, so a renamed method fails at compile time instead of at run time
 * in CI.
 */
export const test = base.extend<Pages>({
  cart: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  catalog: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  checkout: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  login: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  productDetail: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
});

export { expect } from '@playwright/test';
