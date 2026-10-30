"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getProfile, markOnboardingSeen } from "@/lib/api";
import { getToken, getUser, updateStoredUser } from "@/lib/auth";
import {
  TOUR_STEPS,
  TOUR_STORAGE_KEY,
  isLastStep,
  readOnboardingSeenAt,
  readTourFlag,
  shouldShowTour,
  writeTourFlag,
} from "@/lib/onboarding";

const AUTH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/complete-profile",
  "/auth",
  "/admin",
];

function isAuthPath(pathname) {
  return AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const OnboardingContext = createContext(null);

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return value;
}

export default function OnboardingProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const pendingAuto = useRef(false);
  const booted = useRef(false);

  const persistSeen = useCallback(async (seen) => {
    writeTourFlag(window.localStorage, seen);
    if (!getToken()) return;
    const timestamp = seen ? new Date().toISOString() : null;
    try {
      const data = await markOnboardingSeen(seen);
      updateStoredUser({
        onboarding_seen_at: data?.onboarding_seen_at ?? timestamp,
      });
    } catch {
      updateStoredUser({ onboarding_seen_at: timestamp });
    }
  }, []);

  const closeTour = useCallback(
    async (markDone) => {
      setOpen(false);
      setStepIndex(0);
      if (markDone) await persistSeen(true);
    },
    [persistSeen],
  );

  const startTour = useCallback(
    (fromIndex = 0) => {
      const step = TOUR_STEPS[fromIndex] ?? TOUR_STEPS[0];
      setStepIndex(fromIndex);
      setOpen(true);
      if (step.path && pathname !== step.path) {
        router.push(step.path);
      }
    },
    [pathname, router],
  );

  const replayTour = useCallback(async () => {
    await persistSeen(false);
    startTour(0);
  }, [persistSeen, startTour]);

  const next = useCallback(() => {
    if (isLastStep(stepIndex)) {
      void closeTour(true);
      return;
    }
    const nextIndex = stepIndex + 1;
    const step = TOUR_STEPS[nextIndex];
    setStepIndex(nextIndex);
    if (step?.path && pathname !== step.path) {
      router.push(step.path);
    }
  }, [closeTour, pathname, router, stepIndex]);

  const skip = useCallback(() => {
    void closeTour(true);
  }, [closeTour]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let cancelled = false;

    async function boot() {
      const localFlag = readTourFlag(window.localStorage);
      let serverSeenAt = readOnboardingSeenAt(getUser());

      if (getToken()) {
        try {
          const profile = await getProfile();
          if (cancelled) return;
          serverSeenAt = readOnboardingSeenAt(profile) ?? serverSeenAt;
          if (profile) {
            updateStoredUser({
              onboarding_seen_at: serverSeenAt,
            });
          }
          if (serverSeenAt) {
            writeTourFlag(window.localStorage, true);
          }
        } catch {
          // stay with local flag
        }
      }

      if (cancelled) return;
      setReady(true);
      if (shouldShowTour({ localFlag, serverSeenAt })) {
        pendingAuto.current = true;
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !pendingAuto.current || open) return;
    if (isAuthPath(pathname || "/")) return;
    pendingAuto.current = false;
    const timer = window.setTimeout(() => startTour(0), 0);
    return () => window.clearTimeout(timer);
  }, [open, pathname, ready, startTour]);

  useEffect(() => {
    function handleReplay() {
      void replayTour();
    }
    window.addEventListener("psp-replay-tour", handleReplay);
    return () => window.removeEventListener("psp-replay-tour", handleReplay);
  }, [replayTour]);

  const value = useMemo(
    () => ({
      open,
      ready,
      stepIndex,
      step: TOUR_STEPS[stepIndex],
      steps: TOUR_STEPS,
      storageKey: TOUR_STORAGE_KEY,
      startTour,
      replayTour,
      next,
      skip,
      closeTour,
    }),
    [closeTour, next, open, ready, replayTour, skip, startTour, stepIndex],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}
