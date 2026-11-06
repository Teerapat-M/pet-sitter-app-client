"use client";

import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { getWalk, getWalkPoints, walkEventsPath } from "@/lib/api";
import {
  WALK_RETRY_MS,
  applyWalkEvent,
  emptyWalkView,
  loadWalkHistory,
  mergeWalkPoints,
  parseSseFrames,
  walkHasStarted,
} from "@/lib/walkTracking";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function mergeHistory(view, history) {
  if (!history) return view;
  if (history.missing) {
    return view.status === "live" || view.status === "ended" ? view : emptyWalkView();
  }
  const walk = history.walk ?? view.walk;
  const points = mergeWalkPoints(view.points, history.points ?? []);
  const summary = history.summary ?? walk?.summary;
  const status =
    walk?.status === "ended" || view.status === "ended"
      ? "ended"
      : walk?.status === "live" || walk?.status === "started" || view.status === "live"
        ? "live"
        : view.status;
  return {
    status,
    walk: walk ? { ...walk, summary: summary ?? walk.summary } : view.walk,
    points,
    distanceM: Number(summary?.distanceM ?? walk?.distanceM ?? view.distanceM) || 0,
    durationS: Number(summary?.durationS ?? walk?.durationS ?? view.durationS) || 0,
  };
}

export function useWalkEvents(bookingId, enabled) {
  const [view, setView] = useState(emptyWalkView);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    if (!enabled || !bookingId || !API_URL) return undefined;

    let stopped = false;
    const abort = new AbortController();
    let fetchedTrailKey = "";

    async function loadHistory(knownWalk) {
      try {
        const seed = walkHasStarted(knownWalk)
          ? knownWalk
          : walkHasStarted(viewRef.current.walk)
            ? viewRef.current.walk
            : undefined;
        const history = await loadWalkHistory(bookingId, {
          getWalk,
          getWalkPoints,
          knownWalk: seed,
        });
        if (stopped) return;
        setView((current) => mergeHistory(current, history));
        setError("");
      } catch (err) {
        if (stopped || err?.status === 404) return;
        setError(err instanceof Error ? err.message : "Could not load this walk");
      }
    }

    async function connect() {
      while (!stopped) {
        const token = getToken();
        if (!token) {
          setConnected(false);
          await new Promise((resolve) => setTimeout(resolve, WALK_RETRY_MS));
          continue;
        }

        try {
          const res = await fetch(`${API_URL}${walkEventsPath(bookingId)}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: abort.signal,
          });
          if (!res.ok || !res.body) {
            const streamError = new Error(`Walk live stream failed (${res.status})`);
            streamError.status = res.status;
            throw streamError;
          }

          setConnected(true);
          setError("");
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!stopped) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parsed = parseSseFrames(buffer);
            buffer = parsed.rest;
            for (const event of parsed.events) {
              setView((current) => applyWalkEvent(current, event));
              if (event.type === "live" || event.type === "started" || event.type === "ended") {
                const key = `${event.type}:${event.walk?.id ?? bookingId}`;
                if (event.type === "ended" || fetchedTrailKey !== key) {
                  fetchedTrailKey = key;
                  void loadHistory(event.walk);
                }
              }
            }
          }
          setConnected(false);
        } catch (err) {
          if (stopped || abort.signal.aborted) return;
          setConnected(false);
          if (err?.status === 400) {
            setError(err instanceof Error ? err.message : "Walk tracking is not available");
            return;
          }
          if (err?.status === 404) {
            await new Promise((resolve) => setTimeout(resolve, WALK_RETRY_MS));
            continue;
          }
          await new Promise((resolve) => setTimeout(resolve, WALK_RETRY_MS));
        }
      }
    }

    // Probe GET /walk first. Skip /walk/points until a walk exists; 404 is empty.
    void loadHistory();
    void connect();

    return () => {
      stopped = true;
      abort.abort();
    };
  }, [bookingId, enabled]);

  return { view, error, connected };
}
