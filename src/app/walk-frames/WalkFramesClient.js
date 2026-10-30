"use client";

import OwnerWalkView from "@/components/walk/OwnerWalkView";
import SitterWalkView from "@/components/walk/SitterWalkView";
import OwnerWalkBookingDetail from "@/components/walk/OwnerWalkBookingDetail";
import { WalkGpsCallout } from "@/components/walk/WalkUi";
import {
  SAMPLE_ENDED_WALK,
  SAMPLE_LIVE_WALK,
  SAMPLE_WALK_BOOKING,
  SAMPLE_WALK_POINTS,
} from "@/lib/walkDemo";

function Frame({ id, title, children, bare }) {
  if (bare) return <div id={id}>{children}</div>;
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-caption font-bold uppercase tracking-wide text-ink-400">{title}</h2>
      <div className="overflow-hidden rounded-[1.5rem] border border-line bg-background shadow-card">
        {children}
      </div>
    </section>
  );
}

function agoIso(secondsAgo) {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

function livePoints() {
  const stamps = [1934, 900, 5, 5];
  return SAMPLE_WALK_POINTS.map((point, index) => ({
    ...point,
    recordedAt: agoIso(stamps[index] ?? 5),
  }));
}

function liveView() {
  const startedAt = agoIso(1934);
  return {
    status: "live",
    walk: { ...SAMPLE_LIVE_WALK, startedAt },
    points: livePoints().slice(0, 3),
    distanceM: 2400,
    durationS: 1934,
  };
}

function endedView() {
  const startedAt = agoIso(3520);
  const endedAt = agoIso(0);
  return {
    status: "ended",
    walk: {
      ...SAMPLE_ENDED_WALK,
      startedAt,
      endedAt,
      summary: { ...SAMPLE_ENDED_WALK.summary, startedAt, endedAt },
    },
    points: livePoints(),
    distanceM: 4100,
    durationS: 3520,
  };
}

export default function WalkFramesClient({ frame = "" }) {
  const only = frame || "";
  const show = (id) => !only || only === id;
  const bare = Boolean(only);

  return (
    <div className={bare ? "bg-background" : "mx-auto max-w-6xl space-y-12 bg-background px-4 py-8 md:px-8"}>
      {!only ? (
        <div>
          <p className="text-caption font-bold text-primary">Phase 4</p>
          <h1 className="text-h2">GPS walk frames</h1>
        </div>
      ) : null}

      {show("10") ? (
        <Frame id="10-gps-tracking" title="10 · gps tracking" bare={bare}>
          <OwnerWalkView
            booking={SAMPLE_WALK_BOOKING}
            bookingId="walk-booking-1"
            backHref="/owner/bookings/walk-booking-1"
            preview={{ view: liveView() }}
          />
        </Frame>
      ) : null}

      {show("11a") ? (
        <Frame id="11a-walker-start" title="11a · walker start" bare={bare}>
          <SitterWalkView
            booking={SAMPLE_WALK_BOOKING}
            bookingId="walk-booking-1"
            backHref="/sitter/booking-list/walk-booking-1"
            preview={{ status: "idle", points: SAMPLE_WALK_POINTS.slice(0, 3) }}
          />
        </Frame>
      ) : null}

      {show("11b") ? (
        <Frame id="11b-walker-end" title="11b · walker end" bare={bare}>
          <SitterWalkView
            booking={SAMPLE_WALK_BOOKING}
            bookingId="walk-booking-1"
            backHref="/sitter/booking-list/walk-booking-1"
            preview={{
              status: "live",
              confirmEnd: true,
              points: livePoints(),
              distanceM: 4100,
              durationS: 3520,
              startedAt: agoIso(3520),
            }}
          />
        </Frame>
      ) : null}

      {show("12") ? (
        <Frame id="12-walk-summary" title="12 · walk summary" bare={bare}>
          <OwnerWalkView
            booking={{ ...SAMPLE_WALK_BOOKING, status: "completed" }}
            bookingId="walk-booking-1"
            backHref="/owner/bookings/walk-booking-1"
            preview={{ view: endedView() }}
          />
        </Frame>
      ) : null}

      {show("05b") ? (
        <Frame id="05b-details-walking" title="05b · details walking" bare={bare}>
          <div className="grid gap-4 bg-background p-5 md:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-4">
              <h2 className="text-h2">Dog walking details</h2>
              <WalkGpsCallout />
              <p className="text-caption text-ink-400">
                Duration, date, and start time use the live quote API (30 / 45 / 60 min). Repeat series and 90 min walks are not in the booking contract.
              </p>
            </div>
            <aside className="rounded-[1.4rem] bg-surface p-5 shadow-card">
              <p className="text-h4">Ploy S.</p>
              <p className="mt-3 text-body-2">60 min</p>
              <p className="text-caption font-semibold text-accent-700">GPS tracking · Included</p>
              <p className="mt-4 text-h3">฿560</p>
            </aside>
          </div>
        </Frame>
      ) : null}

      {show("07b") ? (
        <Frame id="07b-booking-detail-walk" title="07b · booking detail walk" bare={bare}>
          <OwnerWalkBookingDetail
            booking={SAMPLE_WALK_BOOKING}
            preview={{ view: liveView(), live: true, points: livePoints().slice(0, 3) }}
          />
        </Frame>
      ) : null}
    </div>
  );
}
