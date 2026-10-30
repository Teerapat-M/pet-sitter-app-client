"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, MessageCircle, Search, UserRound } from "lucide-react";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: House, match: (path) => path === "/" },
  {
    href: "/find-sitter",
    label: "Search",
    icon: Search,
    match: (path) => path.startsWith("/find-sitter"),
  },
  {
    href: "/owner/bookings",
    label: "Bookings",
    icon: CalendarDays,
    match: (path) => path.startsWith("/owner/booking"),
  },
  {
    href: "/messages",
    label: "Chat",
    icon: MessageCircle,
    match: (path) => path.startsWith("/messages"),
  },
  {
    href: "/owner/profile",
    label: "Profile",
    icon: UserRound,
    match: (path) => path.startsWith("/owner/profile") || path.startsWith("/owner/pets"),
  },
];

const HIDDEN = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/complete-profile",
  "/auth",
  "/admin",
  "/sitter",
  "/owner/walks",
  "/walk-frames",
  "/privacy-policy",
  "/terms-of-service",
  "/data-deletion",
];

export function shouldHideMobileTabBar(pathname) {
  return HIDDEN.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function MobileTabBar() {
  const pathname = usePathname() || "/";
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    function sync() {
      setLoggedIn(Boolean(getToken()));
    }
    sync();
    window.addEventListener("auth-changed", sync);
    return () => window.removeEventListener("auth-changed", sync);
  }, [pathname]);

  if (shouldHideMobileTabBar(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          const href =
            !loggedIn && tab.href !== "/" && tab.href !== "/find-sitter"
              ? `/login?next=${encodeURIComponent(tab.href)}`
              : tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-caption",
                  active ? "text-primary" : "text-ink-400",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
