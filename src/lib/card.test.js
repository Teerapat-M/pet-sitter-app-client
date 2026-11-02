import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CARD_LIFT_CLASS, cardClassName } from "./card.js";

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GLOBALS_PATH = join(SRC_ROOT, "app/globals.css");
const CARD_COMPONENT_PATH = join(SRC_ROOT, "components/ui/card.jsx");

const CARD_IMPORT_RE =
  /from\s+['"]@\/components\/ui\/card['"]|from\s+['"]\.\.?\/.*ui\/card['"]/;

const KEY_CARD_FILES = [
  "components/home/ServiceTiles.js",
  "components/home/TopSitters.js",
  "components/PetSitterCard.js",
  "components/find-sitter/SitterCardOverlay.js",
  "app/owner/bookings/page.js",
  "components/booking/BookingDetailSidebar.js",
  "components/booking/YourPetStep.js",
  "components/walk/WalkSummaryCard.js",
  "components/sitter/payout/BankAccountCard.js",
  "components/sitter/payout/TotalEarningCard.js",
];

function walkJsFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkJsFiles(path, files);
    else if (/\.(js|jsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

function splitReducedMotion(css) {
  const marker = "@media (prefers-reduced-motion: reduce)";
  const idx = css.indexOf(marker);
  assert.ok(idx !== -1, "globals.css must define reduced-motion card hover");
  const brace = css.indexOf("{", idx);
  let depth = 0;
  let end = brace;
  for (let i = brace; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return {
    rest: `${css.slice(0, idx)}${css.slice(end + 1)}`,
    reduced: css.slice(idx, end + 1),
  };
}

function extractCardOpenClassNames(source) {
  const names = [];
  const re = /<Card\b[\s\S]*?>/g;
  let match = re.exec(source);
  while (match) {
    const tag = match[0];
    const classMatch =
      tag.match(/className="([^"]*)"/) ||
      tag.match(/className=\{`([^`]*)`\}/) ||
      tag.match(/className=\{"([^"]*)"\}/);
    if (classMatch) names.push(classMatch[1]);
    match = re.exec(source);
  }
  return names;
}

test("shared hover class is the single card-lift token", () => {
  assert.equal(CARD_LIFT_CLASS, "card-lift");
  assert.equal(CARD_LIFT_CLASS.includes("hover:"), false);
  assert.equal(CARD_LIFT_CLASS.includes("translate"), false);
});

test("cursor-pointer is only added for interactive cards", () => {
  assert.equal(cardClassName().includes("cursor-pointer"), false);
  assert.equal(cardClassName({ interactive: false }).includes("cursor-pointer"), false);
  assert.ok(cardClassName({ interactive: true }).includes("cursor-pointer"));
});

test("every card gets the shared hover class", () => {
  const merged = cardClassName({ className: "ring-1 cursor-default" });
  assert.ok(merged.split(/\s+/).includes(CARD_LIFT_CLASS));
  assert.ok(merged.includes("ring-1"));
  assert.ok(merged.includes("cursor-default"));
  assert.ok(cardClassName().split(/\s+/).includes(CARD_LIFT_CLASS));
  assert.ok(cardClassName({ interactive: true }).split(/\s+/).includes(CARD_LIFT_CLASS));
});

test("overflow-hidden on a card root cannot clip the lift shadow", () => {
  const merged = cardClassName({ className: "overflow-hidden rounded-card" });
  assert.equal(merged.includes("overflow-hidden"), false);
  assert.ok(merged.includes("overflow-visible"));
  assert.ok(merged.includes(CARD_LIFT_CLASS));
});

test("Card component applies cardClassName", () => {
  const source = readFileSync(CARD_COMPONENT_PATH, "utf8");
  assert.match(source, /cardClassName\(\{\s*interactive,\s*className\s*\}\)/);
  assert.match(source, /data-slot="card"/);
});

test("home, sitter, and booking cards use the Card component", () => {
  for (const rel of KEY_CARD_FILES) {
    const source = readFileSync(join(SRC_ROOT, rel), "utf8");
    assert.match(source, CARD_IMPORT_RE, `${rel} must import Card`);
    assert.match(source, /<Card[\s>]/, `${rel} must render <Card>`);
  }
});

test("every Card import site renders <Card>", () => {
  const files = walkJsFiles(SRC_ROOT).filter((path) => {
    if (path.endsWith("ui/card.jsx")) return false;
    const source = readFileSync(path, "utf8");
    return CARD_IMPORT_RE.test(source);
  });
  assert.ok(files.length >= KEY_CARD_FILES.length, "expected Card import sites");
  for (const path of files) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /<Card[\s>]/, `${path} imports Card but never renders it`);
  }
});

test("Card call sites keep overflow-hidden off the lifting root", () => {
  const files = walkJsFiles(SRC_ROOT).filter((path) => {
    if (path.endsWith("ui/card.jsx")) return false;
    return CARD_IMPORT_RE.test(readFileSync(path, "utf8"));
  });
  for (const path of files) {
    const names = extractCardOpenClassNames(readFileSync(path, "utf8"));
    for (const className of names) {
      assert.equal(
        /\boverflow-hidden\b/.test(className),
        false,
        `${path} Card className still has overflow-hidden: ${className}`,
      );
    }
  }
});

test("shared CSS lift matches spec (6px, warm shadow, 200ms ease-out, focus)", () => {
  const globals = readFileSync(GLOBALS_PATH, "utf8");
  assert.match(globals, /\.card-lift/);
  assert.match(globals, /:is\(\.card,\s*\.card-lift\)/);
  assert.match(globals, /translate:\s*0\s+-6px/);
  assert.match(globals, /0\s+12px\s+24px\s+rgba\(\s*0,\s*0,\s*0,\s*0\.12\s*\)/);
  assert.match(globals, /200ms\s+ease-out/);
  assert.match(globals, /:hover/);
  assert.match(globals, /:focus-visible/);
  assert.match(globals, /:focus-within/);
  assert.equal(globals.includes("motion-safe:hover:-translate-y-1"), false);
  assert.equal(globals.includes("hover:shadow-lg"), false);

  const { rest, reduced } = splitReducedMotion(globals);
  assert.match(rest, /translate:\s*0\s+-6px/);
  assert.match(reduced, /prefers-reduced-motion:\s*reduce/);
  assert.match(reduced, /translate:\s*none/);
  assert.equal(
    /translate:\s*0\s+-6px/.test(reduced),
    false,
    "reduced-motion must not translate the card",
  );
  assert.match(reduced, /box-shadow/);
});
