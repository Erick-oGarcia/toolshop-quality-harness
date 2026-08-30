import path from 'node:path';
import { test, expect } from '@playwright/test';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import { fetchCatalogPage } from '../../src/catalog-client';

const { boolean, decimal, eachLike, integer, string } = MatchersV3;

const provider = new PactV3({
  consumer: 'catalog-bff',
  provider: 'toolshop-api',
  dir: path.resolve('pacts'),
});

test('the catalog page carries the fields this client reads', async () => {
  provider
    .given('the catalog has products')
    .uponReceiving('a request for the first page of products')
    .withRequest({
      method: 'GET',
      path: '/products',
      query: { page: '1' },
    })
    .willRespondWith({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      // Matchers describe the *shape*, not the values. Pinning the example
      // values would turn the contract into a snapshot of one seed, and every
      // reseed would break a provider that is behaving perfectly.
      body: {
        total: integer(9),
        data: eachLike({
          id: string('01M182RX7R67T5S84MYE5P13TB'),
          name: string('Combination Pliers'),
          price: decimal(14.15),
          in_stock: boolean(true),
        }),
      },
    });

  await provider.executeTest(async (mockServer) => {
    const page = await fetchCatalogPage(mockServer.url, 1);

    // Asserting the client's own output, not the raw response: the contract is
    // only worth writing if the mapping it feeds actually works.
    expect(page.total).toBe(9);
    expect(page.items).toEqual([
      { id: '01M182RX7R67T5S84MYE5P13TB', name: 'Combination Pliers', price: 14.15, inStock: true },
    ]);
  });
});
