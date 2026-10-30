import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_OWNER_SESSIONS_PER_CAMERA,
  MAX_SIGNAL_BYTES,
  applyCameraEvent,
  canSendSignal,
  cameraOfflineCopy,
  cameraTileKind,
  cameraViewerKind,
  createIceFlushQueue,
  countLiveCameras,
  emptyCctvView,
  formatAvailableUntil,
  formatCctvUntil,
  formatOutsideWindowCopy,
  hasIceContext,
  icePath,
  iceQuery,
  iceServersFromResponse,
  isBoardingBooking,
  ownerCctvHref,
  signalBodyBytes,
  signallingErrorMessage,
  syncVideoSrcObject,
} from "./cctv.js";

test("isBoardingBooking reads service_type", () => {
  assert.equal(isBoardingBooking({ service_type: "boarding" }), true);
  assert.equal(isBoardingBooking({ serviceType: "dog_walking" }), false);
  assert.equal(isBoardingBooking({ service: { type: "boarding" } }), true);
});

test("owner CCTV href and ICE query require camera/booking context", () => {
  assert.equal(ownerCctvHref("abc"), "/owner/cctv/abc");
  assert.equal(hasIceContext({}), false);
  assert.equal(hasIceContext({ cameraId: "cam-1" }), true);
  assert.equal(hasIceContext({ bookingId: "b-1" }), true);
  assert.equal(iceQuery({ cameraId: "cam-1" }), "cameraId=cam-1");
  assert.equal(icePath({ cameraId: "cam-1" }), "/api/ice?cameraId=cam-1");
  assert.equal(icePath({ bookingId: "b-1" }), "/api/ice?bookingId=b-1");
  assert.equal(
    icePath({ bookingId: "b-1", cameraId: "cam-1" }),
    "/api/ice?bookingId=b-1&cameraId=cam-1",
  );
  assert.throws(() => icePath({}), /cameraId or bookingId is required/);
});

test("GET /api/ice response maps iceServers and ignores extra TURN ttl fields", () => {
  const servers = iceServersFromResponse({
    data: {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302"] },
        { urls: ["turn:turn.example.com:3478"], username: "ephemeral", credential: "short-lived" },
      ],
      expiresAt: "2026-10-30T21:20:00.000Z",
    },
  });
  assert.equal(servers.length, 2);
  assert.equal(servers[1].username, "ephemeral");
});

test("signalling over the byte limit is 413", () => {
  assert.equal(MAX_SIGNAL_BYTES, 16384);
  const small = { type: "ice", sessionId: "s1", candidate: { candidate: "candidate:1", sdpMid: "0" } };
  assert.equal(canSendSignal(small), true);

  const tenKbSdp = {
    type: "offer",
    sessionId: "s1",
    sdp: `v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\n${"a=ice-pwd:".padEnd(10_000, "x")}`,
  };
  const tenKbBytes = signalBodyBytes(tenKbSdp);
  assert.ok(tenKbBytes > 10_000, `expected ~10KB SDP, got ${tenKbBytes}`);
  assert.ok(tenKbBytes < MAX_SIGNAL_BYTES, `~10KB SDP must fit under ${MAX_SIGNAL_BYTES}, got ${tenKbBytes}`);
  assert.equal(canSendSignal(tenKbSdp), true);

  const over = { type: "offer", sessionId: "s1", sdp: "v=0\n".repeat(5_000) };
  assert.equal(signalBodyBytes(over) > MAX_SIGNAL_BYTES, true);
  assert.equal(canSendSignal(over), false);
  assert.equal(signalBodyBytes({ type: "ice", sessionId: "s1", candidate: { candidate: "a" } }) < MAX_SIGNAL_BYTES, true);
  const err = new Error("payload");
  err.status = 413;
  assert.match(signallingErrorMessage(err), /too large/i);
});

test("owner is limited to two viewer sessions per camera", () => {
  assert.equal(MAX_OWNER_SESSIONS_PER_CAMERA, 2);
  const err = new Error("Too many live sessions for this camera");
  err.status = 429;
  assert.match(signallingErrorMessage(err), /Too many live views/i);
  const rate = new Error("Too many signalling messages");
  rate.status = 429;
  assert.match(signallingErrorMessage(rate), /signalling messages/i);
});

test("applyCameraEvent snapshot and status updates", () => {
  let view = emptyCctvView();
  view = applyCameraEvent(view, {
    type: "snapshot",
    access: { canView: true, validTo: "2026-11-15T05:00:00.000Z" },
    cameras: [
      { id: "c1", name: "Play room", status: "online", isEnabled: true },
      { id: "c2", name: "Bedroom", status: "offline", isEnabled: false },
    ],
  });
  assert.equal(view.cameras.length, 2);
  assert.equal(view.access.canView, true);
  assert.equal(cameraTileKind(view.cameras[0], { canView: true }), "live");
  assert.equal(cameraTileKind(view.cameras[1], { canView: true }), "disabled");
  assert.equal(countLiveCameras(view.cameras, view.access), 1);

  view = applyCameraEvent(view, {
    type: "camera:status",
    cameraId: "c1",
    status: "reconnecting",
    isEnabled: true,
  });
  assert.equal(cameraTileKind(view.cameras[0]), "reconnecting");
});

test("viewer tile is LIVE only when connected with a track; errors show copy", () => {
  const camera = { id: "c1", name: "Cam 1 · Play room", status: "online", isEnabled: true };
  const stream = { id: "media" };

  assert.equal(cameraViewerKind(camera, { status: "live", stream }, { canView: true }), "live");
  assert.equal(cameraViewerKind(camera, { status: "live", stream: null }, { canView: true }), "offline");
  assert.equal(cameraViewerKind(camera, { status: "connecting" }, { canView: true }), "reconnecting");
  assert.equal(cameraViewerKind(camera, {}, { canView: true }), "offline");
  assert.equal(
    cameraViewerKind(camera, {}, { canView: true, preview: true }),
    "live",
  );

  const tooMany = new Error("Too many live sessions for this camera");
  tooMany.status = 429;
  assert.equal(
    cameraViewerKind(camera, { status: "error", error: signallingErrorMessage(tooMany) }, { canView: true }),
    "error",
  );
  assert.match(cameraOfflineCopy("error", signallingErrorMessage(tooMany)).body, /Too many live views/i);

  const oversized = new Error("payload");
  oversized.status = 413;
  assert.equal(
    cameraViewerKind(camera, { status: "error", error: signallingErrorMessage(oversized) }, { canView: true }),
    "error",
  );
  assert.match(cameraOfflineCopy("error", signallingErrorMessage(oversized)).body, /too large/i);

  const forbidden = new Error("no");
  forbidden.status = 403;
  assert.equal(
    cameraViewerKind(camera, { status: "forbidden", error: signallingErrorMessage(forbidden) }, { canView: true }),
    "error",
  );
  assert.match(cameraOfflineCopy("error", signallingErrorMessage(forbidden)).body, /not available/i);

  assert.equal(cameraViewerKind(camera, { status: "live", stream }, { canView: false }), "window");
  assert.equal(
    cameraViewerKind({ ...camera, isEnabled: false }, { status: "idle" }, { canView: true }),
    "disabled",
  );
});

test("srcObject is set after status changes connecting -> connected", () => {
  const stream = { id: "track-1" };
  const video = { srcObject: null };

  // ontrack sets stream while status is still connecting — <video> is not mounted
  assert.equal(syncVideoSrcObject(null, stream), null);
  assert.equal(video.srcObject, null);

  // status becomes live, the element mounts, ref callback attaches the existing stream
  assert.equal(syncVideoSrcObject(video, stream), stream);
  assert.equal(video.srcObject, stream);
});

test("ICE candidates wait until the offer POST resolves, then flush in order", async () => {
  const sent = [];
  const queue = createIceFlushQueue({
    send: async (body) => {
      sent.push(`${body.type}:${body.candidate.candidate}`);
    },
  });

  queue.enqueue({ type: "ice", sessionId: "s1", candidate: { candidate: "cand-1", sdpMid: "0" } });
  queue.enqueue({ type: "ice", sessionId: "s1", candidate: { candidate: "cand-2", sdpMid: "0" } });
  assert.deepEqual(sent, []);

  sent.push("offer");
  const flushed = queue.markReady();
  queue.enqueue({ type: "ice", sessionId: "s1", candidate: { candidate: "cand-3", sdpMid: "0" } });
  await flushed;
  await queue.markReady();
  assert.deepEqual(sent, ["offer", "ice:cand-1", "ice:cand-2", "ice:cand-3"]);

  queue.reset();
  queue.enqueue({ type: "ice", sessionId: "s1", candidate: { candidate: "cand-4", sdpMid: "0" } });
  assert.deepEqual(sent, ["offer", "ice:cand-1", "ice:cand-2", "ice:cand-3"]);
});

test("Available until uses Asia/Bangkok", () => {
  const label = formatCctvUntil("2026-11-15T05:00:00.000Z");
  assert.match(label, /15 Nov/);
  assert.match(label, /12:00/);
  const until = formatAvailableUntil({ validTo: "2026-11-15T05:00:00.000Z" });
  assert.match(until, /Access until/);
  const outside = formatOutsideWindowCopy({ validFrom: "2026-11-12T03:00:00.000Z" });
  assert.match(outside, /Thu 12 Nov, 10:00/);
});
