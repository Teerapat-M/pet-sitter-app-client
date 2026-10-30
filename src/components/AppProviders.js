"use client";

import OnboardingProvider from "@/components/onboarding/OnboardingProvider";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import MobileTabBar from "@/components/MobileTabBar";

export default function AppProviders({ children }) {
  return (
    <OnboardingProvider>
      {children}
      <MobileTabBar />
      <OnboardingTour />
    </OnboardingProvider>
  );
}
