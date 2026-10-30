import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingChatHref,
  bookingStatusMeta,
  formatQuoteLine,
  normalizeBookingStatus,
  parseBookingSearchParams,
  serviceTypeLabel,
  shapeCreateRequest,
  shapeQuoteRequest,
  toBookingSearchParams,
  validateBookingForm,
} from "./phase3Booking.js";

const boardingDraft = {
  sitterId: "sitter-1",
  serviceType: "boarding",
  checkIn: "2026-11-01",
  checkOut: "2026-11-05",
  petIds: ["1", "2"],
};

test("form validation covers boarding, walking, and in-home rules", () => {
  assert.equal(validateBookingForm(boardingDraft).ok, true);

  const shortStay = validateBookingForm({
    ...boardingDraft,
    checkOut: "2026-11-01",
  });
  assert.equal(shortStay.ok, false);
  assert.match(shortStay.errors.checkOut, /after check-in/);

  const walk = validateBookingForm({
    sitterId: "sitter-1",
    serviceType: "dog_walking",
    date: "2026-11-02",
    startTime: "09:00",
    durationMinutes: 30,
    petIds: ["9"],
    pets: [{ id: "9", petType: "cat" }],
  });
  assert.equal(walk.ok, false);
  assert.match(walk.errors.petIds, /dogs only/);

  const visit = validateBookingForm({
    sitterId: "sitter-1",
    serviceType: "in_home",
    mode: "visit",
    date: "2026-11-02",
    startTime: "13:00",
    visitHours: 2,
    petIds: ["3"],
    requireAddress: true,
  });
  assert.equal(visit.ok, false);
  assert.match(visit.errors.ownerAddress, /address/);
});

test("quote request shaping never sends a client total", () => {
  const boarding = shapeQuoteRequest(boardingDraft);
  assert.equal(boarding.serviceType, "boarding");
  assert.equal(boarding.checkIn, "2026-11-01");
  assert.equal(boarding.checkOut, "2026-11-05");
  assert.deepEqual(boarding.petIds, [1, 2]);
  assert.equal("totalPrice" in boarding, false);
  assert.equal("mode" in boarding, false);

  const walk = shapeQuoteRequest({
    sitterId: "sitter-1",
    serviceType: "dog_walking",
    date: "2026-11-02",
    startTime: "09:00",
    durationMinutes: 60,
    petIds: ["4"],
  });
  assert.equal(walk.mode, "duration");
  assert.equal(walk.durationMinutes, 60);
  assert.equal("totalPrice" in walk, false);

  const overnight = shapeQuoteRequest({
    sitterId: "sitter-1",
    serviceType: "in_home",
    mode: "overnight",
    checkIn: "2026-11-02",
    checkOut: "2026-11-04",
    petIds: ["3"],
  });
  assert.equal(overnight.mode, "overnight");
  assert.equal(overnight.checkIn, "2026-11-02");
});

test("create request adds payment and in-home address, still no total", () => {
  const body = shapeCreateRequest(
    {
      sitterId: "sitter-1",
      serviceType: "in_home",
      mode: "visit",
      date: "2026-11-02",
      startTime: "13:00",
      visitHours: 2,
      petIds: ["3"],
      ownerAddress: "12 Ari, Bangkok",
      accessInstructions: "Gate code 1234",
    },
    { paymentMethod: "card", message: "Please text on arrival" },
  );

  assert.equal(body.paymentMethod, "stripe");
  assert.equal(body.ownerAddress, "12 Ari, Bangkok");
  assert.equal(body.accessInstructions, "Gate code 1234");
  assert.equal(body.message, "Please text on arrival");
  assert.equal("totalPrice" in body, false);
});

test("status mapping treats legacy success as completed", () => {
  assert.equal(normalizeBookingStatus("success"), "completed");
  assert.equal(bookingStatusMeta("waiting_confirm").label, "Waiting for confirm");
  assert.equal(bookingStatusMeta("completed").label, "Completed");
  assert.equal(bookingStatusMeta("success").key, "completed");
  assert.equal(serviceTypeLabel("dog_walking"), "Dog walking");
  assert.equal(serviceTypeLabel({ service_type: "in_home" }), "In-home sitter");
});

test("quote line is display-only from server fields", () => {
  assert.equal(
    formatQuoteLine({
      serviceType: "boarding",
      quantity: 4,
      durationUnit: "nights",
      unitPrice: 1200,
    }),
    "4 nights × ฿1,200",
  );
  assert.equal(
    formatQuoteLine({
      serviceType: "dog_walking",
      durationMinutes: 30,
      unitPrice: 150,
    }),
    "฿150 / 30 min",
  );
});

test("search params round-trip without a total", () => {
  const params = toBookingSearchParams(boardingDraft);
  assert.equal(params.get("serviceType"), "boarding");
  assert.equal(params.get("totalPrice"), null);

  const parsed = parseBookingSearchParams(params);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.draft.checkIn, "2026-11-01");
  assert.deepEqual(parsed.draft.petIds, ["1", "2"]);
});

test("chat href uses conversation id from the booking", () => {
  assert.equal(bookingChatHref({ conversationId: "42" }), "/messages?id=42");
  assert.equal(bookingChatHref({}), "");
});
