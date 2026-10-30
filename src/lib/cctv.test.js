import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_OWNER_SESSIONS_PER_CAMERA,
  MAX_SIGNAL_BYTES,
  applyCameraEvent,
  canSendSignal,
  cameraTileKind,
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
  assert.equal(MAX_SIGNAL_BYTES, 6000);
  const small = { type: "ice", sessionId: "s1", candidate: { candidate: "candidate:1", sdpMid: "0" } };
  assert.equal(canSendSignal(small), true);
  const huge = { type: "offer", sessionId: "s1", sdp: "v=0\n".repeat(4000) };
  assert.equal(signalBodyBytes(huge) > MAX_SIGNAL_BYTES, true);
  assert.equal(canSendSignal(huge), false);
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

test("Available until uses Asia/Bangkok", () => {
  const label = formatCctvUntil("2026-11-15T05:00:00.000Z");
  assert.match(label, /15 Nov/);
  assert.match(label, /12:00/);
  const until = formatAvailableUntil({ validTo: "2026-11-15T05:00:00.000Z" });
  assert.match(until, /Access until/);
  const outside = formatOutsideWindowCopy({ validFrom: "2026-11-12T03:00:00.000Z" });
  assert.match(outside, /Thu 12 Nov, 10:00/);
});
