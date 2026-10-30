"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SitterWalkView from "@/components/walk/SitterWalkView";
import { getSitterBooking } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { isDogWalkingBooking } from "@/lib/walkTracking";

export default function SitterWalkPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user?.isSitter) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    getSitterBooking(id)
      .then((data) => {
        if (cancelled) return;
        setBooking(data);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setBooking(null);
        setError(err instanceof Error ? err.message : "This walk is not available");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const backHref = `/sitter/booking-list/${encodeURIComponent(String(id))}`;

  if (loading) {
    return <p className="px-5 py-10 text-body-2 text-ink-400">Loading walk…</p>;
  }

  if (error || !booking) {
    return (
      <div className="px-5 py-10">
        <p className="text-body-2 text-danger">{error || "Booking not found"}</p>
        <Link href="/sitter/booking-list" className="mt-4 inline-flex text-caption font-semibold text-primary">
          Back to bookings
        </Link>
      </div>
    );
  }

  if (!isDogWalkingBooking(booking)) {
    return (
      <div className="px-5 py-10">
        <p className="text-body-2">GPS tracking is only for dog walking bookings.</p>
        <Link href={backHref} className="mt-4 inline-flex text-caption font-semibold text-primary">
          Back to booking
        </Link>
      </div>
    );
  }

  return <SitterWalkView booking={booking} bookingId={String(id)} backHref={backHref} />;
}
