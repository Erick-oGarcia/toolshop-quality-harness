import path from 'node:path';
import { test, expect } from '@playwright/test';
import { Verifier } from '@pact-foundation/pact';
import { openDatabase } from '../db/database';

const PACT_FILE = path.resolve('pacts/catalog-bff-toolshop-api.json');
const PROVIDER_URL = process.env.PROVIDER_BASE_URL ?? 'http://localhost:8091';

// Starting the stack, verifying and tearing down takes longer than a browser
// assertion, and the default timeout is sized for the latter.
test.setTimeout(180_000);

test('the Toolshop API honours the catalog contract', async () => {
  const output = await new Verifier({
    provider: 'toolshop-api',
    providerBaseUrl: PROVIDER_URL,
    pactUrls: [PACT_FILE],
    logLevel: 'warn',
    stateHandlers: {
      /**
       * The state is checked, not assumed. A handler that quietly does nothing
       * turns "given the catalog has products" into a comment, and the
       * verification passes against an empty catalog while claiming otherwise.
       */
      'the catalog has products': async () => {
        const { db, close } = await openDatabase();

        try {
          const products = await db.value<number>('SELECT COUNT(*) FROM products');

          if (!products || Number(products) === 0) {
            throw new Error('provider state "the catalog has products" does not hold: none seeded');
          }
        } finally {
          await close();
        }
      },
    },
  }).verifyProvider();

  // A verifier with nothing to verify succeeds. If the pact file went missing
  // or came back empty, everything above would still pass and prove nothing —
  // so the output has to show the interaction was actually exercised.
  expect(output, 'the verifier ran without exercising the interaction').toContain(
    'a request for the first page of products',
  );
});
