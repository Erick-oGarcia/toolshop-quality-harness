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

## Layer: invoice ↔ lines ↔ payment

**Checks:** `tests/db/invoice-integrity.auth.spec.ts` — one order is billed to
the product that was clicked, for the quantity ordered, at the price the
storefront advertised, with `total` and `subtotal` equal to the line arithmetic
and exactly one payment carrying the chosen method. A second check asks the same
arithmetic question of **every invoice already stored**, because a bug that ran
last month leaves no failing test behind, only rows.

Money is compared in whole cents. `14.15 * 3` is not `42.45` in binary floating
point, and the driver returns DECIMAL as a string precisely so the precision
survives long enough for the test to see it.

**Divergence used:** a controlled corruption of one line, which is what a partial
write or a bad migration looks like from the outside.

```bash
docker compose -f docker/compose.yml exec -T mariadb \
  mysql -uroot -proot toolshop -e \
  "UPDATE invoice_items SET quantity = quantity + 1 WHERE id = '<line>';"
```

**Result:**

```
INV-2026000011: total 42.45 vs lines 56.60
```

Restoring the row returns the sweep to green.

**What no other layer would have caught:** nothing about this is visible through
the application. The invoice was created correctly and every screen and endpoint
still renders it; only the stored arithmetic disagrees with itself, and it would
surface as a customer dispute or a broken month-end report long after the change
that caused it.

## Layer: Oracle CO schema — rules a constraint cannot hold

**Checks:** `tests/oracle/co-integrity.spec.ts`, against the Oracle
[CO sample schema](https://github.com/oracle-samples/db-sample-schemas) (MIT).

They deliberately avoid restating what the schema already enforces. Foreign keys
guarantee that a shipment, an order and a product _exist_; a `CHECK` keeps the
status inside its list. Restating an enforced constraint is theatre — it can only
ever pass. What no constraint in standard SQL can express is a rule spanning
rows:

- a shipment attached to an order line belongs to the customer who ordered
- that shipment was made by the store that took the order
- a cancelled order has nothing shipped against it
- every line has a positive price and quantity

**Two rules were dropped after measuring**, which is the point of measuring:

- _a COMPLETE order has everything shipped_ — false here: 1157 of 3806 complete
  lines carry no shipment
- _a line price equals the catalogue price_ — false, and rightly so: 3841 of 3914
  lines differ, because a line records what was charged at the time while the
  catalogue moves on. Asserting equality would assert a bug.

**Divergence used:** repointing one shipment at a different customer, which is
what a bad migration or a partial write looks like from the inside.

```sql
UPDATE shipments SET customer_id = <another customer>
 WHERE shipment_id = <a shipment referenced by an order line>;
```

**Result:** the check reported both lines of the affected order. Restoring the
row — by deriving the customer back from the order the shipment is attached to —
returns it to green.

**What no other layer would have caught:** the foreign key is satisfied
throughout. Every row exists, every reference resolves, and the order renders
correctly anywhere it is displayed. Only the relationship between two rows is
wrong, and it surfaces when a parcel reaches the wrong address.
