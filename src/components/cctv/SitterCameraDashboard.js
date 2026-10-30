"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import CameraSwitch from "@/components/cctv/CameraSwitch";
import {
  createSitterCamera,
  deleteSitterCamera,
  getSitterBookings,
  getSitterMe,
  listSitterCameras,
  patchSitterCamera,
  sitterCameraEventsPath,
} from "@/lib/api";
import {
  countEnabledCameras,
  isBoardingBooking,
  normalizeCamera,
  sitterCameraModeHref,
} from "@/lib/cctv";
import { useCameraEvents } from "@/lib/useCameraEvents";
import { firstPetName, isDogWalkingBooking } from "@/lib/walkTracking";
import { formatBookedDateList } from "@/utils/formatDateTime";

export default function SitterCameraDashboard({ preview }) {
  const [cameras, setCameras] = useState((preview?.cameras ?? []).map(normalizeCamera).filter(Boolean));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [sitter, setSitter] = useState(preview?.sitter ?? null);
  const [bookings, setBookings] = useState(preview?.bookings ?? []);
  const live = useCameraEvents(preview ? "" : sitterCameraEventsPath(), { enabled: !preview });

  useEffect(() => {
    if (preview) return undefined;
    let cancelled = false;
    Promise.all([
      listSitterCameras().catch(() => []),
      getSitterMe().catch(() => null),
      getSitterBookings({ status: "all", limit: 20 }).catch(() => ({ data: [] })),
    ]).then(([list, me, bookingPage]) => {
      if (cancelled) return;
      setCameras((list ?? []).map(normalizeCamera).filter(Boolean));
      setSitter(me);
      setBookings(Array.isArray(bookingPage?.data) ? bookingPage.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const displayedCameras = useMemo(() => {
    if (preview) return cameras;
    const incoming = live.view.cameras.map(normalizeCamera).filter(Boolean);
    if (!incoming.length) return cameras;
    const byId = new Map(cameras.map((row) => [row.id, row]));
    for (const row of incoming) byId.set(row.id, { ...byId.get(row.id), ...row });
    return [...byId.values()];
  }, [cameras, live.view.cameras, preview]);

  const firstName = String(sitter?.name ?? sitter?.full_name ?? "there").split(/\s+/)[0];
  const enabledCount = countEnabledCameras(displayedCameras);
  const today = useMemo(() => bookings.slice(0, 3), [bookings]);
  const rating = sitter?.average_rating ?? sitter?.rating ?? sitter?.avgRating;
  const bookingCount = sitter?.booking_count ?? sitter?.bookingsCount ?? bookings.length;

  async function toggle(camera, isEnabled) {
    if (preview) {
      setCameras((current) => current.map((row) => (row.id === camera.id ? { ...row, isEnabled } : row)));
      return;
    }
    setBusy(camera.id);
    try {
      const updated = await patchSitterCamera(camera.id, { isEnabled });
      setCameras((current) =>
        current.map((row) => (row.id === camera.id ? normalizeCamera(updated) || { ...row, isEnabled } : row)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update camera");
    } finally {
      setBusy("");
    }
  }

  async function addCamera(event) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    if (preview) {
      setCameras((current) => [...current, { id: `preview-${current.length}`, name: nextName, isEnabled: true, status: "offline" }]);
      setName("");
      return;
    }
    setBusy("create");
    try {
      const created = await createSitterCamera({ name: nextName });
      setCameras((current) => [...current, normalizeCamera(created)].filter(Boolean));
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add camera");
    } finally {
      setBusy("");
    }
  }

  async function removeCamera(camera) {
    if (preview) {
      setCameras((current) => current.filter((row) => row.id !== camera.id));
      return;
    }
    setBusy(camera.id);
    try {
      await deleteSitterCamera(camera.id);
      setCameras((current) => current.filter((row) => row.id !== camera.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete camera");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="bg-background pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-10">
        <h1 className="text-h2">Hi, {firstName} 👋</h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Stat label="BOOKINGS" value={String(bookingCount || 0)} />
          {rating != null ? <Stat label="RATING" value={`${Number(rating).toFixed(1)}★`} /> : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section>
            <h2 className="text-h4">Today</h2>
            <div className="mt-3 space-y-3">
              {today.length ? (
                today.map((booking) => (
                  <TodayRow key={booking.id} booking={booking} />
                ))
              ) : (
                <p className="rounded-[1.25rem] bg-surface p-4 text-caption text-ink-400 shadow-card">No bookings on the list yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-[1.4rem] bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h4">Cameras</h2>
              <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-bold text-accent-700">
                {enabledCount} / {displayedCameras.length || 0} on
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {displayedCameras.map((camera) => (
                <li key={camera.id} className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-line px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-body-2 font-bold text-ink-900">{camera.name}</p>
                    <p className="text-caption text-ink-400">
                      {camera.isEnabled
                        ? camera.status === "online"
                          ? "Live · visible to guests"
                          : camera.status === "reconnecting"
                            ? "Reconnecting…"
                            : "On · waiting to go live"
                        : "Off · guests see offline"}
                    </p>
                    <Link href={sitterCameraModeHref(camera.id)} className="text-caption font-bold text-primary">
                      Camera mode →
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <CameraSwitch
                      checked={camera.isEnabled}
                      disabled={Boolean(busy)}
                      label={`Toggle ${camera.name}`}
                      onChange={(value) => toggle(camera, value)}
                    />
                    <button
                      type="button"
                      className="text-caption text-ink-400"
                      onClick={() => removeCamera(camera)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <form className="mt-4 flex gap-2" onSubmit={addCamera}>
              <input
                className="input flex-1"
                placeholder="Add a camera name"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
              <button type="submit" className="btn btn-primary min-h-11 px-4" disabled={busy === "create"}>
                Add
              </button>
            </form>
            <p className="mt-3 text-caption text-ink-400">Guests can only watch while a boarding stay is in service.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[1.25rem] bg-surface px-4 py-4 text-center shadow-card">
      <p className="text-h3">{value}</p>
      <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-ink-400">{label}</p>
    </div>
  );
}

function TodayRow({ booking }) {
  const walking = isDogWalkingBooking(booking);
  const boarding = isBoardingBooking(booking);
  const pet = firstPetName(booking);
  const href = walking
    ? `/sitter/walks/${encodeURIComponent(booking.id)}`
    : `/sitter/booking-list/${encodeURIComponent(booking.id)}`;
  const action = walking ? "Start walk" : boarding ? "Check in" : "Open";
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-surface p-4 shadow-card">
      <div className="min-w-0">
        <p className="text-body-2 font-bold">
          {boarding ? "🏠 Boarding" : walking ? "🐕 Walk" : "📍 Visit"} · {pet}
        </p>
        <p className="text-caption text-ink-400">{formatBookedDateList(booking)}</p>
      </div>
      <Link href={href} className="btn btn-accent min-h-11 shrink-0 px-4">
        {action}
      </Link>
    </div>
  );
}
