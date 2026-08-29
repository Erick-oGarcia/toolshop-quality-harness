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
