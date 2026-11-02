import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { createElement, act } from "react";
import { JSDOM } from "jsdom";

await register(new URL("../../scripts/jsx-loader.mjs", import.meta.url));

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/owner/cctv/booking-1",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in globalThis) continue;
    try {
      globalThis[key] = window[key];
    } catch {
      // Node 22 exposes getter-only globals such as navigator.
    }
  }
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return dom;
}

installDom();

const { createRoot } = await import("react-dom/client");
const { default: CameraTile } = await import("../components/cctv/CameraTile.js");
const { DEFAULT_CAMERA_ASPECT } = await import("./cctv.js");

function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const CAMERA = { id: "c1", name: "Cam 1 · Play room", status: "online", isEnabled: true };

test("solo CameraTile is 16/9 until metadata, then follows the video", async () => {
  const view = mount(
    createElement(CameraTile, {
      camera: CAMERA,
      stream: { id: "media" },
      status: "live",
      featured: true,
      solo: true,
    }),
  );

  const button = view.container.querySelector("button");
  const video = view.container.querySelector("video");
  assert.ok(button);
  assert.ok(video);
  assert.equal(button.style.getPropertyValue("--camera-tile-ar"), String(DEFAULT_CAMERA_ASPECT));
  assert.match(button.style.width, /min\(100%,/);
  assert.match(button.style.width, /vh/);
  assert.equal(button.style.maxHeight, "75vh");
  assert.match(button.className, /mx-auto/);
  assert.match(video.className, /object-contain/);
  assert.equal(video.className.includes("object-cover"), false);

  Object.defineProperties(video, {
    videoWidth: { configurable: true, get: () => 640 },
    videoHeight: { configurable: true, get: () => 480 },
  });
  await act(async () => {
    video.dispatchEvent(new window.Event("loadedmetadata"));
  });
  assert.equal(button.style.getPropertyValue("--camera-tile-ar"), String(4 / 3));
  assert.match(button.style.width, /min\(100%,/);
  assert.equal(button.style.maxHeight, "75vh");

  Object.defineProperties(video, {
    videoWidth: { configurable: true, get: () => 1920 },
    videoHeight: { configurable: true, get: () => 1080 },
  });
  await act(async () => {
    video.dispatchEvent(new window.Event("resize"));
  });
  assert.equal(button.style.getPropertyValue("--camera-tile-ar"), String(16 / 9));

  view.unmount();
});

test("preview CameraTile without a stream still uses the 16/9 frame", () => {
  const view = mount(
    createElement(CameraTile, {
      camera: CAMERA,
      preview: true,
      featured: true,
      solo: true,
    }),
  );
  const button = view.container.querySelector("button");
  assert.equal(view.container.querySelector("video"), null);
  assert.equal(button.style.getPropertyValue("--camera-tile-ar"), String(16 / 9));
  assert.match(button.className, /aspect-ratio:var\(--camera-tile-ar/);
  view.unmount();
});
