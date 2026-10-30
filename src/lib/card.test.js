import assert from "node:assert/strict";
import test from "node:test";
import { CARD_LIFT_CLASS, cardClassName } from "./card.js";

const LIFT_TOKENS = [
  "transition-all",
  "duration-200",
  "hover:-translate-y-1",
  "hover:shadow-lg",
  "motion-reduce:transform-none",
  "motion-reduce:translate-none",
  "motion-reduce:transition-none",
];

test("shared card lift uses transform-only hover with reduced-motion opt-out", () => {
  const tokens = CARD_LIFT_CLASS.split(/\s+/);
  for (const token of LIFT_TOKENS) {
    assert.ok(tokens.includes(token), `missing ${token}`);
  }
  assert.equal(tokens.includes("cursor-pointer"), false);
});

test("cursor-pointer is only added for interactive cards", () => {
  assert.equal(cardClassName().includes("cursor-pointer"), false);
  assert.equal(cardClassName({ interactive: false }).includes("cursor-pointer"), false);
  assert.ok(cardClassName({ interactive: true }).includes("cursor-pointer"));
});

test("lift transition wins over ad-hoc transition-colors", () => {
  const merged = cardClassName({ className: "transition-colors cursor-default" });
  assert.ok(merged.includes("transition-all"));
  assert.equal(merged.includes("transition-colors"), false);
  assert.ok(merged.includes("cursor-default"));

  const clickable = cardClassName({
    interactive: true,
    className: "cursor-default",
  });
  assert.ok(clickable.includes("cursor-pointer"));
  assert.equal(clickable.includes("cursor-default"), false);
});
