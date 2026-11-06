"use client";

import Navbar from "@/components/Navbar";
import OwnerBoardingBookingDetail from "@/components/cctv/OwnerBoardingBookingDetail";
import OwnerCctvView from "@/components/cctv/OwnerCctvView";
import SitterCameraDashboard from "@/components/cctv/SitterCameraDashboard";
import SitterCameraMode from "@/components/cctv/SitterCameraMode";
import OwnerWalkView from "@/components/walk/OwnerWalkView";
import SitterWalkView from "@/components/walk/SitterWalkView";
import {
  PREVIEW_ACCESS,
  PREVIEW_BOARDING,
  PREVIEW_LIVE_CAMERAS,
  PREVIEW_OFFLINE_CAMERAS,
  PREVIEW_SITTER_CAMERAS,
} from "@/lib/cctvPreview";

const PREVIEW_WALK = {
  id: "booking-3102",
  transaction_no: "PS-3102",
  status: "in_service",
  service_type: "dog_walking",
  sitter_name: "Ploy S.",
  sitter: { id: "sitter-1", name: "Ploy S." },
  pet_names: "Bobo",
  pets: [{ name: "Bobo", breed: "Shiba" }],
  pet_owner_name: "Ann W.",
  owner_address: "Sukhumvit 21, Bangkok",
  start_time: "08:00",
  duration: 60,
  duration_unit: "walk",
};

const PREVIEW_WALK_POINTS = [
  { lat: 13.7563, lng: 100.5018, recordedAt: "2026-11-12T01:00:00.000Z" },
  { lat: 13.7581, lng: 100.5039, recordedAt: "2026-11-12T01:06:00.000Z" },
  { lat: 13.7594, lng: 100.5061, recordedAt: "2026-11-12T01:12:00.000Z" },
];

function withOwnerChrome(node) {
  return (
    <>
      <Navbar />
      {node}
    </>
  );
}

function withSitterChrome(node) {
  return <div className="min-h-screen bg-gray-100 px-12 py-8">{node}</div>;
}

export default function CctvFramesClient({ frame = "08" }) {
  if (frame === "08-one") {
    return withOwnerChrome(
      <OwnerCctvView
        booking={PREVIEW_BOARDING}
        bookingId={PREVIEW_BOARDING.id}
        preview={{
          cameras: PREVIEW_LIVE_CAMERAS.slice(0, 1),
          access: PREVIEW_ACCESS,
        }}
      />,
    );
  }
  if (frame === "09") {
    return withOwnerChrome(
      <OwnerCctvView
        booking={PREVIEW_BOARDING}
        bookingId={PREVIEW_BOARDING.id}
        preview={{
          cameras: PREVIEW_OFFLINE_CAMERAS,
          access: { ...PREVIEW_ACCESS, canView: false },
        }}
      />,
    );
  }
  if (frame === "13") {
    return withSitterChrome(
      <SitterCameraDashboard
        preview={{
          sitter: { name: "Ploy", average_rating: 4.9, booking_count: 12 },
          cameras: PREVIEW_SITTER_CAMERAS,
          bookings: [
            { id: "w1", service_type: "dog_walking", pet_names: "Bobo", start_date: "2026-11-12", start_time: "08:00", duration_unit: "walk", duration: 60 },
            { id: "b1", service_type: "boarding", pet_names: "Mochi", start_date: "2026-11-12", start_time: "14:00", end_date: "2026-11-15" },
          ],
        }}
      />,
    );
  }
  if (frame === "11") {
    return withSitterChrome(
      <SitterCameraMode
        cameraId="cam-1"
        preview={{ camera: PREVIEW_SITTER_CAMERAS[0], cameras: PREVIEW_SITTER_CAMERAS, status: "idle" }}
      />,
    );
  }
  if (frame === "walk-owner") {
    return withOwnerChrome(
      <OwnerWalkView
        booking={PREVIEW_WALK}
        bookingId={PREVIEW_WALK.id}
        preview={{
          view: {
            status: "live",
            points: PREVIEW_WALK_POINTS,
            durationS: 720,
            distanceM: 850,
            walk: { startedAt: "2026-11-12T01:00:00.000Z" },
          },
        }}
      />,
    );
  }
  if (frame === "walk-sitter") {
    return withSitterChrome(
      <SitterWalkView
        booking={PREVIEW_WALK}
        bookingId={PREVIEW_WALK.id}
        backHref="/sitter/booking-list"
        preview={{
          status: "live",
          points: PREVIEW_WALK_POINTS,
          distanceM: 850,
          durationS: 720,
          startedAt: "2026-11-12T01:00:00.000Z",
        }}
      />,
    );
  }
  if (frame === "yt") {
    return withOwnerChrome(
      <OwnerCctvView
        booking={PREVIEW_BOARDING}
        bookingId={PREVIEW_BOARDING.id}
        preview={{
          cameras: [
            {
              id: "cam-yt",
              name: "Cam 1 · Garden",
              status: "offline",
              isEnabled: true,
              source: "youtube",
              youtubeVideoId: "dQw4w9WgXcQ",
            },
            {
              id: "cam-empty",
              name: "Cam 2 · Hall",
              status: "online",
              isEnabled: true,
              source: "youtube",
              youtubeVideoId: null,
            },
            { id: "cam-3", name: "Cam 3 · Play room", status: "online", isEnabled: true },
          ],
          access: PREVIEW_ACCESS,
        }}
      />,
    );
  }
  if (frame === "18d") {
    return withOwnerChrome(
      <OwnerBoardingBookingDetail
        booking={PREVIEW_BOARDING}
        preview={{ cameras: PREVIEW_LIVE_CAMERAS, access: PREVIEW_ACCESS }}
      />,
    );
  }
  return withOwnerChrome(
    <OwnerCctvView
      booking={PREVIEW_BOARDING}
      bookingId={PREVIEW_BOARDING.id}
      preview={{ cameras: PREVIEW_LIVE_CAMERAS, access: PREVIEW_ACCESS }}
    />,
  );
}
