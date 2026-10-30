"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronUp, MapPin, Search } from "lucide-react";
import { getPetTypes } from "@/lib/api";
import {
  FALLBACK_PET_TYPES,
  countsFromSearchParams,
  formatSearchCompactSummary,
  serializePetSearchQuery,
} from "@/lib/petSearch";
import { Card } from "@/components/ui/card";
import PetsPicker from "./PetsPicker";

const PRESERVED_SEARCH_KEYS = ["rating", "experience", "service"];

export default function SearchBar({
  defaultLocation = "",
  defaultDate = "",
  defaultPets = "",
  defaultPetCounts = "",
  actionLabel = "Search",
  compactUntilOpen = false,
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(!compactUntilOpen);
  const [location, setLocation] = useState(defaultLocation);
  const [date, setDate] = useState(defaultDate);
  const [types, setTypes] = useState(FALLBACK_PET_TYPES);
  const [counts, setCounts] = useState(() =>
    countsFromSearchParams({
      petCounts: defaultPetCounts,
      pets: defaultPets,
    }),
  );

  useEffect(() => {
    let cancelled = false;
    getPetTypes()
      .then((list) => {
        if (!cancelled && list.length) setTypes(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    const params = serializePetSearchQuery({
      q: location,
      date,
      counts,
      types,
    });

    if (typeof window !== "undefined" && window.location.pathname.startsWith("/find-sitter")) {
      const current = new URLSearchParams(window.location.search);
      for (const key of PRESERVED_SEARCH_KEYS) {
        const value = current.get(key);
        if (value) params.set(key, value);
      }
    }

    const query = params.toString();
    router.push(query ? `/find-sitter?${query}` : "/find-sitter");
  }

  const compactSummary = formatSearchCompactSummary({
    location,
    date,
    counts,
    types,
  });

  if (compactUntilOpen && !expanded) {
    return (
      <Card
        as="button"
        type="button"
        interactive
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        aria-label="Open search"
        className="flex w-full items-center gap-3 rounded-card bg-surface px-4 py-3 shadow-card"
      >
        <Search className="size-5 shrink-0 text-ink-400" aria-hidden />
        <span className="min-w-0 text-left">
          <span className="block text-caption text-ink-400">Search</span>
          <span
            className={`block truncate font-extrabold ${
              compactSummary ? "text-ink-900" : "text-ink-400"
            }`}
          >
            {compactSummary || "Ari, Bangkok · Any dates"}
          </span>
        </span>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      className="relative z-20 flex w-full min-w-0 flex-col gap-2 rounded-[1.75rem] bg-surface p-2 shadow-card lg:flex-row lg:flex-nowrap lg:items-center"
    >
      {compactUntilOpen ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex h-10 w-full items-center justify-center gap-1 text-caption font-bold text-ink-600 lg:hidden"
          aria-label="Close search form"
        >
          <ChevronUp className="size-4" aria-hidden />
          Close
        </button>
      ) : null}
      <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-full px-4 lg:min-w-[12rem] lg:flex-[1.6]">
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="sr-only">Location</span>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Ari, Bangkok"
          className="w-full min-w-0 bg-transparent text-body-2 text-ink-900 outline-none placeholder:text-ink-400"
        />
      </label>
      <span className="hidden h-8 w-px shrink-0 bg-line lg:block" aria-hidden />
      <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-full px-4 lg:w-[11.5rem] lg:shrink-0">
        <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="sr-only">Date</span>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="w-full min-w-0 bg-transparent text-body-2 text-ink-900 outline-none"
        />
      </label>
      <span className="hidden h-8 w-px shrink-0 bg-line lg:block" aria-hidden />
      <PetsPicker types={types} counts={counts} onChange={setCounts} />
      <button type="submit" className="btn btn-primary min-w-32 shrink-0">
        {actionLabel}
      </button>
    </form>
  );
}
