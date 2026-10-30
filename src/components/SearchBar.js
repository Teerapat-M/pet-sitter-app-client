"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, PawPrint } from "lucide-react";

export default function SearchBar({
  defaultLocation = "",
  defaultDate = "",
  defaultPets = "1 dog",
  actionLabel = "Search",
  compact = false,
}) {
  const router = useRouter();
  const [location, setLocation] = useState(defaultLocation);
  const [date, setDate] = useState(defaultDate);
  const [pets, setPets] = useState(defaultPets);

  function handleSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set("q", location.trim());
    if (date) params.set("date", date);
    if (pets.trim()) params.set("pets", pets.trim());
    const query = params.toString();
    router.push(query ? `/find-sitter?${query}` : "/find-sitter");
  }

  return (
    <form
      onSubmit={handleSearch}
      className={`flex w-full flex-col gap-2 bg-surface p-2 shadow-card ${
        compact
          ? "rounded-card"
          : "rounded-full lg:flex-row lg:items-center"
      }`}
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
      <label className="flex min-h-12 flex-1 items-center gap-2 rounded-full px-4">
        <PawPrint className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="sr-only">Pets</span>
        <input
          value={pets}
          onChange={(event) => setPets(event.target.value)}
          placeholder="1 dog"
          className="w-full bg-transparent text-body-2 text-ink-900 outline-none placeholder:text-ink-400"
        />
      </label>
      <button type="submit" className="btn btn-primary min-w-32">
        {actionLabel}
      </button>
    </form>
  );
}
