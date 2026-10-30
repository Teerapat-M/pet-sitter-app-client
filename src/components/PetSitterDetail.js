"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, PawPrint } from "lucide-react";
import { toast } from "sonner";
import Icon from "./Icon";
import Pagination from "./Pagination";
import { getMyPets, getProfile, getSitter, getSitterAvailability, getSitterReviews } from "@/lib/api";
import BookingDateTimeModal from "@/components/booking/BookingDateTimeModal";
import { getUser } from "@/lib/auth";
import {
  bookingRangeOverlapsBooked,
  combineBookingDateTime,
  dateRangeOverlapsBooked,
  isAtLeastThreeHoursAhead,
  normalizeBookedSlots,
} from "@/lib/booking";
import { MONTHS } from "@/components/booking/BookingCalendarPicker";
import { errorToastClassNames } from "@/lib/toastStyles";
import { isOwnerProfileComplete } from "@/utils/validateProfile";
import { SERVICES, quoteBooking } from "@/lib/services";
import { getFallbackSitter } from "@/lib/sitterCard";
import CctvBadge from "@/components/CctvBadge";
import { Card } from "@/components/ui/card";

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

function isSameDayBooking(startDate, endDate, isManyDays) {
  if (isManyDays && !endDate) return false;
  return Boolean(startDate) && (!endDate || startDate === endDate);
}

function isStartBeforeEnd(startDate, startTime, endDate, endTime, isManyDays) {
  if (!startTime || !endTime) return true;
  if (!isSameDayBooking(startDate, endDate, isManyDays)) {
    if (!startDate || !endDate) return true;
    const start = combineBookingDateTime(startDate, startTime);
    const end = combineBookingDateTime(endDate, endTime);
    return Boolean(start && end && start.getTime() < end.getTime());
  }
  return startTime < endTime;
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

function formatChipDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

function BookingCard({
  firstName,
  serviceId,
  onService,
  startDate,
  endDate,
  onStartDate,
  onEndDate,
  petName,
  petOptions,
  onPet,
  bookingChecking,
  isOwnSitter,
  onBook,
}) {
  const quote = quoteBooking(serviceId, startDate, endDate);

  return (
    <Card className="rounded-card bg-surface p-5 shadow-card">
      <h2 className="text-h3">Book {firstName}</h2>
      <div className="mt-4 flex gap-2">
        {SERVICES.map((service) => {
          const active = service.id === serviceId;
          return (
            <button
              key={service.id}
              type="button"
              data-service={service.id}
              onClick={() => onService(service.id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-2 text-[11px] font-bold ${
                active ? "bg-primary text-white" : "border border-line bg-surface text-ink-600"
              }`}
            >
              <span aria-hidden>{service.icon}</span>
              {service.tabLabel}
            </button>
          );
        })}
      </div>

      <div className="relative mt-3">
        <div className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
          <CalendarDays className="size-4 shrink-0 text-ink-400" aria-hidden />
          <span className="text-body-2 font-semibold text-ink-900">
            {formatChipDate(startDate)} → {formatChipDate(endDate)}
          </span>
        </div>
        <div className="absolute inset-0 grid grid-cols-2">
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDate(event.target.value)}
            aria-label="Start date"
            className="cursor-pointer opacity-0"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDate(event.target.value)}
            aria-label="End date"
            className="cursor-pointer opacity-0"
          />
        </div>
      </div>

      <label className="mt-3 flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
        <PawPrint className="size-4 shrink-0 text-ink-400" aria-hidden />
        {petOptions.length > 0 ? (
          <select
            value={petName}
            onChange={(event) => onPet(event.target.value)}
            className="w-full bg-transparent text-body-2 font-semibold text-ink-900 outline-none"
            aria-label="Pet"
          >
            {petOptions.map((pet) => (
              <option key={pet} value={pet}>
                {pet}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={petName}
            onChange={(event) => onPet(event.target.value)}
            className="w-full bg-transparent text-body-2 font-semibold text-ink-900 outline-none"
            aria-label="Pet"
          />
        )}
      </label>

      <div className="mt-4 flex items-center justify-between text-body-2">
        <span className="text-ink-600">{quote.line}</span>
        <span className="text-h4 text-ink-900">฿{quote.total.toLocaleString("en-US")}</span>
      </div>

      <button
        type="button"
        className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onBook}
        disabled={bookingChecking || isOwnSitter}
      >
        {bookingChecking ? "Checking..." : "Book now"}
      </button>
      {isOwnSitter ? (
        <p className="mt-3 text-caption text-ink-400">
          You cannot book your own sitter profile
        </p>
      ) : null}
    </Card>
  );
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
  const [serviceId, setServiceId] = useState("boarding");
  const [startDate, setStartDate] = useState("2026-11-12");
  const [endDate, setEndDate] = useState("2026-11-15");
  const [petName, setPetName] = useState("Bobo");
  const [petOptions, setPetOptions] = useState([]);
  const [booking, setBooking] = useState({
    startDate: "2026-11-12",
    endDate: "2026-11-15",
    startTime: "",
    endTime: "",
  });
  const [bookedSlots, setBookedSlots] = useState([]);

  useEffect(() => {
    if (!getUser()) return;
    let cancelled = false;
    getMyPets()
      .then((pets) => {
        if (cancelled) return;
        const names = (Array.isArray(pets) ? pets : [])
          .map((pet) => String(pet?.name ?? "").trim())
          .filter(Boolean);
        if (names.length) {
          setPetOptions(names);
          setPetName(names[0]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bookingOpen || !sitterId) return;
    let cancelled = false;

    async function loadAvailability() {
      try {
        const data = await getSitterAvailability(sitterId);
        if (!cancelled) setBookedSlots(normalizeBookedSlots(data));
      } catch {
        if (!cancelled) setBookedSlots([]);
      }
    }

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [bookingOpen, sitterId]);

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

  async function openBookingIfProfileComplete() {
    if (bookingChecking) return;

    setBookingChecking(true);
    try {
      const profile = await getProfile();
      if (!isOwnerProfileComplete(profile)) {
        setProfileModalOpen(true);
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

  function handleBookNow() {
    if (isOwnSitter) {
      toast.error("You cannot book yourself", {
        classNames: errorToastClassNames,
      });
      return;
    }
    setBooking((current) => ({ ...current, startDate, endDate }));
    requireLogin(() => {
      void openBookingIfProfileComplete();
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

  function handleBookingChange(patch) {
    setBooking((current) => ({ ...current, ...patch }));
  }

  /** Continue → /owner/booking — many days ส่งแค่วัน · one day ส่งวัน+เวลา */
  function handleBookingContinue(event) {
    event.preventDefault();

    if (isOwnSitter) {
      toast.error("You cannot book yourself", {
        classNames: errorToastClassNames,
      });
      return;
    }

    const { startDate, endDate: bookingEndDate, startTime, endTime } = booking;
    const endDate = bookingEndDate || startDate;
    const isManyDayRange = Boolean(startDate && endDate && endDate > startDate);

    if (!startDate) return;

    if (isManyDayRange) {
      // Step 1a: many days — เช็คแค่วันที่ (ไม่ใช้ time)
      if (!bookingEndDate || bookingEndDate <= startDate) return;

      if (dateRangeOverlapsBooked(startDate, endDate, bookedSlots)) {
        toast.error("This date and time is already booked. Please choose another slot.", {
          classNames: errorToastClassNames,
        });
        return;
      }

      // Step 2a: query เฉพาะ sitterId + startDate + endDate
      const params = new URLSearchParams({
        sitterId: String(sitter.id ?? sitterId),
        startDate,
        endDate,
      });
      setBookingOpen(false);
      router.push(`/owner/booking?${params.toString()}`);
      return;
    }

    // Step 1b: one day — ต้องมีเวลา + กฎเดิม
    if (!startTime || !endTime) return;
    if (!isAtLeastThreeHoursAhead(startDate, startTime)) return;
    if (!isStartBeforeEnd(startDate, startTime, endDate, endTime, false)) return;

    if (
      bookingRangeOverlapsBooked(startDate, endDate, startTime, endTime, bookedSlots)
    ) {
      toast.error("This date and time is already booked. Please choose another slot.", {
        classNames: errorToastClassNames,
      });
      return;
    }

    // Step 2b: one day — startDate/endDate เท่ากัน + time (parseBookingParams รองรับ legacy ?date= ด้วย)
    const params = new URLSearchParams({
      sitterId: String(sitter.id ?? sitterId),
      startDate,
      endDate: startDate,
      startTime,
      endTime,
    });
    setBookingOpen(false);
    router.push(`/owner/booking?${params.toString()}`);
  }

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
                {SERVICES.map((service) => (
                  <Card key={service.id} className="rounded-card border border-line bg-surface p-4">
                    <p className="font-bold">
                      {service.icon} {service.tabLabel === "Walking" ? "Dog walking" : service.tabLabel}
                    </p>
                    <p className="mt-1 text-label text-primary">{service.profilePrice}</p>
                  </Card>
                ))}
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
            <div className="hidden lg:block">
              <BookingCard
                firstName={firstName}
                serviceId={serviceId}
                onService={setServiceId}
                startDate={startDate}
                endDate={endDate}
                onStartDate={setStartDate}
                onEndDate={setEndDate}
                petName={petName}
                petOptions={petOptions}
                onPet={setPetName}
                bookingChecking={bookingChecking}
                isOwnSitter={isOwnSitter}
                onBook={handleBookNow}
              />
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface px-5 py-3 md:hidden">
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={handleBookNow}
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
        <BookingDateTimeModal
          startDate={booking.startDate}
          endDate={booking.endDate}
          startTime={booking.startTime}
          endTime={booking.endTime}
          bookedSlots={bookedSlots}
          onChange={handleBookingChange}
          onClose={() => setBookingOpen(false)}
          onContinue={handleBookingContinue}
        />
      ) : null}
    </div>
  );
}
