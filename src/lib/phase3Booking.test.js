import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingChatHref,
  bookingStatusMeta,
  createLiveQuoteSession,
  formatQuoteLine,
  formatServiceDateTimeLabel,
  liveQuoteKey,
  normalizeBookingStatus,
  parseBookingSearchParams,
  serviceOfferingPriceLabel,
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

test("boarding search params drop leftover walk/in-home fields", () => {
  const params = toBookingSearchParams({
    ...boardingDraft,
    date: "2026-01-10",
    startTime: "09:00",
    mode: "duration",
    durationMinutes: 30,
  });
  assert.equal(params.get("checkIn"), "2026-11-01");
  assert.equal(params.get("checkOut"), "2026-11-05");
  assert.equal(params.get("date"), null);
  assert.equal(params.get("startTime"), null);
  assert.equal(params.get("mode"), null);
  assert.equal(params.get("durationMinutes"), null);

  const parsed = parseBookingSearchParams(
    new URLSearchParams(
      "sitterId=sitter-1&serviceType=boarding&checkIn=2027-01-10&checkOut=2027-01-12&date=2027-01-10&startTime=09:00&mode=duration&petIds=1",
    ),
  );
  assert.equal(parsed.valid, true);
  assert.equal(parsed.draft.startTime, "");
  assert.equal(parsed.draft.date, "");
  assert.equal(parsed.draft.mode, "");
});

test("boarding sidebar label is a date range, not leftover times", () => {
  assert.equal(
    formatServiceDateTimeLabel({
      serviceType: "boarding",
      checkIn: "2027-01-10",
      checkOut: "2027-01-12",
      startTime: "09:00",
    }),
    "10 Jan, 2027 - 12 Jan, 2027",
  );
});

test("quote dates stay YYYY-MM-DD even when given T17:00Z", () => {
  const body = shapeQuoteRequest({
    sitterId: "sitter-1",
    serviceType: "boarding",
    checkIn: "2026-11-11T17:00:00.000Z",
    checkOut: "2026-11-13T17:00:00.000Z",
    petIds: [1],
  });
  assert.match(body.checkIn, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(body.checkOut, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(body.checkIn.includes("T"), false);
  assert.equal(body.checkIn, "2026-11-12");
  assert.equal(body.checkOut, "2026-11-14");
});

test("walking card uses per_walk offering, not a duration fallback", () => {
  const offerings = [
    { type: "dog_walking", mode: "duration", durationMinutes: 30, priceAmount: 200 },
    { type: "dog_walking", mode: "per_walk", priceAmount: 250 },
    { type: "boarding", priceAmount: 450 },
  ];
  assert.equal(serviceOfferingPriceLabel(offerings, "dog_walking"), "฿250 / walk");
  assert.equal(serviceOfferingPriceLabel(offerings, "boarding"), "฿450 / night");
});

test("same quote inputs do not refetch on re-render", async () => {
  const calls = [];
  const session = createLiveQuoteSession({
    quoteFn: async (body) => {
      calls.push(body);
      return { totalPrice: 4800, available: true };
    },
    debounceMs: 20,
  });

  const draftA = {
    sitterId: "sitter-1",
    serviceType: "boarding",
    checkIn: "2026-11-10",
    checkOut: "2026-11-12",
    petIds: ["1"],
  };
  const keyA = liveQuoteKey("sitter-1", { ...draftA }, true);
  const keyB = liveQuoteKey("sitter-1", { ...draftA }, true);
  assert.equal(keyA, keyB);
  assert.notEqual(keyA, "");

  session.applyKey(keyA);
  session.applyKey(keyB);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(calls.length, 1);
  assert.equal(session.fetchCount, 1);

  session.applyKey(keyA);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(calls.length, 1);

  session.applyKey(
    liveQuoteKey("sitter-1", { ...draftA, checkOut: "2026-11-13" }, true),
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(calls.length, 2);
  session.dispose();
});
