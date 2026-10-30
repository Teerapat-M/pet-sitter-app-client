import assert from "node:assert/strict";
import test from "node:test";
import {
  TOUR_STEPS,
  hasServerSeen,
  isLastStep,
  isTourDone,
  nextStepIndex,
  onboardingSeenBody,
  readOnboardingSeenAt,
  readTourFlag,
  shouldShowTour,
  stepNumberLabel,
  writeTourFlag,
} from "./onboarding.js";

test("tour has welcome plus four coachmarks", () => {
  assert.equal(TOUR_STEPS.length, 5);
  assert.equal(TOUR_STEPS[0].kind, "modal");
  assert.deepEqual(
    TOUR_STEPS.slice(1).map((step) => step.id),
    ["services", "book", "cctv", "gps"],
  );
});

test("local and server seen flags skip the tour unless replayed", () => {
  assert.equal(isTourDone("1"), true);
  assert.equal(isTourDone(null), false);
  assert.equal(hasServerSeen("2026-10-30T00:00:00.000Z"), true);
  assert.equal(hasServerSeen(null), false);
  assert.equal(shouldShowTour({ localFlag: null, serverSeenAt: null }), true);
  assert.equal(shouldShowTour({ localFlag: "1", serverSeenAt: null }), false);
  assert.equal(
    shouldShowTour({ localFlag: null, serverSeenAt: "2026-01-01" }),
    false,
  );
  assert.equal(
    shouldShowTour({ localFlag: "1", serverSeenAt: "2026-01-01", replay: true }),
    true,
  );
});

test("step helpers and in-memory storage flag", () => {
  assert.equal(nextStepIndex(0), 1);
  assert.equal(nextStepIndex(4), 4);
  assert.equal(isLastStep(4), true);
  assert.equal(stepNumberLabel(1), "Step 2 of 5");

  const store = new Map();
  const memory = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  writeTourFlag(memory, true);
  assert.equal(readTourFlag(memory), "1");
  writeTourFlag(memory, false);
  assert.equal(readTourFlag(memory), null);
});

test("reads onboarding_seen_at from user payloads", () => {
  assert.equal(readOnboardingSeenAt({ onboarding_seen_at: "ts" }), "ts");
  assert.equal(readOnboardingSeenAt({ onboardingSeenAt: "ts2" }), "ts2");
  assert.equal(readOnboardingSeenAt(null), null);
});

test("PATCH body is { seen: boolean }", () => {
  assert.deepEqual(onboardingSeenBody(true), { seen: true });
  assert.deepEqual(onboardingSeenBody(false), { seen: false });
  assert.deepEqual(onboardingSeenBody(null), { seen: false });
});

test("welcome and coachmark copy match D18 frames", () => {
  assert.equal(
    TOUR_STEPS[0].body,
    "Book trusted sitters, watch CCTV live and track every walk. Take a 30-second tour?",
  );
  assert.equal(
    TOUR_STEPS[1].body,
    "Boarding, dog walking or in-home care — pick what your pet needs.",
  );
  assert.equal(
    TOUR_STEPS[2].body,
    "Compare verified sitters, then tap Book on the one you like.",
  );
  assert.equal(
    TOUR_STEPS[3].body,
    "During a boarding stay, open the sitter's cameras any time.",
  );
  assert.equal(
    TOUR_STEPS[4].body,
    "Follow every walk on the map and get a summary after.",
  );
  assert.equal(TOUR_STEPS[2].scene, "book");
  assert.equal(TOUR_STEPS[3].scene, "cctv");
  assert.equal(TOUR_STEPS[4].scene, "gps");
});
