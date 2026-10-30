"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { getPetTypes } from "@/lib/api";
import {
  FALLBACK_PET_TYPES,
  countsFromSearchParams,
  serializePetSearchQuery,
} from "@/lib/petSearch";
import PetsPicker from "./PetsPicker";

const PRESERVED_SEARCH_KEYS = ["rating", "experience", "service"];

export default function SearchBar({
  defaultLocation = "Ari, Bangkok",
  defaultDate = "2026-11-14",
  defaultPets = "",
  defaultPetCounts = "",
  actionLabel = "Search",
}) {
  const router = useRouter();
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

  return (
    <form
      onSubmit={handleSearch}
      className="relative z-20 flex w-full flex-col gap-2 rounded-full bg-surface p-2 shadow-card lg:flex-row lg:items-center"
    >
      <label className="flex min-h-12 flex-1 items-center gap-2 rounded-full px-4">
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="sr-only">Location</span>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Ari, Bangkok"
          className="w-full bg-transparent text-body-2 text-ink-900 outline-none placeholder:text-ink-400"
        />
      </label>
      <span className="hidden h-8 w-px bg-line lg:block" aria-hidden />
      <label className="flex min-h-12 flex-1 items-center gap-2 rounded-full px-4">
        <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="sr-only">Date</span>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="w-full bg-transparent text-body-2 text-ink-900 outline-none"
        />
      </label>
      <span className="hidden h-8 w-px bg-line lg:block" aria-hidden />
      <PetsPicker types={types} counts={counts} onChange={setCounts} />
      <button type="submit" className="btn btn-primary min-w-32">
        {actionLabel}
      </button>
    </form>
  );
}
