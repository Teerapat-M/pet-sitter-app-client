"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PawPrint, RefreshCw, Settings, UserRound, X } from "lucide-react";
import Logo from "@/components/brand/Logo";
import NotificationBell from "@/components/NotificationBell";
import { becomeSitter } from "@/lib/api";
import { clearAuth, getToken, getUser, saveAuth, updateStoredUser } from "@/lib/auth";
import { useUnreadChatCount } from "@/lib/useUnreadChatCount";
import { cn } from "@/lib/utils";

const FALLBACK_AVATAR = "/icon/user.svg";

function getAvatarSrc(user) {
  return (
    user?.avatarUrl ||
    user?.avatar_url ||
    user?.avatar ||
    user?.profileImage ||
    user?.image ||
    FALLBACK_AVATAR
  );
}

const NAV_LINKS = [
  { href: "/find-sitter", label: "Find sitters" },
  { href: "/owner/bookings", label: "Bookings", auth: true },
  { href: "/messages", label: "Messages", auth: true },
  { href: "/owner/pets", label: "My pets", auth: true },
];

function BecomeSitterModal({ onCancel, onConfirm, loading, error }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/55 p-4"
      onClick={loading ? undefined : onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="become-sitter-title"
        className="w-full max-w-md overflow-hidden rounded-card bg-surface shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 id="become-sitter-title" className="text-h4 text-ink-900">
            Become a Pet Sitter
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="cursor-pointer rounded-lg p-1 text-ink-400 transition-colors hover:text-ink-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-6">
          <p className="text-body-2 text-ink-600">
            Are you sure you want to become a pet sitter?
          </p>
          {error ? <p className="mt-3 text-body-2 text-danger">{error}</p> : null}
        </div>
        <div className="flex items-center gap-3 px-6 pb-6">
          <button type="button" onClick={onCancel} disabled={loading} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn btn-primary flex-1">
            {loading ? "Confirming..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, label, pathname, onClick }) {
  const active =
    href === "/find-sitter"
      ? pathname.startsWith("/find-sitter")
      : href === "/owner/bookings"
        ? pathname.startsWith("/owner/bookings") || pathname.startsWith("/owner/cctv")
        : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "text-body-2 font-semibold transition-colors",
        active ? "text-primary" : "text-ink-600 hover:text-ink-900",
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [becomeSitterOpen, setBecomeSitterOpen] = useState(false);
  const [becomeSitterLoading, setBecomeSitterLoading] = useState(false);
  const [becomeSitterError, setBecomeSitterError] = useState("");
  const menuRef = useRef(null);
  const isLoggedIn = Boolean(user);
  const isSitter = Boolean(user?.isSitter);
  const unreadChatCount = useUnreadChatCount(isLoggedIn);
  const avatarSrc = getAvatarSrc(user);
  const isRemoteAvatar =
    typeof avatarSrc === "string" && /^https?:\/\//.test(avatarSrc);

  useEffect(() => {
    let cancelled = false;

    function syncFromStorage() {
      const token = getToken();
      setUser(token ? getUser() : null);
    }

    async function refreshFromApi() {
      syncFromStorage();
      const token = getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!token || !apiUrl) return;

      try {
        const res = await fetch(`${apiUrl}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.status === 401) {
          clearAuth();
          if (!cancelled) setUser(null);
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok || cancelled || !json.data) return;

        const nextUser = updateStoredUser({
          name: json.data.name,
          email: json.data.email,
          phone: json.data.phone,
          avatarUrl: json.data.avatar_url ?? json.data.avatarUrl,
          onboarding_seen_at:
            json.data.onboarding_seen_at ?? json.data.onboardingSeenAt ?? null,
        });
        if (!cancelled && nextUser) setUser(nextUser);
      } catch {
        // keep the user already loaded from storage
      }
    }

    refreshFromApi();
    window.addEventListener("auth-changed", syncFromStorage);
    window.addEventListener("owner-profile-updated", refreshFromApi);
    window.addEventListener("sitter-profile-updated", refreshFromApi);
    return () => {
      cancelled = true;
      window.removeEventListener("auth-changed", syncFromStorage);
      window.removeEventListener("owner-profile-updated", refreshFromApi);
      window.removeEventListener("sitter-profile-updated", refreshFromApi);
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!becomeSitterOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !becomeSitterLoading) {
        setBecomeSitterOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [becomeSitterOpen, becomeSitterLoading]);

  function handleOpenBecomeSitter() {
    setMenuOpen(false);
    setBecomeSitterError("");
    setBecomeSitterOpen(true);
  }

  async function handleConfirmBecomeSitter() {
    const token = getToken();
    const currentUser = getUser();
    if (!token || !currentUser) {
      setBecomeSitterError("Please log in again");
      return;
    }

    setBecomeSitterError("");
    setBecomeSitterLoading(true);

    try {
      const data = await becomeSitter();
      const persist = Boolean(localStorage.getItem("pet-sitter-token"));
      const nextUser = {
        ...currentUser,
        ...(data?.user ?? {}),
        isSitter: true,
      };
      saveAuth({ token, user: nextUser }, persist);
      setUser(nextUser);
      setBecomeSitterOpen(false);
      router.push("/sitter/profile");
    } catch (err) {
      setBecomeSitterError(
        err instanceof Error ? err.message : "Failed to become a pet sitter",
      );
    } finally {
      setBecomeSitterLoading(false);
    }
  }

  function handleLogout() {
    setMenuOpen(false);
    clearAuth();
    setUser(null);
    router.push("/");
  }

  function handleReplayTour() {
    setMenuOpen(false);
    window.dispatchEvent(new Event("psp-replay-tour"));
  }

  const visibleLinks = NAV_LINKS.filter((link) => isLoggedIn || !link.auth);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        <nav className="psp-container flex h-14 items-center justify-between md:h-20">
          <Logo />

          <div className="hidden items-center gap-8 md:flex">
            {visibleLinks.map((link) => (
              <span key={link.href} className="relative">
                <NavLink href={link.href} label={link.label} pathname={pathname} />
                {link.href === "/messages" && unreadChatCount > 0 ? (
                  <span className="absolute -top-1 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                ) : null}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {isLoggedIn ? (
              <>
                <NotificationBell enabled={isLoggedIn} />
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-accent-50 md:size-11"
                    aria-label="Open profile menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    {isRemoteAvatar ? (
                      <img
                        key={avatarSrc}
                        src={avatarSrc}
                        alt={user?.name || "Profile"}
                        className="size-9 rounded-full object-cover md:size-11"
                      />
                    ) : (
                      <span className="text-lg" aria-hidden>
                        😊
                      </span>
                    )}
                  </button>

                  {menuOpen ? (
                    <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-64 overflow-hidden rounded-card bg-surface py-2 shadow-float">
                      <div className="border-b border-line px-4 py-3">
                        <p className="truncate font-extrabold text-ink-900">
                          {user?.name || "Account"}
                        </p>
                        {user?.email ? (
                          <p className="truncate text-caption text-ink-400">{user.email}</p>
                        ) : null}
                      </div>
                      <Link
                        href="/owner/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-body-2 text-ink-900 hover:bg-primary-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <UserRound className="size-4 text-ink-400" aria-hidden />
                        Profile
                      </Link>
                      <Link
                        href="/owner/pets"
                        className="flex items-center gap-3 px-4 py-2.5 text-body-2 text-ink-900 hover:bg-primary-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <PawPrint className="size-4 text-ink-400" aria-hidden />
                        My pets
                      </Link>
                      <Link
                        href="/owner/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-body-2 text-ink-900 hover:bg-primary-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Settings className="size-4 text-ink-400" aria-hidden />
                        Settings
                      </Link>
                      <div className="px-2 py-1">
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-primary-50 px-3 py-2.5 text-left text-body-2 font-bold text-primary hover:bg-primary-50"
                          onClick={handleReplayTour}
                        >
                          <RefreshCw className="size-4" aria-hidden />
                          Show tour again
                        </button>
                      </div>
                      {isSitter ? (
                        <Link
                          href="/sitter/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-body-2 text-ink-900 hover:bg-primary-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Sitter dashboard
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full cursor-pointer px-4 py-2.5 text-left text-body-2 text-ink-900 hover:bg-primary-50"
                          onClick={handleOpenBecomeSitter}
                        >
                          Become a pet sitter
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex w-full cursor-pointer border-t border-line px-4 py-2.5 text-left text-body-2 font-bold text-danger hover:bg-primary-50"
                        onClick={handleLogout}
                      >
                        Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-body-2 font-bold text-primary md:font-semibold md:text-ink-600">
                  Log in
                </Link>
                <Link href="/register" className="btn btn-primary hidden h-11 px-5 md:inline-flex">
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {becomeSitterOpen ? (
        <BecomeSitterModal
          onCancel={() => !becomeSitterLoading && setBecomeSitterOpen(false)}
          onConfirm={handleConfirmBecomeSitter}
          loading={becomeSitterLoading}
          error={becomeSitterError}
        />
      ) : null}
    </>
  );
}
