"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import WalkSummaryCard from "@/components/walk/WalkSummaryCard";
import WalkTrailMap from "@/components/walk/WalkTrailMap";
import { useWalkEvents } from "@/lib/useWalkEvents";
import {
  formatWalkDistance,
  formatWalkDuration,
} from "@/lib/walkTracking";

function LiveDuration({ startedAt, fallbackS }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!startedAt) return formatWalkDuration(fallbackS);
  return formatWalkDuration(Math.max(0, Math.round((now - Date.parse(startedAt)) / 1000)));
}

export default function OwnerWalkView({ bookingId, title, backHref }) {
  const { view, error, connected } = useWalkEvents(bookingId, Boolean(bookingId));
  const live = view.status === "live";
  const ended = view.status === "ended";
  const waiting = view.status === "waiting";
  const startedAt = view.walk?.startedAt ?? view.walk?.summary?.startedAt;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col bg-background">
      <header className="flex items-center justify-between gap-3 px-5 py-4 md:px-8">
        <Link href={backHref} className="text-caption font-semibold text-ink-600">
          ← Bookings
        </Link>
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            <span className="size-1.5 rounded-full bg-white" aria-hidden />
            Live
          </span>
        ) : (
          <span className="text-caption text-ink-400">
            {connected ? "Connected" : "Reconnecting…"}
          </span>
        )}
      </header>

      <div className="px-5 pb-3 md:px-8">
        <p className="text-caption font-bold text-accent-700">
          {live ? "Walk in progress" : ended ? "Walk summary" : "Waiting for walker"}
        </p>
        <h1 className="mt-1 text-h2">{title}</h1>
        <p className="mt-1 text-caption text-ink-600">
          {live
            ? "Follow the trail on OpenStreetMap. The line updates as your sitter walks."
            : ended
              ? "Full route, distance, and duration after the walk."
              : "The map will appear when your sitter starts the GPS walk."}
        </p>
      </div>

      <div className="min-h-[48vh] flex-1 overflow-hidden md:mx-8 md:rounded-card md:border md:border-line">
        {waiting ? (
          <div className="flex h-full min-h-[48vh] items-center justify-center bg-accent-50 px-6 text-center">
            <div>
              <p className="text-h4">Waiting for the sitter to start</p>
              <p className="mt-2 text-caption text-ink-600">
                Keep this page open. We reconnect automatically if the live stream drops.
              </p>
            </div>
          </div>
        ) : (
          <WalkTrailMap points={view.points} live={live} className="h-full min-h-[48vh] w-full" />
        )}
      </div>

      <div className="space-y-3 px-5 py-4 md:px-8">
        {live ? (
          <Card className="rounded-card bg-accent-50 p-4 shadow-card">
            <p className="text-caption font-bold text-accent-700">Live stats</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <p className="text-caption text-ink-400">Duration</p>
                <p className="text-h3">
                  <LiveDuration startedAt={startedAt} fallbackS={view.durationS} />
                </p>
              </div>
              <div>
                <p className="text-caption text-ink-400">Distance</p>
                <p className="text-h3">
                  {formatWalkDistance(view.distanceM || 0)}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {ended ? (
          <WalkSummaryCard
            walk={view.walk}
            points={view.points}
            distanceM={view.distanceM}
            durationS={view.durationS}
          />
        ) : null}

        {error ? (
          <p className="text-caption text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
