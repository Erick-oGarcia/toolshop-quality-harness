# Confirm has to be pressed twice, and the first press reports success

**Status:** confirmed, reproduced on every run
**Found:** week 2, while writing the checkout spec

## What a customer sees

Fill the cart, reach the payment step, choose a payment method, press **Confirm**.
The page answers _"Payment was successful"_. No order exists. Press **Confirm**
again and the order is created.

A customer who trusts the message and leaves the page has paid for nothing.

## Why it happens

`PaymentComponent.checkPayment()` returns the validation flag as it is _before_
the request that sets it has resolved:

```ts
checkPayment(paymentPayload: any): Observable<boolean> {
  if (!this.state) {
    this.paymentService.validate(endpoint, paymentPayload).subscribe({
      next: (res) => { this.paymentMessage = res.message; this.state = true; },
      ...
    });
  }
  return of(this.state);   // still null on the first press
}
```

The caller only creates the invoice when the result is `true`:

```ts
this.checkPayment(payloadPayload).subscribe(result => {
  if (result === true) { this.invoiceService.createInvoice(payload)... }
```

So the first press fires the validation, returns `null`, and creates nothing.
The validation then resolves, sets `state` and renders the success message —
which is why the UI reports success for an order that was never sent.

## How it was proven

Deduction from the source suggested a different culprit (see
[country-code-mismatch](country-code-mismatch.md)). What settled it was
recording the network instead of reasoning about it: **no `POST /invoices` was
issued at all**, only `POST /payment/check` returning
`{"message":"Payment was successful"}`. A request that never leaves the browser
cannot have been rejected by the API.

## What the trace shows

`checkout-single-press.auth.spec.ts` reproduces the defect on demand: it presses
Confirm once and expects the order, which is what the application should do. It
is marked `test.fail()`, so it counts as an expected failure today and raises an
unexpected pass the day the behaviour is fixed.

Its trace is kept (`trace: 'retain-on-failure'`) and records every request the
failing run made:

| endpoint              | calls |
| --------------------- | ----: |
| `POST /carts`         |     1 |
| `/carts/{id}`         |     3 |
| `POST /payment/check` |     1 |
| `/invoices`           | **0** |

The order route is never called. The run did not fail because the API rejected
the invoice — it failed because no invoice was ever sent, while the page said
_"Payment was successful"_.

Open it with:

```bash
npx playwright show-trace test-results/<run>/trace.zip
```

## What the test does about it

`checkout.auth.spec.ts` presses Confirm, waits for the success message — the
signal that the flag flipped — and presses again. The comment in the spec
explains why, so the second click is not mistaken for a superstitious retry.
