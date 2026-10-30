"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Icon from "./Icon";
import Pagination from "./Pagination";
import PetSitterCard from "./PetSitterCard";
import SitterCardOverlay from "./find-sitter/SitterCardOverlay";
import SearchBar from "./SearchBar";
import { getSitters } from "@/lib/api";
import { getSitterCoords } from "@/lib/sitterLocation";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/utils";
import {
    FALLBACK_PET_TYPES,
    countsFromSearchParams,
    formatPetsSummary,
    parsePetCounts,
} from "@/lib/petSearch";

const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full animate-pulse items-center justify-center bg-primary-50 text-ink-400 font-medium">
            Loading map...
        </div>
    ),
});

const PET_OPTIONS = [
    { id: "dog", label: "Dog" },
    { id: "cat", label: "Cat" },
    { id: "bird", label: "Bird" },
    { id: "rabbit", label: "Rabbit" },
];

const RATING_OPTIONS = [5, 4, 3, 2, 1];
const PAGE_SIZE = 6;
const MAP_LIMIT = 1000;

function parsePetTypes(value) {
    return String(value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => PET_OPTIONS.some((pet) => pet.id === item));
}

function countsForSelectedPets(petTypes, petCountsValue) {
    const existing = parsePetCounts(petCountsValue);
    const counts = {};
    petTypes.forEach((id) => {
        counts[id] = Math.max(1, Number(existing[id]) || 1);
    });
    return counts;
}

function parseRatings(value) {
    return [...new Set(
        String(value ?? "")
            .split(",")
            .map((item) => Number.parseInt(item.trim(), 10))
            .filter((item) => item >= 1 && item <= 5),
    )].sort((a, b) => b - a);
}

function experienceToForm(value) {
    if (!value) return "";
    if (["0-2 Years", "3-5 Years", "5+ Years"].includes(value)) return value;
    if (["0-2", "3-5", "5+"].includes(value)) return `${value} Years`;
    return "";
}

function experienceToQuery(value) {
    if (!value) return "";
    return String(value).replace(/\s*Years$/i, "").trim();
}

function RatingStars({ count }) {
    return (
        <div className="flex items-center gap-0.5 text-success">
            {Array.from({ length: count }).map((_, i) => (
                <Icon key={i} src="/icon/star.svg" className="h-[18px] w-[18px]" />
            ))}
        </div>
    );
}

export default function PetSitterList() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState("");
    const [selectedPets, setSelectedPets] = useState([]);
    const [selectedRatings, setSelectedRatings] = useState([]);
    const [experience, setExperience] = useState("");
    const [service, setService] = useState("");
    const [viewMode, setViewMode] = useState("list");
    const [currentPage, setCurrentPage] = useState(1);
    const [sitters, setSitters] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedSitterId, setSelectedSitterId] = useState(null);
    const [mapCenter, setMapCenter] = useState([13.7563, 100.5018]);
    const [mapZoom, setMapZoom] = useState(13);
    const [filtersOpen, setFiltersOpen] = useState(true);

    const syncFormFromUrl = useCallback(() => {
        const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

        setQuery(searchParams.get("q") ?? "");
        setSelectedPets(parsePetTypes(searchParams.get("petTypes")));
        setSelectedRatings(parseRatings(searchParams.get("rating")));
        setExperience(experienceToForm(searchParams.get("experience") ?? ""));
        setService(searchParams.get("service") ?? "");
        setCurrentPage(Number.isInteger(page) && page > 0 ? page : 1);
    }, [searchParams]);

    const fetchSitters = useCallback(async () => {
        const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
        const isMap = viewMode === "map";

        setLoading(true);
        setError("");

        try {
            const result = await getSitters({
                q: searchParams.get("q") ?? "",
                petTypes: parsePetTypes(searchParams.get("petTypes")),
                rating: parseRatings(searchParams.get("rating")),
                experience: searchParams.get("experience") ?? "",
                page: isMap ? 1 : Number.isInteger(page) && page > 0 ? page : 1,
                limit: isMap ? MAP_LIMIT : PAGE_SIZE,
            });
            const data = result.data || [];
            setSitters(data);
            setTotalPages(isMap ? 0 : result.pagination?.totalPages || 0);
            setTotal(result.pagination?.total ?? data.length);
            if (data.length > 0) {
                setSelectedSitterId(data[0].id);
                setMapCenter(getSitterCoords(data[0]));
            }
        } catch (err) {
            setSitters([]);
            setTotalPages(0);
            setTotal(0);
            setError(err instanceof Error ? err.message : "Failed to load pet sitters");
        } finally {
            setLoading(false);
        }
    }, [searchParams, viewMode]);

    const handleSelectSitter = (sitter) => {
        if (!sitter) return;
        setSelectedSitterId(sitter.id);
        setMapCenter(getSitterCoords(sitter));
        setMapZoom(15);
    };

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            syncFormFromUrl();
            fetchSitters();
        });
        return () => cancelAnimationFrame(frame);
    }, [syncFormFromUrl, fetchSitters]);

    const updateUrl = (next) => {
        const params = new URLSearchParams();
        if (next.q) params.set("q", next.q);
        if (next.petTypes.length) params.set("petTypes", next.petTypes.join(","));
        if (next.ratings.length) params.set("rating", next.ratings.join(","));
        if (next.experience) params.set("experience", experienceToQuery(next.experience));
        if (next.service) params.set("service", next.service);
        const date = searchParams.get("date");
        if (date) params.set("date", date);
        const petCounts = countsForSelectedPets(
            next.petTypes,
            searchParams.get("petCounts"),
        );
        const petsSummary = formatPetsSummary(petCounts, FALLBACK_PET_TYPES);
        if (petsSummary) params.set("pets", petsSummary);
        if (next.petTypes.length) {
            params.set(
                "petCounts",
                next.petTypes.map((id) => `${id}:${petCounts[id]}`).join(","),
            );
        }
        if (next.page > 1) params.set("page", String(next.page));

        const queryString = params.toString();
        router.push(queryString ? `/find-sitter?${queryString}` : "/find-sitter");
    };

    const togglePet = (petId) => {
        setSelectedPets((prev) =>
            prev.includes(petId) ? prev.filter((p) => p !== petId) : [...prev, petId],
        );
    };

    const toggleRating = (rating) => {
        setSelectedRatings((prev) =>
            prev.includes(rating)
                ? prev.filter((value) => value !== rating)
                : [...prev, rating],
        );
    };

    const handleClear = () => {
        setQuery("");
        setSelectedPets([]);
        setSelectedRatings([]);
        setExperience("");
        setService("");
    };

    const handleSearch = (e) => {
        e.preventDefault();
        updateUrl({
            q: query.trim(),
            petTypes: selectedPets,
            ratings: selectedRatings,
            experience,
            service,
            page: 1,
        });
    };

    const goToPage = (page) => {
        const nextPage = Math.min(Math.max(1, page), Math.max(1, totalPages));
        const params = new URLSearchParams(searchParams.toString());
        if (nextPage > 1) {
            params.set("page", String(nextPage));
        } else {
            params.delete("page");
        }
        const queryString = params.toString();
        router.push(queryString ? `/find-sitter?${queryString}` : "/find-sitter");
    };

    const locationLabel = searchParams.get("q") || "Ari, Bangkok";
    const dateLabel = searchParams.get("date") || "Any dates";
    const petsLabel =
        searchParams.get("pets") ||
        formatPetsSummary(
            countsFromSearchParams({
                petCounts: searchParams.get("petCounts"),
                pets: searchParams.get("pets"),
            }),
        ) ||
        "Any pets";
    const serviceLabel = SERVICES.find((item) => item.id === service)?.label || "sitters";

    return (
        <div className="min-h-full bg-background pb-24 md:pb-10">
            <div className="psp-container py-6 md:py-10">
                <h1 className="text-h1">Find a sitter</h1>

                <div className="mt-4">
                    <SearchBar
                        defaultLocation={searchParams.get("q") ?? ""}
                        defaultDate={searchParams.get("date") ?? ""}
                        defaultPets={searchParams.get("pets") ?? ""}
                        defaultPetCounts={searchParams.get("petCounts") ?? ""}
                        actionLabel="Update"
                    />
                </div>
                <p className="mt-3 hidden text-caption text-ink-400 md:block">
                    {locationLabel} · {dateLabel} · {petsLabel}
                </p>

                <div className={`mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr] ${
                    viewMode === "map" ? "lg:items-stretch" : "lg:items-start"
                }`}>
                <aside className={viewMode === "list" ? "lg:sticky lg:top-24 lg:self-start" : ""}>
                    <form
                        onSubmit={handleSearch}
                        className="rounded-card bg-surface p-5 shadow-card"
                    >
                        <button
                            type="button"
                            aria-expanded={filtersOpen}
                            aria-label={filtersOpen ? "Hide search filters" : "Show search filters"}
                            onClick={() => setFiltersOpen((open) => !open)}
                            className="mb-3 flex w-full cursor-pointer items-center justify-between text-label text-ink-900 lg:hidden"
                        >
                            <span>Filters</span>
                            <Icon
                                src="/icon/chevron-down.svg"
                                className={`h-5 w-5 text-ink-400 transition-transform ${
                                    filtersOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        <div
                            className={`grid transition-[grid-template-rows] duration-300 ease-in-out lg:grid-rows-[1fr] ${
                                filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                        >
                            <div className="min-h-0 overflow-hidden">
                                <p className="text-label text-ink-900">Service</p>
                                <div className="mt-3 flex flex-col gap-2">
                                    {SERVICES.map((item) => {
                                        const active = service === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setService(active ? "" : item.id)}
                                                className={cn(
                                                    "flex h-12 items-center gap-2 rounded-full border px-4 text-left text-body-2 font-semibold",
                                                    active
                                                        ? "border-primary bg-primary text-white"
                                                        : "border-line-strong bg-surface text-ink-900",
                                                )}
                                            >
                                                <span aria-hidden>{item.icon}</span>
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <p className="mt-6 text-label text-ink-900">Filters</p>
                                <div className="mt-3 rounded-card bg-accent-50 p-3">
                                    <p className="text-label text-accent-700">Watch CCTV live</p>
                                    <p className="mt-1 text-caption text-ink-600">
                                        Sitters with cameras show a CCTV badge. Live view opens during a boarding stay — later phase.
                                    </p>
                                </div>

                                <div className="mt-5">
                                    <span className="text-label text-ink-900">Pet type</span>
                                    <div className="mt-3 flex flex-col gap-2">
                                        {PET_OPTIONS.map((pet) => (
                                            <label key={pet.id} className="flex cursor-pointer items-center gap-2 text-body-2 text-ink-600">
                                                <input
                                                    type="checkbox"
                                                    className="size-4 accent-secondary"
                                                    checked={selectedPets.includes(pet.id)}
                                                    onChange={() => togglePet(pet.id)}
                                                />
                                                {pet.label === "Cat" ? "Accepts cats" : pet.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <span className="text-label text-ink-900">Rating</span>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {RATING_OPTIONS.map((rating) => {
                                            const isSelected = selectedRatings.includes(rating);
                                            return (
                                                <button
                                                    key={rating}
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    onClick={() => toggleRating(rating)}
                                                    className={`group flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 ${
                                                        isSelected
                                                            ? "border-primary text-primary"
                                                            : "border-line-strong text-ink-600"
                                                    }`}
                                                >
                                                    <span className="text-caption">{rating}</span>
                                                    <RatingStars count={rating} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <span className="text-label text-ink-900">Experience</span>
                                    <div className="relative mt-2">
                                        <select
                                            value={experience}
                                            onChange={(e) => setExperience(e.target.value)}
                                            className={`input appearance-none cursor-pointer pr-10 ${
                                                experience ? "text-ink-600" : "text-ink-400"
                                            }`}
                                        >
                                            <option value="">Any experience</option>
                                            <option value="0-2 Years">0-2 Years</option>
                                            <option value="3-5 Years">3-5 Years</option>
                                            <option value="5+ Years">5+ Years</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-400">
                                            <Icon src="/icon/chevron-down.svg" className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-2">
                                    <button type="button" onClick={handleClear} className="btn btn-secondary w-full">
                                        Clear
                                    </button>
                                    <button type="submit" className="btn btn-primary w-full">
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </aside>

                <section
                    className={viewMode === "map" ? "relative min-h-96 lg:min-h-0" : "flex min-w-0 flex-col"}
                >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-h4">
                            {total || sitters.length} {serviceLabel.toLowerCase()} near {locationLabel}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "rounded-full px-3 py-1.5 text-caption",
                                    viewMode === "list" ? "bg-primary-50 text-primary" : "text-ink-400",
                                )}
                            >
                                List
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("map")}
                                className={cn(
                                    "rounded-full px-3 py-1.5 text-caption",
                                    viewMode === "map" ? "bg-primary-50 text-primary" : "text-ink-400",
                                )}
                            >
                                Map
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-72 animate-pulse rounded-card bg-primary-50" />
                            ))}
                        </div>
                    ) : error ? (
                        <p className="rounded-card bg-surface p-6 text-body-2 text-danger">{error}</p>
                    ) : sitters.length === 0 ? (
                        <p className="rounded-card bg-surface p-6 text-body-2 text-ink-400">
                            No sitters match — widen distance or clear filters.
                        </p>
                    ) : viewMode === "map" ? (
                        <div className="relative h-96 w-full overflow-hidden rounded-tile border border-line shadow-card lg:absolute lg:inset-0 lg:h-auto lg:top-14">
                            <Map
                                center={mapCenter}
                                zoom={mapZoom}
                                markers={sitters.map((sitter) => {
                                    const coords = getSitterCoords(sitter);
                                    return {
                                        id: sitter.id,
                                        position: coords,
                                        popup: sitter.trade_name || sitter.title || sitter.name || "Pet Sitter",
                                        sitterData: sitter,
                                    };
                                })}
                                selectedId={selectedSitterId}
                                onMarkerClick={(marker) => {
                                    const targetSitter = sitters.find(s => s.id === marker.id) || marker.sitterData;
                                    if (targetSitter) {
                                        handleSelectSitter(targetSitter);
                                    }
                                }}
                                className="h-full w-full z-0"
                            />
                            <SitterCardOverlay
                                sitters={sitters}
                                selectedId={selectedSitterId}
                                onSelect={(sitter) => {
                                    handleSelectSitter(sitter);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {sitters.map((sitter, index) => (
                                <PetSitterCard
                                    key={sitter.id}
                                    sitter={sitter}
                                    index={index}
                                />
                            ))}
                        </div>
                    )}

                    {viewMode === "list" && totalPages > 1 && (
                        <div className="mt-8">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={goToPage}
                            />
                        </div>
                    )}
                </section>
                </div>
            </div>
        </div>
    );
}
