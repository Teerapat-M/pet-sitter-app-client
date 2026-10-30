import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compile } from "tailwindcss";
import { CARD_LIFT_CLASS, cardClassName } from "./card.js";

const LIFT_TOKENS = [
  "hover:shadow-lg",
  "motion-safe:transition-all",
  "motion-safe:duration-200",
  "motion-safe:hover:-translate-y-1",
];

test("shared card lift uses transform-only hover gated by motion-safe", () => {
  const tokens = CARD_LIFT_CLASS.split(/\s+/);
  for (const token of LIFT_TOKENS) {
    assert.ok(tokens.includes(token), `missing ${token}`);
  }
  assert.equal(tokens.includes("cursor-pointer"), false);
  assert.equal(tokens.includes(`hover:${"-translate-y-1"}`), false);
  assert.equal(
    tokens.some((token) => token.startsWith("motion-reduce:")),
    false,
  );
});

test("cursor-pointer is only added for interactive cards", () => {
  assert.equal(cardClassName().includes("cursor-pointer"), false);
  assert.equal(cardClassName({ interactive: false }).includes("cursor-pointer"), false);
  assert.ok(cardClassName({ interactive: true }).includes("cursor-pointer"));
});

test("lift class still merges with extra class names", () => {
  const merged = cardClassName({ className: "ring-1 cursor-default" });
  assert.ok(merged.includes("motion-safe:transition-all"));
  assert.ok(merged.includes("ring-1"));
  assert.ok(merged.includes("cursor-default"));

  const clickable = cardClassName({
    interactive: true,
    className: "cursor-default",
  });
  assert.ok(clickable.includes("cursor-pointer"));
  assert.equal(clickable.includes("cursor-default"), false);
});

function stripMotionSafeMedia(css) {
  const marker = "@media (prefers-reduced-motion: no-preference)";
  let result = css;
  let idx = result.indexOf(marker);
  while (idx !== -1) {
    const brace = result.indexOf("{", idx);
    let depth = 0;
    let end = brace;
    for (let i = brace; i < result.length; i += 1) {
      if (result[i] === "{") depth += 1;
      else if (result[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    result = `${result.slice(0, idx)}${result.slice(end + 1)}`;
    idx = result.indexOf(marker);
  }
  return result;
}

test("compiled lift CSS has no hover translate under reduced motion", async () => {
  const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(
    globals.includes(CARD_LIFT_CLASS),
    ".card @apply must stay in sync with CARD_LIFT_CLASS",
  );

  const compiled = await compile(`
    @theme {
      --spacing: 0.25rem;
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    }
    @tailwind utilities;
    .card {
      @apply ${CARD_LIFT_CLASS};
    }
  `);
  const css = compiled.build(CARD_LIFT_CLASS.split(/\s+/));

  assert.match(css, /prefers-reduced-motion:\s*no-preference/);
  assert.match(css, /translate:/);
  assert.equal(
    /translate:/.test(stripMotionSafeMedia(css)),
    false,
    "translate must only appear inside prefers-reduced-motion: no-preference",
  );
});
