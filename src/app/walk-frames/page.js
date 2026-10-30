"use client";

import { Card } from "@/components/ui/card";
import WalkSummaryCard from "@/components/walk/WalkSummaryCard";
import WalkTrailMap from "@/components/walk/WalkTrailMap";

const SAMPLE_POINTS = [
  { id: 1, lat: 13.779, lng: 100.544, recordedAt: "2026-10-20T00:02:00.000Z" },
  { id: 2, lat: 13.780, lng: 100.546, recordedAt: "2026-10-20T00:10:00.000Z" },
  { id: 3, lat: 13.7815, lng: 100.548, recordedAt: "2026-10-20T00:22:00.000Z" },
  { id: 4, lat: 13.783, lng: 100.551, recordedAt: "2026-10-20T00:48:00.000Z" },
];

const SAMPLE_WALK = {
  id: "walk-1",
  status: "ended",
  distanceM: 2100,
  durationS: 2760,
  startedAt: "2026-10-20T00:02:00.000Z",
  endedAt: "2026-10-20T00:48:00.000Z",
  summary: {
    distanceM: 2100,
    durationS: 2760,
    startedAt: "2026-10-20T00:02:00.000Z",
    endedAt: "2026-10-20T00:48:00.000Z",
    start: { lat: 13.779, lng: 100.544 },
    end: { lat: 13.783, lng: 100.551 },
  },
};

function Frame({ id, title, children }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-caption font-bold uppercase tracking-wide text-ink-400">{title}</h2>
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {children}
      </div>
    </section>
  );
}

export default function WalkFramesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 bg-background px-5 py-8 md:px-8">
      <h1 className="text-h2">Phase 4 GPS frames</h1>

      <Frame id="10-gps-tracking" title="10 · gps tracking">
        <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[360px]">
            <WalkTrailMap points={SAMPLE_POINTS} live className="h-full w-full" />
          </div>
          <Card className="rounded-none bg-accent-50 p-5 shadow-none">
            <p className="text-caption font-bold text-accent-700">Walk 3 in progress</p>
            <p className="mt-2 text-h3">Bobo is out with Ploy</p>
            <p className="mt-1 text-caption text-ink-600">32 min · 2.4 km · live GPS</p>
            <span className="mt-4 inline-flex h-10 items-center rounded-full bg-secondary px-4 text-caption font-bold text-white">
              Track walk live
            </span>
          </Card>
        </div>
      </Frame>

      <Frame id="11a-walker-start" title="11a · walker start">
        <div className="mx-auto max-w-md bg-background">
          <div className="px-5 py-4">
            <p className="text-caption font-bold text-accent-700">Ready to walk</p>
            <h3 className="mt-1 text-h3">Bobo with Ploy</h3>
          </div>
          <div className="h-[280px] border-t border-line">
            <WalkTrailMap points={[]} live={false} className="h-full w-full" />
          </div>
          <div className="space-y-3 px-5 py-4">
            <Card className="rounded-card p-4">
              <p className="text-caption text-ink-400">Duration · Distance</p>
              <p className="text-h3">0 min · 0 m</p>
            </Card>
            <button type="button" className="btn btn-primary w-full">
              Start walk
            </button>
          </div>
        </div>
      </Frame>

      <Frame id="11b-walker-end" title="11b · walker end">
        <div className="mx-auto max-w-md bg-background">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-caption font-bold text-accent-700">Walk in progress</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[10px] font-bold uppercase text-white">
              Live walk
            </span>
          </div>
          <div className="h-[280px] border-t border-line">
            <WalkTrailMap points={SAMPLE_POINTS.slice(0, 3)} live className="h-full w-full" />
          </div>
          <div className="space-y-3 px-5 py-4">
            <Card className="rounded-card p-4">
              <p className="text-h3">32 min · 1.40 km</p>
            </Card>
            <button type="button" className="btn w-full bg-danger text-white">
              End walk
            </button>
          </div>
        </div>
      </Frame>

      <Frame id="12-walk-summary" title="12 · walk summary">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-[320px] overflow-hidden rounded-card">
            <WalkTrailMap points={SAMPLE_POINTS} live={false} className="h-full w-full" />
          </div>
          <WalkSummaryCard walk={SAMPLE_WALK} points={SAMPLE_POINTS} title="Walk summary" />
        </div>
      </Frame>
    </div>
  );
}
