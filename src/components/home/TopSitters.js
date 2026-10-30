"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSitters } from "@/lib/api";
import CctvBadge from "@/components/CctvBadge";
import { formatSitterCard } from "@/lib/sitterCard";

export default function TopSitters() {
  const [sitters, setSitters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSitters({ limit: 4 })
      .then((result) => {
        if (!cancelled) setSitters(result.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setSitters([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="psp-container pb-10 md:pb-16">
      <h2 className="text-h2">Top sitters near you</h2>
      {loading ? (
        <p className="mt-4 text-body-2 text-ink-400">Loading sitters...</p>
      ) : sitters.length === 0 ? (
        <p className="mt-4 text-body-2 text-ink-400">No sitters to show yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3 md:mt-6 md:grid md:grid-cols-4 md:gap-5">
          {sitters.slice(0, 4).map((raw) => {
            const sitter = formatSitterCard(raw);
            return (
              <Link
                key={sitter.id}
                href={`/find-sitter/${sitter.id}`}
                className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card md:block md:p-4"
              >
                <div
                  className="size-14 shrink-0 rounded-xl md:mb-3 md:aspect-[16/11] md:h-auto md:w-full md:rounded-2xl"
                  style={{ backgroundColor: sitter.photoTint }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-extrabold text-ink-900">{sitter.name}</p>
                    <CctvBadge className="hidden md:inline-flex" />
                  </div>
                  <p className="mt-0.5 text-caption text-ink-600">
                    ⭐ {sitter.ratingLabel}
                    {sitter.distanceLabel ? ` · ${sitter.distanceLabel}` : ""}
                  </p>
                  {sitter.priceLabel ? (
                    <p className="mt-2 text-label text-primary">{sitter.priceLabel}</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
