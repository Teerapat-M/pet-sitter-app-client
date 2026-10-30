"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Icon from "./Icon";
import Pagination from "./Pagination";
import { getMyPets, getProfile, getSitter, getSitterReviews } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { MONTHS } from "@/components/booking/BookingCalendarPicker";
import { errorToastClassNames } from "@/lib/toastStyles";
import { isOwnerProfileComplete } from "@/utils/validateProfile";
import { SERVICES } from "@/lib/services";
import { getFallbackSitter } from "@/lib/sitterCard";
import CctvBadge from "@/components/CctvBadge";
import { Card } from "@/components/ui/card";
import ServiceBookingForm, { useLiveQuote } from "@/components/booking/ServiceBookingForm";
import { normalizeBookingPet, toDateOnly } from "@/lib/booking";
import {
  alignDraftToOfferings,
  offeredServiceTypes,
  serviceOfferingPriceLabel,
  toBookingSearchParams,
  validateBookingForm,
} from "@/lib/phase3Booking";

function isRemoteSrc(src) {
  return String(src ?? "").startsWith("http");
}

function isOwnSitterListing(sitterId) {
  const currentId = getUser()?.id;
  return Boolean(currentId && sitterId && String(currentId) === String(sitterId));
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? "";
}

function formatExperience(value) {
  if (value == null || value === "") return "";
  const text = String(value).trim();
  if (text === "0") return "";
  if (/exp\.?$/i.test(text)) return text;
  if (/years?$/i.test(text)) return `${text} Exp.`;
  return `${text} Years Exp.`;
}

function normalizePetTypes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const name = typeof item === "string" ? item : item?.name;
      return String(name ?? "").trim().toLowerCase();
    })
    .filter(Boolean);
}

function collectPhotos(raw) {
  const rows = raw.sitter_photos ?? raw.sitters_photo ?? raw.photos ?? [];
  const list = Array.isArray(rows) ? rows : [];

  return list
    .slice()
    .sort((a, b) => {
      if (typeof a === "string" || typeof b === "string") return 0;
      return (a.sort_order ?? a.sortOrder ?? 0) - (b.sort_order ?? b.sortOrder ?? 0);
    })
    .map((item) =>
      typeof item === "string" ? item : item?.photo_url || item?.photoUrl || ""
    )
    .filter(Boolean);
}

function normalizeSitter(raw) {
  const district = firstString(raw.district, raw.sub_district, raw.subDistrict);
  const province = firstString(raw.province);
  const location =
    firstString(raw.location) || [district, province].filter(Boolean).join(", ");

  return {
    id: raw.id ?? raw.user_id,
    title: firstString(raw.title, raw.display_name, raw.tradeName, "Pet Sitter"),
    sitterName: firstString(raw.sitterName, raw.sitter_name, raw.name),
    avatarUrl: firstString(raw.avatarUrl, raw.avatar_url),
    location,
    rating: Number(raw.rating ?? raw.rating_avg ?? 0) || 0,
    ratingAvg: Number(raw.rating_avg ?? raw.ratingAvg ?? raw.rating ?? 0) || 0,
    reviewCount: Number(raw.review_count ?? raw.reviewCount ?? 0) || 0,
    petTypes: normalizePetTypes(raw.petTypes ?? raw.pet_types),
    photos: collectPhotos(raw),
    introduction: firstString(raw.introduction),
    services: firstString(raw.services),
    experience: formatExperience(raw.experience ?? raw.experience_years ?? raw.experienceYears),
    cameraCount: Number(raw.camera_count ?? raw.cameraCount ?? raw.cameras?.length ?? 0) || 0,
    hasCctv: Boolean(raw.hasCctv ?? raw.has_cctv ?? raw.camera_count),
    serviceOfferings: raw.serviceOfferings ?? raw.service_offerings ?? [],
    latitude: raw.latitude,
    longitude: raw.longitude,
  };
}

function Stars({ count, iconClassName = "h-5 w-5" }) {
  return (
    <div className="flex items-center gap-0.5 text-green" aria-label={`${count} star rating`}>
      {Array.from({ length: Math.min(5, Math.max(0, count)) }).map((_, index) => (
        <Icon key={index} src="/icon/star.svg" className={iconClassName} />
      ))}
    </div>
  );
}

function CompleteProfileModal({ onClose, onComplete }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-profile-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-(--shadow-card)"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 id="complete-profile-title" className="text-h4 text-gray-900">
            Complete your profile
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Close"
          >
            <Icon src="/icon/x.svg" className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-6">
          <p className="text-body-2 text-gray-500">
            Please fill in your name, email, phone, ID number, and date of birth
            before booking a pet sitter.
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={onComplete} className="btn btn-primary flex-1">
            Complete profile
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginRequiredModal({ onClose, onLogin }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-(--shadow-card)"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 id="login-required-title" className="text-h4 text-gray-900">
            Please log in
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Close"
          >
            <Icon src="/icon/x.svg" className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-6">
          <p className="text-body-2 text-gray-500">
            You need to log in first to continue.
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={onLogin} className="btn btn-primary flex-1">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

function CoverPhoto({ src, title }) {
  return (
    <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-tile bg-[#ffd7b8] lg:min-h-[22rem]">
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
          unoptimized={isRemoteSrc(src)}
        />
      ) : (
        <p className="text-label text-primary-600">🐾 Large pet photo</p>
      )}
    </div>
  );
}

function GalleryThumbs({ photos }) {
  const extras = photos.slice(1);
  const extraCount = Math.max(0, photos.length - 2);
  const items = [
    { src: extras[0], label: "Garden", tint: "#ffd7b8", className: "row-span-2 min-h-[7.5rem]" },
    { src: extras[1], label: "", tint: "#d7f3ea", className: "min-h-[3.5rem]" },
    {
      src: extras[2],
      label: extraCount > 1 ? `+${extraCount} photos` : "+12 photos",
      tint: "#ffe9b5",
      className: "min-h-[3.5rem]",
    },
  ];

  return (
    <div className="grid h-44 grid-cols-2 grid-rows-2 gap-3">
      {items.map((item) => (
        <Card
          key={`${item.tint}-${item.label}`}
          className={`relative flex items-end overflow-hidden rounded-2xl p-3 text-caption font-semibold text-primary-600 ${item.className}`}
          style={{ backgroundColor: item.tint }}
        >
          {item.src ? (
            <Image
              src={item.src}
              alt={item.label || "Sitter photo"}
              fill
              sizes="160px"
              className="object-cover"
              unoptimized={isRemoteSrc(item.src)}
            />
          ) : null}
          {item.label.startsWith("+") ? (
            <span className="relative z-10 ml-auto rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-white">
              {item.label}
            </span>
          ) : item.label ? (
            <span className="relative z-10 text-caption font-semibold text-primary-600">
              🪴 {item.label}
            </span>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function CctvPanel({ name }) {
  return (
    <Card className="rounded-tile bg-accent-50 p-4">
      <p className="text-label text-accent-700">CCTV at {name}&apos;s place</p>
      <p className="mt-1 text-body-2 text-ink-600">
        Watch your pet live during the stay.
      </p>
      <div className="mt-3 flex gap-2">
        {["Play room", "Garden", "Bedroom"].map((room) => (
          <div
            key={room}
            className="flex h-16 flex-1 items-end rounded-xl bg-ink-900 p-2 text-caption text-white"
          >
            {room}
          </div>
        ))}
      </div>
    </Card>
  );
}

function localIsoDate(offsetDays = 0) {
  const now = new Date();
  now.setTime(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return toDateOnly(now);
}

function defaultBookingDraft() {
  return {
    serviceType: "boarding",
    mode: "visit",
    checkIn: localIsoDate(1),
    checkOut: localIsoDate(4),
    date: localIsoDate(1),
    startTime: "09:00",
    durationMinutes: 30,
    visitHours: 2,
    ownerAddress: "",
    petIds: [],
  };
}

const REVIEW_PAGE_SIZE = 5;
const RATING_FILTERS = [5, 4, 3, 2, 1];
const FALLBACK_REVIEWS = [
  {
    id: "demo-anna",
    name: "Anna & Mochi",
    rating: 5,
    comment: "Loved the live camera — so reassuring!",
    date: "",
  },
  {
    id: "demo-ken",
    name: "Ken & Bobo",
    rating: 5,
    comment: "Great walks, GPS map was spot on.",
    date: "",
  },
];

function formatReviewDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function normalizeReview(raw) {
  const rating = Number(raw.rating ?? raw.stars ?? 0) || 0;

  return {
    id: raw.id ?? raw.review_id ?? `${raw.created_at ?? ""}-${raw.name ?? ""}`,
    name: firstString(
      raw.name,
      raw.owner_name,
      raw.ownerName,
      raw.user_name,
      raw.reviewer_name,
      raw.reviewerName,
      "Pet Owner"
    ),
    avatarUrl: firstString(
      raw.avatarUrl,
      raw.avatar_url,
      raw.owner_avatar,
      raw.ownerAvatar
    ),
    date: formatReviewDate(raw.created_at ?? raw.createdAt ?? raw.date),
    rating: Math.min(5, Math.max(0, Math.round(rating))),
    comment: firstString(raw.comment, raw.content, raw.review, raw.text),
  };
}

function FilterStars({ count }) {
  return (
    <span className="flex items-center gap-0.5 text-green">
      {Array.from({ length: count }).map((_, index) => (
        <Icon key={index} src="/icon/star.svg" className="h-4.5 w-4.5" />
      ))}
    </span>
  );
}

function ReviewsSection({ sitterId, ratingAvg, reviewCount }) {
  const demo = String(sitterId).startsWith("demo-");
  const [reviews, setReviews] = useState(demo ? FALLBACK_REVIEWS : []);
  const [loading, setLoading] = useState(!demo);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState({
    ratingAvg: Number(ratingAvg) || 0,
    reviewCount: Number(reviewCount) || 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!String(sitterId).startsWith("demo-")) setLoading(true);
      try {
        const result = await getSitterReviews(sitterId, {
          page,
          limit: REVIEW_PAGE_SIZE,
          rating: ratingFilter,
        });
        if (cancelled) return;
        setReviews(result.data.map(normalizeReview));
        setTotalPages(result.pagination.totalPages ?? 0);
        setSummary({
          ratingAvg:
            Number(result.summary?.rating_avg ?? result.summary?.ratingAvg ?? ratingAvg) || 0,
          reviewCount:
            Number(result.summary?.review_count ?? result.summary?.reviewCount ?? reviewCount) ||
            0,
        });
      } catch {
        if (!cancelled) {
          if (String(sitterId).startsWith("demo-")) {
            setReviews(FALLBACK_REVIEWS);
            setSummary({ ratingAvg: Number(ratingAvg) || 4.9, reviewCount: Number(reviewCount) || 212 });
            setTotalPages(0);
          } else {
            setReviews([]);
            setTotalPages(0);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sitterId, page, ratingFilter, ratingAvg, reviewCount]);

  const average = summary.ratingAvg;
  const count = summary.reviewCount;

  function handleFilter(next) {
    setRatingFilter(next);
    setPage(1);
  }

  return (
    <section>
      <Card className="rounded-card bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-10">
          <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full bg-primary-50 text-ink-900">
            <span className="text-h3 leading-none">{Number(average).toFixed(1)}</span>
            <span className="mt-1 text-caption">
              {count} {count === 1 ? "Review" : "Reviews"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-h3">Reviews · {Number(average).toFixed(1)}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleFilter(null)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-body-3 font-medium transition-colors ${
                  ratingFilter == null
                    ? "border-orange-500 text-orange-500"
                    : "border-gray-200 text-gray-500 hover:border-orange-500 hover:text-orange-500"
                }`}
              >
                All Reviews
              </button>
              {RATING_FILTERS.map((rating) => {
                const isSelected = ratingFilter === rating;
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleFilter(isSelected ? null : rating)}
                    className={`group flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 transition-colors ${
                      isSelected
                        ? "border-orange-500 text-orange-500"
                        : "border-gray-200 text-gray-500 hover:border-orange-500 hover:text-orange-500"
                    }`}
                  >
                    <span className="text-body-3 font-medium">{rating}</span>
                    <FilterStars count={rating} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="px-5 pt-6 pb-8 sm:px-8 sm:py-10">
          {loading ? (
            <p className="py-10 text-body-2 text-gray-400">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="py-10 text-body-2 text-gray-400">
              {ratingFilter ? "No reviews for this rating" : "No reviews yet"}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {reviews.map((review) => (
                <Card
                  as="li"
                  key={review.id}
                  className="rounded-card border border-line bg-surface p-4"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3 sm:w-56 sm:shrink-0 sm:items-center sm:justify-start sm:gap-4">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      {review.avatarUrl ? (
                        <Image
                          src={review.avatarUrl}
                          alt={review.name}
                          width={56}
                          height={56}
                          className="avatar size-10 shrink-0 sm:size-14"
                          unoptimized={isRemoteSrc(review.avatarUrl)}
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-300 sm:size-14">
                          <Icon src="/icon/user.svg" className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-body-2 font-bold text-black">{review.name}</p>
                        {review.date ? (
                          <p className="text-body-3 text-gray-400">{review.date}</p>
                        ) : null}
                      </div>
                    </div>
                    {review.rating > 0 ? (
                      <div className="shrink-0 sm:hidden">
                        <Stars count={review.rating} iconClassName="h-4 w-4" />
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    {review.rating > 0 ? (
                      <div className="hidden sm:block">
                        <Stars count={review.rating} />
                      </div>
                    ) : null}
                    {review.comment ? (
                      <p className="text-body-2 text-gray-500 sm:mt-2">{review.comment}</p>
                    ) : null}
                  </div>
                </Card>
              ))}
            </ul>
          )}

        {totalPages > 1 ? (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function PetSitterDetail({ sitterId }) {
  const router = useRouter();
  const fallback = getFallbackSitter(sitterId);
  const [sitter, setSitter] = useState(() =>
    fallback ? normalizeSitter(fallback) : null,
  );
  const [loading, setLoading] = useState(() => !fallback);
  const [error, setError] = useState("");
  const isLoggedIn = useSyncExternalStore(
    (callback) => {
      window.addEventListener("auth-changed", callback);
      return () => window.removeEventListener("auth-changed", callback);
    },
    () => Boolean(getUser()),
    () => false,
  );
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingChecking, setBookingChecking] = useState(false);
  const [pets, setPets] = useState([]);
  const [draft, setDraft] = useState(defaultBookingDraft);
  const alignedSitterId = useRef("");
  const quoteDraft = useMemo(
    () => ({
      ...draft,
      sitterId,
      serviceOfferings: sitter?.serviceOfferings ?? [],
    }),
    [draft, sitterId, sitter?.serviceOfferings],
  );
  const quoteEnabled = isLoggedIn && !isOwnSitterListing(sitterId) && Boolean(sitter);
  const { quote, quoteError, quoting } = useLiveQuote(
    sitterId,
    quoteDraft,
    quoteEnabled,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const seed = getFallbackSitter(sitterId);
      if (!seed) setLoading(true);
      setError("");
      try {
        const data = await getSitter(sitterId);
        if (!cancelled) setSitter(normalizeSitter(data));
      } catch (err) {
        if (!cancelled) {
          if (seed) {
            setSitter(normalizeSitter(seed));
            setError("");
          } else {
            setSitter(null);
            setError(err instanceof Error ? err.message : "Failed to load pet sitter");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sitterId]);

  useEffect(() => {
    alignedSitterId.current = "";
  }, [sitterId]);

  useEffect(() => {
    if (!sitter?.id) return;
    const offerings = sitter.serviceOfferings;
    if (!Array.isArray(offerings) || offerings.length === 0) return;
    setDraft((current) => {
      const preferFirst = alignedSitterId.current !== sitter.id;
      alignedSitterId.current = sitter.id;
      return alignDraftToOfferings(current, offerings, { preferFirst });
    });
  }, [sitter]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    getMyPets()
      .then((rows) => {
        if (cancelled) return;
        const next = (Array.isArray(rows) ? rows : [])
          .map(normalizeBookingPet)
          .filter((pet) => pet?.id);
        setPets(next);
        setDraft((current) =>
          current.petIds?.length
            ? current
            : { ...current, petIds: next[0] ? [String(next[0].id)] : [] },
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="min-h-full bg-background px-5 py-16">
        <p className="psp-container text-body-2 text-ink-400">Loading pet sitter...</p>
      </div>
    );
  }

  if (error || !sitter) {
    return (
      <div className="min-h-full bg-background px-5 py-16">
        <div className="psp-container flex flex-col gap-4">
          <p className="text-body-2 text-danger">{error || "Pet sitter not found"}</p>
          <Link href="/find-sitter" className="btn btn-secondary w-fit">
            Back to results
          </Link>
        </div>
      </div>
    );
  }

  const isOwnSitter = isOwnSitterListing(sitter.id ?? sitterId);
  const firstName = (sitter.sitterName || sitter.title || "this sitter").split(" ")[0];
  const offeredTypes = offeredServiceTypes(sitter.serviceOfferings);
  const cctvLabel = sitter.cameraCount
    ? `CCTV · ${sitter.cameraCount} cameras`
    : "CCTV · 3 cameras";

  function requireLogin(onAllowed) {
    if (isLoggedIn) {
      onAllowed?.();
      return;
    }
    setLoginModalOpen(true);
  }

  function goToCheckout() {
    const nextDraft = { ...draft, sitterId: String(sitter.id ?? sitterId), pets };
    const { ok, errors } = validateBookingForm({
      ...nextDraft,
      requireAddress: nextDraft.serviceType === "in_home",
    });
    if (!ok) {
      toast.error(Object.values(errors)[0] || "Please complete the booking form", {
        classNames: errorToastClassNames,
      });
      return;
    }
    if (quote?.available === false) {
      toast.error("This slot overlaps another booking. Choose another date or time.", {
        classNames: errorToastClassNames,
      });
      return;
    }
    const params = toBookingSearchParams(nextDraft);
    setBookingOpen(false);
    router.push(`/owner/booking?${params.toString()}`);
  }

  async function openBookingIfProfileComplete(thenCheckout) {
    if (bookingChecking) return;

    setBookingChecking(true);
    try {
      const profile = await getProfile();
      if (!isOwnerProfileComplete(profile)) {
        setProfileModalOpen(true);
        return;
      }
      if (thenCheckout) {
        goToCheckout();
        return;
      }
      setBookingOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load profile", {
        classNames: errorToastClassNames,
      });
    } finally {
      setBookingChecking(false);
    }
  }

  function handleBookNow(thenCheckout = true) {
    if (isOwnSitter) {
      toast.error("You cannot book yourself", {
        classNames: errorToastClassNames,
      });
      return;
    }
    requireLogin(() => {
      void openBookingIfProfileComplete(thenCheckout);
    });
  }

  function handleLoginConfirm() {
    setLoginModalOpen(false);
    router.push("/login");
  }

  function handleCompleteProfile() {
    setProfileModalOpen(false);
    const returnTo = `/find-sitter/${sitter.id ?? sitterId}`;
    router.push(`/owner/profile?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const bookingForm = (
    <ServiceBookingForm
      sitterId={String(sitter.id ?? sitterId)}
      firstName={firstName}
      pets={pets}
      draft={draft}
      onChange={setDraft}
      quote={quote}
      quoteError={quoteError}
      quoting={quoting}
      bookingChecking={bookingChecking}
      isOwnSitter={isOwnSitter}
      onBook={() => handleBookNow(true)}
      serviceOfferings={sitter.serviceOfferings}
    />
  );

  return (
    <div className="min-h-full bg-background pb-28 md:pb-10">
      <div className="psp-container py-6">
        <Link href="/find-sitter" className="text-caption font-semibold text-ink-600">
          ← Back to results
        </Link>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:gap-6">
          <CoverPhoto src={sitter.photos[0]} title={sitter.title} />
          <GalleryThumbs photos={sitter.photos} />

          <div className="min-w-0">
            <h1 className="text-h1">{sitter.sitterName || sitter.title}</h1>
            <p className="mt-2 text-body-2 text-ink-600">
              ⭐ {sitter.ratingAvg?.toFixed?.(1) ?? sitter.rating}{" "}
              {sitter.reviewCount ? `(${sitter.reviewCount} reviews)` : ""}
              {sitter.location ? ` · ${sitter.location}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge badge-verified">✓ Verified</span>
              <CctvBadge label={cctvLabel} />
            </div>

            {sitter.introduction ? (
              <p className="mt-4 whitespace-pre-line text-body-2 text-ink-600">
                {sitter.introduction}
              </p>
            ) : null}

            <section className="mt-8">
              <h2 className="text-h3">Services</h2>
              {sitter.services ? (
                <p className="mt-2 whitespace-pre-line text-body-2 text-ink-600">{sitter.services}</p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(offeredTypes.length
                  ? SERVICES.filter((service) => offeredTypes.includes(service.id))
                  : SERVICES
                ).map((service) => {
                  const priceLabel = serviceOfferingPriceLabel(
                    sitter.serviceOfferings,
                    service.id,
                  );
                  return (
                    <Card key={service.id} className="rounded-card border border-line bg-surface p-4">
                      <p className="font-bold">
                        {service.icon} {service.tabLabel === "Walking" ? "Dog walking" : service.tabLabel}
                      </p>
                      {priceLabel ? (
                        <p className="mt-1 text-label text-primary">{priceLabel}</p>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </section>

            <div className="mt-8">
              <ReviewsSection
                sitterId={sitter.id ?? sitterId}
                ratingAvg={sitter.ratingAvg}
                reviewCount={sitter.reviewCount}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <CctvPanel name={sitter.sitterName || sitter.title} />
            <div className="hidden lg:block">{bookingForm}</div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface px-5 py-3 lg:hidden">
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => handleBookNow(false)}
          disabled={bookingChecking || isOwnSitter}
        >
          {bookingChecking ? "Checking..." : "Book now"}
        </button>
      </div>

      {loginModalOpen ? (
        <LoginRequiredModal
          onClose={() => setLoginModalOpen(false)}
          onLogin={handleLoginConfirm}
        />
      ) : null}

      {profileModalOpen ? (
        <CompleteProfileModal
          onClose={() => setProfileModalOpen(false)}
          onComplete={handleCompleteProfile}
        />
      ) : null}

      {bookingOpen ? (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black/50 p-4 lg:hidden">
          <div className="mx-auto max-w-md pb-8 pt-6">
            <button
              type="button"
              className="mb-3 text-caption font-bold text-white"
              onClick={() => setBookingOpen(false)}
            >
              Close
            </button>
            {bookingForm}
          </div>
        </div>
      ) : null}
    </div>
  );
}
