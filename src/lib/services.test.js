import assert from "node:assert/strict";
import test from "node:test";
import { quoteBooking, serviceById } from "./services.js";

test("boarding quote matches D03 (3 nights × ฿450)", () => {
  const quote = quoteBooking("boarding", "2026-11-12", "2026-11-15");
  assert.equal(quote.nights, 3);
  assert.equal(quote.unitPrice, 450);
  assert.equal(quote.total, 1350);
  assert.equal(quote.line, "3 nights × ฿450");
});

test("walking quote is a flat 30-min rate", () => {
  const quote = quoteBooking("dog_walking", "2026-11-12", "2026-11-15");
  assert.equal(quote.total, 150);
  assert.equal(quote.line, "฿150 / 30 min");
});

test("in-home profile price is visit + night", () => {
  assert.equal(serviceById("in_home").profilePrice, "฿350 visit · ฿700 night");
  assert.equal(quoteBooking("in_home", "2026-11-12", "2026-11-15").total, 2100);
});
