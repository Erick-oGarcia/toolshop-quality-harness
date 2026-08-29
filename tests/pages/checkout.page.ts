import { type Locator, type Page } from '@playwright/test';

/**
 * Steps 2 to 4 of the checkout wizard: sign-in, address and payment. Step 2
 * only renders a "proceed" button when the session is already signed in, which
 * is how the authenticated specs skip the login form.
 */
export class CheckoutPage {
  readonly proceedAfterSignIn: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly country: Locator;
  readonly state: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly proceedAfterAddress: Locator;
  readonly paymentMethod: Locator;
  readonly finish: Locator;
  readonly paymentSuccessMessage: Locator;
  readonly confirmation: Locator;

  constructor(page: Page) {
    this.proceedAfterSignIn = page.getByTestId('proceed-2');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.country = page.getByTestId('country');
    this.state = page.getByTestId('state');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.proceedAfterAddress = page.getByTestId('proceed-3');
    this.paymentMethod = page.getByTestId('payment-method');
    this.finish = page.getByTestId('finish');
    this.paymentSuccessMessage = page.getByTestId('payment-success-message');

    // The confirmation block carries the invoice number but no `data-test`, and
    // its text comes from a translation file, so matching on words would break
    // in another locale. The id is the only stable handle the app offers here.
    // eslint-disable-next-line playwright/no-raw-locators
    this.confirmation = page.locator('#order-confirmation');
  }

  /**
   * The invoice number printed on the confirmation, which is how a database
   * check finds the row this run created. Reading it beats `ORDER BY created_at
   * DESC LIMIT 1`, which silently picks another worker's order the moment the
   * suite runs in parallel.
   */
  async invoiceNumber(): Promise<string> {
    const text = await this.confirmation.innerText();
    const match = text.match(/INV-\d+/);

    if (match === null) {
      throw new Error(`no invoice number in the confirmation: ${text.replace(/\s+/g, ' ')}`);
    }

    return match[0];
  }
}
