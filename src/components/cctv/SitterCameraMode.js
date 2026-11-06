"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSitterCamera, listSitterCameras, patchSitterCamera } from "@/lib/api";
import {
  CAMERA_PRIVACY_NOTE,
  YOUTUBE_LIVE_NOTE,
  cameraGuestStateLabel,
  cameraPausedForGuests,
  cameraPauseToggleLabel,
  isYoutubeCamera,
  normalizeCamera,
  sitterCamerasHref,
} from "@/lib/cctv";
import { useCameraPublisher } from "@/lib/useCameraPublisher";

export default function SitterCameraMode({ cameraId, preview }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const [camera, setCamera] = useState(preview?.camera ?? null);
  const [list, setList] = useState(preview?.cameras ?? []);
  const youtube = isYoutubeCamera(camera);
  const sourceKnown = Boolean(preview || camera);
  const publisher = useCameraPublisher(preview ? "" : cameraId, {
    enabled: Boolean(cameraId) && !preview && sourceKnown && !youtube,
  });

  useEffect(() => {
    if (preview) return undefined;
    let cancelled = false;
    Promise.all([getSitterCamera(cameraId).catch(() => null), listSitterCameras().catch(() => [])]).then(
      ([mine, cameras]) => {
        if (cancelled) return;
        setCamera(normalizeCamera(mine));
        setList((cameras ?? []).map(normalizeCamera).filter(Boolean));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [cameraId, preview]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return undefined;
    node.srcObject = publisher.stream ?? preview?.stream ?? null;
    return () => {
      node.srcObject = null;
    };
  }, [preview?.stream, publisher.stream]);

  const live = preview?.status === "live" || publisher.status === "live";
  const denied = publisher.status === "denied";

  return (
    <section className="flex flex-col gap-3">
        <Link href={sitterCamerasHref()} className="text-body-3 font-semibold text-gray-500">
          ← Cameras
        </Link>
        <h1 className="text-h3 font-bold text-gray-900">{camera?.name || "Camera mode"}</h1>
        <p className="text-body-3 text-gray-400">
          {youtube
            ? "This camera uses YouTube Live. Switch the source on the cameras page to publish from this device."
            : `Publish this camera from your phone or laptop. ${CAMERA_PRIVACY_NOTE}.`}
        </p>
        <p className="inline-flex w-fit rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-500">
          {cameraGuestStateLabel(
            cameraPausedForGuests(camera),
            youtube ? camera?.status : live ? "online" : camera?.status,
          )}
        </p>

        {youtube ? (
          <p className="mt-2 rounded-2xl bg-orange-100 px-4 py-3 text-body-3 text-gray-500">{YOUTUBE_LIVE_NOTE}</p>
        ) : (
          <div className="relative mt-2 overflow-hidden rounded-2xl bg-gray-900">
            <video ref={videoRef} className="aspect-[16/10] w-full object-cover" autoPlay playsInline muted />
            {!live && !publisher.stream ? (
              <div className="absolute inset-0 flex items-center justify-center text-body-3 font-semibold text-white/80">
                {denied ? publisher.error : "Camera is idle"}
              </div>
            ) : null}
          </div>
        )}

        {denied && !youtube ? (
          <p className="rounded-2xl bg-orange-100 px-4 py-3 text-body-3 text-orange-500">{publisher.error}</p>
        ) : null}
        {publisher.error && !denied && !youtube ? (
          <p className="text-body-3 text-red">{publisher.error}</p>
        ) : null}

        <label className="mt-1 block text-body-3 font-semibold text-gray-500">
          Registered camera
          <select
            className="input mt-1 w-full"
            value={cameraId}
            onChange={(event) => {
              router.push(`/sitter/cameras/${encodeURIComponent(event.target.value)}`);
            }}
          >
            {(list.length ? list : camera ? [camera] : []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        {!youtube && publisher.devices.length > 1 ? (
          <label className="mt-3 block text-body-3 font-semibold text-gray-500">
            This device
            <select
              className="input mt-1 w-full"
              value={publisher.deviceId}
              onChange={(event) => void publisher.switchDevice(event.target.value)}
            >
              {publisher.devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || "Camera"}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {youtube ? null : live ? (
            <button type="button" className="btn min-h-11 bg-red px-5 text-white" onClick={() => publisher.stop()}>
              Stop
            </button>
          ) : (
            <button type="button" className="btn btn-primary min-h-11 px-5" onClick={() => publisher.start()}>
              Go live
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline min-h-11 px-5"
            aria-pressed={cameraPausedForGuests(camera)}
            onClick={() => {
              if (!cameraId || preview) return;
              const paused = cameraPausedForGuests(camera);
              void patchSitterCamera(cameraId, { isEnabled: paused }).then((updated) => {
                setCamera(normalizeCamera(updated));
              });
            }}
          >
            {cameraPauseToggleLabel(cameraPausedForGuests(camera))}
          </button>
        </div>
    </section>
  );
}
