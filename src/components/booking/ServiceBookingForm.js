"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, MapPin, PawPrint } from "lucide-react";
import { Card } from "@/components/ui/card";
import CctvBadge from "@/components/CctvBadge";
import { SERVICES } from "@/lib/services";
import { quotePhase3Booking } from "@/lib/api";
import { HOURLY_TIMES } from "@/lib/booking";
import {
  IN_HOME_ADDRESS_REQUIRED_MESSAGE,
  WALK_DURATIONS,
  canQuoteOffering,
  createLiveQuoteSession,
  draftForServiceType,
  formatQuoteLine,
  formatQuoteTotal,
  inHomeAddressMissing,
  isDogPet,
  liveQuoteKey,
  offeredInHomeModes,
  offeredServiceTypes,
  offeredWalkDurations,
  offeredWalkModes,
  quoteUnavailable,
  validateBookingForm,
} from "@/lib/phase3Booking";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-caption text-danger">{message}</p>;
}

function PetChecklist({ pets, selectedIds, onToggle, dogsOnly }) {
  if (!pets.length) {
    return (
      <p className="text-caption text-ink-400">
        {dogsOnly
          ? "Add a dog to your pets to book a walk."
          : "Add a pet to continue."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {pets.map((pet) => {
        const id = String(pet.id);
        const disabled = dogsOnly && !isDogPet(pet);
        const checked = selectedIds.includes(id);
        return (
          <li key={id}>
            <label
              className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3 ${
                disabled
                  ? "border-line text-ink-400"
                  : checked
                    ? "border-primary bg-primary-50"
                    : "border-line bg-surface"
              }`}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(id)}
              />
              <span className="text-body-2 font-semibold">{pet.name}</span>
              <span className="ml-auto text-caption text-ink-400">
                {pet.petType || pet.pet_type || ""}
                {disabled ? " · dogs only" : ""}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function ServiceBookingForm({
  sitterId,
  firstName,
  pets = [],
  draft,
  onChange,
  quote,
  quoteError,
  quoting,
  bookingChecking,
  isOwnSitter,
  onBook,
  serviceOfferings,
}) {
  const offerings = serviceOfferings ?? draft.serviceOfferings ?? [];
  const knownOfferings = Array.isArray(offerings) && offerings.length > 0;
  const offeredTypes = offeredServiceTypes(offerings);
  const visibleServices = knownOfferings && offeredTypes.length
    ? SERVICES.filter((service) => offeredTypes.includes(service.id))
    : SERVICES;
  const walkModes = offeredWalkModes(offerings);
  const walkDurations = knownOfferings ? offeredWalkDurations(offerings) : WALK_DURATIONS;
  const showPerWalk = knownOfferings && walkModes.includes("per_walk");
  const showWalkDurations = !knownOfferings || walkModes.includes("duration");
  const inHomeModes = knownOfferings ? offeredInHomeModes(offerings) : ["visit", "overnight"];
  const serviceType = draft.serviceType || visibleServices[0]?.id || "boarding";
  const dogsOnly = serviceType === "dog_walking";
  const visiblePets = dogsOnly ? pets.filter(isDogPet).concat(pets.filter((pet) => !isDogPet(pet))) : pets;
  const { errors } = validateBookingForm({
    ...draft,
    pets,
    requireAddress: serviceType === "in_home",
  });
  const missingAddress = inHomeAddressMissing(draft);
  const cannotQuote = knownOfferings && !canQuoteOffering(offerings, draft);

  function patch(next) {
    onChange({ ...draft, ...next });
  }

  function togglePet(id) {
    const current = Array.isArray(draft.petIds) ? draft.petIds.map(String) : [];
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];
    patch({ petIds: next });
  }

  const unavailable = quoteUnavailable(quote);
  const line = formatQuoteLine(quote);
  const total = formatQuoteTotal(quote);

  return (
    <Card className="rounded-card bg-surface p-5 shadow-card">
      <h2 className="text-h3">Book {firstName}</h2>
      <div className="mt-4 flex gap-2">
        {visibleServices.map((service) => {
          const active = service.id === serviceType;
          return (
            <button
              key={service.id}
              type="button"
              data-service={service.id}
              onClick={() => onChange(draftForServiceType(draft, service.id, offerings))}
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

      {serviceType === "boarding" ? (
        <div className="mt-4 grid gap-3">
          <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
            <CalendarDays className="size-4 shrink-0 text-ink-400" aria-hidden />
            <span className="sr-only">Check-in</span>
            <input
              type="date"
              value={draft.checkIn || ""}
              onChange={(event) => patch({ checkIn: event.target.value })}
              aria-label="Check-in"
              className="w-full bg-transparent text-body-2 font-semibold outline-none"
            />
          </label>
          <FieldError message={errors.checkIn} />
          <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
            <CalendarDays className="size-4 shrink-0 text-ink-400" aria-hidden />
            <span className="sr-only">Check-out</span>
            <input
              type="date"
              value={draft.checkOut || ""}
              onChange={(event) => patch({ checkOut: event.target.value })}
              aria-label="Check-out"
              className="w-full bg-transparent text-body-2 font-semibold outline-none"
            />
          </label>
          <FieldError message={errors.checkOut} />
          <p className="text-caption text-ink-400">Check-in/out default to 12:00. Price is per night.</p>
        </div>
      ) : null}

      {serviceType === "dog_walking" ? (
        <div className="mt-4 grid gap-3">
          <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
            <CalendarDays className="size-4 shrink-0 text-ink-400" aria-hidden />
            <input
              type="date"
              value={draft.date || ""}
              onChange={(event) => patch({ date: event.target.value })}
              aria-label="Walk date"
              className="w-full bg-transparent text-body-2 font-semibold outline-none"
            />
          </label>
          <FieldError message={errors.date} />
          <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
            <Clock className="size-4 shrink-0 text-ink-400" aria-hidden />
            <select
              value={draft.startTime || ""}
              onChange={(event) => patch({ startTime: event.target.value })}
              aria-label="Start time"
              className="w-full bg-transparent text-body-2 font-semibold outline-none"
            >
              <option value="">Start time</option>
              {HOURLY_TIMES.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </label>
          <FieldError message={errors.startTime} />
          <div className="flex flex-wrap gap-2">
            {showPerWalk ? (
              <button
                type="button"
                onClick={() => patch({ mode: "per_walk", durationMinutes: "" })}
                className={`flex-1 rounded-full px-3 py-2 text-caption font-bold ${
                  draft.mode === "per_walk" ? "bg-primary text-white" : "border border-line text-ink-600"
                }`}
              >
                Per walk
              </button>
            ) : null}
            {showWalkDurations
              ? (walkDurations.length ? walkDurations : WALK_DURATIONS).map((minutes) => {
                  const active =
                    draft.mode !== "per_walk" && Number(draft.durationMinutes) === minutes;
                  return (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => patch({ durationMinutes: minutes, mode: "duration" })}
                      className={`flex-1 rounded-full px-3 py-2 text-caption font-bold ${
                        active ? "bg-primary text-white" : "border border-line text-ink-600"
                      }`}
                    >
                      {minutes} min
                    </button>
                  );
                })
              : null}
          </div>
          {showPerWalk && !showWalkDurations ? (
            <p className="text-caption text-ink-400">This sitter prices walks per walk.</p>
          ) : null}
          <FieldError message={errors.durationMinutes} />
          <div className="flex items-start gap-2 rounded-[1.1rem] bg-accent-50 px-4 py-3 text-accent-700">
            <span aria-hidden>📍</span>
            <div>
              <p className="text-caption font-extrabold">Live GPS tracking</p>
              <p className="text-caption font-semibold text-accent-700/80">
                Follow the walk on a map in real time, plus a summary when it ends.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {serviceType === "in_home" ? (
        <div className="mt-4 grid gap-3">
          <div className="flex gap-2">
            {(inHomeModes.length ? inHomeModes : ["visit", "overnight"]).map((mode) => {
              const active = draft.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    onChange(draftForServiceType({ ...draft, mode }, "in_home", offerings))
                  }
                  className={`flex-1 rounded-full px-3 py-2 text-caption font-bold ${
                    active ? "bg-primary text-white" : "border border-line text-ink-600"
                  }`}
                >
                  {mode === "visit" ? "Daytime visit" : "Overnight"}
                </button>
              );
            })}
          </div>
          <FieldError message={errors.mode} />
          {draft.mode === "overnight" ? (
            <>
              <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
                <CalendarDays className="size-4 shrink-0 text-ink-400" aria-hidden />
                <input
                  type="date"
                  value={draft.checkIn || ""}
                  onChange={(event) => patch({ checkIn: event.target.value })}
                  aria-label="Overnight check-in"
                  className="w-full bg-transparent text-body-2 font-semibold outline-none"
                />
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
                <CalendarDays className="size-4 shrink-0 text-ink-400" aria-hidden />
                <input
                  type="date"
                  value={draft.checkOut || ""}
                  onChange={(event) => patch({ checkOut: event.target.value })}
                  aria-label="Overnight check-out"
                  className="w-full bg-transparent text-body-2 font-semibold outline-none"
                />
              </label>
              <FieldError message={errors.checkOut} />
            </>
          ) : (
            <>
              <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
                <CalendarDays className="size-4 shrink-0 text-ink-400" aria-hidden />
                <input
                  type="date"
                  value={draft.date || ""}
                  onChange={(event) => patch({ date: event.target.value })}
                  aria-label="Visit date"
                  className="w-full bg-transparent text-body-2 font-semibold outline-none"
                />
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
                <Clock className="size-4 shrink-0 text-ink-400" aria-hidden />
                <select
                  value={draft.startTime || ""}
                  onChange={(event) => patch({ startTime: event.target.value })}
                  aria-label="Visit start time"
                  className="w-full bg-transparent text-body-2 font-semibold outline-none"
                >
                  <option value="">Start time</option>
                  {HOURLY_TIMES.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
                <span className="text-caption font-bold text-ink-400">Hours</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.visitHours || ""}
                  onChange={(event) => patch({ visitHours: Number(event.target.value) })}
                  aria-label="Visit hours"
                  className="w-full bg-transparent text-body-2 font-semibold outline-none"
                />
              </label>
            </>
          )}
          <label className="flex min-h-12 items-center gap-2 rounded-full border border-line px-4">
            <MapPin className="size-4 shrink-0 text-ink-400" aria-hidden />
            <input
              value={draft.ownerAddress || ""}
              onChange={(event) => patch({ ownerAddress: event.target.value })}
              placeholder="Owner address"
              aria-label="Owner address"
              className="w-full bg-transparent text-body-2 font-semibold outline-none placeholder:text-ink-400"
            />
          </label>
          <FieldError message={errors.ownerAddress} />
        </div>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-2 text-caption font-bold text-ink-600">
          <PawPrint className="size-4" aria-hidden />
          Pets
        </p>
        <PetChecklist
          pets={visiblePets}
          selectedIds={(draft.petIds ?? []).map(String)}
          onToggle={togglePet}
          dogsOnly={dogsOnly}
        />
        <FieldError message={errors.petIds} />
      </div>

      <div className="mt-4 flex items-center justify-between text-body-2">
        <span className="text-ink-600">
          {quoting ? "Getting live quote…" : line || "Live quote"}
        </span>
        <span className="text-h4 text-ink-900">{total || "—"}</span>
      </div>
      {quote?.hasCctv ? (
        <div className="mt-2">
          <CctvBadge label="CCTV at this stay" />
        </div>
      ) : null}
      {serviceType === "dog_walking" ? (
        <p className="mt-2 text-caption font-semibold text-accent-700">GPS tracking included</p>
      ) : null}
      {unavailable ? (
        <p className="mt-2 text-caption text-danger" role="alert">
          This slot overlaps another booking. Choose another date or time.
        </p>
      ) : null}
      {quoteError ? (
        <p className="mt-2 text-caption text-danger" role="alert">
          {quoteError}
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onBook}
        disabled={bookingChecking || isOwnSitter || unavailable || missingAddress || cannotQuote}
      >
        {bookingChecking ? "Checking..." : "Book now"}
      </button>
      {missingAddress ? (
        <p className="mt-3 text-caption text-danger" role="status">
          {errors.ownerAddress || IN_HOME_ADDRESS_REQUIRED_MESSAGE}
        </p>
      ) : null}
      {cannotQuote && !missingAddress ? (
        <p className="mt-3 text-caption text-danger" role="status">
          This sitter does not offer the selected service.
        </p>
      ) : null}
      {isOwnSitter ? (
        <p className="mt-3 text-caption text-ink-400">
          You cannot book your own sitter profile
        </p>
      ) : null}
      <p className="mt-2 text-caption text-ink-400">
        Price is calculated by the server. The amount you see is display-only.
      </p>
    </Card>
  );
}

export function useLiveQuote(sitterId, draft, enabled) {
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const sessionRef = useRef(null);
  if (sessionRef.current == null) {
    sessionRef.current = createLiveQuoteSession({
      quoteFn: quotePhase3Booking,
      debounceMs: 350,
    });
  }

  const key = liveQuoteKey(sitterId, draft, enabled);

  useEffect(() => {
    const session = sessionRef.current;
    session.subscribe({
      onQuote: setQuote,
      onError: setQuoteError,
      onQuoting: setQuoting,
    });
    session.applyKey(key);
  }, [key]);

  useEffect(() => {
    const session = sessionRef.current;
    return () => session.dispose();
  }, []);

  return { quote, quoteError, quoting };
}
