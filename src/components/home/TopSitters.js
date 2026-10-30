"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSitters } from "@/lib/api";
import CctvBadge from "@/components/CctvBadge";
import { Card } from "@/components/ui/card";
import { FALLBACK_SITTERS, formatSitterCard } from "@/lib/sitterCard";

export default function TopSitters() {
  const [sitters, setSitters] = useState(FALLBACK_SITTERS);

  useEffect(() => {
    let cancelled = false;
    getSitters({ limit: 4 })
      .then((result) => {
        if (cancelled) return;
        const data = result.data ?? [];
        if (data.length) setSitters(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="psp-container pb-10 md:pb-16">
      <h2 className="text-h2">Top sitters near you</h2>
      <div className="mt-4 flex flex-col gap-3 md:mt-6 md:grid md:grid-cols-4 md:gap-5">
          {sitters.slice(0, 4).map((raw, index) => {
            const sitter = formatSitterCard(raw, index);
            return (
              <Card
                as={Link}
                interactive
                key={sitter.id}
                href={`/find-sitter/${sitter.id}`}
                className="flex flex-col rounded-card bg-surface p-3 shadow-card md:p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-14 shrink-0 rounded-xl md:size-16"
                    style={{ backgroundColor: sitter.photoTint }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-extrabold text-ink-900">{sitter.name}</p>
                      {sitter.hasCctv ? (
                        <CctvBadge className="shrink-0 md:hidden" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-caption text-ink-600">
                      ⭐ {sitter.ratingShort}
                      {sitter.distanceLabel ? ` · ${sitter.distanceLabel}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-label text-primary md:hidden">{sitter.priceShort}</p>
                </div>
                <div className="mt-3 hidden items-center justify-between gap-2 md:flex">
                  {sitter.hasCctv ? <CctvBadge /> : <span />}
                  <p className="text-label text-primary">{sitter.priceLabel}</p>
                </div>
              </Card>
            );
          })}
        </div>
    </section>
  );
}
