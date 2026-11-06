function firstString(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function getConversationBookingId(conversation) {
  const nested = conversation?.booking;
  return firstString(
    conversation?.bookingId,
    conversation?.booking_id,
    typeof nested === "string" || typeof nested === "number" ? nested : "",
    nested && typeof nested === "object"
      ? nested.id ?? nested.bookingId ?? nested.booking_id
      : "",
  );
}

export function getConversationPhone(conversation, booking) {
  const raw = firstString(
    conversation?.otherUser?.phone,
    conversation?.otherUser?.phoneNumber,
    conversation?.otherUser?.phone_number,
    booking?.sitter?.phone,
    booking?.owner?.phone,
    booking?.pet_owner?.phone,
    booking?.contactPhone,
    booking?.sitter_phone,
    booking?.owner_phone,
  );
  const digits = digitsOnly(raw);
  return digits.length >= 8 ? digits : "";
}

export function toTelHref(phone) {
  const digits = digitsOnly(phone);
  return digits ? `tel:${digits}` : "";
}

export function getConversationPresence(conversation) {
  const other = conversation?.otherUser ?? {};
  if (typeof other.isOnline === "boolean") {
    return other.isOnline ? "Online" : "Offline";
  }
  if (typeof other.online === "boolean") {
    return other.online ? "Online" : "Offline";
  }
  const lastSeen = firstString(other.lastSeenAt, other.last_seen_at);
  if (!lastSeen) return "";
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "";
  return `Last seen ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

function bookingDateSummary(booking) {
  const start = firstString(booking.start_date, booking.startDate);
  const end = firstString(booking.end_date, booking.endDate) || start;
  const startTime = firstString(booking.start_time, booking.startTime);
  const endTime = firstString(booking.end_time, booking.endTime);
  if (!start) return "";
  if (end && end !== start) return `${start} → ${end}`;
  if (startTime && endTime) return `${start} · ${startTime}–${endTime}`;
  return start;
}

export function formatThreadBookingBanner(booking, { isSitter = false } = {}) {
  if (!booking || typeof booking !== "object") return null;

  const id = firstString(booking.id, booking.bookingId, booking.booking_id);
  const title = firstString(
    booking.title,
    booking.service,
    booking.service_name,
    booking.serviceName,
    booking.sitter_name,
    booking.sitterName,
    booking.pet_owner_name,
  );
  const summary = firstString(
    booking.summary,
    bookingDateSummary(booking),
    booking.pet_names,
  );

  if (!id && !title && !summary) return null;

  return {
    title: title || "Booking",
    summary,
    href: isSitter && id ? `/sitter/booking-list/${id}` : "/owner/bookings",
  };
}
