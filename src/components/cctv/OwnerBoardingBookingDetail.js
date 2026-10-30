"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import OwnerCctvBanner from "@/components/cctv/OwnerCctvBanner";
import { WalkBadge } from "@/components/walk/WalkUi";
import { bookingChatHref, normalizeBookingStatus, serviceTypeLabel } from "@/lib/phase3Booking";
import {
  firstPetName,
  formatWalkClock,
  walkBookingCode,
  walkFirstName,
  walkSitterName,
} from "@/lib/walkTracking";
import { formatBookedDateList } from "@/utils/formatDateTime";

function Timeline({ booking, inService, ended }) {
  const created = booking?.created_at || booking?.createdAt || booking?.transaction_date;
  const items = [
    { key: "booked", label: "Booked & paid", meta: created ? formatWalkClock(created) : "", tone: "done" },
    { key: "confirm", label: "Waiting for confirm", meta: "Sitter confirmed", tone: "done" },
    {
      key: "service",
      label: "Waiting for service",
      meta: formatBookedDateList(booking),
      tone: inService || ended ? "done" : "soon",
    },
    {
      key: "live",
      label: inService ? "In service · CCTV unlocked" : "In service",
      meta: inService ? "Cameras open during this stay" : "",
      tone: inService ? "live" : "soon",
    },
    { key: "done", label: "Success", meta: ended ? "Completed" : formatBookedDateList({ start_date: booking?.end_date, start_time: booking?.end_time }), tone: ended ? "done" : "soon" },
  ];

  return (
    <aside className="rounded-[1.4rem] bg-surface p-5 shadow-card">
      <h2 className="text-h4">Timeline</h2>
      <ol className="mt-4 space-y-4">
        {items.map((item, index) => (
          <li key={item.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={
                  item.tone === "live"
                    ? "size-2.5 rounded-full bg-primary"
                    : item.tone === "done"
                      ? "size-2.5 rounded-full bg-secondary"
                      : "size-2.5 rounded-full bg-line-strong"
                }
              />
              {index < items.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" /> : null}
            </div>
            <div className="-mt-1 pb-2">
              <p className="text-body-2 font-bold text-ink-900">{item.label}</p>
              {item.meta ? <p className="text-caption text-ink-400">{item.meta}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export default function OwnerBoardingBookingDetail({ booking, preview, backHref = "/owner/bookings" }) {
  const status = normalizeBookingStatus(booking?.status);
  const inService = status === "in_service";
  const ended = status === "completed";
  const sitter = walkFirstName(walkSitterName(booking));
  const petName = firstPetName(booking);
  const code = walkBookingCode(booking);
  const messageHref = bookingChatHref(booking) || "/messages";
  const schedule = [formatBookedDateList(booking), petName].filter(Boolean).join(" · ");

  return (
    <div className="bg-background pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-5 py-5 md:px-10">
        <Link href={backHref} className="text-caption font-semibold text-ink-600">
          ← My bookings
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{code ? `Booking #${code}` : "Booking"}</h1>
          {inService ? (
            <WalkBadge tone="orange">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              In service
            </WalkBadge>
          ) : null}
        </div>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <Card className="flex items-center gap-4 rounded-[1.4rem] p-4 shadow-card">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-[1rem] bg-primary-50 text-2xl" aria-hidden>
                🏠
              </div>
              <div className="min-w-0">
                <p className="text-h4">{serviceTypeLabel(booking) || "Boarding"} with {sitter}</p>
                <p className="mt-1 text-caption text-ink-400">{schedule}</p>
              </div>
            </Card>

            {inService ? <OwnerCctvBanner booking={booking} preview={preview} /> : null}

            <Link href={messageHref} className="btn btn-outline">
              <MessageCircle className="size-4" aria-hidden />
              Message {sitter}
            </Link>
          </div>
          <Timeline booking={booking} inService={inService} ended={ended} />
        </div>
      </div>
    </div>
  );
}
