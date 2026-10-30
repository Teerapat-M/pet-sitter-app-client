import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBookingDate, toDateOnly } from "./booking.js";

test("date-only strings stay YYYY-MM-DD without toISOString", () => {
  assert.equal(toDateOnly("2026-11-11"), "2026-11-11");
  assert.equal(normalizeBookingDate("2026-11-11"), "2026-11-11");
  assert.equal(toDateOnly("2026-11-11").includes("T"), false);
});

test("T17:00Z is converted to the Asia/Bangkok calendar date", () => {
  // 11 Nov 2026 00:00 Bangkok = 10 Nov 2026 17:00 UTC
  assert.equal(toDateOnly("2026-11-10T17:00:00.000Z"), "2026-11-11");
  assert.equal(normalizeBookingDate("2026-11-10T17:00:00.000Z"), "2026-11-11");
  const shifted = new Date(2026, 10, 11);
  assert.equal(toDateOnly(shifted), "2026-11-11");
  assert.equal(JSON.stringify(toDateOnly(shifted)).includes("T"), false);
});
