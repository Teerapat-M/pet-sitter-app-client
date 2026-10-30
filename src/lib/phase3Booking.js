/**
 * Phase 3 booking contract helpers.
 * Matches server docs/phase3-api.md — client never sends a trusted total.
 */

export const SERVICE_TYPES = ["boarding", "dog_walking", "in_home"];
export const WALK_DURATIONS = [30, 60];
export const IN_HOME_MODES = ["visit", "overnight"];
export const PAYMENT_METHODS = ["cash", "stripe"];

export const BOOKING_STATUSES = [
  "waiting_confirm",
  "waiting_service",
  "in_service",
  "completed",
  "cancelled",
];

export const BOOKING_STATUS_LABELS = {
  waiting_confirm: "Waiting for confirm",
  waiting_service: "Waiting for service",
  in_service: "In service",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_TONES = {
  waiting_confirm: { text: "text-pink", dot: "bg-pink", color: "#FA8AC0" },
  waiting_service: { text: "text-yellow", dot: "bg-yellow", color: "#F5A623" },
  in_service: { text: "text-blue", dot: "bg-blue", color: "#76D0FC" },
  completed: { text: "text-green", dot: "bg-green", color: "#1CCD83" },
  cancelled: { text: "text-red", dot: "bg-red", color: "#EA1010" },
};

export const SERVICE_TYPE_LABELS = {
  boarding: "Boarding",
  dog_walking: "Dog walking",
  in_home: "In-home sitter",
};

export function serviceTypeLabel(bookingOrType) {
  const type =
    typeof bookingOrType === "string"
      ? bookingOrType
      : trim(
          bookingOrType?.service_type ??
            bookingOrType?.serviceType ??
            bookingOrType?.service?.type ??
            "",
        );
  return SERVICE_TYPE_LABELS[type] || "";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toIdList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeBookingStatus(status) {
  const key = trim(status);
  if (key === "success") return "completed";
  return BOOKING_STATUSES.includes(key) ? key : key;
}

export function bookingStatusMeta(status) {
  const key = normalizeBookingStatus(status);
  const labels = BOOKING_STATUS_LABELS[key];
  const tones = BOOKING_STATUS_TONES[key];
  if (!labels || !tones) {
    return {
      key: key || "waiting_confirm",
      label: key || "Waiting for confirm",
      text: "text-ink-400",
      dot: "bg-ink-400",
      color: "#9A8676",
    };
  }
  return { key, label: labels, ...tones };
}

export function isDogPet(pet) {
  const type = String(pet?.petType ?? pet?.pet_type ?? pet?.type ?? "")
    .trim()
    .toLowerCase();
  return type === "dog";
}

export function validateBookingForm(draft = {}) {
  const errors = {};
  const serviceType = trim(draft.serviceType);
  if (!SERVICE_TYPES.includes(serviceType)) {
    errors.serviceType = "Choose boarding, dog walking, or in-home.";
  }

  const petIds = toIdList(draft.petIds);
  if (!petIds.length) {
    errors.petIds = "Select at least one pet.";
  }

  if (serviceType === "boarding") {
    const checkIn = trim(draft.checkIn);
    const checkOut = trim(draft.checkOut);
    if (!DATE_RE.test(checkIn)) errors.checkIn = "Check-in date is required.";
    if (!DATE_RE.test(checkOut)) errors.checkOut = "Check-out date is required.";
    if (DATE_RE.test(checkIn) && DATE_RE.test(checkOut) && checkOut <= checkIn) {
      errors.checkOut = "Check-out must be after check-in.";
    }
  }

  if (serviceType === "dog_walking") {
    if (!DATE_RE.test(trim(draft.date))) errors.date = "Walk date is required.";
    if (!TIME_RE.test(trim(draft.startTime))) {
      errors.startTime = "Start time is required.";
    }
    const minutes = Number(draft.durationMinutes);
    if (!WALK_DURATIONS.includes(minutes)) {
      errors.durationMinutes = "Choose a 30 or 60 minute walk.";
    }
    if (Array.isArray(draft.pets) && draft.pets.length) {
      const selected = draft.pets.filter((pet) => petIds.includes(String(pet.id)));
      if (selected.some((pet) => !isDogPet(pet))) {
        errors.petIds = "Dog walking is for dogs only.";
      }
    }
  }

  if (serviceType === "in_home") {
    const mode = trim(draft.mode);
    if (!IN_HOME_MODES.includes(mode)) {
      errors.mode = "Choose a daytime visit or overnight stay.";
    }
    if (mode === "visit") {
      if (!DATE_RE.test(trim(draft.date))) errors.date = "Visit date is required.";
      if (!TIME_RE.test(trim(draft.startTime))) {
        errors.startTime = "Start time is required.";
      }
      const hours = Number(draft.visitHours);
      if (!Number.isInteger(hours) || hours < 1) {
        errors.visitHours = "Visit hours must be a whole number.";
      }
    }
    if (mode === "overnight") {
      const checkIn = trim(draft.checkIn);
      const checkOut = trim(draft.checkOut);
      if (!DATE_RE.test(checkIn)) errors.checkIn = "Check-in date is required.";
      if (!DATE_RE.test(checkOut)) errors.checkOut = "Check-out date is required.";
      if (DATE_RE.test(checkIn) && DATE_RE.test(checkOut) && checkOut <= checkIn) {
        errors.checkOut = "Check-out must be after check-in.";
      }
    }
    if (draft.requireAddress && !trim(draft.ownerAddress)) {
      errors.ownerAddress = "Owner address is required for in-home care.";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Body for POST /api/bookings/quote. Never includes totalPrice.
 */
export function shapeQuoteRequest(draft = {}) {
  const serviceType = trim(draft.serviceType);
  const sitterId = trim(draft.sitterId);
  const petIds = toIdList(draft.petIds);
  const body = { sitterId, serviceType };
  if (petIds.length) body.petIds = petIds.map((id) => (/^\d+$/.test(id) ? Number(id) : id));

  if (serviceType === "boarding") {
    body.checkIn = trim(draft.checkIn);
    body.checkOut = trim(draft.checkOut);
    return body;
  }

  if (serviceType === "dog_walking") {
    body.mode = "duration";
    body.date = trim(draft.date);
    body.startTime = trim(draft.startTime);
    body.durationMinutes = Number(draft.durationMinutes);
    return body;
  }

  body.mode = trim(draft.mode);
  if (body.mode === "visit") {
    body.date = trim(draft.date);
    body.startTime = trim(draft.startTime);
    body.visitHours = Number(draft.visitHours);
  } else {
    body.checkIn = trim(draft.checkIn);
    body.checkOut = trim(draft.checkOut);
  }
  return body;
}

/**
 * Body for POST /api/bookings. Same as quote plus payment + in-home address.
 * totalPrice is never sent.
 */
export function shapeCreateRequest(draft = {}, { paymentMethod = "cash", message = "" } = {}) {
  const body = shapeQuoteRequest(draft);
  const method = trim(paymentMethod) === "card" ? "stripe" : trim(paymentMethod);
  body.paymentMethod = PAYMENT_METHODS.includes(method) ? method : "cash";

  const note = trim(message);
  if (note) body.message = note;

  if (trim(draft.serviceType) === "in_home") {
    body.ownerAddress = trim(draft.ownerAddress);
    const access = trim(draft.accessInstructions);
    if (access) body.accessInstructions = access;
  }

  return body;
}

export function formatQuoteLine(quote) {
  if (!quote || typeof quote !== "object") return "";
  const unit = Number(quote.unitPrice ?? quote.unit_price);
  const quantity = Number(quote.quantity ?? quote.duration ?? quote.nights ?? quote.hours);
  const durationUnit = trim(quote.durationUnit ?? quote.duration_unit);
  const currency = Number.isFinite(unit)
    ? `฿${unit.toLocaleString("en-US")}`
    : "";

  if (quote.serviceType === "dog_walking" || durationUnit === "minutes" || durationUnit === "walk") {
    const minutes = Number(quote.durationMinutes ?? quote.duration ?? 30);
    return currency ? `${currency} / ${minutes} min` : "";
  }

  if (Number.isFinite(quantity) && quantity > 0 && currency) {
    const unitLabel =
      durationUnit === "hours"
        ? quantity === 1
          ? "hour"
          : "hours"
        : quantity === 1
          ? "night"
          : "nights";
    return `${quantity} ${unitLabel} × ${currency}`;
  }

  return currency;
}

export function formatQuoteTotal(quote) {
  const total = Number(quote?.totalPrice ?? quote?.total_price);
  if (!Number.isFinite(total)) return "";
  return `฿${total.toLocaleString("en-US")}`;
}

export function quoteUnavailable(quote) {
  return quote && quote.available === false;
}

export function toBookingSearchParams(draft = {}) {
  const params = new URLSearchParams();
  const fields = [
    "sitterId",
    "serviceType",
    "mode",
    "checkIn",
    "checkOut",
    "date",
    "startTime",
    "durationMinutes",
    "visitHours",
    "ownerAddress",
    "accessInstructions",
  ];
  for (const key of fields) {
    const value = trim(draft[key] != null ? String(draft[key]) : "");
    if (value) params.set(key, value);
  }
  const petIds = toIdList(draft.petIds);
  if (petIds.length) params.set("petIds", petIds.join(","));
  return params;
}

export function parseBookingSearchParams(searchParams = {}) {
  const get = (key) => {
    if (typeof searchParams.get === "function") return trim(searchParams.get(key));
    return trim(searchParams[key]);
  };

  const serviceType = get("serviceType");
  const draft = {
    sitterId: get("sitterId"),
    serviceType,
    mode: get("mode"),
    checkIn: get("checkIn") || get("startDate"),
    checkOut: get("checkOut") || get("endDate"),
    date: get("date") || get("startDate"),
    startTime: get("startTime"),
    durationMinutes: get("durationMinutes") ? Number(get("durationMinutes")) : "",
    visitHours: get("visitHours") ? Number(get("visitHours")) : "",
    ownerAddress: get("ownerAddress"),
    accessInstructions: get("accessInstructions"),
    petIds: toIdList(get("petIds")),
  };

  if (!SERVICE_TYPES.includes(serviceType) || !draft.sitterId) {
    return { valid: false, missing: ["sitterId", "serviceType"].filter((key) => !draft[key] || (key === "serviceType" && !SERVICE_TYPES.includes(serviceType))) };
  }

  const { ok, errors } = validateBookingForm({
    ...draft,
    requireAddress: serviceType === "in_home",
  });
  if (!ok) {
    return { valid: false, errors, draft };
  }
  return { valid: true, draft };
}

export function bookingChatHref(booking) {
  const id =
    booking?.conversationId ??
    booking?.conversation_id ??
    booking?.conversation?.id;
  if (id == null || id === "") return "";
  return `/messages?id=${encodeURIComponent(String(id))}`;
}

export function offeringPrice(offerings, serviceType, mode) {
  const list = Array.isArray(offerings) ? offerings : [];
  const match = list.find((item) => {
    const type = trim(item?.type ?? item?.serviceType ?? item?.service_type);
    if (type !== serviceType) return false;
    if (!mode) return true;
    return trim(item?.mode) === mode;
  });
  const amount = Number(match?.priceAmount ?? match?.price_amount ?? match?.price);
  return Number.isFinite(amount) ? amount : null;
}
