import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { createElement, act } from "react";
import { JSDOM } from "jsdom";
import {
  YOUTUBE_INVALID_MESSAGE,
  YOUTUBE_LIVE_NOTE,
} from "./cctv.js";
import { PREVIEW_ACCESS, PREVIEW_BOARDING } from "./cctvPreview.js";

await register(new URL("../../scripts/jsx-loader.mjs", import.meta.url));

const YT_ID = "dQw4w9WgXcQ";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/sitter/cameras",
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
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return dom;
}

installDom();

const { createRoot } = await import("react-dom/client");

async function click(element) {
  await act(async () => {
    element.dispatchEvent(
      new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
        view: window,
      }),
    );
  });
}

async function setInputValue(element, value) {
  await act(async () => {
    const previous = element.value;
    const proto = Object.getPrototypeOf(element);
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element._valueTracker?.setValue(previous);
    element.dispatchEvent(new window.Event("input", { bubbles: true }));
    element.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
}

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

test("owner youtube tile uses nocookie embed src at 16/9 and skips WebRTC video", async () => {
  const { default: OwnerCctvView } = await import("../components/cctv/OwnerCctvView.js");
  const view = mount(
    createElement(OwnerCctvView, {
      booking: PREVIEW_BOARDING,
      bookingId: PREVIEW_BOARDING.id,
      preview: {
        cameras: [
          {
            id: "cam-yt",
            name: "Garden",
            status: "offline",
            isEnabled: true,
            source: "youtube",
            youtubeVideoId: YT_ID,
          },
          {
            id: "cam-rtc",
            name: "Play room",
            status: "online",
            isEnabled: true,
            source: "webrtc",
          },
        ],
        access: PREVIEW_ACCESS,
      },
    }),
  );

  const iframe = view.container.querySelector("iframe");
  assert.ok(iframe, "youtube camera should render an iframe");
  assert.equal(
    iframe.getAttribute("src"),
    `https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&mute=1`,
  );
  assert.equal(iframe.getAttribute("title"), "Garden");
  assert.equal(iframe.getAttribute("allow"), "autoplay; encrypted-media; picture-in-picture");
  assert.ok(iframe.hasAttribute("allowfullscreen"));
  assert.equal(view.container.querySelectorAll("iframe").length, 1);
  assert.equal(view.container.querySelectorAll("video").length, 0);
  const tile = iframe.closest("[style]");
  assert.ok(tile);
  assert.equal(tile.style.getPropertyValue("--camera-tile-ar"), String(16 / 9));
  assert.match(tile.className, /aspect-ratio:var\(--camera-tile-ar/);
  view.unmount();
});

test("solo youtube CameraTile uses the full-frame 16/9 cap", async () => {
  const { default: CameraTile } = await import("../components/cctv/CameraTile.js");
  const view = mount(
    createElement(CameraTile, {
      camera: {
        id: "cam-yt",
        name: "Garden",
        source: "youtube",
        youtubeVideoId: YT_ID,
        isEnabled: true,
        status: "online",
      },
      canView: true,
      featured: true,
      solo: true,
    }),
  );
  const tile = view.container.querySelector("[role='group']");
  const iframe = view.container.querySelector("iframe");
  assert.ok(tile);
  assert.ok(iframe);
  assert.equal(tile.style.getPropertyValue("--camera-tile-ar"), String(16 / 9));
  assert.match(tile.style.width, /min\(100%,/);
  assert.equal(tile.style.maxHeight, "75vh");
  assert.match(tile.className, /mx-auto/);
  view.unmount();
});

test("youtube camera with a null id shows the not-available state", async () => {
  const { default: CameraTile } = await import("../components/cctv/CameraTile.js");
  const view = mount(
    createElement(CameraTile, {
      camera: {
        id: "cam-empty",
        name: "Hall",
        source: "youtube",
        youtubeVideoId: null,
        isEnabled: true,
        status: "online",
      },
      canView: true,
    }),
  );
  assert.equal(view.container.querySelector("iframe"), null);
  assert.match(view.container.textContent, /not available/i);
  view.unmount();
});

test("useCameraViewer does not start WebRTC for youtube cameras", async () => {
  process.env.NEXT_PUBLIC_API_URL ??= "http://localhost:4000";
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => ({}) };
  };

  const { useCameraViewer } = await import("./useCameraViewer.js");
  function Probe() {
    useCameraViewer(
      "booking-1",
      {
        id: "cam-yt",
        source: "youtube",
        youtubeVideoId: YT_ID,
        isEnabled: true,
        status: "online",
      },
      { enabled: true },
    );
    return createElement("div", { "data-probe": "yt" });
  }

  const view = mount(createElement(Probe));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  assert.equal(calls.length, 0);
  view.unmount();
  globalThis.fetch = originalFetch;
});

test("sitter dashboard shows the YouTube delay note and validates URLs", async () => {
  const { default: SitterCameraDashboard } = await import(
    "../components/cctv/SitterCameraDashboard.js"
  );
  const view = mount(
    createElement(SitterCameraDashboard, {
      preview: {
        sitter: { name: "Ploy" },
        cameras: [
          { id: "cam-1", name: "Play room", status: "online", isEnabled: true, source: "webrtc" },
        ],
        bookings: [],
      },
    }),
  );

  assert.match(view.container.textContent, new RegExp(YOUTUBE_LIVE_NOTE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(view.container.textContent, /stream key/i);

  const select = view.container.querySelector('select[aria-label="Source for Play room"]');
  assert.ok(select);
  await act(async () => {
    select.value = "youtube";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });

  const input = view.container.querySelector('input[placeholder*="11-character"]');
  assert.ok(input, "youtube source should show a URL/id input");
  await setInputValue(input, "rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx-xxxx-xxxx");
  const save = [...view.container.querySelectorAll("button")].find((button) =>
    /Save YouTube link/i.test(button.textContent),
  );
  assert.ok(save);
  await click(save);
  assert.match(view.container.textContent, new RegExp(YOUTUBE_INVALID_MESSAGE));
  assert.equal(view.container.querySelector("iframe"), null);
  view.unmount();
});
