"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import OwnerBoardingBookingDetail from "@/components/cctv/OwnerBoardingBookingDetail";
import OwnerWalkBookingDetail from "@/components/walk/OwnerWalkBookingDetail";
import { getOwnerBooking } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { isBoardingBooking } from "@/lib/cctv";
import { isDogWalkingBooking } from "@/lib/walkTracking";

export default function OwnerBookingDetailPage() {
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
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Booking not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return <p className="px-5 py-10 text-body-2 text-ink-400">Loading booking…</p>;
  }

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

  if (isBoardingBooking(booking)) {
    return <OwnerBoardingBookingDetail booking={booking} />;
  }

  if (!isDogWalkingBooking(booking)) {
    return (
      <div className="px-5 py-10">
        <p className="text-body-2">Open this booking from My bookings.</p>
        <Link href="/owner/bookings" className="mt-4 inline-flex text-caption font-semibold text-primary">
          Back to bookings
        </Link>
      </div>
    );
  }

  return <OwnerWalkBookingDetail booking={booking} />;
}
