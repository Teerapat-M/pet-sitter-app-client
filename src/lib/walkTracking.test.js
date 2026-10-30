import assert from "node:assert/strict";
import test from "node:test";
import {
  OWNER_WALK_LIVE_LABEL,
  OWNER_WALK_WAITING_LABEL,
  WALK_FLUSH_MS,
  WALK_MAX_BATCH,
  addMinutesToClock,
  applyWalkEvent,
  createWalkPointBuffer,
  emptyWalkView,
  firstPetName,
  formatUpdatedAgo,
  formatWalkDistance,
  formatWalkDuration,
  formatWalkElapsed,
  formatWalkPace,
  formatWalkStatDistance,
  formatWalkSummary,
  isDogWalkingBooking,
  loadWalkHistory,
  ownerWalkProgressCopy,
  ownerWalkProgressState,
  parseSseFrames,
  pathDistanceMeters,
  positionToPoint,
  shouldKeepClientPoint,
  walkDurationMinutes,
  walkHasStarted,
} from "./walkTracking.js";

test("isDogWalkingBooking reads service_type and duration_unit walk", () => {
  assert.equal(isDogWalkingBooking({ service_type: "dog_walking" }), true);
  assert.equal(isDogWalkingBooking({ serviceType: "boarding" }), false);
  assert.equal(isDogWalkingBooking({ duration_unit: "walk" }), true);
  assert.equal(isDogWalkingBooking({ service_type: "in_home" }), false);
});

test("distance and duration formatters match walk summary copy", () => {
  assert.equal(formatWalkDistance(640), "640 m");
  assert.equal(formatWalkDistance(2100), "2.10 km");
  assert.equal(formatWalkStatDistance(2400), "2.4 km");
  assert.equal(formatWalkStatDistance(4100), "4.1 km");
  assert.equal(formatWalkDuration(0), "0 s");
  assert.equal(formatWalkDuration(20), "20 s");
  assert.equal(formatWalkDuration(42), "42 s");
  assert.equal(formatWalkDuration(59), "59 s");
  assert.equal(formatWalkDuration(60), "1 min");
  assert.equal(formatWalkDuration(420), "7 min");
  assert.equal(formatWalkDuration(2760), "46 min");
  assert.equal(formatWalkDuration(3720), "1h 2m");
  assert.equal(formatWalkSummary({ distanceM: 60, durationS: 20 }), "0.06 km in 20 s");
  assert.equal(formatWalkSummary({ distanceM: 2100, durationS: 2760 }), "2.10 km in 46 min");
  assert.equal(formatWalkElapsed(1934), "32:14");
  assert.equal(formatWalkElapsed(3520), "58:40");
  assert.equal(formatWalkPace(2400, 1934), "13'/km");
  assert.equal(formatWalkPace(4100, 3520), "14'/km");
  assert.equal(formatWalkPace(0, 60), "—");
  assert.equal(addMinutesToClock("08:02", 60), "09:02");
  assert.equal(
    formatUpdatedAgo("2026-11-14T01:02:00.000Z", Date.parse("2026-11-14T01:02:05.000Z")),
    "updated 5s ago",
  );
  assert.equal(firstPetName({ pet_names: "Bobo, Milo" }), "Bobo");
  assert.equal(walkDurationMinutes({ duration: 60, duration_unit: "walk" }), 60);
});

test("short walks show seconds in duration (under 1 min)", () => {
  assert.equal(formatWalkDuration(20), "20 s");
  assert.equal(formatWalkDuration(59.4), "59 s");
  assert.equal(formatWalkDuration(60), "1 min");
  assert.equal(formatWalkSummary({ distanceM: 60, durationS: 20 }), "0.06 km in 20 s");
});

test("path distance is haversine along the trail", () => {
  const meters = pathDistanceMeters([
    { lat: 13.7307, lng: 100.5418 },
    { lat: 13.7307, lng: 100.5418 },
    { lat: 13.732, lng: 100.55 },
  ]);
  assert.ok(meters > 800);
  assert.ok(meters < 2000);
});

test("client point buffering keeps a 5s interval and flushes batches", async () => {
  const posts = [];
  let now = 0;
  const buffer = createWalkPointBuffer({
    flushMs: WALK_FLUSH_MS,
    maxBatch: 3,
    minIntervalMs: 5000,
    now: () => now,
    postFn: async (body) => {
      posts.push(body);
      return { accepted: body.points.length, skipped: 0 };
    },
  });

  const first = {
    lat: 13.73,
    lng: 100.58,
    recordedAt: "2026-10-30T02:09:00.000Z",
  };
  const tooSoon = {
    lat: 13.7301,
    lng: 100.5801,
    recordedAt: "2026-10-30T02:09:02.000Z",
  };
  const later = {
    lat: 13.7302,
    lng: 100.5802,
    recordedAt: "2026-10-30T02:09:08.000Z",
  };

  assert.equal(buffer.enqueue(first), true);
  assert.equal(buffer.enqueue(tooSoon), false);
  assert.equal(buffer.enqueue(later), true);
  assert.equal(buffer.length, 2);

  const flushed = await buffer.flush();
  assert.equal(flushed.flushed, 2);
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].points.map((point) => point.lat), [13.73, 13.7302]);
  assert.ok(posts[0].points.length <= WALK_MAX_BATCH);
  buffer.dispose();
});

test("failed flush keeps the buffer for offline retry", async () => {
  let fail = true;
  let clock = 0;
  const buffer = createWalkPointBuffer({
    minIntervalMs: 0,
    now: () => clock,
    postFn: async (body) => {
      if (fail) {
        const error = new Error("offline");
        error.status = 0;
        throw error;
      }
      return { accepted: body.points.length };
    },
  });

  buffer.enqueue({ lat: 13.73, lng: 100.58, recordedAt: "2026-10-30T02:09:00.000Z" });
  const first = await buffer.flush();
  assert.equal(first.flushed, 0);
  assert.equal(buffer.length, 1);

  fail = false;
  clock = 30_000;
  const second = await buffer.flush();
  assert.equal(second.flushed, 1);
  assert.equal(buffer.length, 0);
  buffer.dispose();
});

test("SSE parser reads snapshot then point/ended and ignores keepalives", () => {
  const chunk = [
    ": keepalive",
    "",
    'data: {"type":"live","bookingId":"b1","walk":{"id":"w1","status":"live"},"points":[{"id":1,"lat":13.73,"lng":100.58}]}',
    "",
    'data: {"type":"point","bookingId":"b1","point":{"id":2,"lat":13.731,"lng":100.581}}',
    "",
    'data: {"type":"ended","bookingId":"b1","distanceM":640,"durationS":420}',
    "",
    "data: {",
  ].join("\n");

  const { events, rest } = parseSseFrames(chunk);
  assert.equal(events.length, 3);
  assert.equal(events[0].type, "live");
  assert.equal(events[1].type, "point");
  assert.equal(events[2].type, "ended");
  assert.equal(rest.startsWith("data: {"), true);

  let view = emptyWalkView();
  view = applyWalkEvent(view, events[0]);
  assert.equal(view.status, "live");
  assert.equal(view.points.length, 1);
  view = applyWalkEvent(view, events[1]);
  assert.equal(view.points.length, 2);
  view = applyWalkEvent(view, events[2]);
  assert.equal(view.status, "ended");
  assert.equal(view.distanceM, 640);
  assert.equal(view.durationS, 420);
  assert.equal(formatWalkSummary(view), "0.64 km in 7 min");
});

test("positionToPoint copies lat/lng/accuracy from geolocation", () => {
  const point = positionToPoint({
    timestamp: Date.parse("2026-10-30T02:09:08.000Z"),
    coords: { latitude: 13.7308, longitude: 100.5813, accuracy: 6 },
  });
  assert.equal(point.lat, 13.7308);
  assert.equal(point.lng, 100.5813);
  assert.equal(point.accuracy, 6);
  assert.equal(point.recordedAt, "2026-10-30T02:09:08.000Z");
});

test("shouldKeepClientPoint enforces the 5-10s client interval", () => {
  const a = { lat: 1, lng: 2, recordedAt: "2026-10-30T02:09:00.000Z" };
  const b = { lat: 1, lng: 2, recordedAt: "2026-10-30T02:09:03.000Z" };
  const c = { lat: 1, lng: 2, recordedAt: "2026-10-30T02:09:06.000Z" };
  assert.equal(shouldKeepClientPoint(null, a), true);
  assert.equal(shouldKeepClientPoint(a, b), false);
  assert.equal(shouldKeepClientPoint(a, c), true);
});

function notFound(message = "not found") {
  const error = new Error(message);
  error.status = 404;
  return error;
}

test("loadWalkHistory skips /walk/points until a walk exists and treats 404 as empty", async () => {
  const pointsCalls = [];
  const missing = await loadWalkHistory("booking-1", {
    getWalk: async () => {
      throw notFound("Walk not found");
    },
    getWalkPoints: async () => {
      pointsCalls.push("points");
      throw new Error("GET /walk/points should not run before a walk exists");
    },
  });
  assert.equal(missing.missing, true);
  assert.equal(missing.walk, null);
  assert.deepEqual(missing.points, []);
  assert.equal(pointsCalls.length, 0);

  const waitingWalk = await loadWalkHistory("booking-1", {
    getWalk: async () => ({ id: "w1", status: "waiting" }),
    getWalkPoints: async () => {
      pointsCalls.push("points");
      throw new Error("GET /walk/points should not run while the walk is waiting");
    },
  });
  assert.equal(waitingWalk.missing, false);
  assert.equal(waitingWalk.walk?.status, "waiting");
  assert.deepEqual(waitingWalk.points, []);
  assert.equal(pointsCalls.length, 0);
  assert.equal(walkHasStarted(waitingWalk.walk), false);
});

test("loadWalkHistory fetches points after a walk exists and swallows points 404", async () => {
  const live = await loadWalkHistory("booking-1", {
    getWalk: async () => ({ id: "w1", status: "live", distanceM: 12 }),
    getWalkPoints: async () => ({
      walk: { id: "w1", status: "live" },
      points: [{ lat: 13.7, lng: 100.5 }],
      summary: { distanceM: 12, durationS: 20 },
    }),
  });
  assert.equal(live.missing, false);
  assert.equal(live.walk.id, "w1");
  assert.equal(live.points.length, 1);

  const emptyTrail = await loadWalkHistory("booking-1", {
    knownWalk: { id: "w1", status: "live", lastPoint: { lat: 1, lng: 2 } },
    getWalk: async () => {
      throw new Error("getWalk should be skipped when knownWalk has started");
    },
    getWalkPoints: async () => {
      throw notFound("No points yet");
    },
  });
  assert.equal(emptyTrail.missing, false);
  assert.equal(emptyTrail.walk.id, "w1");
  assert.equal(emptyTrail.points.length, 1);
  assert.equal(emptyTrail.points[0].lat, 1);
});

test("owner booking detail waits until the walk has started", () => {
  assert.equal(
    ownerWalkProgressState({ bookingStatus: "in_service", walkStatus: "waiting" }),
    "waiting",
  );
  assert.equal(
    ownerWalkProgressState({ bookingStatus: "in_service", walkStatus: "" }),
    "waiting",
  );
  assert.equal(
    ownerWalkProgressState({ bookingStatus: "in_service", walkStatus: "live" }),
    "live",
  );
  assert.equal(
    ownerWalkProgressState({ bookingStatus: "in_service", walkStatus: "started" }),
    "live",
  );
  assert.equal(
    ownerWalkProgressState({ bookingStatus: "completed", walkStatus: "ended" }),
    "ended",
  );
  assert.equal(ownerWalkProgressCopy("waiting"), OWNER_WALK_WAITING_LABEL);
  assert.equal(ownerWalkProgressCopy("live"), OWNER_WALK_LIVE_LABEL);
  assert.equal(OWNER_WALK_WAITING_LABEL, "Waiting for walk to start");
});
