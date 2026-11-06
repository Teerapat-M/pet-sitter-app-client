import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CARD_LIFT_CLASS, CARD_LIFT_SHADOW_CLASS, cardClassName } from "./card.js";

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GLOBALS_PATH = join(SRC_ROOT, "app/globals.css");
const CARD_COMPONENT_PATH = join(SRC_ROOT, "components/ui/card.jsx");

const CARD_IMPORT_RE =
  /from\s+['"]@\/components\/ui\/card['"]|from\s+['"]\.\.?\/.*ui\/card['"]/;

const KEY_CARD_FILES = [
  "app/owner/bookings/page.js",
  "components/booking/ServiceBookingForm.js",
  "components/walk/WalkSummaryCard.js",
  "components/sitter/payout/BankAccountCard.js",
  "components/sitter/payout/TotalEarningCard.js",
  "components/cctv/OwnerCctvBanner.js",
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

test("capability screens that still use Card import the shared component", () => {
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

test("hover/focus shadow utilities win over rest-state shadow-card", () => {
  assert.equal(
    CARD_LIFT_SHADOW_CLASS,
    "hover:shadow-card-hover focus-visible:shadow-card-hover focus-within:shadow-card-hover",
  );
  const merged = cardClassName({ className: "shadow-card" });
  assert.ok(merged.split(/\s+/).includes("shadow-card"), "resting shadow-card stays");
  for (const token of CARD_LIFT_SHADOW_CLASS.split(/\s+/)) {
    assert.ok(merged.split(/\s+/).includes(token), `missing ${token} in ${merged}`);
  }
  assert.ok(cardClassName().includes("hover:shadow-card-hover"));

  const bookings = readFileSync(join(SRC_ROOT, "app/owner/bookings/page.js"), "utf8");
  const walkCard = readFileSync(join(SRC_ROOT, "components/walk/WalkSummaryCard.js"), "utf8");
  assert.match(bookings, /<Card[\s>]/);
  assert.match(walkCard, /<Card[\s>]/);
});

test("classic shell keeps card-lift as a no-op so Plus leftover Cards do not restyle the original UI", () => {
  const globals = readFileSync(GLOBALS_PATH, "utf8");
  assert.match(globals, /\.card-lift/);
  assert.equal(globals.includes("translate: 0 -6px"), false);
  assert.equal(globals.includes(":is(.card, .card-lift)"), false);
});
