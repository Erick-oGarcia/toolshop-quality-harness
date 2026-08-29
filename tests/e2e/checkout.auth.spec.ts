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

  // The profile stores the country NAME ("Austria") while the select's options
  // are ISO codes ("AT"), so the field arrives blank while the form still counts
  // as valid — the control holds a value no option matches. Selecting it is what
  // a customer facing an empty dropdown is forced to do.
  // See docs/findings/country-code-mismatch.md.
  await checkout.country.selectOption('AT');

  // Only the postcode and the house number are typed. The application looks the
  // address up from country + postcode and patches street, city and state with
  // the result, and the invoice API validates the submitted city against that
  // same lookup — which is seeded by country + postcode, so both sides compute
  // the same answer. Typing our own city therefore starts a race we cannot win:
  // whichever lands last decides whether the order is accepted, and the losing
  // case is a silent 422. Letting the lookup fill those fields makes the data
  // consistent by construction.
  await checkout.postalCode.fill('1050');
  await checkout.houseNumber.fill('98');

  // `state` is null in the seed and no other step writes it, so the button can
  // only enable once the lookup has landed: this waits for the whole address to
  // be filled by the application, without knowing how long the lookup takes.
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

  await expect(checkout.confirmation).toBeVisible();
});
