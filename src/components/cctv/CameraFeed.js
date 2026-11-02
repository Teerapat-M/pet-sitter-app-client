"use client";

import { isYoutubeCamera } from "@/lib/cctv";
import { useCameraViewer } from "@/lib/useCameraViewer";

export default function CameraFeed({
  bookingId,
  camera,
  enabled,
  onSignal,
  onSessionEnded,
  children,
}) {
  const viewer = useCameraViewer(bookingId, camera, {
    enabled: Boolean(enabled) && !isYoutubeCamera(camera),
    onSignal,
    onSessionEnded,
  });
  return children(viewer);
}
