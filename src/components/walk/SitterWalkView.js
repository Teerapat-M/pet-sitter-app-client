"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import WalkSummaryCard from "@/components/walk/WalkSummaryCard";
import WalkTrailMap from "@/components/walk/WalkTrailMap";
import { getWalk, getWalkPoints } from "@/lib/api";
import { useWalkRecorder } from "@/lib/useWalkRecorder";
import {
  formatWalkDistance,
  formatWalkDuration,
} from "@/lib/walkTracking";

function LiveClock({ startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!startedAt) return formatWalkDuration(0);
  return formatWalkDuration(Math.max(0, Math.round((now - Date.parse(startedAt)) / 1000)));
}

export default function SitterWalkView({ bookingId, title, backHref }) {
  const recorder = useWalkRecorder(bookingId);
  const [history, setHistory] = useState(null);
  const live = recorder.status === "live" || recorder.status === "ending";
  const ended = recorder.status === "ended" || history?.walk?.status === "ended";
  const alreadyLive = history?.walk?.status === "live" && recorder.status === "idle";

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getWalk(bookingId).catch(() => null),
      getWalkPoints(bookingId).catch(() => null),
    ]).then(([walk, trail]) => {
      if (cancelled) return;
      setHistory({
        walk: trail?.walk ?? walk,
        points: trail?.points ?? (walk?.lastPoint ? [walk.lastPoint] : []),
        summary: trail?.summary ?? walk?.summary,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <Link href={backHref} className="text-caption font-semibold text-ink-600">
          ← Back
        </Link>
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            <span className="size-1.5 rounded-full bg-white" aria-hidden />
            Live walk
          </span>
        ) : (
          <span className="text-caption font-bold text-ink-400">Walker</span>
        )}
      </header>

      <div className="px-5 pb-3">
        <p className="text-caption font-bold text-accent-700">
          {live ? "Walk in progress" : ended ? "Walk ended" : "Ready to walk"}
        </p>
        <h1 className="mt-1 text-h3">{title}</h1>
      </div>

      <div className="min-h-[42vh] flex-1 overflow-hidden rounded-t-[1.5rem] border-t border-line">
        <WalkTrailMap
          points={recorder.points.length ? recorder.points : history?.points ?? []}
          live={live}
          className="h-full min-h-[42vh] w-full"
        />
      </div>

      <div className="space-y-3 px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Card className="rounded-card bg-surface p-4 shadow-card">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-caption text-ink-400">Duration</p>
              <p className="text-h3">
                {ended
                  ? formatWalkDuration(
                      recorder.endedWalk?.durationS ??
                        history?.summary?.durationS ??
                        recorder.elapsedS,
                    )
                  : live
                    ? <LiveClock startedAt={recorder.startedAt} />
                    : "0 min"}
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-400">Distance</p>
              <p className="text-h3">
                {formatWalkDistance(
                  recorder.distanceM || history?.summary?.distanceM || 0,
                )}
              </p>
            </div>
          </div>
        </Card>

        {recorder.offline ? (
          <p className="text-caption text-warning" role="status">
            You&apos;re offline. Points are queued and will retry when you&apos;re back online.
          </p>
        ) : null}
        {recorder.error ? (
          <p className="text-caption text-danger" role="alert">
            {recorder.error}
          </p>
        ) : null}

        {(ended && (recorder.endedWalk || history?.walk)) ? (
          <WalkSummaryCard
            walk={recorder.endedWalk ?? history?.walk}
            points={recorder.points.length ? recorder.points : history?.points}
            distanceM={recorder.endedWalk?.distanceM ?? history?.summary?.distanceM}
            durationS={recorder.endedWalk?.durationS ?? history?.summary?.durationS}
          />
        ) : null}

        {ended ? (
          <Link href={backHref} className="btn btn-primary w-full">
            Done
          </Link>
        ) : live ? (
          <button
            type="button"
            className="btn w-full bg-danger text-white disabled:opacity-50"
            onClick={() => void recorder.stop()}
            disabled={recorder.status === "ending"}
          >
            {recorder.status === "ending" ? "Ending walk…" : "End walk"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary w-full disabled:opacity-50"
            onClick={() => void recorder.start()}
            disabled={recorder.status === "starting"}
          >
            {recorder.status === "starting"
              ? "Starting…"
              : alreadyLive
                ? "Continue walk"
                : "Start walk"}
          </button>
        )}
        <p className="text-center text-caption text-ink-400">
          GPS posts every 5–10 seconds. Keep this screen open while you walk.
        </p>
      </div>
    </div>
  );
}
