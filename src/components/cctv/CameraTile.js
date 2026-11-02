"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CAMERA_ASPECT,
  bindVideoAspect,
  cameraOfflineCopy,
  cameraStatusLabel,
  cameraTileBoxStyle,
  cameraViewerKind,
  syncVideoSrcObject,
} from "@/lib/cctv";

function LiveBadge({ kind }) {
  const live = kind === "live";
  return (
    <span
      className={cn(
        "absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white",
        live ? "bg-live" : "bg-ink-400/90",
      )}
    >
      <span className={cn("size-1.5 rounded-full", live ? "bg-white" : "bg-white/80")} aria-hidden />
      {cameraStatusLabel(kind)}
    </span>
  );
}

export default function CameraTile({
  camera,
  stream,
  status,
  error = "",
  canView = true,
  preview = false,
  featured = false,
  solo = false,
  muted = true,
  className,
  onSelect,
  onFullscreen,
  placeholder = "🐕",
  videoRef,
}) {
  const innerRef = useRef(null);
  const [aspect, setAspect] = useState(DEFAULT_CAMERA_ASPECT);
  const kind = cameraViewerKind(camera, { status, stream, error }, { canView, preview });
  const live = kind === "live";
  const hasStream = Boolean(stream);
  const copy = cameraOfflineCopy(kind, error);
  const fillGrid = featured && !solo;

  useEffect(() => {
    const node = innerRef.current;
    syncVideoSrcObject(node, stream);
    if (!node) {
      setAspect(DEFAULT_CAMERA_ASPECT);
      return undefined;
    }
    return bindVideoAspect(node, setAspect);
  }, [stream, live]);

  function setVideoNode(node) {
    innerRef.current = node;
    syncVideoSrcObject(node, stream);
    if (typeof videoRef === "function") videoRef(node);
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(camera)}
      style={cameraTileBoxStyle({ aspect, solo })}
      className={cn(
        "relative min-w-0 w-full overflow-hidden rounded-[1.35rem] bg-ink-900 text-left text-white",
        solo
          ? "mx-auto [aspect-ratio:var(--camera-tile-ar,1.7777777777777777)]"
          : fillGrid
            ? "max-lg:[aspect-ratio:var(--camera-tile-ar,1.7777777777777777)] lg:h-full lg:min-h-0 lg:flex-1"
            : "[aspect-ratio:var(--camera-tile-ar,1.7777777777777777)]",
        className,
      )}
    >
      <LiveBadge kind={kind} />
      {live && hasStream ? (
        <video
          ref={setVideoNode}
          className="absolute inset-0 size-full bg-ink-900 object-contain"
          autoPlay
          playsInline
          muted={muted}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900 px-4 text-center">
          {live ? (
            <span className="text-4xl" aria-hidden>
              {placeholder}
            </span>
          ) : (
            <>
              <span className="text-lg" aria-hidden>
                📷
              </span>
              <p className="mt-2 text-body-2 font-bold">{copy.title}</p>
              {copy.body ? <p className="mt-1 text-caption text-white/70">{copy.body}</p> : null}
            </>
          )}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
        <p className="text-caption font-semibold text-white/90">
          {camera?.name || "Camera"}
        </p>
        {onFullscreen ? (
          <span
            role="presentation"
            className="flex size-8 items-center justify-center rounded-lg text-white/80"
            onClick={(event) => {
              event.stopPropagation();
              onFullscreen(camera);
            }}
          >
            <Maximize2 className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
    </button>
  );
}
