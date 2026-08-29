# Detection proof

A green suite against an application that happens to be correct proves nothing:
it cannot tell you whether the checks would notice if it were wrong. Every
verification layer here therefore has to be shown failing against a real
divergence, on purpose, and the proof is recorded below.

## Layer: storefront ↔ database

**Check:** `tests/db/catalog-consistency.spec.ts` — every product listed on the
storefront exists in the `products` table with the same name and price, joined
on the ULID the card carries in `data-test`.

**Divergence used:** the defect from week 1. `ProductService` caches product
listings for 300 s on the file driver, and that cache survives
`migrate:fresh --seed`, so the API keeps serving rows that no longer exist.

Reproduce it:

```bash
# 1. warm the cache
curl -s -o /dev/null "http://localhost:8091/products?page=1&between=price,1,100&is_rental=false"

# 2. reseed WITHOUT clearing the cache
docker compose -f docker/compose.yml exec -T laravel-api php artisan migrate:fresh --seed

# 3. the check fails
npx playwright test tests/db/catalog-consistency.spec.ts
```

**Result:**

```
Error: product 01M17JYW82X8JJ4YQMG6QK82Q4 is on the storefront
       but not in the database
```

Clearing the cache and running again returns the suite to green, so the check
responds to the divergence rather than failing on principle.

**What no other layer would have caught:** the API answers `200` with plausible
data, so an API test agrees with it. The page renders nine products, so a UI
test agrees too. Both read their answer from the component that is wrong. Only a
second source disagrees.

## Layer: order ↔ inventory (eventual consistency)

**Check:** `tests/db/stock-decrement.auth.spec.ts` — ordering two units of a
product decrements that product's `stock` by exactly two. The stock is read
before the order and the assertion is a _difference_: `toBe(23)` would also pass
against a product that already sat at 23, proving nothing about the order the
test just placed.

The decrement is asynchronous — `POST /invoices` answers `201` while a queued
job adjusts the stock afterwards (measured in ADR-0001) — so the check re-reads
the row until it settles, with a timeout past which "eventually" stops being an
explanation.

**Divergence used:** a dead queue worker, which is an ordinary production
incident and not a contrived one.

```bash
docker compose -f docker/compose.yml stop queue
npx playwright test tests/db/stock-decrement.auth.spec.ts
docker compose -f docker/compose.yml start queue    # back to green
```

**Result:**

```
Error: stock for Combination Pliers never settled at 18
Expected: 18
Received: 20
```

**What no other layer would have caught:** the order succeeded. The API answered
`201`, the page printed an invoice number, and the customer was thanked. Every
browser-facing and API-facing check agrees the sale went through — while the
inventory that fulfilment and reordering depend on never moved. That is
overselling, and it is invisible from the outside.
