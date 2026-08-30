import { test, expect } from '../fixtures';

/**
 * Integrity checks against the Oracle CO sample schema.
 *
 * They deliberately do not repeat what the schema already enforces. Foreign keys
 * guarantee that a shipment, a product and an order *exist*; a `CHECK` keeps the
 * status inside its list. What no constraint in standard SQL can express is a
 * rule that spans rows — that the shipment attached to a line belongs to the
 * same customer as the order it belongs to. Restating an enforced constraint is
 * theatre: it can only ever pass.
 */

test('a shipment attached to an order line belongs to the customer who ordered', async ({
  oracle,
}) => {
  const crossed = await oracle.rows<{ ORDER_ID: number; ORDER_CUSTOMER: number }>(
    `SELECT oi.order_id, o.customer_id AS order_customer, s.customer_id AS shipment_customer
       FROM order_items oi
       JOIN orders o     ON o.order_id = oi.order_id
       JOIN shipments s  ON s.shipment_id = oi.shipment_id
      WHERE s.customer_id <> o.customer_id`,
  );

  // The foreign key proves the shipment exists. Nothing proves it is the right
  // person's — and a parcel leaving for the wrong address is not a data problem
  // anyone discovers from a screen.
  expect(crossed, 'order lines shipped under a shipment that belongs to someone else').toEqual([]);
});

test('a shipment attached to an order line was made by the store that took the order', async ({
  oracle,
}) => {
  const crossed = await oracle.rows<{ ORDER_ID: number }>(
    `SELECT oi.order_id, o.store_id AS order_store, s.store_id AS shipment_store
       FROM order_items oi
       JOIN orders o     ON o.order_id = oi.order_id
       JOIN shipments s  ON s.shipment_id = oi.shipment_id
      WHERE s.store_id <> o.store_id`,
  );

  expect(crossed, 'order lines shipped from a store that did not take the order').toEqual([]);
});

test('a cancelled order has nothing shipped against it', async ({ oracle }) => {
  const shipped = await oracle.rows<{ ORDER_ID: number; SHIPMENT_ID: number }>(
    `SELECT oi.order_id, oi.shipment_id
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
      WHERE o.order_status = 'CANCELLED'
        AND oi.shipment_id IS NOT NULL`,
  );

  // Note what is *not* asserted here: that a COMPLETE order has everything
  // shipped. Measured on this data, 1157 of 3806 complete lines carry no
  // shipment, so that rule does not hold and asserting it would only encode a
  // guess. The cancelled side does hold, on all 68 lines.
  expect(shipped, 'cancelled orders with shipments against them').toEqual([]);
});

test('every order line has a positive price and quantity', async ({ oracle }) => {
  const invalid = await oracle.rows<{ ORDER_ID: number; UNIT_PRICE: number; QUANTITY: number }>(
    `SELECT order_id, line_item_id, unit_price, quantity
       FROM order_items
      WHERE unit_price <= 0 OR quantity <= 0`,
  );

  // The line price is *not* compared against the catalogue: 3841 of 3914 lines
  // legitimately differ, because a line records what was charged at the time and
  // the catalogue moves on. Asserting equality would assert a bug.
  expect(invalid, 'order lines priced at or below zero').toEqual([]);
});
