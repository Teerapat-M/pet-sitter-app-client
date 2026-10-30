"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import WalkTrailMap from "@/components/walk/WalkTrailMap";
import { WalkBadge, WalkTrailThumb, liveElapsedSeconds, useNow } from "@/components/walk/WalkUi";
import { useWalkEvents } from "@/lib/useWalkEvents";
import { bookingChatHref, normalizeBookingStatus, serviceTypeLabel } from "@/lib/phase3Booking";
import {
  OWNER_WALK_LIVE_LABEL,
  OWNER_WALK_WAITING_LABEL,
  firstPetName,
  formatWalkClock,
  formatWalkDuration,
  formatWalkStatDistance,
  ownerWalkProgressCopy,
  ownerWalkProgressState,
  walkBookingCode,
  walkDurationMinutes,
  walkFirstName,
  walkOwnerHref,
  walkSitterName,
  walkStartTimeLabel,
} from "@/lib/walkTracking";
import { formatBookedDateList } from "@/utils/formatDateTime";

function Timeline({ booking, live, ended, waiting }) {
  const created = booking?.created_at || booking?.createdAt || booking?.transaction_date;
  const items = [
    {
      key: "booked",
      label: "Booked & paid",
      meta: created ? formatWalkClock(created) : "",
      tone: "done",
    },
    waiting
      ? {
          key: "walk",
          label: OWNER_WALK_WAITING_LABEL,
          meta: booking?.start_time ? `scheduled ${walkStartTimeLabel(booking)}` : "sitter has not started yet",
          tone: "soon",
        }
      : live
        ? {
            key: "walk",
            label: "Walk · live now",
            meta: booking?.start_time ? `started ${walkStartTimeLabel(booking)}` : "in progress",
            tone: "live",
          }
        : ended
          ? {
              key: "walk",
              label: "Walk",
              meta: "Completed",
              tone: "done",
            }
          : {
              key: "walk",
              label: "Walk",
              meta: [walkStartTimeLabel(booking), walkDurationMinutes(booking) ? `${walkDurationMinutes(booking)} min` : ""]
                .filter(Boolean)
                .join(" · "),
              tone: "soon",
            },
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

export default function OwnerWalkBookingDetail({ booking, preview, backHref = "/owner/bookings" }) {
  const status = normalizeBookingStatus(booking?.status);
  const liveQuery = useWalkEvents(preview ? "" : booking?.id, Boolean(booking?.id) && !preview);
  const view = preview?.view ?? liveQuery.view;
  const progress = ownerWalkProgressState({
    bookingStatus: status,
    walkStatus: preview?.live ? "live" : view.status,
  });
  const live = progress === "live";
  const waiting = progress === "waiting";
  const ended = progress === "ended";
  const petName = firstPetName(booking);
  const sitter = walkFirstName(walkSitterName(booking));
  const code = walkBookingCode(booking);
  const now = useNow(1000);
  const startedAt = view.walk?.startedAt ?? view.walk?.summary?.startedAt;
  const elapsedS = liveElapsedSeconds(startedAt, view.durationS, now);
  const distanceM = view.distanceM || 0;
  const messageHref = bookingChatHref(booking) || "/messages";
  const walkHref = walkOwnerHref(booking?.id);
  const schedule = [
    formatBookedDateList(booking),
    walkDurationMinutes(booking) ? `${walkDurationMinutes(booking)} min` : "",
    petName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="bg-background pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-5 py-5 md:px-10">
        <Link href={backHref} className="text-caption font-semibold text-ink-600">
          ← My bookings
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{code ? `Booking #${code}` : "Booking"}</h1>
          {live ? (
            <WalkBadge tone="orange">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              Walking now
            </WalkBadge>
          ) : null}
          {ended ? (
            <WalkBadge>✓ Completed</WalkBadge>
          ) : null}
        </div>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <Card className="flex items-center gap-4 rounded-[1.4rem] p-4 shadow-card">
              <div className="size-16 shrink-0 rounded-[1rem] bg-primary-50" aria-hidden />
              <div className="min-w-0">
                <p className="text-h4">Dog walking with {sitter}</p>
                <p className="mt-1 text-caption text-ink-400">{schedule}</p>
              </div>
            </Card>

            {waiting ? (
              <div className="overflow-hidden rounded-[1.4rem] bg-accent-50 p-4">
                <p className="text-caption font-bold text-accent-700">
                  {ownerWalkProgressCopy("waiting")}
                </p>
                <h2 className="mt-1 text-h3">
                  {petName ? `${petName} is with ${sitter}` : `With ${sitter}`}
                </h2>
                <p className="mt-1 text-caption text-ink-600">
                  Live tracking starts when the sitter begins the walk.
                </p>
                <Link href={walkHref} className="btn btn-accent mt-4 min-h-11 px-5">
                  Open walk tracking
                </Link>
              </div>
            ) : null}

            {live ? (
              <div className="overflow-hidden rounded-[1.4rem] bg-accent-50 p-4 md:grid md:grid-cols-[minmax(0,1fr)_13rem] md:items-center md:gap-4">
                <div>
                  <p className="text-caption font-bold text-accent-700">{OWNER_WALK_LIVE_LABEL}</p>
                  <h2 className="mt-1 text-h3">
                    {petName} is out with {sitter}
                  </h2>
                  <p className="mt-1 text-caption text-ink-600">
                    {formatWalkDuration(elapsedS)} · {formatWalkStatDistance(distanceM)}
                    {startedAt ? "" : ""}
                  </p>
                  <Link href={walkHref} className="btn btn-accent mt-4 min-h-11 px-5">
                    📍 Track walk live
                  </Link>
                </div>
                <div className="mt-4 h-28 overflow-hidden rounded-[1rem] md:mt-0 md:h-32">
                  {preview || view.points?.length ? (
                    <WalkTrailThumb points={preview?.points ?? view.points} className="h-full w-full" />
                  ) : (
                    <WalkTrailMap points={view.points} live className="h-full w-full" />
                  )}
                </div>
              </div>
            ) : null}

            {ended ? (
              <div>
                <h2 className="text-h4">Walk summaries</h2>
                <Link
                  href={walkHref}
                  className="mt-3 flex items-center justify-between rounded-[1.25rem] border border-line bg-surface p-4"
                >
                  <div>
                    <p className="text-body-2 font-bold">
                      {serviceTypeLabel(booking) || "Walk"} · {petName}
                    </p>
                    <p className="text-caption text-ink-400">
                      {formatWalkStatDistance(view.distanceM || view.walk?.distanceM || 0)} ·{" "}
                      {formatWalkDuration(view.durationS || view.walk?.durationS || 0)}
                    </p>
                  </div>
                  <span className="text-caption font-bold text-primary">View →</span>
                </Link>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={messageHref} className="btn btn-outline">
                <MessageCircle className="size-4" aria-hidden />
                Message {sitter}
              </Link>
            </div>
          </div>

          <Timeline booking={booking} live={live} ended={ended} waiting={waiting} />
        </div>
      </div>
    </div>
  );
}
