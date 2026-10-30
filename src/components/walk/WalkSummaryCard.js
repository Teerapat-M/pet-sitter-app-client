"use client";

import { Card } from "@/components/ui/card";
import {
  formatWalkClock,
  formatWalkDistance,
  formatWalkDuration,
  formatWalkSummary,
} from "@/lib/walkTracking";

export default function WalkSummaryCard({
  walk,
  points = [],
  distanceM,
  durationS,
  title = "Walk summary",
}) {
  const summary = walk?.summary && typeof walk.summary === "object" ? walk.summary : {};
  const distance = distanceM ?? summary.distanceM ?? walk?.distanceM ?? 0;
  const duration = durationS ?? summary.durationS ?? walk?.durationS ?? 0;
  const startedAt = summary.startedAt ?? walk?.startedAt;
  const endedAt = summary.endedAt ?? walk?.endedAt;
  const start = summary.start ?? points[0];
  const end = summary.end ?? points[points.length - 1];
  const line =
    typeof walk?.summary === "string"
      ? walk.summary
      : formatWalkSummary({ distanceM: distance, durationS: duration });

  return (
    <Card className="rounded-card bg-accent-50 p-5 shadow-card">
      <p className="text-caption font-bold text-accent-700">{title}</p>
      <p className="mt-2 text-h3 text-ink-900">{line}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-body-2">
        <div>
          <dt className="text-caption text-ink-400">Distance</dt>
          <dd className="font-bold text-ink-900">{formatWalkDistance(distance)}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-400">Duration</dt>
          <dd className="font-bold text-ink-900">{formatWalkDuration(duration)}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-400">Started</dt>
          <dd className="font-bold text-ink-900">{formatWalkClock(startedAt)}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-400">Ended</dt>
          <dd className="font-bold text-ink-900">{formatWalkClock(endedAt)}</dd>
        </div>
      </dl>
      {start && end ? (
        <p className="mt-3 text-caption text-ink-600">
          {start.lat?.toFixed?.(4)}, {start.lng?.toFixed?.(4)} → {end.lat?.toFixed?.(4)},{" "}
          {end.lng?.toFixed?.(4)}
        </p>
      ) : null}
    </Card>
  );
}
