/**
 * Phase 5 CCTV helpers.
 * Built against server PR #10 (`cursor/phase-5-cctv-3030`).
 * `docs/phase5-api.md` on that branch still describes unscoped GET /api/ice and
 * 8 viewers/camera; the review-fix source is the contract:
 * scoped ICE (cameraId and/or bookingId), short-lived TURN, 413 (16KB), 2 owner sessions.
 */

export const CCTV_HEARTBEAT_MS = 10_000;
export const CCTV_STALE_MS = 30_000;
export const CCTV_RETRY_MS = 2_000;
export const CCTV_TZ = "Asia/Bangkok";
/** Matches server parseSignalBody (server PR #12) — oversized POST /signal is 413. */
export const MAX_SIGNAL_BYTES = 16384;
/** Review-fix contract: max live viewer sessions per owner per camera. */
export const MAX_OWNER_SESSIONS_PER_CAMERA = 2;
export const SESSION_ENDED_STOP_REASONS = new Set([
  "camera_disabled",
  "camera_removed",
  "window_ended",
  "booking_ended",
]);

export function isBoardingBooking(booking) {
  const type = String(
    booking?.service_type ?? booking?.serviceType ?? booking?.service?.type ?? "",
  ).trim();
  return type === "boarding";
}

export function ownerCctvHref(bookingId) {
  return `/owner/cctv/${encodeURIComponent(String(bookingId))}`;
}

export function sitterCamerasHref() {
  return "/sitter/cameras";
}

export function sitterCameraModeHref(cameraId) {
  return `/sitter/cameras/${encodeURIComponent(String(cameraId))}`;
}

export function newSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeCamera(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    sitterId: row.sitterId ?? row.sitter_id ?? null,
    venueId: row.venueId ?? row.venue_id ?? null,
    name: String(row.name ?? "Camera").trim() || "Camera",
    isEnabled: row.isEnabled !== false && row.is_enabled !== false,
    status: String(row.status ?? "offline").toLowerCase() || "offline",
    lastSeenAt: row.lastSeenAt ?? row.last_seen_at ?? null,
    validFrom: row.validFrom ?? row.valid_from ?? null,
    validTo: row.validTo ?? row.valid_to ?? null,
  };
}

export function normalizeAccess(access) {
  if (!access || typeof access !== "object") {
    return { validFrom: null, validTo: null, now: null, canView: false };
  }
  return {
    validFrom: access.validFrom ?? access.valid_from ?? null,
    validTo: access.validTo ?? access.valid_to ?? null,
    now: access.now ?? null,
    canView: Boolean(access.canView ?? access.can_view),
  };
}

export function emptyCctvView() {
  return {
    cameras: [],
    access: normalizeAccess(null),
    connected: false,
  };
}

export function applyCameraEvent(view = emptyCctvView(), event) {
  if (!event || typeof event !== "object") return view;
  const type = String(event.type ?? "");

  if (type === "snapshot") {
    return {
      cameras: (event.cameras ?? []).map(normalizeCamera).filter(Boolean),
      access: normalizeAccess(event.access ?? view.access),
      connected: true,
    };
  }

  if (type === "camera:status") {
    const cameraId = String(event.cameraId ?? event.camera_id ?? "");
    const incoming = normalizeCamera({
      id: cameraId,
      name: event.name,
      status: event.status,
      isEnabled: event.isEnabled ?? event.is_enabled,
      lastSeenAt: event.lastSeenAt ?? event.last_seen_at,
    });
    const cameras = view.cameras.slice();
    const index = cameras.findIndex((camera) => camera.id === cameraId);
    if (index >= 0) {
      cameras[index] = {
        ...cameras[index],
        status: incoming?.status || cameras[index].status,
        isEnabled:
          event.isEnabled != null || event.is_enabled != null
            ? incoming.isEnabled
            : cameras[index].isEnabled,
        lastSeenAt: incoming?.lastSeenAt ?? cameras[index].lastSeenAt,
        name: event.name ? incoming.name : cameras[index].name,
      };
    } else if (incoming) {
      cameras.push(incoming);
    }
    return { ...view, cameras };
  }

  return view;
}

export function cameraTileKind(camera, { canView = true } = {}) {
  if (!canView) return "window";
  if (!camera) return "offline";
  if (camera.isEnabled === false) return "disabled";
  const status = String(camera.status ?? "").toLowerCase();
  if (status === "reconnecting") return "reconnecting";
  if (status === "online") return "live";
  return "offline";
}

/**
 * LIVE only when the viewer is actually connected (RTCPeerConnection
 * `connected` + a media track). Preview tiles skip WebRTC and fall back to
 * camera status so frame 08 still shows LIVE placeholders.
 */
export function cameraViewerKind(
  camera,
  viewer = {},
  { canView = true, preview = false } = {},
) {
  if (!canView) return "window";
  if (!camera) return "offline";
  if (camera.isEnabled === false) return "disabled";

  const viewerStatus = String(viewer.status ?? "").toLowerCase();
  const hasTrack = Boolean(viewer.stream);

  if (viewerStatus === "error" || viewerStatus === "forbidden") return "error";
  if (viewerStatus === "ended") return "disabled";

  if (preview) return cameraTileKind(camera, { canView });

  if (viewerStatus === "live" && hasTrack) return "live";
  if (viewerStatus === "connecting" || viewerStatus === "reconnecting") return "reconnecting";

  const camStatus = String(camera.status ?? "").toLowerCase();
  if (camStatus === "reconnecting") return "reconnecting";
  return "offline";
}

export function cameraStatusLabel(kind) {
  if (kind === "live") return "LIVE";
  if (kind === "reconnecting") return "OFFLINE";
  if (kind === "disabled" || kind === "offline") return "OFFLINE";
  return "OFFLINE";
}

export function cameraOfflineCopy(kind, error = "") {
  if (kind === "error") {
    return { title: "Camera offline", body: error || "Live signalling failed." };
  }
  if (kind === "disabled") return { title: "Camera offline", body: "Sitter turned this camera off" };
  if (kind === "reconnecting") return { title: "Camera offline", body: "Reconnecting…" };
  if (kind === "window") return { title: "Live view not open yet", body: "" };
  return { title: "Camera offline", body: "Waiting for the sitter to go live" };
}

export function countLiveCameras(cameras = [], access) {
  const canView = access?.canView !== false;
  return cameras.filter((camera) => cameraTileKind(camera, { canView }) === "live").length;
}

export function countEnabledCameras(cameras = []) {
  return cameras.filter((camera) => camera.isEnabled !== false).length;
}

function bangkokParts(iso, options) {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: CCTV_TZ, ...options }).format(date);
}

export function formatCctvUntil(iso) {
  if (!iso) return "";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const weekday = bangkokParts(date, { weekday: "short" });
  const dayMonth = bangkokParts(date, { day: "numeric", month: "short" });
  const time = bangkokParts(date, { hour: "2-digit", minute: "2-digit", hour12: false });
  if (!weekday || !dayMonth || !time) return "";
  return `${weekday} ${dayMonth}, ${time}`;
}

export function formatCctvUnlockLine(iso) {
  if (!iso) return "";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const weekday = bangkokParts(date, { weekday: "short" });
  const dayMonth = bangkokParts(date, { day: "numeric", month: "short" });
  const time = bangkokParts(date, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${weekday} ${dayMonth}, ${time}`;
}

export function bookingWindowIso(booking, which = "from") {
  const date =
    which === "to"
      ? booking?.end_date ?? booking?.endDate ?? booking?.checkOut
      : booking?.start_date ?? booking?.startDate ?? booking?.checkIn;
  const time =
    which === "to"
      ? booking?.end_time ?? booking?.endTime ?? "12:00"
      : booking?.start_time ?? booking?.startTime ?? "10:00";
  const day = String(date ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const clock = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(String(time ?? "").trim());
  const hh = clock ? clock[1].padStart(2, "0") : which === "to" ? "12" : "10";
  const mm = clock ? clock[2] : "00";
  return `${day}T${hh}:${mm}:00+07:00`;
}

export function formatOutsideWindowCopy(access, booking) {
  const from = formatCctvUnlockLine(access?.validFrom || bookingWindowIso(booking, "from"));
  if (!from) {
    return "Cameras unlock at check-in and close at check-out.";
  }
  return `Cameras unlock at check-in on ${from} and close at check-out.`;
}

export function formatAvailableUntil(access, booking) {
  const until = formatCctvUntil(access?.validTo || bookingWindowIso(booking, "to"));
  if (!until) return "";
  return `Access until ${until}`;
}

export function iceCandidatePayload(candidate) {
  if (!candidate) return null;
  if (typeof candidate === "string") return { candidate };
  const json = typeof candidate.toJSON === "function" ? candidate.toJSON() : candidate;
  if (!json?.candidate) return null;
  return {
    candidate: json.candidate,
    sdpMid: json.sdpMid ?? json.sdp_mid ?? "0",
    sdpMLineIndex: json.sdpMLineIndex ?? json.sdp_m_line_index ?? 0,
  };
}

export function iceQuery({ cameraId, bookingId } = {}) {
  const params = new URLSearchParams();
  if (bookingId) params.set("bookingId", String(bookingId));
  if (cameraId) params.set("cameraId", String(cameraId));
  return params.toString();
}

export function icePath({ cameraId, bookingId } = {}) {
  if (!hasIceContext({ cameraId, bookingId })) {
    throw new Error("cameraId or bookingId is required");
  }
  return `/api/ice?${iceQuery({ cameraId, bookingId })}`;
}

export function hasIceContext({ cameraId, bookingId } = {}) {
  return Boolean(cameraId || bookingId);
}

export function iceServersFromResponse(json) {
  const data = json?.data ?? json ?? {};
  const servers = data.iceServers ?? data.ice_servers;
  return Array.isArray(servers) ? servers : [];
}

export function signalBodyBytes(body) {
  try {
    const encoded = JSON.stringify(body ?? {});
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(encoded).byteLength;
    }
    return encoded.length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function canSendSignal(body, maxBytes = MAX_SIGNAL_BYTES) {
  return signalBodyBytes(body) <= maxBytes;
}

export function signallingErrorMessage(error) {
  const status = Number(error?.status);
  const message = error instanceof Error ? error.message : "";
  if (status === 413) return "That signalling message was too large to send.";
  if (status === 429) {
    if (/signalling messages/i.test(message)) {
      return "Too many signalling messages. Wait a moment and retry.";
    }
    return "Too many live views on this camera. Close another view and retry.";
  }
  if (status === 409) return "This live session is already in use. Retrying…";
  if (status === 403) return "This camera is not available right now.";
  return message || "Live signalling failed.";
}

export function mediaPermissionMessage(error) {
  const name = String(error?.name ?? "");
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission is off. Allow the camera to go live.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "This camera is already in use.";
  }
  return error instanceof Error ? error.message : "Could not open the camera.";
}

export function defaultStunServers() {
  return [{ urls: ["stun:stun.l.google.com:19302"] }];
}

export const CCTV_GAPS = [
  "Remind me — no reminder endpoint; button is visible only.",
  "Snapshots today — no snapshot storage API; thumbs are this-session canvas captures.",
  "Sound — local mute on the video element, not a server flag.",
  "Sitter earnings this month — no earnings endpoint; omitted.",
  "Receipt on booking detail — no receipt endpoint; omitted.",
];
