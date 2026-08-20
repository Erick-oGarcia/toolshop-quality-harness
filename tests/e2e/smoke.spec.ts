import { test, expect } from '@playwright/test';

// Rode com: npm run test:smoke
// Dica: `npx playwright test --ui` abre o modo interativo; o painel "Locator"
// sugere o seletor certo quando você clica num elemento da página.

test('@smoke a home lista produtos', async ({ page }) => {
  await page.goto('/');

  // TODO(Erick): assertar que a grade renderizou COM ITENS (não só que a página abriu).
  // Perguntas-guia:
  //  - Qual data-test os cards de produto têm? (devtools na home, procure atributos data-test)
  //  - Como assertar "existem N ou mais cards"? Pesquise por `.count()` ou pelo
  //    matcher de contagem em expect(locator) — evite `waitForTimeout`.
  //  - baseURL já aponta para http://localhost:4200 (playwright.config.ts) — use caminhos relativos.
  const productCards = await page.getByTestId('product-01KZ9P20WVRY7JCFGP422GN9TX');
  await expect(productCards).toHaveCount(1); // Exemplo: assertar que existem 5 cards
});

test('@smoke abrir um produto mostra a página de detalhe', async ({ page }) => {
  await page.goto('/');

  // TODO(Erick): clicar no PRIMEIRO card e assertar algo que só existe no detalhe
  // (nome do produto, preço, botão de adicionar ao carrinho).
  // Pense: qual asserção falharia de verdade se a página de detalhe quebrasse?
  // (assertar só a URL é fraco — a página pode carregar vazia e o teste passa)
  //const productCards = await page.getByTestId('product-01KZ9P20WVRY7JCFGP422GN9TX');
  const productCards = await page.getByTestId('product-01KZ9P20WVRY7JCFGP422GN9TX');
  await productCards.first().click();




  // Assertar que a página de detalhe foi aberta
  const unitPrice = await page.getByTestId('unit-price');
  await expect(unitPrice).toHaveValue('$14.15');

});
