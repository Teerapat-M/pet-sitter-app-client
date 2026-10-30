"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSitterCamera, listSitterCameras, patchSitterCamera } from "@/lib/api";
import { normalizeCamera, sitterCamerasHref } from "@/lib/cctv";
import { useCameraPublisher } from "@/lib/useCameraPublisher";

export default function SitterCameraMode({ cameraId, preview }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const [camera, setCamera] = useState(preview?.camera ?? null);
  const [list, setList] = useState(preview?.cameras ?? []);
  const publisher = useCameraPublisher(preview ? "" : cameraId, { enabled: Boolean(cameraId) && !preview });

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
    <div className="bg-background pb-24 md:pb-10">
      <div className="mx-auto max-w-3xl px-5 py-5 md:px-10">
        <Link href={sitterCamerasHref()} className="text-caption font-semibold text-ink-600">
          ← Cameras
        </Link>
        <h1 className="mt-3 text-h2">{camera?.name || "Camera mode"}</h1>
        <p className="mt-1 text-caption text-ink-400">
          Publish this camera from your phone or laptop. Owners can watch during an in-service boarding stay.
        </p>

        <div className="relative mt-5 overflow-hidden rounded-[1.4rem] bg-[#2b2622]">
          <video ref={videoRef} className="aspect-[16/10] w-full object-cover" autoPlay playsInline muted />
          {!live ? (
            <div className="absolute inset-0 flex items-center justify-center text-caption font-semibold text-white/80">
              {denied ? publisher.error : "Camera is idle"}
            </div>
          ) : null}
        </div>

        {denied ? (
          <p className="mt-3 rounded-[1.1rem] bg-primary-50 px-4 py-3 text-caption text-primary">{publisher.error}</p>
        ) : null}
        {publisher.error && !denied ? (
          <p className="mt-3 text-caption text-danger">{publisher.error}</p>
        ) : null}

        <label className="mt-4 block text-caption font-semibold text-ink-600">
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

        {publisher.devices.length > 1 ? (
          <label className="mt-3 block text-caption font-semibold text-ink-600">
            This device
            <select
              className="input mt-1 w-full"
              value={publisher.deviceId}
              onChange={(event) => publisher.setDeviceId(event.target.value)}
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
          {live ? (
            <button type="button" className="btn btn-danger min-h-11 px-5" onClick={() => publisher.stop()}>
              Stop
            </button>
          ) : (
            <button type="button" className="btn btn-accent min-h-11 px-5" onClick={() => publisher.start()}>
              Go live
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline min-h-11 px-5"
            onClick={() => {
              if (!cameraId || preview) return;
              void patchSitterCamera(cameraId, { isEnabled: !(camera?.isEnabled !== false) }).then((updated) => {
                setCamera(normalizeCamera(updated));
              });
            }}
          >
            {camera?.isEnabled === false ? "Enable for guests" : "Hide from guests"}
          </button>
        </div>
      </div>
    </div>
  );
}
