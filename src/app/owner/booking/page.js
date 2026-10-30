import { parseBookingParams } from "@/lib/booking";
import { parseBookingSearchParams } from "@/lib/phase3Booking";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata = {
  title: "Booking | Pet Sitter Plus",
};

export default async function OwnerBookingPage({ searchParams }) {
  const params = await searchParams;
  const phase3 = parseBookingSearchParams(params);

  if (phase3.valid) {
    return <BookingFlow phase3={phase3.draft} />;
  }

  const booking = parseBookingParams(params);
  if (!booking.valid) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="card p-8 text-center">
          <h1 className="text-h3 text-gray-900">Invalid booking link</h1>
          <p className="mt-3 text-body-2 text-gray-500">
            {phase3.errors
              ? Object.values(phase3.errors)[0]
              : booking.error ??
                "This link is missing required booking details. Please start again from the pet sitter page."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <BookingFlow
      sitterId={booking.sitterId}
      startDate={booking.startDate}
      endDate={booking.endDate}
      startTime={booking.startTime}
      endTime={booking.endTime}
      hours={booking.hours}
      isManyDays={booking.isManyDays}
      nights={booking.nights}
    />
  );
}
