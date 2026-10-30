"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getWalk, getWalkPoints } from "@/lib/api";
import { useWalkRecorder } from "@/lib/useWalkRecorder";
import {
  firstPetBreed,
  firstPetName,
  formatWalkDuration,
  formatWalkStatDistance,
  formatWalkSummary,
  loadWalkHistory,
  walkAdditionalNote,
  walkDurationMinutes,
  walkFirstName,
  walkOwnerName,
  walkPickupAddress,
  walkStartTimeLabel,
} from "@/lib/walkTracking";
import WalkTrailMap from "@/components/walk/WalkTrailMap";
import {
  WalkBadge,
  WalkElapsedValue,
  WalkStatChips,
  liveElapsedSeconds,
  useNow,
} from "@/components/walk/WalkUi";

function EndWalkDialog({
  open,
  petName,
  ownerName,
  distanceM,
  durationS,
  ending,
  onConfirm,
  onCancel,
  stats,
}) {
  if (!open) return null;
  const summary = `${petName} walked ${formatWalkStatDistance(distanceM)} in ${formatWalkDuration(durationS)}. A summary will be sent to ${ownerName}.`;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink-900/45 p-4 md:items-center md:justify-center">
      {stats ? <div className="mb-3 md:hidden">{stats}</div> : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-walk-title"
        className="w-full max-w-md rounded-[1.5rem] bg-surface px-5 py-6 text-center shadow-float"
      >
        <h2 id="end-walk-title" className="text-h3">
          End this walk?
        </h2>
        <p className="mt-2 text-body-2 text-ink-600">{summary}</p>
        <button
          type="button"
          className="btn btn-danger mt-5 w-full"
          onClick={onConfirm}
          disabled={ending}
        >
          {ending ? "Ending walk…" : "End walk"}
        </button>
        <button type="button" className="btn btn-outline mt-2 w-full" onClick={onCancel} disabled={ending}>
          Keep walking
        </button>
      </div>
    </div>
  );
}

export default function SitterWalkView({ booking, bookingId, backHref, preview }) {
  const recorder = useWalkRecorder(preview ? "" : bookingId);
  const [history, setHistory] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(Boolean(preview?.confirmEnd));
  const didResume = useRef(false);

  const petName = firstPetName(booking);
  const breed = firstPetBreed(booking);
  const ownerName = walkOwnerName(booking);
  const ownerFirst = walkFirstName(ownerName);
  const address = walkPickupAddress(booking);
  const startTime = walkStartTimeLabel(booking);
  const durationMinutes = walkDurationMinutes(booking);
  const note = walkAdditionalNote(booking);

  useEffect(() => {
    if (preview || !bookingId) return undefined;
    let cancelled = false;
    loadWalkHistory(bookingId, { getWalk, getWalkPoints })
      .then((history) => {
        if (cancelled) return;
        setHistory({
          walk: history.walk,
          points: history.points,
          summary: history.summary,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setHistory({ walk: null, points: [], summary: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, preview]);

  useEffect(() => {
    if (preview || didResume.current) return;
    if (history?.walk?.status === "live" && recorder.status === "idle") {
      didResume.current = true;
      void recorder.resume({
        ...history.walk,
        points: history.points,
        distanceM: history.summary?.distanceM ?? history.walk.distanceM,
      });
    }
  }, [history, preview, recorder]);

  const status = preview?.status ?? recorder.status;
  const points = preview?.points ?? (recorder.points.length ? recorder.points : history?.points ?? []);
  const distanceM = preview?.distanceM ?? (recorder.distanceM || history?.summary?.distanceM || 0);
  const startedAt = preview?.startedAt ?? recorder.startedAt ?? history?.walk?.startedAt;
  const live = status === "live" || status === "ending" || preview?.status === "live";
  const ended = status === "ended" || history?.walk?.status === "ended";
  const idle = !live && !ended;
  const now = useNow(1000);
  const durationS =
    preview?.durationS ??
    (ended
      ? recorder.endedWalk?.durationS ?? history?.summary?.durationS ?? recorder.elapsedS
      : liveElapsedSeconds(startedAt, recorder.elapsedS, now));

  const stats = live || ended ? (
    <WalkStatChips
      elapsedLabel={ended ? "DURATION" : "ELAPSED"}
      elapsedValue={
        ended ? formatWalkDuration(durationS) : <WalkElapsedValue startedAt={startedAt} fallbackS={durationS} />
      }
      distanceM={distanceM}
      durationS={durationS}
      paceLabel={ended ? "AVG PACE" : "PACE"}
    />
  ) : null;

  return (
    <div className="relative min-h-[100dvh] bg-background md:min-h-[calc(100dvh-4.5rem)]">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col md:min-h-[calc(100dvh-4.5rem)] md:px-10 md:py-6">
        <header className="flex items-center justify-between gap-3 px-4 pt-4 md:px-0 md:pt-0">
          <div>
            <Link href={backHref} className="text-caption font-semibold text-ink-600">
              ← {idle ? "Today’s walk" : live ? "" : "Back"}
            </Link>
            {idle ? (
              <>
                <p className="mt-3 hidden text-caption font-bold text-ink-400 md:block">Walker mode</p>
                <h1 className="mt-1 text-h2 md:mt-1">Today’s walk</h1>
              </>
            ) : (
              <div className="mt-3 hidden items-center gap-3 md:flex">
                <h1 className="text-h2">{ended ? "Walk ended" : `Walking ${petName}`}</h1>
                {live ? (
                  <WalkBadge tone="green">
                    <span className="size-1.5 rounded-full bg-white" aria-hidden />
                    Sharing location
                  </WalkBadge>
                ) : null}
              </div>
            )}
          </div>
          {live ? (
            <WalkBadge tone="green" className="md:hidden">
              <span className="size-1.5 rounded-full bg-white" aria-hidden />
              Sharing location
            </WalkBadge>
          ) : null}
        </header>

        <div className="mt-4 flex flex-1 flex-col md:mt-5 md:grid md:grid-cols-[minmax(0,1.15fr)_22.5rem] md:items-start md:gap-6">
          <div className="min-h-[38vh] flex-1 overflow-hidden md:h-[min(70vh,40rem)] md:min-h-[34rem] md:rounded-[1.4rem]">
            <WalkTrailMap points={points} live={live} className="h-full min-h-[38vh] w-full" />
          </div>

          <section className="space-y-3 px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-[1.4rem] md:bg-surface md:p-5 md:shadow-card">
            {idle ? (
              <>
                <div className="rounded-[1.25rem] bg-surface p-4 shadow-card md:bg-transparent md:p-0 md:shadow-none">
                  <div className="flex items-center gap-3">
                    <div className="size-12 shrink-0 rounded-full bg-primary-50" aria-hidden />
                    <div>
                      <h2 className="text-h4">
                        {petName}
                        {breed ? ` · ${breed}` : ""}
                      </h2>
                      <p className="text-caption text-ink-400">Owner: {ownerName}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-body-2 text-ink-900">
                    {address ? <p>📍 {address}</p> : null}
                    {startTime || durationMinutes ? (
                      <p>
                        ⏰ {startTime || "Start"}
                        {durationMinutes ? ` · ${durationMinutes} min` : ""}
                      </p>
                    ) : null}
                    {note ? <p>📝 {note}</p> : null}
                  </div>
                </div>
                <div className="rounded-[1.1rem] bg-accent-50 px-4 py-3 text-caption font-semibold text-accent-700">
                  ✓ GPS ready · owner will see your route
                </div>
                {recorder.error ? (
                  <p className="text-caption text-danger" role="alert">
                    {recorder.error}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="btn btn-accent hidden w-full md:inline-flex"
                  onClick={() => { if (!preview) void recorder.start(); }}
                  disabled={!preview && recorder.status === "starting"}
                >
                  {!preview && recorder.status === "starting" ? "Starting…" : "▶ Start walk"}
                </button>
                <button
                  type="button"
                  className="mx-auto flex size-44 items-center justify-center rounded-full bg-secondary text-h3 font-extrabold text-white shadow-float md:hidden"
                  onClick={() => { if (!preview) void recorder.start(); }}
                  disabled={!preview && recorder.status === "starting"}
                >
                  {!preview && recorder.status === "starting" ? "Starting…" : "Start walk"}
                </button>
              </>
            ) : null}

            {live ? (
              <>
                <div className="hidden md:block">{stats}</div>
                <div className="md:hidden">{stats}</div>
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
                <button
                  type="button"
                  className="btn btn-danger hidden w-full md:inline-flex"
                  onClick={() => setConfirmEnd(true)}
                >
                  End walk
                </button>
                <button
                  type="button"
                  className="btn btn-danger w-full md:hidden"
                  onClick={() => setConfirmEnd(true)}
                >
                  End walk
                </button>
              </>
            ) : null}

            {ended ? (
              <>
                {stats}
                <p className="text-body-2 text-ink-600">
                  {formatWalkSummary({ distanceM, durationS })}. The owner can open the walk summary from this booking.
                </p>
                <Link href={backHref} className="btn btn-accent w-full">
                  Done
                </Link>
              </>
            ) : null}
          </section>
        </div>
      </div>

      <EndWalkDialog
        open={confirmEnd}
        petName={petName}
        ownerName={ownerFirst}
        distanceM={distanceM}
        durationS={durationS}
        ending={recorder.status === "ending"}
        stats={stats}
        onConfirm={() => {
          setConfirmEnd(false);
          if (!preview) void recorder.stop();
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  );
}
