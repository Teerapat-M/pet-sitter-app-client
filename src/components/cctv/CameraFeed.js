"use client";

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
    enabled,
    onSignal,
    onSessionEnded,
  });
  return children(viewer);
}
