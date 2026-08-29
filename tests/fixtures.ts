import { test as base } from '@playwright/test';
import { CatalogPage } from './pages/catalog.page';
import { ProductDetailPage } from './pages/product-detail.page';

type Pages = {
  catalog: CatalogPage;
  productDetail: ProductDetailPage;
};

/**
 * Tests import `test` from here, not from `@playwright/test`: the page objects
 * arrive typed, so a renamed method fails at compile time instead of at run time
 * in CI.
 */
export const test = base.extend<Pages>({
  catalog: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  productDetail: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
});

export { expect } from '@playwright/test';
