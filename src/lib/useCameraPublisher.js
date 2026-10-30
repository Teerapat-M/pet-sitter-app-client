"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getIceServers,
  postSitterCameraHeartbeat,
  postSitterCameraSignal,
  sitterCameraEventsPath,
} from "@/lib/api";
import {
  CCTV_HEARTBEAT_MS,
  canSendSignal,
  createIceFlushQueue,
  defaultStunServers,
  iceCandidatePayload,
  mediaPermissionMessage,
  signallingErrorMessage,
} from "@/lib/cctv";
import { useCameraEvents } from "@/lib/useCameraEvents";

async function requestWakeLock() {
  if (typeof navigator === "undefined" || !navigator.wakeLock?.request) return null;
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}

function closePeer(entry) {
  try {
    entry?.pc?.close();
  } catch {
    // ignore
  }
}

async function postPublisherSignal(cameraId, body) {
  if (!canSendSignal(body)) {
    const error = new Error("That signalling message was too large to send.");
    error.status = 413;
    throw error;
  }
  return postSitterCameraSignal(cameraId, body);
}

export function useCameraPublisher(cameraId, { enabled = true } = {}) {
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [devices, setDevices] = useState([]);
  const peersRef = useRef(new Map());
  const streamRef = useRef(null);
  const wakeLockRef = useRef(null);
  const cameraIdRef = useRef(cameraId);
  const statusRef = useRef(status);

  useEffect(() => {
    cameraIdRef.current = cameraId;
  }, [cameraId]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    try {
      await lock?.release?.();
    } catch {
      // ignore
    }
  }, []);

  const closeAllPeers = useCallback(() => {
    for (const entry of peersRef.current.values()) {
      entry?.iceQueue?.reset();
      closePeer(entry);
    }
    peersRef.current.clear();
  }, []);

  const loadIce = useCallback(async () => {
    const id = cameraIdRef.current;
    if (!id) return defaultStunServers();
    try {
      const servers = await getIceServers({ cameraId: id });
      return servers.length ? servers : defaultStunServers();
    } catch {
      return defaultStunServers();
    }
  }, []);

  const handleOffer = useCallback(async (event) => {
    const sessionId = String(event.sessionId ?? "");
    const sdp = event.sdp;
    const activeId = cameraIdRef.current;
    if (!sessionId || !sdp || !streamRef.current || !activeId) return;
    if (event.cameraId && String(event.cameraId) !== String(activeId)) return;

    closePeer(peersRef.current.get(sessionId));
    const iceServers = await loadIce();
    const pc = new RTCPeerConnection({ iceServers });
    const iceQueue = createIceFlushQueue({
      send: async (body) => {
        try {
          await postPublisherSignal(activeId, body);
        } catch (err) {
          if (err?.status === 413) return;
          setError(signallingErrorMessage(err));
        }
      },
    });
    streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current));
    pc.onicecandidate = (iceEvent) => {
      const candidate = iceCandidatePayload(iceEvent.candidate);
      if (!candidate) return;
      iceQueue.enqueue({ type: "ice", sessionId, candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        iceQueue.reset();
        closePeer(peersRef.current.get(sessionId));
        peersRef.current.delete(sessionId);
      }
    };
    peersRef.current.set(sessionId, { pc, iceQueue });
    try {
      await pc.setRemoteDescription({ type: "offer", sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postPublisherSignal(activeId, {
        type: "answer",
        sessionId,
        sdp: answer.sdp,
      });
      await iceQueue.markReady();
    } catch (err) {
      iceQueue.reset();
      closePeer(peersRef.current.get(sessionId));
      peersRef.current.delete(sessionId);
      setError(signallingErrorMessage(err));
    }
  }, [loadIce]);

  const handleSignal = useCallback(
    async (event) => {
      const kind = String(event.kind ?? event.type ?? "");
      if (kind === "offer") {
        await handleOffer(event);
        return;
      }
      if (kind !== "ice") return;
      const sessionId = String(event.sessionId ?? "");
      const entry = peersRef.current.get(sessionId);
      if (!entry?.pc || !event.candidate) return;
      try {
        await entry.pc.addIceCandidate(event.candidate);
      } catch {
        // ignore stale ICE
      }
    },
    [handleOffer],
  );

  const handleSessionEnded = useCallback((event) => {
    const sessionId = String(event.sessionId ?? "");
    const entry = peersRef.current.get(sessionId);
    entry?.iceQueue?.reset();
    closePeer(entry);
    peersRef.current.delete(sessionId);
  }, []);

  const events = useCameraEvents(sitterCameraEventsPath(), {
    enabled: Boolean(enabled && cameraId),
    onSignal: handleSignal,
    onSessionEnded: handleSessionEnded,
  });

  const refreshDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices(list.filter((item) => item.kind === "videoinput"));
  }, []);

  const start = useCallback(
    async (nextDeviceId = deviceId) => {
      if (!cameraId) return;
      setError("");
      setStatus("starting");
      try {
        const constraints = {
          audio: true,
          video: nextDeviceId
            ? { deviceId: { exact: nextDeviceId } }
            : { facingMode: "environment" },
        };
        let media;
        try {
          media = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        }
        stopTracks();
        streamRef.current = media;
        setStream(media);
        const used = media.getVideoTracks()[0]?.getSettings?.().deviceId;
        if (used) setDeviceId(used);
        await refreshDevices();
        await postSitterCameraHeartbeat(cameraId);
        wakeLockRef.current = await requestWakeLock();
        setStatus("live");
      } catch (err) {
        stopTracks();
        setStatus("denied");
        setError(mediaPermissionMessage(err));
      }
    },
    [cameraId, deviceId, refreshDevices, stopTracks],
  );

  const stop = useCallback(async () => {
    closeAllPeers();
    stopTracks();
    await releaseWakeLock();
    setStatus("idle");
  }, [closeAllPeers, releaseWakeLock, stopTracks]);

  useEffect(() => {
    if (!enabled || !cameraId || status !== "live") return undefined;
    const timer = setInterval(() => {
      void postSitterCameraHeartbeat(cameraId).catch(() => {
        setStatus("reconnecting");
      });
    }, CCTV_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [cameraId, enabled, status]);

  useEffect(() => {
    if (status !== "reconnecting" || !enabled) return undefined;
    const timer = setTimeout(() => {
      void start();
    }, CCTV_HEARTBEAT_MS);
    return () => clearTimeout(timer);
  }, [enabled, start, status]);

  useEffect(() => {
    async function onVisibility() {
      if (document.visibilityState !== "visible") return;
      if (statusRef.current !== "live") return;
      if (wakeLockRef.current) return;
      wakeLockRef.current = await requestWakeLock();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    return () => {
      closeAllPeers();
      stopTracks();
      void releaseWakeLock();
    };
  }, [cameraId, closeAllPeers, releaseWakeLock, stopTracks]);

  return {
    stream,
    status,
    error,
    devices,
    deviceId,
    setDeviceId,
    start,
    stop,
    events,
  };
}
