# Almost every stored invoice has no subtotal

**Status:** confirmed; the cause is the seeded corpus, not the checkout
**Found:** week 3, while writing the invoice integrity checks

## The numbers

```sql
SELECT COUNT(*) AS invoices, SUM(subtotal IS NULL) AS without_subtotal FROM invoices;
```

| invoices | without subtotal |
| -------: | ---------------: |
|      205 |              200 |

The five with a subtotal are the ones this suite created through the checkout.
The other two hundred come from the seeder, which writes `total` and the lines
but leaves `subtotal` null.

## Why it matters even though it is demo data

The column is nullable, so the database accepts an invoice with no subtotal, and
the application never has to reconcile the two paths. Any report that sums
`subtotal` — a tax return, a month-end close, a margin breakdown — reads null for
97.5% of the history while the totals are all present. The failure shows up far
from its cause and looks like a reporting bug.

`total` itself is consistent: the sweep in `invoice-integrity.auth.spec.ts`
compares every invoice against its own lines and finds no divergence across all
205 rows. The gap is specific to `subtotal`.

## Why it is not asserted as a defect

The suite tests the application, and the checkout does populate `subtotal`. A
`test.fail()` here would claim the application is broken when the seeder is what
wrote those rows. It is recorded rather than asserted — and it is the reason the
per-order check verifies `subtotal` explicitly, so the path that does matter
stays covered.
