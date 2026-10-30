export const TOUR_STORAGE_KEY = "psp_tour_done";

export const TOUR_STEPS = [
  {
    id: "welcome",
    path: "/",
    kind: "modal",
    title: "Welcome to Pet Sitter Plus",
    body: "Book trusted sitters, watch CCTV live and track every walk. Take a 30-second tour?",
  },
  {
    id: "services",
    path: "/",
    kind: "coachmark",
    anchor: "services",
    arrow: "bottom",
    title: "Choose a service",
    body: "Boarding, dog walking or in-home care — pick what your pet needs.",
  },
  {
    id: "book",
    path: "/find-sitter",
    kind: "coachmark",
    anchor: "book",
    arrow: "top",
    scene: "book",
    title: "Find and book a sitter",
    body: "Compare verified sitters, then tap Book on the one you like.",
  },
  {
    id: "cctv",
    kind: "coachmark",
    anchor: "cctv",
    arrow: "top",
    scene: "cctv",
    title: "Watch CCTV live",
    body: "During a boarding stay, open the sitter's cameras any time.",
  },
  {
    id: "gps",
    kind: "coachmark",
    anchor: "gps",
    arrow: "top",
    scene: "gps",
    title: "Track the walk on GPS",
    body: "Follow every walk on the map and get a summary after.",
  },
];

export function isTourDone(storageValue) {
  return storageValue === "1";
}

export function hasServerSeen(seenAt) {
  if (seenAt == null || seenAt === "") return false;
  return true;
}

export function readTourFlag(storage) {
  if (!storage || typeof storage.getItem !== "function") return null;
  return storage.getItem(TOUR_STORAGE_KEY);
}

export function writeTourFlag(storage, done) {
  if (!storage || typeof storage.setItem !== "function") return;
  if (done) storage.setItem(TOUR_STORAGE_KEY, "1");
  else if (typeof storage.removeItem === "function") {
    storage.removeItem(TOUR_STORAGE_KEY);
  }
}

export function shouldShowTour({ localFlag, serverSeenAt, replay = false } = {}) {
  if (replay) return true;
  if (isTourDone(localFlag)) return false;
  if (hasServerSeen(serverSeenAt)) return false;
  return true;
}

export function nextStepIndex(current, total = TOUR_STEPS.length) {
  const index = Number(current) || 0;
  return Math.min(index + 1, Math.max(0, total - 1));
}

export function isLastStep(index, total = TOUR_STEPS.length) {
  return index >= total - 1;
}

export function stepNumberLabel(index, total = TOUR_STEPS.length) {
  return `Step ${index + 1} of ${total}`;
}

export function readOnboardingSeenAt(user) {
  if (!user || typeof user !== "object") return null;
  return (
    user.onboarding_seen_at ??
    user.onboardingSeenAt ??
    user.onboarding_completed_at ??
    user.onboardingCompletedAt ??
    null
  );
}

/** Body for PATCH /api/users/me/onboarding */
export function onboardingSeenBody(seen) {
  return { seen: Boolean(seen) };
}
