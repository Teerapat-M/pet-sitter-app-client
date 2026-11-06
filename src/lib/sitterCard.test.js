import assert from "node:assert/strict";
import test from "node:test";
import { FALLBACK_SITTERS, formatSitterCard, getFallbackSitter } from "./sitterCard.js";

test("home cards always expose a ฿/night price and CCTV flag", () => {
  const empty = formatSitterCard({}, 0);
  assert.equal(empty.priceLabel, "฿450 / night");
  assert.equal(empty.priceShort, "฿450");
  assert.equal(empty.hasCctv, true);

  const priced = formatSitterCard({ from_price: 380, has_cctv: true }, 1);
  assert.equal(priced.priceLabel, "฿380 / night");
});

test("fallback sitters match the D01 four-up set", () => {
  assert.equal(FALLBACK_SITTERS.length, 4);
  assert.equal(getFallbackSitter("demo-ploy")?.sitterName, "Ploy Srisuk");
  assert.equal(formatSitterCard(FALLBACK_SITTERS[0]).name, "Ploy S.");
  assert.equal(formatSitterCard(FALLBACK_SITTERS[0]).distanceLabel, "1.2 km");
});
