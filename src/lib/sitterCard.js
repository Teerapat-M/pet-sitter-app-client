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

export const FALLBACK_SITTERS = [
  {
    id: "demo-ploy",
    cardName: "Ploy S.",
    sitterName: "Ploy Srisuk",
    name: "Ploy Srisuk",
    rating: 4.9,
    review_count: 212,
    from_price: 450,
    distance_km: 1.2,
    has_cctv: true,
    camera_count: 3,
    location: "Ari, Bangkok",
    district: "Ari",
    province: "Bangkok",
    introduction:
      "Vet nurse with a fenced garden. I send photo updates twice a day and my home has 3 CCTV cameras you can watch live during a boarding stay.",
    pet_types: ["dog", "cat"],
    is_verified: true,
  },
  {
    id: "demo-mark",
    cardName: "Mark T.",
    sitterName: "Mark T.",
    rating: 4.8,
    review_count: 0,
    from_price: 380,
    distance_km: 2.0,
    has_cctv: true,
    location: "Ari, Bangkok",
  },
  {
    id: "demo-nina",
    cardName: "Nina K.",
    sitterName: "Nina K.",
    rating: 4.9,
    review_count: 0,
    from_price: 520,
    distance_km: 2.2,
    has_cctv: true,
    location: "Ari, Bangkok",
  },
  {
    id: "demo-tom",
    cardName: "Tom P.",
    sitterName: "Tom P.",
    rating: 4.7,
    review_count: 0,
    from_price: 400,
    distance_km: 3.1,
    has_cctv: true,
    location: "Ari, Bangkok",
  },
];

export function getFallbackSitter(id) {
  return FALLBACK_SITTERS.find((item) => String(item.id) === String(id)) ?? null;
}

export function formatSitterCard(raw, index = 0) {
  const lat = Number(raw?.latitude);
  const lng = Number(raw?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const listedKm = Number(raw?.distance_km ?? raw?.distanceKm);
  const km = Number.isFinite(listedKm)
    ? listedKm
    : hasCoords
      ? haversineKm(ARI, [lat, lng])
      : null;
  const rating = Number(raw?.rating ?? raw?.rating_avg ?? 0) || 0;
  const reviews = Number(raw?.review_count ?? raw?.reviewCount ?? 0) || 0;
  const name = firstString(
    raw?.cardName,
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
  const amount = Number.isFinite(price) ? Math.round(price) : 450;
  const cctvOff = raw?.has_cctv === false || raw?.hasCctv === false;

  return {
    id: raw?.id,
    name,
    title: firstString(raw?.title, raw?.trade_name, name),
    photo,
    photoTint: TINTS[index % TINTS.length],
    rating,
    reviews,
    ratingLabel: reviews ? `${rating.toFixed(1)} (${reviews})` : rating ? rating.toFixed(1) : "New",
    ratingShort: rating ? rating.toFixed(1) : "New",
    distanceLabel: km == null ? "" : `${Number(km).toFixed(1)} km`,
    priceAmount: amount,
    priceLabel: `฿${amount} / night`,
    priceShort: `฿${amount}`,
    hasCctv: !cctvOff,
    verified: Boolean(raw?.is_verified || raw?.verified || raw?.isVerified),
    petTypes: Array.isArray(raw?.petTypes)
      ? raw.petTypes
      : Array.isArray(raw?.pet_types)
        ? raw.pet_types
        : [],
    location: firstString(raw?.location, [raw?.district, raw?.province].filter(Boolean).join(", ")),
    raw,
  };
}
