"use client";

import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { parseSseFrames } from "@/lib/walkTracking";
import {
  CCTV_RETRY_MS,
  applyCameraEvent,
  emptyCctvView,
} from "@/lib/cctv";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useCameraEvents(path, { enabled = true, onSignal, onSessionEnded } = {}) {
  const [view, setView] = useState(emptyCctvView);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const signalRef = useRef(onSignal);
  const endedRef = useRef(onSessionEnded);

  useEffect(() => {
    signalRef.current = onSignal;
    endedRef.current = onSessionEnded;
  }, [onSignal, onSessionEnded]);

  useEffect(() => {
    if (!enabled || !path || !API_URL) return undefined;

    let stopped = false;
    const abort = new AbortController();

    async function connect() {
      while (!stopped) {
        const token = getToken();
        if (!token) {
          setConnected(false);
          await new Promise((resolve) => setTimeout(resolve, CCTV_RETRY_MS));
          continue;
        }

        try {
          const res = await fetch(`${API_URL}${path}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: abort.signal,
          });
          if (!res.ok || !res.body) {
            const streamError = new Error(`Camera stream failed (${res.status})`);
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
              if (event?.type === "signal") {
                signalRef.current?.(event);
                continue;
              }
              if (event?.type === "session-ended") {
                endedRef.current?.(event);
              }
              setView((current) => applyCameraEvent(current, event));
            }
          }
          setConnected(false);
        } catch (err) {
          if (stopped || abort.signal.aborted) return;
          setConnected(false);
          if (err?.status === 403) {
            setError("outside-window");
            setView((current) => ({
              ...current,
              access: { ...current.access, canView: false },
            }));
            await new Promise((resolve) => setTimeout(resolve, CCTV_RETRY_MS * 4));
            continue;
          }
          if (err?.status === 401 || err?.status === 404) {
            setError(err instanceof Error ? err.message : "Cameras are not available");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, CCTV_RETRY_MS));
        }
      }
    }

    void connect();
    return () => {
      stopped = true;
      abort.abort();
    };
  }, [enabled, path]);

  return { view, error, connected };
}
