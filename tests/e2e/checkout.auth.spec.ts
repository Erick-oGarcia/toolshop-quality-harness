import { test, expect } from '../fixtures';
import { SEEDED_USERS } from '../data/users';

test('a signed-in customer can place an order', async ({
  catalog,
  productDetail,
  cart,
  checkout,
}) => {
  await catalog.open();

  // The name is read from the card, not from the detail page: the detail heading
  // also contains the ECO badge, so it would not match what the cart renders.
  const card = catalog.products.first();
  const { name } = await catalog.summaryOf(card);
  await card.click();

  await productDetail.addToCart.click();

  // The badge is updated inside the POST /carts response handler, so this proves
  // the server accepted the write — not merely that the UI reacted. It is also
  // the synchronisation point: `expect` polls until it appears, which no fixed
  // wait can do correctly.
  await expect(cart.quantityBadge).toHaveText('1');

  await cart.open();

  // Exact on the count, contains on the text: the cart title renders the product
  // name next to a discount badge, so an exact match would fail only for
  // discounted products.
  await expect(cart.productTitles).toHaveCount(1);
  await expect(cart.productTitles.first()).toContainText(name);

  await cart.proceed.click();

  // Step 2 renders this button only for an already signed-in session, so
  // reaching it is itself evidence that storageState carried a real session.
  await checkout.proceedAfterSignIn.click();

  // The fills below would hide a regression here: if the application stopped
  // loading the signed-in customer's profile, this field would arrive empty, the
  // fill would populate it anyway, and the test would stay green. This is the
  // only line that checks the wizard knows who is signed in.
  await expect(checkout.street).toHaveValue(SEEDED_USERS.customer.address.street);

  // All six address fields are required. Filling postal_code or house_number
  // schedules a postcode lookup (300 ms debounce) that overwrites street, city
  // and state when it succeeds and leaves them alone when it fails — so racing
  // it would be guesswork either way. The test fills everything and then waits
  // for the form's own readiness signal: the button is bound to the form's
  // validity, so it enabling itself is the app saying the address is accepted.
  // The profile stores the country NAME ("Austria") while the select's options
  // are ISO codes ("AT"), so the field arrives blank and the form still counts
  // as valid — the control holds a value no option matches. Sending the name
  // makes the invoice API reject the order while the UI reports success, so the
  // test selects the country explicitly, exactly as a real customer is forced
  // to. See docs/findings/country-code-mismatch.md.
  await checkout.country.selectOption('AT');

  await checkout.street.fill('Test street 98');
  await checkout.city.fill('Vienna');
  await checkout.state.fill('Vienna');
  await checkout.postalCode.fill('1050');
  await checkout.houseNumber.fill('98');

  await expect(checkout.proceedAfterAddress).toBeEnabled();
  await checkout.proceedAfterAddress.click();

  await expect(checkout.paymentMethod).toBeVisible();

  // cash-on-delivery is the only method that needs no extra fields, which keeps
  // this spec about the order flow instead of about filling a card form. The
  // other methods deserve their own specs.
  await checkout.paymentMethod.selectOption('cash-on-delivery');

  await checkout.paymentMethod.selectOption('cash-on-delivery');

  // Confirm has to be pressed twice, and that is the application's behaviour,
  // not a flaky test. `checkPayment()` returns `of(this.state)` — the flag as it
  // is *before* the validation request it just fired resolves — so the first
  // press validates the payment and returns false, and no invoice is created.
  // The success message is what tells us the flag has flipped, so it is the
  // signal to press again. See docs/findings/confirm-needs-two-clicks.md.
  await checkout.finish.click();
  await expect(checkout.paymentSuccessMessage).toBeVisible();
  await checkout.finish.click();

  // The default 5 s expect timeout is a client-side default with no relation to
  // how long this takes: the second press triggers POST /invoices and the page
  // shows nothing until it answers, on a cold Laravel container in CI. Waiting
  // longer does not hide a defect — a rejected invoice never renders the
  // confirmation at all, so a real failure still fails, just without the
  // ambiguity of "slow or broken?".
  await expect(checkout.confirmation).toBeVisible({ timeout: 20_000 });
});
