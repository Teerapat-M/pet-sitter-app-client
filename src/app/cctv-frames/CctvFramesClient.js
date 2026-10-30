"use client";

import OwnerBoardingBookingDetail from "@/components/cctv/OwnerBoardingBookingDetail";
import OwnerCctvView from "@/components/cctv/OwnerCctvView";
import SitterCameraDashboard from "@/components/cctv/SitterCameraDashboard";
import SitterCameraMode from "@/components/cctv/SitterCameraMode";
import {
  PREVIEW_ACCESS,
  PREVIEW_BOARDING,
  PREVIEW_LIVE_CAMERAS,
  PREVIEW_OFFLINE_CAMERAS,
  PREVIEW_SITTER_CAMERAS,
} from "@/lib/cctvPreview";

export default function CctvFramesClient({ frame = "08" }) {
  if (frame === "09") {
    return (
      <OwnerCctvView
        booking={PREVIEW_BOARDING}
        bookingId={PREVIEW_BOARDING.id}
        preview={{
          cameras: PREVIEW_OFFLINE_CAMERAS,
          access: { ...PREVIEW_ACCESS, canView: false },
        }}
      />
    );
  }
  if (frame === "13") {
    return (
      <SitterCameraDashboard
        preview={{
          sitter: { name: "Ploy", average_rating: 4.9, booking_count: 12 },
          cameras: PREVIEW_SITTER_CAMERAS,
          bookings: [
            { id: "w1", service_type: "dog_walking", pet_names: "Bobo", start_date: "2026-11-12", start_time: "08:00", duration_unit: "walk", duration: 60 },
            { id: "b1", service_type: "boarding", pet_names: "Mochi", start_date: "2026-11-12", start_time: "14:00", end_date: "2026-11-15" },
          ],
        }}
      />
    );
  }
  if (frame === "11") {
    return (
      <SitterCameraMode
        cameraId="cam-1"
        preview={{ camera: PREVIEW_SITTER_CAMERAS[0], cameras: PREVIEW_SITTER_CAMERAS, status: "idle" }}
      />
    );
  }
  if (frame === "18d") {
    return (
      <OwnerBoardingBookingDetail
        booking={PREVIEW_BOARDING}
        preview={{ cameras: PREVIEW_LIVE_CAMERAS, access: PREVIEW_ACCESS }}
      />
    );
  }
  return (
    <OwnerCctvView
      booking={PREVIEW_BOARDING}
      bookingId={PREVIEW_BOARDING.id}
      preview={{ cameras: PREVIEW_LIVE_CAMERAS, access: PREVIEW_ACCESS }}
    />
  );
}
