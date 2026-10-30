"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatUpdatedAgo,
  formatWalkElapsed,
  formatWalkPace,
  formatWalkStatDistance,
  lastPointAt,
  pointsToLatLngs,
} from "@/lib/walkTracking";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

export function WalkBadge({ tone = "mint", children, className }) {
  const tones = {
    mint: "bg-accent-50 text-accent-700",
    green: "bg-[#1f7a66] text-white",
    orange: "bg-primary-50 text-primary",
    cream: "bg-primary-50 text-primary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        tones[tone] || tones.mint,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function WalkStatChips({
  elapsedLabel,
  elapsedValue,
  distanceM = 0,
  durationS = 0,
  paceLabel = "PACE",
}) {
  const items = [
    { value: elapsedValue, label: elapsedLabel },
    { value: formatWalkStatDistance(distanceM), label: "DISTANCE" },
    { value: formatWalkPace(distanceM, durationS), label: paceLabel },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[1.1rem] border border-line bg-background px-2 py-3 text-center"
        >
          <p className="text-[1.05rem] font-extrabold tracking-tight text-ink-900 sm:text-h4">
            {item.value}
          </p>
          <p className="mt-0.5 text-[9px] font-bold tracking-[0.14em] text-ink-400">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function WalkGpsCallout({ className }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-[1.1rem] bg-accent-50 px-4 py-3 text-accent-700",
        className,
      )}
    >
      <span aria-hidden className="mt-0.5 text-sm">
        📍
      </span>
      <div>
        <p className="text-caption font-extrabold">Live GPS tracking</p>
        <p className="text-caption font-semibold text-accent-700/80">
          Follow the walk on a map in real time, plus a summary when it ends.
        </p>
      </div>
    </div>
  );
}

export function WalkTrailThumb({ points = [], className }) {
  const latLngs = pointsToLatLngs(points);
  const lats = latLngs.map((pair) => pair[0]);
  const lngs = latLngs.map((pair) => pair[1]);
  const minLat = lats.length ? Math.min(...lats) : 13.779;
  const maxLat = lats.length ? Math.max(...lats) : 13.781;
  const minLng = lngs.length ? Math.min(...lngs) : 100.544;
  const maxLng = lngs.length ? Math.max(...lngs) : 100.547;
  const padLat = Math.max((maxLat - minLat) * 0.35, 0.0012);
  const padLng = Math.max((maxLng - minLng) * 0.35, 0.0012);
  const toX = (lng) => ((lng - (minLng - padLng)) / (maxLng - minLng + padLng * 2)) * 160;
  const toY = (lat) => (1 - (lat - (minLat - padLat)) / (maxLat - minLat + padLat * 2)) * 96;
  const d = latLngs
    .map((pair, index) => `${index === 0 ? "M" : "L"} ${toX(pair[1]).toFixed(1)} ${toY(pair[0]).toFixed(1)}`)
    .join(" ");
  const start = latLngs[0];
  const last = latLngs[latLngs.length - 1];

  return (
    <svg
      viewBox="0 0 160 96"
      className={cn("h-full w-full overflow-hidden rounded-[1rem] bg-[#d9efe6]", className)}
      aria-hidden
    >
      <rect width="160" height="96" fill="#d9efe6" />
      <rect x="0" y="30" width="160" height="4" fill="#f7faf6" />
      <rect x="52" y="0" width="4" height="96" fill="#f7faf6" />
      <rect x="108" y="0" width="4" height="96" fill="#f7faf6" />
      <rect x="64" y="42" width="28" height="18" rx="4" fill="#c6e6d8" />
      {d ? (
        <path d={d} fill="none" stroke="#FF8A3D" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {start ? <circle cx={toX(start[1])} cy={toY(start[0])} r="4.5" fill="#1F7A66" /> : null}
      {last ? (
        <>
          <circle cx={toX(last[1])} cy={toY(last[0])} r="6" fill="#ffffff" />
          <circle cx={toX(last[1])} cy={toY(last[0])} r="4.2" fill="#3CC8A8" />
        </>
      ) : null}
    </svg>
  );
}

export function WalkContactRow({
  messageHref,
  messageLabel = "Message walker",
  callLabel = "Call walker",
}) {
  const messageButton = messageHref ? (
    <Link href={messageHref} className="btn btn-outline min-h-12 flex-1">
      <MessageCircle className="size-4" aria-hidden />
      <span className="md:hidden">Message</span>
      <span className="hidden md:inline">{messageLabel}</span>
    </Link>
  ) : (
    <span className="btn btn-outline min-h-12 flex-1 opacity-60">
      <MessageCircle className="size-4" aria-hidden />
      <span className="md:hidden">Message</span>
      <span className="hidden md:inline">{messageLabel}</span>
    </span>
  );

  return (
    <div className="flex flex-row gap-2 md:flex-col">
      {messageButton}
      <button
        type="button"
        className="btn btn-outline min-h-12 flex-1"
        aria-disabled="true"
        title="Voice calls are not available yet"
        onClick={(event) => event.preventDefault()}
      >
        <Phone className="size-4" aria-hidden />
        {callLabel}
      </button>
    </div>
  );
}

export function WalkLiveMeta({ startedAt, points, walk }) {
  const now = useNow(1000);
  const updated = formatUpdatedAgo(lastPointAt(points, walk), now);
  const started = startedAt
    ? new Date(startedAt).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
      })
    : "";
  if (!started && !updated) return null;
  return (
    <p className="text-caption text-ink-400">
      {started ? `Started ${started}` : "Started"}
      {updated ? ` · ${updated}` : ""}
    </p>
  );
}

export function liveElapsedSeconds(startedAt, fallbackS, nowMs) {
  if (startedAt) {
    const parsed = Date.parse(startedAt);
    if (Number.isFinite(parsed)) return Math.max(0, Math.round((nowMs - parsed) / 1000));
  }
  return Number(fallbackS) || 0;
}

export function WalkElapsedValue({ startedAt, fallbackS }) {
  const now = useNow(1000);
  return formatWalkElapsed(liveElapsedSeconds(startedAt, fallbackS, now));
}
