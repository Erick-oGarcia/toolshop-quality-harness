# The country field arrives blank for a signed-in customer

**Status:** the blank field is confirmed; the data-consistency consequence below
is a hypothesis, not yet verified
**Found:** week 2, while writing the checkout spec

## What is confirmed

The checkout address step renders country options keyed by ISO code:

```html
<option value="{{country.code}}">{{ country.name }}</option>
```

with `assets/countries.json` holding `{"name": "Austria", "code": "AT"}`.

The seeded customer profile stores the **name**:

```php
'city' => 'Vienna', 'country' => 'Austria',
```

`AddressComponent.setAddress()` patches the form from that profile, so the
control ends up holding `"Austria"`. No option carries that value, so the select
renders empty — while `Validators.required` passes, because it reads the control
and not the DOM. The form considers itself valid; the customer sees a blank
dropdown.

Measured directly, on arrival at the address step:

| field        | value            |
| ------------ | ---------------- |
| street       | `Test street 98` |
| city         | `Vienna`         |
| state        | _(empty)_        |
| country      | _(empty)_        |
| postal_code  | _(empty)_        |
| house_number | _(empty)_        |

## What is not confirmed

The obvious consequence would be that an order placed without touching the
dropdown stores `"Austria"` while one placed after touching it stores `"AT"` —
the same address written two ways depending on a gesture. The API validates
`billing_country` with `AddressMatchesCountry`, and its postcode patterns are
keyed by ISO code, so the name may also be rejected outright.

Neither has been observed yet: the order never reached the API while
[the two-click defect](confirm-needs-two-clicks.md) was in the way. This is the
first thing the database layer should check.

## What the test does about it

It selects the country explicitly, which is what a customer facing a blank
dropdown is forced to do.
