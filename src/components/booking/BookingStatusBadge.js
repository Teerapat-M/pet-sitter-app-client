import { bookingStatusMeta } from "@/lib/phase3Booking";

export default function BookingStatusBadge({ status, className = "" }) {
  const meta = bookingStatusMeta(status);
  return (
    <span className={`inline-flex items-center gap-2 text-body-2 ${meta.text} ${className}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}
