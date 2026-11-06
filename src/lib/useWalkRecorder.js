"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { endWalk, postWalkPoints, startWalk } from "@/lib/api";
import {
  WALK_FLUSH_MS,
  createWalkPointBuffer,
  geolocationErrorMessage,
  pathDistanceMeters,
  positionToPoint,
} from "@/lib/walkTracking";

async function requestWakeLock() {
  if (typeof navigator === "undefined" || !navigator.wakeLock?.request) return null;
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}

export function useWalkRecorder(bookingId) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine === false : false,
  );
  const [points, setPoints] = useState([]);
  const [distanceM, setDistanceM] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [endedWalk, setEndedWalk] = useState(null);

  const bufferRef = useRef(null);
  const watchRef = useRef(null);
  const wakeLockRef = useRef(null);
  const startedAtRef = useRef("");

  const clearWatch = useCallback(() => {
    if (watchRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
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

  const stopBuffer = useCallback(async () => {
    const buffer = bufferRef.current;
    bufferRef.current = null;
    if (buffer) {
      await buffer.flushRemaining();
      buffer.dispose();
    }
  }, []);

  const handlePosition = useCallback((position) => {
    const point = positionToPoint(position);
    const buffer = bufferRef.current;
    if (!point || !buffer) return;
    if (!buffer.enqueue(point)) return;
    setPoints((current) => {
      const next = [...current, point];
      setDistanceM(pathDistanceMeters(next));
      return next;
    });
    setError("");
  }, []);

  const handleGeoError = useCallback((geoError) => {
    setError(geolocationErrorMessage(geoError));
  }, []);

  const beginWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("This device does not support GPS.");
      return;
    }
    clearWatch();
    watchRef.current = navigator.geolocation.watchPosition(handlePosition, handleGeoError, {
      enableHighAccuracy: true,
      maximumAge: 4000,
      timeout: 15000,
    });
  }, [clearWatch, handleGeoError, handlePosition]);

  const attachLiveSession = useCallback(
    async (walk) => {
      startedAtRef.current = walk?.startedAt || startedAtRef.current || new Date().toISOString();
      setStartedAt(startedAtRef.current);
      setEndedWalk(null);
      if (!bufferRef.current) {
        const buffer = createWalkPointBuffer({
          flushMs: WALK_FLUSH_MS,
          postFn: async (body) => {
            if (typeof navigator !== "undefined" && navigator.onLine === false) {
              const offlineError = new Error("offline");
              offlineError.status = 0;
              throw offlineError;
            }
            const result = await postWalkPoints(bookingId, body);
            if (Number.isFinite(Number(result?.distanceM))) {
              setDistanceM(Number(result.distanceM));
            }
            return result;
          },
        });
        bufferRef.current = buffer;
        buffer.start();
      }
      beginWatching();
      if (!wakeLockRef.current) {
        wakeLockRef.current = await requestWakeLock();
      }
      setStatus("live");
    },
    [beginWatching, bookingId],
  );

  const start = useCallback(async () => {
    if (!bookingId || status === "live" || status === "starting") return;
    setStatus("starting");
    setError("");
    try {
      const walk = await startWalk(bookingId);
      setPoints([]);
      setDistanceM(Number(walk?.distanceM) || 0);
      await attachLiveSession(walk);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not start the walk");
    }
  }, [attachLiveSession, bookingId, status]);

  const resume = useCallback(
    async (walk) => {
      if (!bookingId || status === "live" || status === "starting" || status === "ending") return;
      setError("");
      if (Array.isArray(walk?.points) && walk.points.length) {
        setPoints(walk.points);
        setDistanceM(Number(walk.distanceM) || 0);
      } else if (walk?.lastPoint) {
        setPoints([walk.lastPoint]);
        setDistanceM(Number(walk?.distanceM) || 0);
      } else {
        setDistanceM(Number(walk?.distanceM) || 0);
      }
      await attachLiveSession(walk);
    },
    [attachLiveSession, bookingId, status],
  );

  const stop = useCallback(async () => {
    if (!bookingId || (status !== "live" && status !== "starting")) return;
    setStatus("ending");
    setError("");
    clearWatch();
    await releaseWakeLock();
    try {
      await stopBuffer();
      const walk = await endWalk(bookingId);
      setEndedWalk(walk);
      setDistanceM(Number(walk?.distanceM ?? walk?.summary?.distanceM) || 0);
      setStatus("ended");
    } catch (err) {
      setStatus("live");
      beginWatching();
      setError(err instanceof Error ? err.message : "Could not end the walk");
    }
  }, [beginWatching, bookingId, clearWatch, releaseWakeLock, status, stopBuffer]);

  useEffect(() => {
    function onOnline() {
      setOffline(false);
      void bufferRef.current?.flush();
    }
    function onOffline() {
      setOffline(true);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    async function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (status !== "live") return;
      if (!wakeLockRef.current) {
        wakeLockRef.current = await requestWakeLock();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status]);

  useEffect(() => {
    return () => {
      clearWatch();
      void releaseWakeLock();
      bufferRef.current?.dispose();
    };
  }, [clearWatch, releaseWakeLock]);

  const elapsedS = startedAt
    ? Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000))
    : 0;

  return {
    status,
    error,
    offline,
    points,
    distanceM,
    startedAt,
    endedWalk,
    elapsedS,
    pendingCount: bufferRef.current?.length ?? 0,
    start,
    resume,
    stop,
  };
}
