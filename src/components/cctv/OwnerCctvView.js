"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Clock, Grid2x2, Maximize2, Square, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import CameraFeed from "@/components/cctv/CameraFeed";
import CameraTile from "@/components/cctv/CameraTile";
import { bookingCameraEventsPath, getBookingCameras } from "@/lib/api";
import {
  MAX_OWNER_SESSIONS_PER_CAMERA,
  cameraTileKind,
  countLiveCameras,
  formatAvailableUntil,
  formatOutsideWindowCopy,
  normalizeAccess,
  normalizeCamera,
} from "@/lib/cctv";
import { useCameraEvents } from "@/lib/useCameraEvents";
import { cn } from "@/lib/utils";
import { walkBookingCode, walkFirstName, walkSitterName } from "@/lib/walkTracking";

function venueName(booking) {
  const sitter = walkFirstName(walkSitterName(booking));
  return sitter ? `${sitter}'s place` : "Live cameras";
}

function featuredPlacement(camera, selectedId, cameras) {
  const others = cameras.filter((item) => item.id !== selectedId);
  if (camera.id === selectedId) {
    if (others.length >= 3) return "lg:col-start-1 lg:row-start-1 lg:row-span-3";
    if (others.length === 2) return "lg:col-start-1 lg:row-start-1 lg:row-span-2";
    if (others.length === 0) return "lg:col-span-2 lg:row-start-1";
    return "lg:col-start-1 lg:row-start-1";
  }
  const index = others.findIndex((item) => item.id === camera.id);
  if (index === 0) return "lg:col-start-2 lg:row-start-1";
  if (index === 1) return "lg:col-start-2 lg:row-start-2";
  if (index === 2) return "lg:col-start-2 lg:row-start-3";
  return "lg:col-start-2";
}

function afterCamerasRowClass(selectedId, cameras) {
  const others = cameras.filter((item) => item.id !== selectedId);
  const row = Math.max(others.length, 1) + 1;
  if (row === 4) return "lg:row-start-4";
  if (row === 3) return "lg:row-start-3";
  return "lg:row-start-2";
}

const SNAPSHOT_PLACEHOLDERS = ["#6b5e54", "#5c6560", "#6a5c50"];

export default function OwnerCctvView({ booking, bookingId, preview, backHref }) {
  const [layout, setLayout] = useState("featured");
  const [selectedId, setSelectedId] = useState(preview?.cameras?.[0]?.id ?? "");
  const [muted, setMuted] = useState(true);
  const [snapshots, setSnapshots] = useState([]);
  const [rest, setRest] = useState(preview ?? null);
  const [gate, setGate] = useState("");
  const videoRefs = useRef(new Map());
  const signalHandlersRef = useRef(new Map());
  const endedHandlersRef = useRef(new Map());

  const liveQuery = useCameraEvents(preview ? "" : bookingCameraEventsPath(bookingId), {
    enabled: Boolean(bookingId) && !preview,
    onSignal: (event) => {
      signalHandlersRef.current.get(String(event.cameraId ?? ""))?.(event);
    },
    onSessionEnded: (event) => {
      endedHandlersRef.current.get(String(event.cameraId ?? ""))?.(event);
    },
  });

  useEffect(() => {
    if (preview || !bookingId) return undefined;
    let cancelled = false;
    getBookingCameras(bookingId)
      .then((data) => {
        if (cancelled) return;
        setRest({
          cameras: (data.cameras ?? []).map(normalizeCamera).filter(Boolean),
          access: normalizeAccess(data.access),
        });
        setSelectedId((current) => current || data.cameras?.[0]?.id || "");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) {
          setGate("outside-window");
          setRest({ cameras: [], access: { canView: false } });
          return;
        }
        setGate(err instanceof Error ? err.message : "Could not load cameras");
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, preview]);

  const cameras = (
    preview?.cameras ??
    (liveQuery.view.cameras.length ? liveQuery.view.cameras : rest?.cameras) ??
    []
  )
    .map(normalizeCamera)
    .filter(Boolean);
  const access =
    preview?.access ?? (liveQuery.view.access?.validTo ? liveQuery.view.access : rest?.access);
  const canView = gate !== "outside-window" && liveQuery.error !== "outside-window" && access?.canView !== false;
  const outside = !canView;
  const liveCount = countLiveCameras(cameras, { canView });
  const selected = cameras.find((camera) => camera.id === selectedId) ?? cameras[0];
  const code = walkBookingCode(booking);
  const until = formatAvailableUntil(access, booking);

  const capture = useCallback((camera) => {
    const video = videoRefs.current.get(camera?.id);
    if (!video || video.readyState < 2) {
      toast.info("Live video is not ready to snapshot yet.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${camera?.name || "camera"}-snapshot.png`;
    link.click();
    setSnapshots((current) => [{ id: `${camera.id}-${Date.now()}`, url }, ...current].slice(0, 3));
  }, []);

  const requestFullscreen = useCallback((camera) => {
    const video = videoRefs.current.get(camera?.id);
    const node = video?.parentElement ?? video;
    if (!node?.requestFullscreen) return;
    void node.requestFullscreen();
  }, []);

  function renderFeed(camera, { featured = false, className } = {}) {
    const kind = cameraTileKind(camera, { canView });
    const enabled = Boolean(canView && kind === "live" && !preview);
    return (
      <CameraFeed
        bookingId={preview ? "" : bookingId}
        camera={camera}
        enabled={enabled}
        onSignal={(handler) => {
          if (handler) signalHandlersRef.current.set(camera.id, handler);
          else signalHandlersRef.current.delete(camera.id);
        }}
        onSessionEnded={(handler) => {
          if (handler) endedHandlersRef.current.set(camera.id, handler);
          else endedHandlersRef.current.delete(camera.id);
        }}
      >
        {(viewer) => (
          <CameraTile
            camera={camera}
            stream={viewer.stream}
            status={viewer.status}
            error={viewer.error}
            canView={canView}
            preview={Boolean(preview)}
            featured={featured}
            muted={muted}
            className={className}
            onSelect={(item) => setSelectedId(item.id)}
            onFullscreen={requestFullscreen}
            videoRef={(node) => {
              if (node) videoRefs.current.set(camera.id, node);
              else videoRefs.current.delete(camera.id);
            }}
          />
        )}
      </CameraFeed>
    );
  }

  return (
    <div className="bg-background pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-5 py-5 md:px-10">
        <Link
          href={backHref || `/owner/bookings/${encodeURIComponent(String(bookingId || booking?.id || ""))}`}
          className="text-caption font-semibold text-ink-600"
        >
          ← {code ? `Booking #${code}` : "My bookings"}
        </Link>
        <h1 className="mt-3 text-h2">
          {venueName(booking)}
          {liveCount > 0 && canView ? " · Live" : ""}
        </h1>
        <p className="mt-1 text-caption text-ink-400">
          {until ? `${until} · only you can watch` : "only you can watch"}
        </p>
        {gate && gate !== "outside-window" ? (
          <p className="mt-2 text-caption text-danger">{gate}</p>
        ) : null}

        <div
          className={cn(
            "mt-5 grid grid-cols-1 gap-3",
            layout === "featured"
              ? "lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch lg:gap-x-4"
              : "md:grid-cols-2",
          )}
        >
          {cameras.map((camera) => {
            const featured = layout === "featured" && camera.id === selected?.id;
            return (
              <div
                key={camera.id}
                className={cn(
                  "flex min-w-0 flex-col",
                  layout === "featured" && featuredPlacement(camera, selected?.id, cameras),
                )}
              >
                {renderFeed(camera, { featured })}
              </div>
            );
          })}
          <div
            className={cn(
              "space-y-3",
              layout === "featured" && cn("lg:col-start-1", afterCamerasRowClass(selected?.id, cameras)),
              layout === "grid" && "md:col-span-2",
            )}
          >
            <div className="flex items-center justify-around rounded-[1.4rem] bg-surface px-2 py-3 shadow-card md:px-8">
              <ToolButton icon={Camera} label="Snapshot" onClick={() => selected && capture(selected)} />
              <ToolButton icon={Maximize2} label="Fullscreen" onClick={() => selected && requestFullscreen(selected)} />
              <ToolButton
                icon={layout === "grid" ? Square : Grid2x2}
                label={layout === "grid" ? "Single" : "Grid view"}
                onClick={() => setLayout((current) => (current === "grid" ? "featured" : "grid"))}
              />
              <ToolButton icon={muted ? VolumeX : Volume2} label="Sound" onClick={() => setMuted((value) => !value)} />
            </div>
            <p className="rounded-[1.2rem] bg-primary-50 px-4 py-3 text-center text-caption text-ink-600 lg:hidden">
              🔒 Only you can view · ends at check-out
            </p>
          </div>
          <div
            className={cn(
              "space-y-3",
              layout === "featured" && cn("lg:col-start-2", afterCamerasRowClass(selected?.id, cameras)),
              layout === "grid" && "md:col-span-2",
            )}
          >
            {outside ? (
              <div className="rounded-[1.4rem] bg-surface p-6 text-center shadow-card">
                <Clock className="mx-auto size-10 text-ink-400" aria-hidden />
                <h2 className="mt-3 text-h4">Live view not open yet</h2>
                <p className="mt-2 text-caption text-ink-600">{formatOutsideWindowCopy(access, booking)}</p>
                <button
                  type="button"
                  className="btn btn-outline mt-5 min-h-11 w-full"
                  onClick={() => toast.info("Reminders are not available yet.")}
                >
                  Remind me
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-h4">Snapshots today</h2>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="aspect-square overflow-hidden rounded-[1rem]"
                      style={{ backgroundColor: SNAPSHOT_PLACEHOLDERS[index] }}
                    >
                      {snapshots[index] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={snapshots[index].url} alt="" className="size-full object-cover" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="sr-only">At most {MAX_OWNER_SESSIONS_PER_CAMERA} live viewer sessions per camera.</p>
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" className="flex flex-col items-center gap-1 text-caption font-semibold text-ink-600" onClick={onClick}>
      <Icon className="size-5" aria-hidden />
      {label}
    </button>
  );
}
