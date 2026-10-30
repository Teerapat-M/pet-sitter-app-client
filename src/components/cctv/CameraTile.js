"use client";

import { useEffect, useRef } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cameraOfflineCopy, cameraStatusLabel, cameraViewerKind } from "@/lib/cctv";

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
  muted = true,
  className,
  onSelect,
  onFullscreen,
  placeholder = "🐕",
  videoRef,
}) {
  const innerRef = useRef(null);
  const kind = cameraViewerKind(camera, { status, stream, error }, { canView, preview });
  const live = kind === "live";
  const hasStream = Boolean(stream);
  const copy = cameraOfflineCopy(kind, error);

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return undefined;
    node.srcObject = stream ?? null;
    return () => {
      node.srcObject = null;
    };
  }, [stream]);

  function setRefs(node) {
    innerRef.current = node;
    if (typeof videoRef === "function") videoRef(node);
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(camera)}
      className={cn(
        "relative flex w-full overflow-hidden rounded-[1.35rem] bg-ink-900 text-left text-white",
        featured ? "h-44 lg:h-full lg:min-h-0 lg:flex-1" : "h-44 min-h-44",
        className,
      )}
    >
      <span
        className={cn("block w-full shrink-0", featured ? "h-44 lg:h-full" : "h-44")}
        aria-hidden
      />
      <LiveBadge kind={kind} />
      {live && hasStream ? (
        <video
          ref={setRefs}
          className="absolute inset-0 size-full object-cover"
          autoPlay
          playsInline
          muted={muted}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
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
