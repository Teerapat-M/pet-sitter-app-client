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
  "source_changed",
]);
/** Same pattern as cameras_youtube_video_id_format_check (server PR #16). */
export const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const YOUTUBE_INVALID_MESSAGE = "Invalid YouTube video URL or id";
export const YOUTUBE_LIVE_NOTE =
  "Unlisted YouTube links are viewable by anyone with the link. Typical delay is 5–30 seconds.";

export function isBoardingBooking(booking) {
  const type = String(
    booking?.service_type ?? booking?.serviceType ?? booking?.service?.type ?? "",
  ).trim();
  return type === "boarding";
}

/** Boarding CCTV plus walk-along webcam when a GPS walk is in progress. */
export function bookingAllowsOwnerCameras(booking) {
  const type = String(
    booking?.service_type ?? booking?.serviceType ?? booking?.service?.type ?? "",
  ).trim();
  return type === "boarding" || type === "dog_walking";
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

export function cameraSource(row) {
  return String(row?.source ?? "webrtc") === "youtube" ? "youtube" : "webrtc";
}

export function isYoutubeCamera(row) {
  return cameraSource(row) === "youtube";
}

export function youtubeVideoIdOf(row) {
  if (!isYoutubeCamera(row)) return null;
  const id = row?.youtubeVideoId ?? row?.youtube_video_id ?? null;
  return typeof id === "string" && YOUTUBE_VIDEO_ID_RE.test(id) ? id : null;
}

export function youtubeEmbedSrc(id) {
  const videoId = asYoutubeVideoId(id);
  if (!videoId) return "";
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1`;
}

function youtubeHostKind(hostname) {
  const host = String(hostname ?? "").toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") return "youtu.be";
  if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
    return "youtube.com";
  }
  return null;
}

function youtubePathParts(pathname) {
  return String(pathname ?? "")
    .split("/")
    .filter((part) => part.length > 0);
}

function asYoutubeVideoId(value) {
  const id = String(value ?? "").trim();
  return YOUTUBE_VIDEO_ID_RE.test(id) ? id : null;
}

function idFromYoutubeUrl(raw) {
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const kind = youtubeHostKind(url.hostname);
  if (!kind) return null;
  const parts = youtubePathParts(url.pathname);

  if (kind === "youtu.be") {
    if (parts.length !== 1) return null;
    return asYoutubeVideoId(parts[0]);
  }
  if (parts.length === 1 && parts[0] === "watch") {
    return asYoutubeVideoId(url.searchParams.get("v"));
  }
  if (parts.length === 2 && parts[0] === "live") {
    return asYoutubeVideoId(parts[1]);
  }
  return null;
}

/**
 * Accept watch / youtu.be / live URLs (www/m) or a bare 11-char id.
 * Stream keys, RTMP, embed, and shorts return null.
 */
export function parseYoutubeVideoId(input) {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;
  return asYoutubeVideoId(raw) || idFromYoutubeUrl(raw);
}

export function normalizeCamera(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  const source = cameraSource(row);
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
    source,
    youtubeVideoId: source === "youtube" ? youtubeVideoIdOf({ ...row, source }) : null,
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
  if (isYoutubeCamera(camera)) return youtubeVideoIdOf(camera) ? "live" : "unavailable";
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
  if (isYoutubeCamera(camera)) return youtubeVideoIdOf(camera) ? "live" : "unavailable";

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
  if (kind === "unavailable") {
    return { title: "Camera offline", body: "This camera is not available right now." };
  }
  if (kind === "reconnecting") return { title: "Camera offline", body: "Reconnecting…" };
  if (kind === "window") return { title: "Live view not open yet", body: "" };
  return { title: "Camera offline", body: "Waiting for the sitter to go live" };
}

/** YouTube cameras skip ICE/signalling (server 400). Preview never starts WebRTC. */
export function shouldStartWebrtc(camera, { canView = true, preview = false } = {}) {
  if (preview || !canView || isYoutubeCamera(camera)) return false;
  return cameraTileKind(camera, { canView }) === "live";
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

/**
 * Attach a MediaStream to a video element that may not exist until LIVE.
 * Call from a ref callback (element mount) and whenever stream/live changes.
 */
export function syncVideoSrcObject(node, stream) {
  if (!node) return null;
  node.srcObject = stream ?? null;
  return node.srcObject;
}

/** CSS aspect-ratio before video metadata (16 / 9). */
export const DEFAULT_CAMERA_ASPECT = 16 / 9;
export const CAMERA_TILE_MAX_HEIGHT_VH = 75;

export function videoAspectRatio(video, fallback = DEFAULT_CAMERA_ASPECT) {
  const width = Number(video?.videoWidth);
  const height = Number(video?.videoHeight);
  if (!(width > 0) || !(height > 0)) return fallback;
  return width / height;
}

export function cameraTileBoxStyle({
  aspect = DEFAULT_CAMERA_ASPECT,
  solo = false,
  maxHeightVh = CAMERA_TILE_MAX_HEIGHT_VH,
} = {}) {
  const ratio = Number(aspect);
  const ar = Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_CAMERA_ASPECT;
  const style = { "--camera-tile-ar": String(ar) };
  if (solo) {
    style.width = `min(100%, calc(${maxHeightVh}vh * ${ar}))`;
    style.maxHeight = `${maxHeightVh}vh`;
  }
  return style;
}

export function bindVideoAspect(video, onAspect) {
  if (!video || typeof onAspect !== "function") return () => {};
  const emit = () => onAspect(videoAspectRatio(video));
  emit();
  video.addEventListener("loadedmetadata", emit);
  video.addEventListener("resize", emit);
  return () => {
    video.removeEventListener("loadedmetadata", emit);
    video.removeEventListener("resize", emit);
  };
}

/** Frame 08: one large featured tile + up to three small tiles in the side column. */
export function ownerFeaturedPlacement(camera, selectedId, cameras = []) {
  const others = cameras.filter((item) => item.id !== selectedId);
  if (camera?.id === selectedId) {
    if (others.length >= 3) return "lg:col-start-1 lg:row-start-1 lg:row-span-3";
    if (others.length === 2) return "lg:col-start-1 lg:row-start-1 lg:row-span-2";
    if (others.length === 0) return "lg:col-span-2 lg:row-start-1";
    return "lg:col-start-1 lg:row-start-1";
  }
  const index = others.findIndex((item) => item.id === camera?.id);
  if (index === 0) return "lg:col-start-2 lg:row-start-1";
  if (index === 1) return "lg:col-start-2 lg:row-start-2";
  if (index === 2) return "lg:col-start-2 lg:row-start-3";
  return "lg:col-start-2";
}

export function ownerAfterCamerasRowClass(selectedId, cameras = []) {
  const others = cameras.filter((item) => item.id !== selectedId);
  const row = Math.max(others.length, 1) + 1;
  if (row === 4) return "lg:row-start-4";
  if (row === 3) return "lg:row-start-3";
  return "lg:row-start-2";
}

export function ownerCctvCameraGridClass(layout = "featured") {
  return layout === "featured"
    ? "lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch lg:gap-x-4"
    : "md:grid-cols-2";
}

/**
 * Buffer local ICE until the offer/answer POST that creates the signalling
 * session has resolved, then flush in enqueue order.
 */
export function createIceFlushQueue({ send } = {}) {
  const pending = [];
  let opened = false;
  let generation = 0;
  let chain = Promise.resolve();

  function enqueue(body) {
    if (!body || !canSendSignal(body)) return;
    pending.push(body);
    if (opened) void flush();
  }

  function flush() {
    const current = generation;
    chain = chain.then(async () => {
      while (pending.length && current === generation) {
        const body = pending.shift();
        try {
          await send?.(body);
        } catch {
          // keep remaining candidates moving
        }
      }
    });
    return chain;
  }

  function markReady() {
    opened = true;
    return flush();
  }

  function reset() {
    generation += 1;
    pending.length = 0;
    opened = false;
    chain = Promise.resolve();
  }

  return { enqueue, markReady, reset };
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

export const CAMERA_PRIVACY_NOTE =
  "Private: only owners with an active booking can watch";

export function cameraPausedForGuests(camera) {
  return camera?.isEnabled === false;
}

export function cameraPauseToggleLabel(paused) {
  return paused ? "Resume camera" : "Pause camera for guests";
}

export function cameraGuestStateLabel(paused, status) {
  if (paused) return "Paused for guests";
  if (status === "online") return "Live for guests";
  if (status === "reconnecting") return "Reconnecting…";
  return "On · waiting to go live";
}

export const CAMERA_DEVICE_STORAGE_KEY = "psp_camera_device_id";

export function persistCameraDeviceId(deviceId, storage) {
  const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!store) return;
  const value = String(deviceId ?? "").trim();
  try {
    if (value) store.setItem(CAMERA_DEVICE_STORAGE_KEY, value);
    else store.removeItem(CAMERA_DEVICE_STORAGE_KEY);
  } catch {
    // ignore quota / private-mode
  }
}

export function readPersistedCameraDeviceId(storage) {
  const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!store?.getItem) return "";
  try {
    return String(store.getItem(CAMERA_DEVICE_STORAGE_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

export function usableCameraDeviceId(deviceId, devices = []) {
  const id = String(deviceId ?? "").trim();
  if (!id) return "";
  if (!devices.length) return id;
  return devices.some((device) => device.deviceId === id) ? id : "";
}

export function switchCameraErrorMessage(error) {
  const name = String(error?.name ?? "");
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission was denied. The previous camera is still in use.";
  }
  if (name === "NotReadableError") {
    return "That camera is already in use. The previous camera is still in use.";
  }
  if (name === "OverconstrainedError") {
    return "That camera is not available. The previous camera is still in use.";
  }
  return mediaPermissionMessage(error);
}

export function videoSendersFromPeers(peers) {
  const senders = [];
  if (!peers) return senders;
  const entries = typeof peers.values === "function" ? peers.values() : Object.values(peers);
  for (const entry of entries) {
    const pc = entry?.pc ?? entry;
    for (const sender of pc?.getSenders?.() ?? []) {
      if (sender?.track?.kind === "video") senders.push(sender);
    }
  }
  return senders;
}

export async function switchPublisherVideo({
  deviceId,
  currentStream,
  peers,
  getUserMedia,
  MediaStreamCtor = globalThis.MediaStream,
} = {}) {
  const id = String(deviceId ?? "").trim();
  if (!id) throw new TypeError("deviceId is required");
  const acquire =
    getUserMedia ??
    navigator?.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if (typeof acquire !== "function") {
    throw new Error("Camera switching is not supported in this browser.");
  }

  const media = await acquire({ video: { deviceId: { exact: id } } });
  const newVideo = media.getVideoTracks?.()[0];
  if (!newVideo) {
    media.getTracks?.().forEach((track) => track.stop?.());
    const error = new Error("No video track");
    error.name = "NotFoundError";
    throw error;
  }

  const oldVideos = currentStream?.getVideoTracks?.() ?? [];
  await Promise.all(
    videoSendersFromPeers(peers).map((sender) => sender.replaceTrack(newVideo)),
  );

  const Stream = MediaStreamCtor;
  const next = Stream ? new Stream() : media;
  if (Stream) {
    next.addTrack(newVideo);
    for (const track of currentStream?.getAudioTracks?.() ?? []) next.addTrack(track);
  }
  for (const track of media.getTracks?.() ?? []) {
    if (track !== newVideo) track.stop?.();
  }
  for (const track of oldVideos) track.stop?.();

  const used = newVideo.getSettings?.().deviceId || id;
  return { stream: next, deviceId: used, track: newVideo };
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
