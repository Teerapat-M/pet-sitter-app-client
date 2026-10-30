import assert from "node:assert/strict";
import test from "node:test";
import {
  FALLBACK_PET_TYPES,
  countsFromSearchParams,
  formatPetsSummary,
  formatSearchCompactSummary,
  formatSitterResultsHeading,
  parsePetCounts,
  parsePetsSummary,
  serializePetSearchQuery,
} from "./petSearch.js";

test("summary label uses singular and plural type names", () => {
  assert.equal(formatPetsSummary({ dog: 2, cat: 1 }), "2 dogs, 1 cat");
  assert.equal(formatPetsSummary({ dog: 1 }), "1 dog");
  assert.equal(formatPetsSummary({ bird: 3, rabbit: 2 }), "3 birds, 2 rabbits");
  assert.equal(formatPetsSummary({ dog: 0, cat: 0 }), "");
  assert.equal(formatPetsSummary({}), "");
});

test("query serialization writes petTypes, pets summary, and petCounts", () => {
  const params = serializePetSearchQuery({
    q: "Ari, Bangkok",
    date: "2026-11-14",
    counts: { dog: 2, cat: 1, bird: 0 },
    types: FALLBACK_PET_TYPES,
  });

  assert.equal(params.get("q"), "Ari, Bangkok");
  assert.equal(params.get("date"), "2026-11-14");
  assert.equal(params.get("petTypes"), "dog,cat");
  assert.equal(params.get("pets"), "2 dogs, 1 cat");
  assert.equal(params.get("petCounts"), "dog:2,cat:1");
});

test("empty counts omit pet query params", () => {
  const params = serializePetSearchQuery({
    q: "Ari",
    counts: { dog: 0 },
  });
  assert.equal(params.get("q"), "Ari");
  assert.equal(params.get("petTypes"), null);
  assert.equal(params.get("pets"), null);
  assert.equal(params.get("petCounts"), null);
});

test("compact search summary omits empty fields", () => {
  assert.equal(formatSearchCompactSummary({}), "");
  assert.equal(
    formatSearchCompactSummary({
      location: "Ari, Bangkok",
      date: "2026-11-14",
      counts: { dog: 2, cat: 1 },
    }),
    "Ari, Bangkok · 14 Nov · 2 dogs, 1 cat",
  );
});

test("sitter results heading omits location suffix when empty", () => {
  assert.equal(
    formatSitterResultsHeading({
      count: 12,
      serviceLabel: "Sitters",
      location: "Ari, Bangkok",
    }),
    "12 sitters near Ari, Bangkok",
  );
  assert.equal(
    formatSitterResultsHeading({ count: 8, serviceLabel: "Sitters", location: "" }),
    "8 sitters",
  );
  assert.equal(formatSitterResultsHeading({ count: 3 }), "3 sitters");
});

test("petCounts and summary strings round-trip", () => {
  assert.deepEqual(parsePetCounts("dog:2,cat:1"), { dog: 2, cat: 1 });
  assert.deepEqual(parsePetsSummary("2 dogs, 1 cat"), { dog: 2, cat: 1 });
  assert.deepEqual(parsePetsSummary("1 dog"), { dog: 1 });
  assert.deepEqual(
    countsFromSearchParams({ petCounts: "cat:3", pets: "1 dog, 2 cats" }),
    { dog: 1, cat: 3 },
  );
});
