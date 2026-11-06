"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBookingCameras } from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  countLiveCameras,
  formatAvailableUntil,
  normalizeAccess,
  normalizeCamera,
  ownerCctvHref,
} from "@/lib/cctv";
import { walkFirstName, walkSitterName } from "@/lib/walkTracking";

export default function OwnerCctvBanner({ booking, preview }) {
  const [data, setData] = useState(preview ?? null);
  const bookingId = booking?.id;

  useEffect(() => {
    if (preview || !bookingId) return undefined;
    let cancelled = false;
    getBookingCameras(bookingId)
      .then((payload) => {
        if (!cancelled) {
          setData({
            cameras: (payload.cameras ?? []).map(normalizeCamera).filter(Boolean),
            access: normalizeAccess(payload.access),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData({
            cameras: [],
            access: { canView: err?.status !== 403, validFrom: null, validTo: null, now: null },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, preview]);

  const cameras = (data?.cameras ?? preview?.cameras ?? []).map(normalizeCamera).filter(Boolean);
  const access = data?.access ?? preview?.access;
  const liveCount = countLiveCameras(cameras, access);
  const sitter = walkFirstName(walkSitterName(booking));
  const until = formatAvailableUntil(access, booking);
  const href = ownerCctvHref(bookingId);
  const thumbs = cameras.slice(0, 3);
  const fallbackThumbs = ["Play room", "Garden", "Bedroom"];

  return (
    <Card
      data-tour="cctv"
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-orange-500">
            <span className="size-1.5 rounded-full bg-orange-500" aria-hidden />
            Live
          </span>
          <h2 className="mt-3 text-h4 font-bold text-gray-900">
            {liveCount || cameras.length || 3} cameras online at {sitter}&apos;s place
          </h2>
          <p className="mt-1 text-body-3 text-gray-400">
            {until ? `${until} · only you can watch` : "only you can watch"}
          </p>
          <Link href={href} className="btn btn-primary mt-4 min-h-11 px-5">
            Watch CCTV
          </Link>
        </div>
        <div className="flex gap-2">
          {(thumbs.length ? thumbs : fallbackThumbs).map((item) => {
            const name = typeof item === "string" ? item : item.name;
            return (
              <div
                key={name}
                className="flex h-20 w-16 items-end rounded-2xl bg-gray-100 p-1.5 text-[10px] text-gray-500"
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
