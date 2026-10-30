"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import OwnerCctvView from "@/components/cctv/OwnerCctvView";
import { getOwnerBooking } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { isBoardingBooking } from "@/lib/cctv";

export default function OwnerCctvPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login/owner");
      return;
    }
    let cancelled = false;
    getOwnerBooking(id)
      .then((data) => {
        if (cancelled) return;
        setBooking(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "This stay is not available");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) return <p className="px-5 py-10 text-body-2 text-ink-400">Loading cameras…</p>;
  if (error || !booking) {
    return (
      <div className="px-5 py-10">
        <p className="text-body-2 text-danger">{error || "Booking not found"}</p>
        <Link href="/owner/bookings" className="mt-4 inline-flex text-caption font-semibold text-primary">
          Back to bookings
        </Link>
      </div>
    );
  }
  if (!isBoardingBooking(booking)) {
    return (
      <div className="px-5 py-10">
        <p className="text-body-2">Live cameras are for boarding stays.</p>
        <Link href={`/owner/bookings/${encodeURIComponent(String(id))}`} className="mt-4 inline-flex text-caption font-semibold text-primary">
          Back to booking
        </Link>
      </div>
    );
  }

  return (
    <OwnerCctvView
      booking={booking}
      bookingId={String(id)}
      backHref={`/owner/bookings/${encodeURIComponent(String(id))}`}
    />
  );
}
