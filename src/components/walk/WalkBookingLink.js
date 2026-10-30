"use client";

import Link from "next/link";
import { normalizeBookingStatus } from "@/lib/phase3Booking";
import {
  isDogWalkingBooking,
  walkOwnerHref,
  walkSitterHref,
} from "@/lib/walkTracking";

export default function WalkBookingLink({
  booking,
  role = "owner",
  className = "btn btn-primary",
  onClick,
}) {
  if (!isDogWalkingBooking(booking) || !booking?.id) return null;
  const status = normalizeBookingStatus(booking.status);
  const href = role === "sitter" ? walkSitterHref(booking.id) : walkOwnerHref(booking.id);

  if (status === "in_service") {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {role === "sitter" ? "Start walk" : "Track walk live"}
      </Link>
    );
  }

  if (status === "completed") {
    return (
      <Link href={href} className={className} onClick={onClick}>
        Walk summary
      </Link>
    );
  }

  return null;
}
