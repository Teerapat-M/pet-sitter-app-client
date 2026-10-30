/**
 * Phase 4 GPS walk helpers.
 * Matches server docs/phase4-api.md — client never invents walk endpoints.
 */

export const WALK_FLUSH_MS = 8000;
export const WALK_MIN_INTERVAL_MS = 5000;
export const WALK_MAX_BATCH = 60;
export const WALK_RETRY_MS = 2000;
export const BANGKOK_CENTER = [13.7563, 100.5018];

export function isDogWalkingBooking(booking) {
  const type = String(
    booking?.service_type ?? booking?.serviceType ?? booking?.service?.type ?? "",
  ).trim();
  if (type === "dog_walking") return true;
  return String(booking?.duration_unit ?? booking?.durationUnit ?? "").trim() === "walk";
}

export function walkOwnerHref(bookingId) {
  return `/owner/walks/${encodeURIComponent(String(bookingId))}`;
}

export function walkSitterHref(bookingId) {
  return `/sitter/walks/${encodeURIComponent(String(bookingId))}`;
}

export function formatWalkDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value) || value < 0) return "0 m";
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(2)} km`;
}

export function formatWalkDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "0 min";
  const minutes = Math.max(value > 0 ? 1 : 0, Math.round(value / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatWalkSummary({ distanceM = 0, durationS = 0 } = {}) {
  const km = (Number(distanceM) / 1000).toFixed(2);
  const minutes = Math.max(1, Math.round(Number(durationS) / 60) || 1);
  return `${km} km in ${minutes} min`;
}

export function formatWalkClock(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

export function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return 0;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathDistanceMeters(points = []) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

export function positionToPoint(position, now = () => new Date()) {
  const coords = position?.coords;
  if (!coords) return null;
  const lat = Number(coords.latitude);
  const lng = Number(coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const recordedAt = Number.isFinite(position.timestamp)
    ? new Date(position.timestamp).toISOString()
    : now().toISOString();
  const accuracy = Number(coords.accuracy);
  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    recordedAt,
  };
}

export function shouldKeepClientPoint(last, next, minIntervalMs = WALK_MIN_INTERVAL_MS) {
  if (!next) return false;
  if (!last) return true;
  const lastMs = Date.parse(last.recordedAt);
  const nextMs = Date.parse(next.recordedAt);
  if (!Number.isFinite(nextMs)) return false;
  if (Number.isFinite(lastMs) && nextMs - lastMs < minIntervalMs) return false;
  return true;
}

export function geolocationErrorMessage(error) {
  const code = error?.code;
  if (code === 1 || error?.PERMISSION_DENIED === 1) {
    return "Location permission is off. Enable it to share the walk.";
  }
  if (code === 2) return "Can't read GPS right now. We'll keep trying.";
  if (code === 3) return "GPS timed out. Move to an open area and retry.";
  if (error?.message) return error.message;
  return "Location is unavailable.";
}

export function parseSseFrames(buffer) {
  const parts = String(buffer ?? "").split("\n\n");
  const rest = parts.pop() ?? "";
  const events = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.startsWith(":")) continue;
    const data = part
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, ""))
      .join("");
    if (!data) continue;
    try {
      events.push(JSON.parse(data));
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, rest };
}

export function emptyWalkView() {
  return {
    status: "waiting",
    walk: null,
    points: [],
    distanceM: 0,
    durationS: 0,
  };
}

export function mergeWalkPoints(existing = [], incoming = []) {
  const map = new Map();
  for (const point of [...existing, ...incoming]) {
    if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lng))) {
      continue;
    }
    const key =
      point.id != null
        ? `id:${point.id}`
        : `t:${point.recordedAt ?? ""}:${point.lat}:${point.lng}`;
    map.set(key, {
      ...point,
      lat: Number(point.lat),
      lng: Number(point.lng),
    });
  }
  return [...map.values()].sort((a, b) => {
    if (a.id != null && b.id != null) return Number(a.id) - Number(b.id);
    return String(a.recordedAt ?? "").localeCompare(String(b.recordedAt ?? ""));
  });
}

export function applyWalkEvent(view = emptyWalkView(), event) {
  if (!event || typeof event !== "object") return view;
  const type = String(event.type ?? "");
  if (!type || type === "connected") return view;

  if (type === "waiting") {
    return { ...emptyWalkView(), status: "waiting" };
  }

  if (type === "live" || type === "started") {
    const points = mergeWalkPoints(view.points, event.points ?? (event.point ? [event.point] : []));
    const walk = event.walk ?? view.walk;
    return {
      status: "live",
      walk,
      points,
      distanceM: Number(event.distanceM ?? walk?.distanceM ?? view.distanceM) || 0,
      durationS: Number(event.durationS ?? walk?.durationS ?? view.durationS) || 0,
    };
  }

  if (type === "point" && event.point) {
    const points = mergeWalkPoints(view.points, [event.point]);
    return {
      ...view,
      status: view.status === "ended" ? "ended" : "live",
      points,
    };
  }

  if (type === "ended") {
    const points = mergeWalkPoints(view.points, event.points ?? []);
    const walk = event.walk ?? (view.walk ? { ...view.walk, status: "ended" } : view.walk);
    return {
      status: "ended",
      walk,
      points,
      distanceM: Number(event.distanceM ?? walk?.distanceM ?? view.distanceM) || 0,
      durationS: Number(event.durationS ?? walk?.durationS ?? view.durationS) || 0,
    };
  }

  return view;
}

export function pointsToLatLngs(points = []) {
  return points
    .map((point) => [Number(point.lat), Number(point.lng)])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
}

export function createWalkPointBuffer({
  flushMs = WALK_FLUSH_MS,
  maxBatch = WALK_MAX_BATCH,
  minIntervalMs = WALK_MIN_INTERVAL_MS,
  postFn,
  now = () => Date.now(),
} = {}) {
  let queue = [];
  let lastKept = null;
  let inflight = false;
  let retryAt = 0;
  let consecutiveErrors = 0;
  let timer = null;
  let disposed = false;
  let flushCount = 0;

  function pending() {
    return queue.slice();
  }

  function enqueue(point) {
    if (disposed || !point) return false;
    if (!shouldKeepClientPoint(lastKept, point, minIntervalMs)) return false;
    lastKept = point;
    queue.push(point);
    return true;
  }

  async function flush() {
    if (disposed || inflight || !queue.length) {
      return { flushed: 0, skipped: true };
    }
    if (now() < retryAt) {
      return { flushed: 0, waiting: true };
    }

    const batch = queue.slice(0, maxBatch);
    inflight = true;
    flushCount += 1;
    try {
      const result = await postFn({ points: batch });
      queue = queue.slice(batch.length);
      consecutiveErrors = 0;
      return { flushed: batch.length, result };
    } catch (error) {
      consecutiveErrors += 1;
      const backoff =
        error?.status === 429
          ? 15000
          : Math.min(30000, 2000 * 2 ** Math.min(consecutiveErrors, 4));
      retryAt = now() + backoff;
      return { flushed: 0, error };
    } finally {
      inflight = false;
    }
  }

  function start() {
    if (timer || disposed) return;
    timer = setInterval(() => {
      void flush();
    }, flushMs);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  async function flushRemaining() {
    stop();
    while (queue.length && !disposed) {
      const outcome = await flush();
      if (outcome.error || outcome.flushed === 0) break;
    }
  }

  function dispose() {
    disposed = true;
    stop();
    queue = [];
  }

  return {
    enqueue,
    flush,
    flushRemaining,
    start,
    stop,
    dispose,
    pending,
    get length() {
      return queue.length;
    },
    get flushCount() {
      return flushCount;
    },
  };
}
