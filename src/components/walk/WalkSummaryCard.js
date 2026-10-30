"use client";

import {
  formatWalkClock,
  formatWalkDistance,
  formatWalkDuration,
  formatWalkPace,
  formatWalkStatDistance,
  formatWalkSummary,
} from "@/lib/walkTracking";
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
      <div className="rounded-[1.25rem] border border-line bg-surface p-4">
        <p className="text-caption font-bold text-ink-400">{title}</p>
        <p className="mt-1 text-body-2 font-semibold text-ink-900">{line}</p>
        <p className="mt-1 text-caption text-ink-400">
          {formatWalkStatDistance(distance)} · {formatWalkDuration(duration)}
          {formatWalkPace(distance, duration) !== "—" ? ` · ${formatWalkPace(distance, duration)}` : ""}
        </p>
      </div>
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
      <p className="text-body-2 text-ink-600">{line}</p>
      <p className="text-caption text-ink-400">
        {formatWalkClock(startedAt)} – {formatWalkClock(endedAt)}
        {points.length ? ` · ${formatWalkDistance(distance)}` : ""}
      </p>
    </div>
  );
}
