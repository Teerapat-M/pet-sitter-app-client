import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_OWNER_SESSIONS_PER_CAMERA,
  MAX_SIGNAL_BYTES,
  SESSION_ENDED_STOP_REASONS,
  YOUTUBE_INVALID_MESSAGE,
  YOUTUBE_LIVE_NOTE,
  YOUTUBE_VIDEO_ID_RE,
  applyCameraEvent,
  canSendSignal,
  cameraOfflineCopy,
  cameraSource,
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
  isYoutubeCamera,
  normalizeCamera,
  ownerCctvHref,
  parseYoutubeVideoId,
  shouldStartWebrtc,
  signalBodyBytes,
  signallingErrorMessage,
  syncVideoSrcObject,
  youtubeEmbedSrc,
  youtubeVideoIdOf,
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

const YT_ID = "dQw4w9WgXcQ";

test("parseYoutubeVideoId accepts watch, youtu.be, live, www/m, and a bare 11-char id", () => {
  assert.equal(YOUTUBE_VIDEO_ID_RE.test(YT_ID), true);
  assert.equal(parseYoutubeVideoId(YT_ID), YT_ID);
  assert.equal(parseYoutubeVideoId(`https://www.youtube.com/watch?v=${YT_ID}`), YT_ID);
  assert.equal(parseYoutubeVideoId(`https://youtube.com/watch?v=${YT_ID}&t=12`), YT_ID);
  assert.equal(parseYoutubeVideoId(`https://m.youtube.com/watch?v=${YT_ID}`), YT_ID);
  assert.equal(parseYoutubeVideoId(`youtube.com/watch?v=${YT_ID}`), YT_ID);
  assert.equal(parseYoutubeVideoId(`https://youtu.be/${YT_ID}`), YT_ID);
  assert.equal(parseYoutubeVideoId(`https://youtu.be/${YT_ID}?si=abc`), YT_ID);
  assert.equal(parseYoutubeVideoId(`youtu.be/${YT_ID}`), YT_ID);
  assert.equal(parseYoutubeVideoId(`https://www.youtube.com/live/${YT_ID}`), YT_ID);
  assert.equal(parseYoutubeVideoId(`https://www.youtube.com/live/${YT_ID}/`), YT_ID);
  assert.equal(parseYoutubeVideoId(`https://youtube.com/live/${YT_ID}?feature=share`), YT_ID);
  assert.equal(parseYoutubeVideoId(`  ${YT_ID}  `), YT_ID);
});

test("parseYoutubeVideoId rejects embed, shorts, stream keys, RTMP, and anything else", () => {
  const reject = (value) => {
    assert.equal(parseYoutubeVideoId(value), null, String(value));
  };
  reject("https://www.youtube.com/embed/" + YT_ID);
  reject("https://www.youtube.com/shorts/" + YT_ID);
  reject("https://www.youtube.com/watch?v=short");
  reject("https://www.youtube.com/watch?v=" + YT_ID + "extra");
  reject("https://youtu.be/" + YT_ID + "/extra");
  reject("https://music.youtube.com/watch?v=" + YT_ID);
  reject("https://youtube.com/live");
  reject("https://www.youtube.com/live/my-custom-handle");
  reject("xxxx-xxxx-xxxx-xxxx");
  reject("live_1234-xxxx-xxxx-xxxx-xxxx");
  reject("rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx-xxxx-xxxx");
  reject("https://a.rtmp.youtube.com/live2/xxxx-xxxx-xxxx-xxxx");
  reject("https://studio.youtube.com/video/" + YT_ID + "/livestreaming");
  reject("https://vimeo.com/" + YT_ID);
  reject("");
  reject("not a url");
  reject(null);
  reject(12);
  assert.equal(YOUTUBE_INVALID_MESSAGE, "Invalid YouTube video URL or id");
});

test("youtube cameras embed nocookie src and skip WebRTC", () => {
  const youtube = normalizeCamera({
    id: "c-yt",
    name: "Garden",
    source: "youtube",
    youtubeVideoId: YT_ID,
    isEnabled: true,
    status: "offline",
  });
  const webrtc = normalizeCamera({
    id: "c-rtc",
    name: "Play room",
    isEnabled: true,
    status: "online",
  });
  const missingId = normalizeCamera({
    id: "c-empty",
    name: "Hall",
    source: "youtube",
    youtubeVideoId: null,
    isEnabled: true,
    status: "online",
  });

  assert.equal(cameraSource(youtube), "youtube");
  assert.equal(isYoutubeCamera(youtube), true);
  assert.equal(isYoutubeCamera(webrtc), false);
  assert.equal(youtubeVideoIdOf(youtube), YT_ID);
  assert.equal(
    youtubeEmbedSrc(YT_ID),
    `https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&mute=1`,
  );
  assert.equal(cameraTileKind(youtube, { canView: true }), "live");
  assert.equal(cameraViewerKind(youtube, { status: "idle" }, { canView: true }), "live");
  assert.equal(shouldStartWebrtc(youtube, { canView: true }), false);
  assert.equal(shouldStartWebrtc(webrtc, { canView: true }), true);
  assert.equal(shouldStartWebrtc(webrtc, { canView: true, preview: true }), false);
  assert.equal(cameraTileKind(missingId, { canView: true }), "unavailable");
  assert.match(cameraOfflineCopy("unavailable").body, /not available/i);
  assert.equal(SESSION_ENDED_STOP_REASONS.has("source_changed"), true);
  assert.match(YOUTUBE_LIVE_NOTE, /anyone with the link/i);
  assert.match(YOUTUBE_LIVE_NOTE, /5–30 seconds/);
});
