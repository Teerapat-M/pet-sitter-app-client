const TINTS = ["#ffd7b8", "#d7f3ea", "#ffe9b5", "#fde2d6", "#e8f1fe"];

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? "";
}

function haversineKm(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
}

const ARI = [13.7796, 100.5446];

export function formatSitterCard(raw, index = 0) {
  const lat = Number(raw?.latitude);
  const lng = Number(raw?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const km = hasCoords ? haversineKm(ARI, [lat, lng]) : null;
  const rating = Number(raw?.rating ?? raw?.rating_avg ?? 0) || 0;
  const reviews = Number(raw?.review_count ?? raw?.reviewCount ?? 0) || 0;
  const name = firstString(
    raw?.sitterName,
    raw?.sitter_name,
    raw?.name,
    raw?.title,
    raw?.trade_name,
    "Pet sitter",
  );
  const photo =
    firstString(
      raw?.imageUrl,
      raw?.image_url,
      raw?.cover_url,
      raw?.photos?.[0]?.photo_url,
      raw?.sitter_photos?.[0]?.photo_url,
    ) || "";
  const price = Number(raw?.from_price ?? raw?.fromPrice ?? raw?.price ?? raw?.min_price);
  const petTypes = Array.isArray(raw?.petTypes)
    ? raw.petTypes
    : Array.isArray(raw?.pet_types)
      ? raw.pet_types
      : [];

  return {
    id: raw?.id,
    name,
    title: firstString(raw?.title, raw?.trade_name, name),
    photo,
    photoTint: TINTS[index % TINTS.length],
    rating,
    reviews,
    ratingLabel: reviews ? `${rating.toFixed(1)} (${reviews})` : rating ? rating.toFixed(1) : "New",
    distanceLabel: km == null ? "" : `${km.toFixed(1)} km`,
    priceLabel: Number.isFinite(price) ? `from ฿${Math.round(price)}` : "",
    hasCctv: Boolean(raw?.has_cctv || raw?.hasCctv || raw?.camera_count || raw?.cameras?.length),
    verified: Boolean(raw?.is_verified || raw?.verified || raw?.isVerified),
    petTypes,
    location: firstString(raw?.location, [raw?.district, raw?.province].filter(Boolean).join(", ")),
    raw,
  };
}
