import assert from "node:assert/strict";
import test from "node:test";
import {
  formatThreadBookingBanner,
  getConversationBookingId,
  getConversationPhone,
  getConversationPresence,
  toTelHref,
} from "./chatThread.js";

test("thread booking helpers ignore conversations without real booking data", () => {
  assert.equal(getConversationBookingId({}), "");
  assert.equal(formatThreadBookingBanner(null), null);
  assert.equal(formatThreadBookingBanner({}), null);
  assert.equal(formatThreadBookingBanner({ transactionNo: "#PS-2502" }), null);
  assert.equal(getConversationPresence({ otherUser: { name: "Ploy" } }), "");
  assert.equal(getConversationPhone({ otherUser: { name: "Ploy" } }), "");
});

test("thread booking helpers read real ids, phone, and presence", () => {
  assert.equal(
    getConversationBookingId({ booking_id: "abc", booking: { id: "nested" } }),
    "abc",
  );
  assert.equal(getConversationBookingId({ bookingId: 42 }), "42");
  assert.equal(getConversationBookingId({ booking: "b-9" }), "b-9");
  assert.equal(getConversationPhone({ otherUser: { phone: "081-234-5678" } }), "0812345678");
  assert.equal(toTelHref("081-234-5678"), "tel:0812345678");
  assert.equal(
    getConversationPresence({ otherUser: { isOnline: true } }),
    "Online",
  );

  const banner = formatThreadBookingBanner({
    id: "b1",
    service_name: "Dog walking",
    start_date: "2026-11-14",
    start_time: "08:00",
    end_time: "08:30",
  });
  assert.equal(banner.title, "Dog walking");
  assert.equal(banner.summary, "2026-11-14 · 08:00–08:30");
  assert.equal(banner.href, "/owner/bookings");
});
