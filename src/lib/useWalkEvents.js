"use client";

import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { getWalk, getWalkPoints, walkEventsPath } from "@/lib/api";
import {
  WALK_RETRY_MS,
  applyWalkEvent,
  emptyWalkView,
  mergeWalkPoints,
  parseSseFrames,
} from "@/lib/walkTracking";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function mergeHistory(view, history) {
  if (!history) return view;
  const walk = history.walk ?? view.walk;
  const points = mergeWalkPoints(view.points, history.points ?? []);
  const summary = history.summary ?? walk?.summary;
  const status =
    walk?.status === "ended" || view.status === "ended"
      ? "ended"
      : walk?.status === "live" || view.status === "live"
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

    async function loadHistory() {
      try {
        const history = await getWalkPoints(bookingId, { limit: 2000 });
        if (stopped) return;
        setView((current) => mergeHistory(current, history));
        setError("");
      } catch (err) {
        if (stopped || err?.status === 404) {
          try {
            const walk = await getWalk(bookingId);
            if (stopped) return;
            if (!walk) {
              setView(emptyWalkView());
              return;
            }
            setView((current) =>
              mergeHistory(current, {
                walk,
                points: walk.lastPoint ? [walk.lastPoint] : [],
                summary: walk.summary,
              }),
            );
          } catch (inner) {
            if (!stopped) {
              setError(inner instanceof Error ? inner.message : "Could not load this walk");
            }
          }
          return;
        }
        if (!stopped) {
          setError(err instanceof Error ? err.message : "Could not load this walk");
        }
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
            const error = new Error(`Walk live stream failed (${res.status})`);
            error.status = res.status;
            throw error;
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
              if (event.type === "ended") {
                void loadHistory();
              }
            }
          }
          setConnected(false);
        } catch (err) {
          if (stopped || abort.signal.aborted) return;
          setConnected(false);
          if (err?.status === 400 || err?.status === 404) {
            setError(err instanceof Error ? err.message : "Walk tracking is not available");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, WALK_RETRY_MS));
        }
      }
    }

    void loadHistory();
    void connect();

    return () => {
      stopped = true;
      abort.abort();
    };
  }, [bookingId, enabled]);

  return { view, error, connected };
}
