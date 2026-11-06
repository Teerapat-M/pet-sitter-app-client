"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";

function SuccessBody() {
  const params = useSearchParams();
  const bookingId = params.get("bookingId") || "";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16">
      <Card className="rounded-card p-8 text-center">
        <p className="text-4xl" aria-hidden>
          ✅
        </p>
        <h1 className="mt-4 text-h2">Payment received</h1>
        <p className="mt-2 text-body-2 text-ink-600">
          Stripe recorded this test payment. Your sitter still needs to accept
          the booking before the stay is confirmed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {bookingId ? (
            <Link
              href={`/owner/bookings?bookingId=${encodeURIComponent(bookingId)}`}
              className="btn btn-primary"
            >
              View booking
            </Link>
          ) : (
            <Link href="/owner/bookings" className="btn btn-primary">
              My bookings
            </Link>
          )}
          <Link href="/find-sitter" className="btn btn-secondary">
            Find sitters
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function BookingCheckoutSuccessPage() {
  return (
    <Suspense fallback={<p className="p-8 text-body-2 text-ink-400">Loading…</p>}>
      <SuccessBody />
    </Suspense>
  );
}
