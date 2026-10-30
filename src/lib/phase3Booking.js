/**
 * Phase 3 booking contract helpers.
 * Matches server docs/phase3-api.md — client never sends a trusted total.
 */

import {
  formatBookingDate,
  formatTime12Hour,
  toDateOnly,
} from "./booking.js";

export const SERVICE_TYPES = ["boarding", "dog_walking", "in_home"];
export const WALK_DURATIONS = [30, 60];
export const WALK_DURATION_MINUTES = [30, 45, 60];
export const IN_HOME_MODES = ["visit", "overnight"];
export const WALK_MODES = ["per_walk", "duration"];
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

export const IN_HOME_ADDRESS_REQUIRED_MESSAGE =
  "Owner address is required for in-home care.";

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
    const checkIn = toDateOnly(draft.checkIn);
    const checkOut = toDateOnly(draft.checkOut);
    if (!DATE_RE.test(checkIn)) errors.checkIn = "Check-in date is required.";
    if (!DATE_RE.test(checkOut)) errors.checkOut = "Check-out date is required.";
    if (DATE_RE.test(checkIn) && DATE_RE.test(checkOut) && checkOut <= checkIn) {
      errors.checkOut = "Check-out must be after check-in.";
    }
  }

  if (serviceType === "dog_walking") {
    if (!DATE_RE.test(toDateOnly(draft.date))) errors.date = "Walk date is required.";
    if (!TIME_RE.test(trim(draft.startTime))) {
      errors.startTime = "Start time is required.";
    }
    const walkMode = trim(draft.mode) === "per_walk" ? "per_walk" : "duration";
    if (walkMode === "duration") {
      const minutes = Number(draft.durationMinutes);
      if (!WALK_DURATION_MINUTES.includes(minutes)) {
        errors.durationMinutes = "Choose a walk duration this sitter offers.";
      }
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
      if (!DATE_RE.test(toDateOnly(draft.date))) errors.date = "Visit date is required.";
      if (!TIME_RE.test(trim(draft.startTime))) {
        errors.startTime = "Start time is required.";
      }
      const hours = Number(draft.visitHours);
      if (!Number.isInteger(hours) || hours < 1) {
        errors.visitHours = "Visit hours must be a whole number.";
      }
    }
    if (mode === "overnight") {
      const checkIn = toDateOnly(draft.checkIn);
      const checkOut = toDateOnly(draft.checkOut);
      if (!DATE_RE.test(checkIn)) errors.checkIn = "Check-in date is required.";
      if (!DATE_RE.test(checkOut)) errors.checkOut = "Check-out date is required.";
      if (DATE_RE.test(checkIn) && DATE_RE.test(checkOut) && checkOut <= checkIn) {
        errors.checkOut = "Check-out must be after check-in.";
      }
    }
    if (draft.requireAddress && !trim(draft.ownerAddress)) {
      errors.ownerAddress = IN_HOME_ADDRESS_REQUIRED_MESSAGE;
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
    body.checkIn = toDateOnly(draft.checkIn);
    body.checkOut = toDateOnly(draft.checkOut);
    return body;
  }

  if (serviceType === "dog_walking") {
    const walkMode = trim(draft.mode) === "per_walk" ? "per_walk" : "duration";
    body.mode = walkMode;
    body.date = toDateOnly(draft.date);
    body.startTime = trim(draft.startTime);
    if (walkMode === "duration") {
      body.durationMinutes = Number(draft.durationMinutes);
    } else {
      const minutes = Number(draft.durationMinutes);
      if (WALK_DURATION_MINUTES.includes(minutes)) {
        body.durationMinutes = minutes;
      }
    }
    return body;
  }

  body.mode = trim(draft.mode);
  if (body.mode === "visit") {
    body.date = toDateOnly(draft.date);
    body.startTime = trim(draft.startTime);
    body.visitHours = Number(draft.visitHours);
  } else {
    body.checkIn = toDateOnly(draft.checkIn);
    body.checkOut = toDateOnly(draft.checkOut);
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

function serviceSearchFields(draft = {}) {
  const serviceType = trim(draft.serviceType);
  const fields = ["sitterId", "serviceType"];
  if (serviceType === "boarding") {
    return [...fields, "checkIn", "checkOut"];
  }
  if (serviceType === "dog_walking") {
    return [...fields, "date", "startTime", "durationMinutes"];
  }
  if (serviceType === "in_home") {
    const mode = trim(draft.mode) === "overnight" ? "overnight" : "visit";
    if (mode === "overnight") {
      return [...fields, "mode", "checkIn", "checkOut", "ownerAddress", "accessInstructions"];
    }
    return [...fields, "mode", "date", "startTime", "visitHours", "ownerAddress", "accessInstructions"];
  }
  return fields;
}

export function toBookingSearchParams(draft = {}) {
  const params = new URLSearchParams();
  for (const key of serviceSearchFields(draft)) {
    const raw = draft[key];
    const value =
      key === "checkIn" || key === "checkOut" || key === "date"
        ? toDateOnly(raw)
        : trim(raw != null ? String(raw) : "");
    if (value) params.set(key, value);
  }
  const petIds = toIdList(draft.petIds);
  if (petIds.length) params.set("petIds", petIds.join(","));
  return params;
}

export function draftForServiceType(draft = {}, serviceType, offerings) {
  const next = {
    sitterId: draft.sitterId,
    petIds: Array.isArray(draft.petIds) ? draft.petIds : toIdList(draft.petIds),
    ownerAddress: trim(draft.ownerAddress),
    accessInstructions: trim(draft.accessInstructions),
    serviceType,
    mode: "",
    checkIn: "",
    checkOut: "",
    date: "",
    startTime: "",
    durationMinutes: "",
    visitHours: "",
  };

  if (serviceType === "boarding") {
    next.checkIn = toDateOnly(draft.checkIn) || toDateOnly(draft.date);
    next.checkOut = toDateOnly(draft.checkOut);
    return next;
  }

  if (serviceType === "dog_walking") {
    const walkModes = offeredWalkModes(offerings);
    const durations = offeredWalkDurations(offerings);
    const requestedMode = trim(draft.mode);
    const hasKnownWalks = Array.isArray(offerings) && offerings.length > 0;
    const allowPerWalk = !hasKnownWalks || walkModes.includes("per_walk");
    const allowDuration = !hasKnownWalks || walkModes.includes("duration");
    const preferPerWalk =
      requestedMode === "per_walk" || (!allowDuration && allowPerWalk);

    next.date = toDateOnly(draft.date) || toDateOnly(draft.checkIn);
    next.startTime = TIME_RE.test(trim(draft.startTime)) ? trim(draft.startTime) : "09:00";

    if (preferPerWalk && allowPerWalk) {
      next.mode = "per_walk";
      next.durationMinutes = "";
      return next;
    }

    next.mode = "duration";
    const allowedDurations = durations.length ? durations : WALK_DURATIONS;
    next.durationMinutes = allowedDurations.includes(Number(draft.durationMinutes))
      ? Number(draft.durationMinutes)
      : allowedDurations[0];
    return next;
  }

  const homeModes = offeredInHomeModes(offerings);
  const requested = trim(draft.mode) === "overnight" ? "overnight" : "visit";
  const mode =
    homeModes.length && !homeModes.includes(requested) ? homeModes[0] : requested;
  next.mode = mode;
  if (mode === "overnight") {
    next.checkIn = toDateOnly(draft.checkIn);
    next.checkOut = toDateOnly(draft.checkOut);
  } else {
    next.date = toDateOnly(draft.date) || toDateOnly(draft.checkIn);
    next.startTime = TIME_RE.test(trim(draft.startTime)) ? trim(draft.startTime) : "09:00";
    const hours = Number(draft.visitHours);
    next.visitHours = Number.isInteger(hours) && hours >= 1 ? hours : 2;
  }
  return next;
}

export function parseBookingSearchParams(searchParams = {}) {
  const get = (key) => {
    if (typeof searchParams.get === "function") return trim(searchParams.get(key));
    return trim(searchParams[key]);
  };

  const serviceType = get("serviceType");
  const raw = {
    sitterId: get("sitterId"),
    serviceType,
    mode: get("mode"),
    checkIn: toDateOnly(get("checkIn") || get("startDate")),
    checkOut: toDateOnly(get("checkOut") || get("endDate")),
    date: toDateOnly(get("date") || get("startDate")),
    startTime: get("startTime"),
    durationMinutes: get("durationMinutes") ? Number(get("durationMinutes")) : "",
    visitHours: get("visitHours") ? Number(get("visitHours")) : "",
    ownerAddress: get("ownerAddress"),
    accessInstructions: get("accessInstructions"),
    petIds: toIdList(get("petIds")),
  };
  const draft = draftForServiceType(raw, serviceType);

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

function offeringAmount(item) {
  const amount = Number(item?.priceAmount ?? item?.price_amount ?? item?.price);
  return Number.isFinite(amount) ? amount : null;
}

function offeringType(item) {
  return trim(item?.type ?? item?.serviceType ?? item?.service_type);
}

function offeringMode(item) {
  return trim(item?.mode);
}

function offeringDuration(item) {
  const minutes = Number(item?.durationMinutes ?? item?.duration_minutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

export function normalizeOfferings(offerings) {
  return (Array.isArray(offerings) ? offerings : [])
    .map((item) => {
      const type = offeringType(item);
      if (!SERVICE_TYPES.includes(type)) return null;
      return {
        type,
        mode: offeringMode(item),
        durationMinutes: offeringDuration(item),
      };
    })
    .filter(Boolean);
}

export function hasOffering(offerings, serviceType, { mode = "", durationMinutes } = {}) {
  const list = normalizeOfferings(offerings).filter((item) => item.type === serviceType);
  if (!list.length) return false;

  if (serviceType === "boarding") return true;

  if (serviceType === "dog_walking") {
    const walkMode = trim(mode) === "per_walk" ? "per_walk" : "duration";
    if (walkMode === "per_walk") {
      return list.some((item) => item.mode === "per_walk");
    }
    const minutes = Number(durationMinutes);
    return list.some(
      (item) =>
        item.mode === "duration" &&
        (durationMinutes == null || durationMinutes === ""
          ? true
          : item.durationMinutes === minutes),
    );
  }

  if (serviceType === "in_home") {
    const homeMode = trim(mode);
    if (!homeMode) return false;
    return list.some((item) => item.mode === homeMode);
  }

  return false;
}

export function offeredServiceTypes(offerings) {
  const types = new Set(normalizeOfferings(offerings).map((item) => item.type));
  return SERVICE_TYPES.filter((type) => types.has(type));
}

export function offeredWalkModes(offerings) {
  const list = normalizeOfferings(offerings).filter((item) => item.type === "dog_walking");
  return WALK_MODES.filter((mode) => list.some((item) => item.mode === mode));
}

export function offeredWalkDurations(offerings) {
  const durations = normalizeOfferings(offerings)
    .filter((item) => item.type === "dog_walking" && item.mode === "duration" && item.durationMinutes != null)
    .map((item) => item.durationMinutes);
  return [...new Set(durations)].sort((a, b) => a - b);
}

export function offeredInHomeModes(offerings) {
  const list = normalizeOfferings(offerings).filter((item) => item.type === "in_home");
  return IN_HOME_MODES.filter((mode) => list.some((item) => item.mode === mode));
}

export function firstOfferedService(offerings) {
  const list = Array.isArray(offerings) ? offerings : [];
  for (const item of list) {
    const type = offeringType(item);
    if (!SERVICE_TYPES.includes(type)) continue;
    return {
      type,
      mode: offeringMode(item),
      durationMinutes: offeringDuration(item),
    };
  }
  return null;
}

export function canQuoteOffering(offerings, draft = {}) {
  if (offerings == null) return true;
  if (!Array.isArray(offerings) || offerings.length === 0) return false;
  const serviceType = trim(draft.serviceType);
  if (serviceType === "dog_walking") {
    return hasOffering(offerings, "dog_walking", {
      mode: trim(draft.mode) === "per_walk" ? "per_walk" : "duration",
      durationMinutes: draft.durationMinutes,
    });
  }
  if (serviceType === "in_home") {
    return hasOffering(offerings, "in_home", { mode: draft.mode });
  }
  return hasOffering(offerings, serviceType);
}

export function defaultDraftFromOfferings(offerings, base = {}) {
  const first = firstOfferedService(offerings);
  if (!first) {
    const serviceType = SERVICE_TYPES.includes(trim(base.serviceType))
      ? base.serviceType
      : "boarding";
    return draftForServiceType(base, serviceType, offerings);
  }
  return draftForServiceType(
    {
      ...base,
      serviceType: first.type,
      mode: first.mode,
      durationMinutes: first.durationMinutes ?? base.durationMinutes,
    },
    first.type,
    offerings,
  );
}

export function alignDraftToOfferings(draft = {}, offerings, { preferFirst = false } = {}) {
  const list = Array.isArray(offerings) ? offerings : [];
  if (!list.length) return draft;
  if (!preferFirst && canQuoteOffering(list, draft)) return draft;

  const types = offeredServiceTypes(list);
  const currentType = trim(draft.serviceType);
  if (!preferFirst && types.includes(currentType)) {
    return {
      ...draft,
      ...draftForServiceType(draft, currentType, list),
      petIds: draft.petIds,
      ownerAddress: draft.ownerAddress,
    };
  }

  const next = defaultDraftFromOfferings(list, draft);
  return {
    ...draft,
    ...next,
    petIds: draft.petIds,
    ownerAddress: draft.ownerAddress,
  };
}

export function inHomeAddressMissing(draft = {}) {
  return trim(draft.serviceType) === "in_home" && !trim(draft.ownerAddress);
}

export function pickOffering(offerings, serviceType, { mode = "", durationMinutes } = {}) {
  const list = (Array.isArray(offerings) ? offerings : []).filter((item) => {
    const type = trim(item?.type ?? item?.serviceType ?? item?.service_type);
    return type === serviceType;
  });
  if (!list.length) return null;

  if (durationMinutes != null && durationMinutes !== "") {
    const byDuration = list.find(
      (item) => Number(item.durationMinutes ?? item.duration_minutes) === Number(durationMinutes),
    );
    if (byDuration) return byDuration;
  }

  if (mode) {
    const byMode = list.find((item) => trim(item.mode) === mode);
    if (byMode) return byMode;
  }

  if (serviceType === "dog_walking") {
    return list.find((item) => trim(item.mode) === "per_walk") ?? list[0];
  }

  return list[0];
}

export function offeringPrice(offerings, serviceType, mode, extra = {}) {
  return offeringAmount(pickOffering(offerings, serviceType, { mode, ...extra }));
}

export function serviceOfferingPriceLabel(offerings, serviceType) {
  if (serviceType === "in_home") {
    const visit = offeringPrice(offerings, "in_home", "visit");
    const overnight = offeringPrice(offerings, "in_home", "overnight");
    return [
      visit != null ? `฿${visit.toLocaleString("en-US")} visit` : null,
      overnight != null ? `฿${overnight.toLocaleString("en-US")} night` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (serviceType === "dog_walking") {
    const chosen = pickOffering(offerings, "dog_walking", { mode: "per_walk" });
    const amount = offeringAmount(chosen);
    if (amount == null) return "";
    if (trim(chosen?.mode) === "per_walk") {
      return `฿${amount.toLocaleString("en-US")} / walk`;
    }
    const minutes = Number(chosen?.durationMinutes ?? chosen?.duration_minutes);
    return Number.isFinite(minutes) && minutes > 0
      ? `฿${amount.toLocaleString("en-US")} / ${minutes} min`
      : `฿${amount.toLocaleString("en-US")} / walk`;
  }

  const amount = offeringPrice(offerings, serviceType);
  if (amount == null) return "";
  return `฿${amount.toLocaleString("en-US")} / night`;
}

export function formatServiceDateTimeLabel(draft = {}, quote = null) {
  const serviceType = trim(draft.serviceType);
  const overnight = serviceType === "in_home" && trim(draft.mode) === "overnight";
  if (serviceType === "boarding" || overnight) {
    const start = toDateOnly(draft.checkIn || quote?.startDate);
    const end = toDateOnly(draft.checkOut || quote?.endDate);
    if (start && end && end !== start) {
      return `${formatBookingDate(start)} - ${formatBookingDate(end)}`;
    }
    return start ? formatBookingDate(start) : "";
  }

  const date = toDateOnly(draft.date || draft.checkIn || quote?.startDate);
  const startTime = trim(draft.startTime || quote?.startTime);
  if (date && startTime) {
    return `${formatBookingDate(date)} | ${formatTime12Hour(startTime)}`;
  }
  return date ? formatBookingDate(date) : "";
}

export function liveQuoteKey(sitterId, draft, enabled) {
  if (!enabled || !sitterId || !draft) return "";
  const next = { ...draft, sitterId };
  const { ok } = validateBookingForm({ ...next, requireAddress: false });
  if (!ok) return "";
  if (!canQuoteOffering(next.serviceOfferings, next)) return "";
  return JSON.stringify(shapeQuoteRequest(next));
}

export function createLiveQuoteSession({ quoteFn, debounceMs = 350 } = {}) {
  let lastKey = "";
  let timer = null;
  let abort = null;
  let fetchCount = 0;
  const listeners = {
    onQuote: () => {},
    onError: () => {},
    onQuoting: () => {},
  };

  function cancelInFlight() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (abort) {
      abort.abort();
      abort = null;
    }
  }

  return {
    get fetchCount() {
      return fetchCount;
    },
    subscribe(next = {}) {
      Object.assign(listeners, next);
    },
    applyKey(key) {
      const nextKey = key || "";
      if (nextKey === lastKey) return false;
      lastKey = nextKey;
      cancelInFlight();
      if (!nextKey) {
        listeners.onQuote(null);
        listeners.onError("");
        listeners.onQuoting(false);
        return false;
      }

      const controller = new AbortController();
      abort = controller;
      timer = setTimeout(() => {
        fetchCount += 1;
        listeners.onQuoting(true);
        let payload = null;
        try {
          payload = JSON.parse(nextKey);
        } catch {
          payload = null;
        }
        if (!payload) {
          listeners.onQuoting(false);
          return;
        }
        Promise.resolve(quoteFn(payload, { signal: controller.signal }))
          .then((data) => {
            if (controller.signal.aborted) return;
            listeners.onQuote(data ?? null);
            listeners.onError("");
          })
          .catch((err) => {
            if (controller.signal.aborted || err?.name === "AbortError") return;
            listeners.onQuote(null);
            listeners.onError(
              err instanceof Error ? err.message : "Could not quote this booking",
            );
          })
          .finally(() => {
            if (!controller.signal.aborted) listeners.onQuoting(false);
          });
      }, debounceMs);
      return true;
    },
    dispose() {
      lastKey = "\0";
      cancelInFlight();
    },
  };
}
