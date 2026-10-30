/**
 * Home/find-sitter pet picker helpers.
 *
 * Pet types come from GET /api/pet-types. FALLBACK_PET_TYPES matches the
 * server seed (Dog, Cat, Bird, Rabbit) if that request fails.
 */

export const PET_TYPES_ENDPOINT = "/api/pet-types";

export const FALLBACK_PET_TYPES = [
  { id: "dog", label: "Dog", plural: "dogs" },
  { id: "cat", label: "Cat", plural: "cats" },
  { id: "bird", label: "Bird", plural: "birds" },
  { id: "rabbit", label: "Rabbit", plural: "rabbits" },
];

function capitalize(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pluralize(word) {
  const base = String(word ?? "").trim().toLowerCase();
  if (!base) return "";
  if (base.endsWith("s")) return base;
  return `${base}s`;
}

function typeIdFromWord(word) {
  const raw = String(word ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.endsWith("ies") && raw.length > 3) return `${raw.slice(0, -3)}y`;
  if (raw.endsWith("s") && raw.length > 1) return raw.slice(0, -1);
  return raw;
}

export function normalizePetTypeList(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.pet_types)
        ? raw.pet_types
        : [];

  const seen = new Set();
  const types = [];

  for (const item of list) {
    const name =
      typeof item === "string"
        ? item
        : item?.name ?? item?.label ?? item?.pet_type ?? item?.type ?? "";
    const label = capitalize(name);
    if (!label) continue;

    const slugSource =
      typeof item === "object" && item
        ? item.slug ?? item.key ?? (typeof item.id === "string" ? item.id : name)
        : name;
    const id = String(slugSource)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!id || /^\d+$/.test(id) || seen.has(id)) continue;

    seen.add(id);
    types.push({
      id,
      label,
      plural: pluralize(id),
    });
  }

  return types;
}

export function formatPetsSummary(counts = {}, types = FALLBACK_PET_TYPES) {
  return types
    .map((type) => {
      const count = Number(counts[type.id]) || 0;
      if (count <= 0) return null;
      const word = count === 1 ? type.label.toLowerCase() : type.plural;
      return `${count} ${word}`;
    })
    .filter(Boolean)
    .join(", ");
}

export function parsePetCounts(value) {
  const counts = {};
  String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [idRaw, countRaw] = part.split(":");
      const id = String(idRaw ?? "")
        .trim()
        .toLowerCase();
      const count = Number.parseInt(String(countRaw ?? "").trim(), 10);
      if (!id || !Number.isInteger(count) || count <= 0) return;
      counts[id] = count;
    });
  return counts;
}

export function parsePetsSummary(value) {
  const counts = {};
  String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const match = part.match(/^(\d+)\s+([a-z]+)$/i);
      if (!match) return;
      const count = Number.parseInt(match[1], 10);
      const id = typeIdFromWord(match[2]);
      if (!id || !Number.isInteger(count) || count <= 0) return;
      counts[id] = count;
    });
  return counts;
}

export function countsFromSearchParams({ petCounts, pets } = {}) {
  return {
    ...parsePetsSummary(pets),
    ...parsePetCounts(petCounts),
  };
}

export function formatSearchDateLabel(date) {
  const raw = String(date ?? "").trim();
  if (!raw) return "";
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatSearchCompactSummary({
  location = "",
  date = "",
  counts = {},
  types = FALLBACK_PET_TYPES,
} = {}) {
  const parts = [];
  const query = String(location ?? "").trim();
  if (query) parts.push(query);
  const dateLabel = formatSearchDateLabel(date);
  if (dateLabel) parts.push(dateLabel);
  const pets = formatPetsSummary(counts, types);
  if (pets) parts.push(pets);
  return parts.join(" · ");
}

export function formatSitterResultsHeading({
  count = 0,
  serviceLabel = "sitters",
  location = "",
} = {}) {
  const n = Number(count) || 0;
  const service = String(serviceLabel || "sitters").toLowerCase();
  const place = String(location ?? "").trim();
  return place ? `${n} ${service} near ${place}` : `${n} ${service}`;
}

export function serializePetSearchQuery({
  q = "",
  date = "",
  counts = {},
  types = FALLBACK_PET_TYPES,
} = {}) {
  const params = new URLSearchParams();
  const query = String(q ?? "").trim();
  if (query) params.set("q", query);
  if (date) params.set("date", date);

  const selected = types.filter((type) => (Number(counts[type.id]) || 0) > 0);
  if (selected.length) {
    params.set("petTypes", selected.map((type) => type.id).join(","));
    params.set(
      "petCounts",
      selected.map((type) => `${type.id}:${Number(counts[type.id])}`).join(","),
    );
  }

  const summary = formatPetsSummary(counts, types);
  if (summary) params.set("pets", summary);

  return params;
}
