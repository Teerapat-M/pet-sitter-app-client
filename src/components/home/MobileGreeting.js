"use client";

import { useSyncExternalStore } from "react";
import { getUser } from "@/lib/auth";

function subscribe(callback) {
  window.addEventListener("auth-changed", callback);
  window.addEventListener("owner-profile-updated", callback);
  return () => {
    window.removeEventListener("auth-changed", callback);
    window.removeEventListener("owner-profile-updated", callback);
  };
}

function getSnapshot() {
  const full = String(getUser()?.name ?? "").trim();
  return full.split(" ")[0] || "";
}

function getServerSnapshot() {
  return "";
}

export default function MobileGreeting() {
  const name = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="mb-4 md:hidden">
      <p className="text-h2">Hi {name || "there"} 👋</p>
      <p className="text-body-2 text-ink-600">Who needs care today?</p>
    </div>
  );
}
