"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PawPrint } from "lucide-react";
import { getOwnerPets } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Card } from "@/components/ui/card";

const TINTS = ["bg-primary-50", "bg-accent-50", "bg-yellow-light"];

function formatAge(age) {
  const months = Number(age);
  if (!Number.isFinite(months) || age === "") return "";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return `${years} y`;
}

export default function OwnerPetsPage() {
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPets() {
      if (!getToken()) {
        router.replace("/login/owner");
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const nextPets = await getOwnerPets();
        if (cancelled) return;
        setPets(nextPets);
      } catch (error) {
        if (cancelled) return;
        if (error.message === "NO_TOKEN" || error.message === "Unauthorized") {
          router.replace("/login/owner");
          return;
        }
        setLoadError(error.message || "Failed to load pets");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPets();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <div className="psp-container py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-h1">My pets</h1>
            <p className="mt-1 text-body-2 text-ink-400">
              Profiles sitters see when you book
            </p>
          </div>
          <Link href="/owner/pets/create" className="btn btn-primary shrink-0">
            + Add pet
          </Link>
        </div>

        {loadError ? (
          <p className="mt-4 text-body-2 text-danger">{loadError}</p>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {isLoading ? (
            <p className="text-body-2 text-ink-400">Loading pets...</p>
          ) : pets.length === 0 && !loadError ? (
            <p className="text-body-2 text-ink-400">
              You don&apos;t have any pets yet.
            </p>
          ) : (
            pets.map((pet, index) => (
              <Card
                as="article"
                key={pet.id}
                className={`overflow-hidden rounded-card bg-surface shadow-card ${
                  pet.isSuspended ? "opacity-70" : ""
                }`}
              >
                <div className={`flex h-40 items-center justify-center ${TINTS[index % TINTS.length]}`}>
                  {pet.image ? (
                    <img src={pet.image} alt="" className="size-full object-cover" />
                  ) : pet.type?.toLowerCase() === "dog" ? (
                    <span className="text-5xl" aria-hidden>🐶</span>
                  ) : pet.type?.toLowerCase() === "cat" ? (
                    <span className="text-5xl" aria-hidden>🐱</span>
                  ) : (
                    <PawPrint className="size-12 text-primary" aria-hidden />
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-h3">{pet.name}</h2>
                  <p className="mt-1 text-caption text-ink-600">
                    {pet.type}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                    {formatAge(pet.age) ? ` · ${formatAge(pet.age)}` : ""}
                    {pet.weight
                      ? ` · ${String(pet.weight).toLowerCase().includes("kg") ? pet.weight : `${pet.weight} kg`}`
                      : ""}
                  </p>
                  {pet.about ? (
                    <p className="mt-2 text-caption text-ink-400">{pet.about}</p>
                  ) : null}
                  {pet.isSuspended ? (
                    <span className="mt-2 inline-block text-caption font-bold text-danger">
                      Suspended
                    </span>
                  ) : null}
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Link
                      href={`/owner/pets/${pet.id}`}
                      className="btn btn-secondary h-11 px-3 text-caption"
                    >
                      Edit profile
                    </Link>
                    <Link href="/find-sitter" className="btn btn-primary h-11 px-3 text-caption">
                      Book care
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
