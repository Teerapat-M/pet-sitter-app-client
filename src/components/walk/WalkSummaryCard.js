"use client";

import {
  formatWalkClock,
  formatWalkDistance,
  formatWalkDuration,
  formatWalkPace,
  formatWalkStatDistance,
  formatWalkSummary,
} from "@/lib/walkTracking";
import { Card } from "@/components/ui/card";
import { WalkStatChips } from "@/components/walk/WalkUi";

export default function WalkSummaryCard({
  walk,
  points = [],
  distanceM,
  durationS,
  title = "Walk summary",
  compact = false,
}) {
  const summary = walk?.summary && typeof walk.summary === "object" ? walk.summary : {};
  const distance = distanceM ?? summary.distanceM ?? walk?.distanceM ?? 0;
  const duration = durationS ?? summary.durationS ?? walk?.durationS ?? 0;
  const startedAt = summary.startedAt ?? walk?.startedAt;
  const endedAt = summary.endedAt ?? walk?.endedAt;
  const line =
    typeof walk?.summary === "string"
      ? walk.summary
      : formatWalkSummary({ distanceM: distance, durationS: duration });

  if (compact) {
    return (
      <Card className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-body-3 font-bold text-gray-400">{title}</p>
        <p className="mt-1 text-body-2 font-semibold text-gray-900">{line}</p>
        <p className="mt-1 text-body-3 text-gray-400">
          {formatWalkStatDistance(distance)} · {formatWalkDuration(duration)}
          {formatWalkPace(distance, duration) !== "—" ? ` · ${formatWalkPace(distance, duration)}` : ""}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <WalkStatChips
        elapsedLabel="DURATION"
        elapsedValue={formatWalkDuration(duration)}
        distanceM={distance}
        durationS={duration}
        paceLabel="AVG PACE"
      />
      <p className="text-body-2 text-gray-500">{line}</p>
      <p className="text-body-3 text-gray-400">
        {formatWalkClock(startedAt)} – {formatWalkClock(endedAt)}
        {points.length ? ` · ${formatWalkDistance(distance)}` : ""}
      </p>
    </div>
  );
}
