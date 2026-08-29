# The same address is stored two different ways, depending on one click

**Status:** confirmed against the database
**Found:** week 2 in the checkout form · confirmed week 3 with a database check

## What a customer sees

A signed-in customer reaching the address step finds the country dropdown
**blank**, while every other field is filled in. The form is valid anyway, so
they can proceed without noticing.

## What is stored

Two orders, same customer, same postcode, same house number. The only difference
is whether the customer touched the dropdown:

| column                | dropdown untouched  | country selected |
| --------------------- | ------------------- | ---------------- |
| `billing_country`     | `Austria`           | `AT`             |
| `billing_city`        | `East Vellaborough` | `Frauenkirchen`  |
| `billing_state`       | `Kansas`            | `Burgenland`     |
| `billing_postal_code` | `1050`              | `1050`           |

The untouched path stores an **American city and state against an Austrian
postcode**, and writes the country as a name where the other path writes a code.
Both orders were accepted.

## Why

The select is keyed by ISO code:

```html
<option value="{{country.code}}">{{ country.name }}</option>
```

with `assets/countries.json` holding `{"name": "Austria", "code": "AT"}`. The
profile stores the **name**, so `AddressComponent.setAddress()` patches the
control with `"Austria"`, no option matches, and the field renders empty —
while `Validators.required` passes, because it reads the control and not the
DOM.

That value then travels. The postcode lookup resolves a locale from it:

```php
$locale = self::COUNTRY_TO_LOCALE[strtoupper($country)] ?? 'en_US';
```

There is no `AUSTRIA` key, so it falls back to US data — which is where
`Kansas` comes from. The API validates the submitted city against the same
lookup, seeded by country + postcode, so both sides compute the same wrong
answer and agree with each other.

## Why only the database sees it

The API answers `201` and the page prints an invoice number: from the outside
the order is a success, and both spellings pass validation. Nothing in the UI or
in the API response reveals that two orders placed the same way now disagree in
the table that matters — the one an invoice, a shipping label or a tax report
would be built from.

## What the suite does about it

`tests/db/order-persistence.auth.spec.ts` holds two checks, deliberately
separate:

- **an order exists in the database against the right customer** — a live
  guarantee that must pass
- **an order stores the country as the code the form offers** — marked
  `test.fail()`, so it records this defect without turning the suite red and
  raises an unexpected pass the day it is fixed

They are separate on purpose: a real guarantee bundled inside an
expected-failure test stops warning anyone the moment it breaks.
