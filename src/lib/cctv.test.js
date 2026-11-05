import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
  bookingAllowsOwnerCameras,
  isBoardingBooking,
  isYoutubeCamera,
  normalizeCamera,
  parseYoutubeVideoId,
  shouldStartWebrtc,
  youtubeEmbedSrc,
  youtubeVideoIdOf,
  CAMERA_DEVICE_STORAGE_KEY,
  CAMERA_PRIVACY_NOTE,
  CAMERA_TILE_MAX_HEIGHT_VH,
  DEFAULT_CAMERA_ASPECT,
  bindVideoAspect,
  cameraGuestStateLabel,
  cameraPausedForGuests,
  cameraPauseToggleLabel,
  cameraTileBoxStyle,
  ownerAfterCamerasRowClass,
  ownerCctvCameraGridClass,
  ownerCctvHref,
  ownerFeaturedPlacement,
  persistCameraDeviceId,
  readPersistedCameraDeviceId,
  switchCameraErrorMessage,
  switchPublisherVideo,
  usableCameraDeviceId,
  signalBodyBytes,
  signallingErrorMessage,
  syncVideoSrcObject,
  videoAspectRatio,
} from "./cctv.js";

test("isBoardingBooking reads service_type", () => {
  assert.equal(isBoardingBooking({ service_type: "boarding" }), true);
  assert.equal(isBoardingBooking({ serviceType: "dog_walking" }), false);
  assert.equal(isBoardingBooking({ service: { type: "boarding" } }), true);
});

test("owner cameras are allowed for boarding stays and GPS walks", () => {
  assert.equal(bookingAllowsOwnerCameras({ service_type: "boarding" }), true);
  assert.equal(bookingAllowsOwnerCameras({ serviceType: "dog_walking" }), true);
  assert.equal(bookingAllowsOwnerCameras({ serviceType: "in_home" }), false);
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

test("privacy copy and pause toggle labels", () => {
  assert.match(CAMERA_PRIVACY_NOTE, /only owners with an active booking/i);
  assert.equal(cameraPausedForGuests({ isEnabled: false }), true);
  assert.equal(cameraPausedForGuests({ isEnabled: true }), false);
  assert.equal(cameraPauseToggleLabel(false), "Pause camera for guests");
  assert.equal(cameraPauseToggleLabel(true), "Resume camera");
  assert.equal(cameraGuestStateLabel(true), "Paused for guests");
  assert.equal(cameraGuestStateLabel(false, "online"), "Live for guests");
});

function fakeTrack(kind, deviceId) {
  const track = {
    kind,
    id: `${kind}-${deviceId}`,
    stopped: false,
    getSettings: () => ({ deviceId }),
    stop() {
      track.stopped = true;
    },
  };
  return track;
}

class FakeStream {
  constructor(tracks = []) {
    this.tracks = [...tracks];
  }
  getTracks() {
    return this.tracks;
  }
  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === "video");
  }
  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio");
  }
  addTrack(track) {
    this.tracks.push(track);
  }
}

test("switchPublisherVideo replaces the video sender and stops the old track", async () => {
  const oldVideo = fakeTrack("video", "cam-old");
  const oldAudio = fakeTrack("audio", "mic");
  const currentStream = new FakeStream([oldVideo, oldAudio]);
  const replaced = [];
  const peers = new Map([
    [
      "viewer-1",
      {
        pc: {
          getSenders: () => [
            {
              track: { kind: "video" },
              replaceTrack: async (track) => {
                replaced.push(track.id);
              },
            },
          ],
        },
      },
    ],
  ]);

  const result = await switchPublisherVideo({
    deviceId: "cam-new",
    currentStream,
    peers,
    MediaStreamCtor: FakeStream,
    getUserMedia: async (constraints) => {
      assert.deepEqual(constraints, { video: { deviceId: { exact: "cam-new" } } });
      return new FakeStream([fakeTrack("video", "cam-new")]);
    },
  });

  assert.equal(result.deviceId, "cam-new");
  assert.equal(result.stream.getVideoTracks()[0].id, "video-cam-new");
  assert.equal(result.stream.getAudioTracks()[0], oldAudio);
  assert.deepEqual(replaced, ["video-cam-new"]);
  assert.equal(oldVideo.stopped, true);
  assert.equal(oldAudio.stopped, false);
});

test("switchPublisherVideo keeps the old stream on camera errors", async () => {
  const oldVideo = fakeTrack("video", "cam-old");
  const currentStream = new FakeStream([oldVideo]);
  const replaced = [];
  const peers = new Map([
    [
      "viewer-1",
      {
        pc: {
          getSenders: () => [
            {
              track: { kind: "video" },
              replaceTrack: async (track) => replaced.push(track.id),
            },
          ],
        },
      },
    ],
  ]);

  for (const name of ["NotAllowedError", "NotReadableError", "OverconstrainedError"]) {
    const err = new Error(name);
    err.name = name;
    await assert.rejects(
      () =>
        switchPublisherVideo({
          deviceId: "cam-new",
          currentStream,
          peers,
          MediaStreamCtor: FakeStream,
          getUserMedia: async () => {
            throw err;
          },
        }),
      (caught) => caught.name === name,
    );
    assert.match(switchCameraErrorMessage(err), /previous camera is still in use/i);
  }

  assert.equal(oldVideo.stopped, false);
  assert.deepEqual(replaced, []);
  assert.equal(currentStream.getVideoTracks()[0], oldVideo);
});

test("persisted device id restores only when still present", () => {
  const memory = new Map();
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  persistCameraDeviceId("cam-2", storage);
  assert.equal(readPersistedCameraDeviceId(storage), "cam-2");
  assert.equal(memory.get(CAMERA_DEVICE_STORAGE_KEY), "cam-2");
  assert.equal(
    usableCameraDeviceId("cam-2", [
      { deviceId: "cam-1", kind: "videoinput" },
      { deviceId: "cam-2", kind: "videoinput" },
    ]),
    "cam-2",
  );
  assert.equal(
    usableCameraDeviceId("cam-gone", [{ deviceId: "cam-1", kind: "videoinput" }]),
    "",
  );
});

test("video aspect ratio defaults to 16/9 until metadata arrives", () => {
  assert.equal(DEFAULT_CAMERA_ASPECT, 16 / 9);
  assert.equal(videoAspectRatio(null), 16 / 9);
  assert.equal(videoAspectRatio({ videoWidth: 0, videoHeight: 0 }), 16 / 9);
  assert.equal(videoAspectRatio({ videoWidth: 1280, videoHeight: 720 }), 16 / 9);
  assert.equal(videoAspectRatio({ videoWidth: 640, videoHeight: 480 }), 4 / 3);
});

test("solo camera tile shrinks width to keep aspect under max-height", () => {
  const style = cameraTileBoxStyle({ aspect: 16 / 9, solo: true });
  assert.equal(style["--camera-tile-ar"], String(16 / 9));
  assert.equal(style.maxHeight, `${CAMERA_TILE_MAX_HEIGHT_VH}vh`);
  assert.equal(style.width, `min(100%, calc(${CAMERA_TILE_MAX_HEIGHT_VH}vh * ${16 / 9}))`);

  const stacked = cameraTileBoxStyle({ aspect: 4 / 3 });
  assert.equal(stacked["--camera-tile-ar"], String(4 / 3));
  assert.equal(stacked.width, undefined);
  assert.equal(stacked.maxHeight, undefined);
});

test("bindVideoAspect updates on loadedmetadata and resize then unbinds", () => {
  const video = {
    videoWidth: 0,
    videoHeight: 0,
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
    removeEventListener(type, fn) {
      if (this.listeners[type] === fn) delete this.listeners[type];
    },
  };
  const seen = [];
  const stop = bindVideoAspect(video, (ratio) => seen.push(ratio));
  assert.equal(seen[0], 16 / 9);

  video.videoWidth = 1280;
  video.videoHeight = 720;
  video.listeners.loadedmetadata();
  assert.equal(seen[1], 16 / 9);

  video.videoWidth = 640;
  video.videoHeight = 480;
  video.listeners.resize();
  assert.equal(seen[2], 4 / 3);

  stop();
  assert.equal("loadedmetadata" in video.listeners, false);
  assert.equal("resize" in video.listeners, false);
});

test("frame 08 featured placement is 1 large + 2 small", () => {
  const cameras = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(
    ownerFeaturedPlacement(cameras[0], "a", cameras),
    "lg:col-start-1 lg:row-start-1 lg:row-span-2",
  );
  assert.equal(ownerFeaturedPlacement(cameras[1], "a", cameras), "lg:col-start-2 lg:row-start-1");
  assert.equal(ownerFeaturedPlacement(cameras[2], "a", cameras), "lg:col-start-2 lg:row-start-2");
  assert.equal(ownerAfterCamerasRowClass("a", cameras), "lg:row-start-3");
  assert.match(ownerCctvCameraGridClass("featured"), /18rem/);

  assert.equal(
    ownerFeaturedPlacement({ id: "only" }, "only", [{ id: "only" }]),
    "lg:col-span-2 lg:row-start-1",
  );
});

test("CameraTile uses object-contain and video aspect-ratio, not a fixed strip", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const tile = readFileSync(join(root, "components/cctv/CameraTile.js"), "utf8");
  const view = readFileSync(join(root, "components/cctv/OwnerCctvView.js"), "utf8");
  assert.match(tile, /object-contain/);
  assert.equal(tile.includes("object-cover"), false);
  assert.equal(tile.includes("h-44"), false);
  assert.match(tile, /bindVideoAspect/);
  assert.match(tile, /solo/);
  assert.match(view, /solo=\{solo\}/);
  assert.match(view, /cameras\.length <= 1/);
  assert.match(view, /ownerFeaturedPlacement/);
  const lib = readFileSync(join(root, "lib/cctv.js"), "utf8");
  assert.match(lib, /loadedmetadata/);
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
