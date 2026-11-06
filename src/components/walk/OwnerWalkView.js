"use client";

import Link from "next/link";
import { useWalkEvents } from "@/lib/useWalkEvents";
import {
  addMinutesToClock,
  firstPetName,
  formatWalkClock,
  formatWalkDateHeading,
  formatWalkDuration,
  walkBookingCode,
  walkDurationMinutes,
  walkFirstName,
  walkPickupAddress,
  walkSitterId,
  walkSitterName,
} from "@/lib/walkTracking";
import { bookingChatHref } from "@/lib/phase3Booking";
import { ownerCctvHref } from "@/lib/cctv";
import WalkTrailMap from "@/components/walk/WalkTrailMap";
import {
  WalkBadge,
  WalkContactRow,
  WalkElapsedValue,
  WalkLiveMeta,
  WalkStatChips,
  liveElapsedSeconds,
  useNow,
} from "@/components/walk/WalkUi";

function PlannedProgress({ startedAt, durationMinutes, fallbackS }) {
  const now = useNow(1000);
  if (!durationMinutes) return null;
  const elapsed = liveElapsedSeconds(startedAt, fallbackS, now);
  const plannedS = durationMinutes * 60;
  const ratio = Math.min(1, plannedS ? elapsed / plannedS : 0);
  const startClock = startedAt ? formatWalkClock(startedAt) : "";
  const endClock = startedAt
    ? formatWalkClock(new Date(Date.parse(startedAt) + plannedS * 1000).toISOString())
    : addMinutesToClock(startClock, durationMinutes);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Planned</p>
      <p className="mt-1 text-body-2 font-semibold text-gray-900">
        {durationMinutes} min{endClock ? ` · ends ~${endClock}` : ""}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-orange-500"
          style={{ width: `${Math.max(6, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function OwnerWalkView({
  booking,
  bookingId,
  backHref = "/owner/bookings",
  preview,
}) {
  const liveQuery = useWalkEvents(preview ? "" : bookingId, Boolean(bookingId) && !preview);
  const view = preview?.view ?? liveQuery.view;
  const error = preview ? "" : liveQuery.error;
  const live = view.status === "live";
  const ended = view.status === "ended";
  const waiting = view.status === "waiting";
  const startedAt = view.walk?.startedAt ?? view.walk?.summary?.startedAt;
  const petName = firstPetName(booking);
  const sitterName = walkFirstName(walkSitterName(booking));
  const code = walkBookingCode(booking);
  const durationMinutes = walkDurationMinutes(booking);
  const address = walkPickupAddress(booking);
  const messageHref = bookingChatHref(booking) || "/messages";
  const sitterId = walkSitterId(booking);
  const now = useNow(1000);
  const elapsedS = liveElapsedSeconds(startedAt, view.durationS, now);
  const distanceM = view.distanceM || 0;
  const durationS = ended ? view.durationS || elapsedS : elapsedS;

  const stats = (
    <WalkStatChips
      elapsedLabel={ended ? "DURATION" : "ELAPSED"}
      elapsedValue={
        ended ? formatWalkDuration(durationS) : <WalkElapsedValue startedAt={startedAt} fallbackS={view.durationS} />
      }
      distanceM={distanceM}
      durationS={durationS}
      paceLabel={ended ? "AVG PACE" : "PACE"}
    />
  );

  const map = waiting ? (
    <div className="flex h-full min-h-[42vh] items-center justify-center bg-orange-100 px-6 text-center">
      <div>
        <p className="text-h4 font-bold text-gray-900">Waiting for the sitter to start</p>
        <p className="mt-2 text-body-3 text-gray-500">
          Keep this page open. We reconnect automatically if the live stream drops.
        </p>
      </div>
    </div>
  ) : (
    <WalkTrailMap points={view.points} live={live} className="h-full min-h-[42vh] w-full" />
  );

  return (
    <div className="bg-gray-100 md:min-h-[calc(100dvh-4.5rem)]">
      <div className="relative isolate flex min-h-[100dvh] flex-col md:mx-auto md:min-h-[calc(100dvh-4.5rem)] md:max-w-6xl md:px-10 md:py-6">
        <div className="absolute inset-0 md:hidden">{map}</div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-transparent md:hidden" />

        <header className="relative z-10 flex items-start justify-between gap-3 px-4 pt-4 md:px-0 md:pt-0">
          <div className="min-w-0">
            <Link
              href={backHref}
              className="flex size-10 items-center justify-center rounded-full bg-white text-gray-900 md:inline md:size-auto md:rounded-none md:bg-transparent md:text-body-3 md:font-semibold md:text-gray-500"
            >
              <span className="md:hidden" aria-hidden>
                ←
              </span>
              <span className="hidden md:inline">
                {code ? `← Booking #${code}` : "← Bookings"}
              </span>
            </Link>
            <div className="mt-4 hidden items-center gap-3 md:flex">
              <h1 className="text-h2">
                {ended ? `Walk summary${startedAt ? ` · ${formatWalkDateHeading(startedAt)}` : ""}` : `${petName}'s walk · live`}
              </h1>
              {live ? (
                <WalkBadge>
                  <span className="size-1.5 rounded-full bg-orange-500" aria-hidden />
                  Walking now
                </WalkBadge>
              ) : null}
              {ended ? (
                <WalkBadge>
                  ✓ Completed
                </WalkBadge>
              ) : null}
            </div>
          </div>
          {live ? (
            <WalkBadge className="md:hidden">
              <span className="size-1.5 rounded-full bg-orange-500" aria-hidden />
              Walking now
            </WalkBadge>
          ) : ended ? (
            <WalkBadge className="md:hidden">✓ Completed</WalkBadge>
          ) : null}
        </header>

        <div className="relative z-10 mt-auto flex flex-col md:mt-5 md:grid md:flex-none md:grid-cols-[minmax(0,1.15fr)_22.5rem] md:items-start md:gap-6">
          <div className="hidden overflow-hidden rounded-2xl md:block md:min-h-[34rem] md:h-[min(70vh,40rem)]">
            {map}
          </div>

          <section className="rounded-t-2xl bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:rounded-2xl md:p-5">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 md:hidden" />

            {live || waiting ? (
              <>
                <div className="flex items-center gap-3">
                    <div className="size-12 shrink-0 rounded-full bg-orange-100" aria-hidden />
                  <div className="min-w-0">
                    <h2 className="text-h4">{sitterName} is walking {petName}</h2>
                    <WalkLiveMeta startedAt={startedAt} points={view.points} walk={view.walk} />
                  </div>
                </div>
                <div className="mt-4">{stats}</div>
                {live ? (
                  <div className="mt-4 hidden md:block">
                    <PlannedProgress
                      startedAt={startedAt}
                      durationMinutes={durationMinutes}
                      fallbackS={view.durationS}
                    />
                  </div>
                ) : null}
                {address ? (
                  <div className="mt-4 hidden md:block">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Pickup</p>
                    <p className="mt-1 text-body-2 font-semibold text-gray-900">📍 {address}</p>
                  </div>
                ) : null}
                <div className="mt-4">
                  <WalkContactRow messageHref={messageHref} />
                </div>
                {bookingId ? (
                  <Link
                    href={ownerCctvHref(bookingId)}
                    className="btn btn-secondary mt-3 w-full"
                  >
                    Watch webcam with GPS
                  </Link>
                ) : null}
              </>
            ) : null}

            {ended ? (
              <>
                <h2 className="text-h3 md:hidden">Walk summary</h2>
                <div className="mt-3 md:mt-0">{stats}</div>
                <div className="mt-5 flex gap-2">
                  <Link href={backHref} className="btn btn-primary flex-1">
                    Rate walk
                  </Link>
                  {sitterId ? (
                    <Link href={`/find-sitter/${sitterId}`} className="btn btn-outline flex-1">
                      Book again
                    </Link>
                  ) : (
                    <Link href="/find-sitter" className="btn btn-outline flex-1">
                      Book again
                    </Link>
                  )}
                </div>
              </>
            ) : null}

            {error ? (
              <p className="mt-3 text-body-3 text-red" role="alert">
                {error}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
