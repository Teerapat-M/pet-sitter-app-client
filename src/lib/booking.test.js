import assert from "node:assert/strict";
import test from "node:test";
import {
  formatBookingDate,
  formatBookingDateRangeFromRecord,
  formatBookingDateTimeLabel,
  formatOwnerBookingDate,
  formatOwnerBookingDateTime,
  normalizeBookingDate,
  toDateOnly,
} from "./booking.js";

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

test("owner list and detail use the same Asia/Bangkok booking formatter", () => {
  const oneDay = {
    start_date: "2027-01-10",
    end_date: "2027-01-10",
    start_time: "09:00",
    end_time: "12:00",
    duration_unit: "hours",
  };
  const listDateTime = formatOwnerBookingDateTime(oneDay);
  const detailDateTime = formatBookingDateTimeLabel({
    startDate: oneDay.start_date,
    endDate: oneDay.end_date,
    startTime: oneDay.start_time,
    endTime: oneDay.end_time,
    isManyDays: false,
  });
  assert.equal(listDateTime, detailDateTime);
  assert.equal(listDateTime, "10 Jan, 2027 | 9 AM - 12 PM");
  assert.equal(formatOwnerBookingDate(oneDay), "10 Jan, 2027");
  assert.equal(formatOwnerBookingDate(oneDay), formatBookingDate(oneDay.start_date));

  const manyDay = {
    start_date: "2027-01-10",
    end_date: "2027-01-12",
    duration_unit: "Day",
  };
  assert.equal(
    formatOwnerBookingDateTime(manyDay),
    formatBookingDateRangeFromRecord(manyDay),
  );
  assert.equal(formatOwnerBookingDate(manyDay), "10 Jan, 2027 - 12 Jan, 2027");
  assert.equal(formatOwnerBookingDateTime(manyDay), formatOwnerBookingDate(manyDay));

  const utcShift = { start_date: "2026-11-10T17:00:00.000Z" };
  assert.equal(formatOwnerBookingDate(utcShift), "11 Nov, 2026");
});
