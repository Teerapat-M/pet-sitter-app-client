"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getIceServers, postBookingCameraSignal } from "@/lib/api";
import {
  SESSION_ENDED_STOP_REASONS,
  canSendSignal,
  defaultStunServers,
  iceCandidatePayload,
  newSessionId,
  signallingErrorMessage,
} from "@/lib/cctv";

async function postViewerSignal(bookingId, cameraId, body) {
  if (!canSendSignal(body)) {
    const error = new Error("That signalling message was too large to send.");
    error.status = 413;
    throw error;
  }
  return postBookingCameraSignal(bookingId, cameraId, body);
}

function closePeerConnection(pc) {
  try {
    pc?.close();
  } catch {
    // ignore
  }
}

export function useCameraViewer(bookingId, camera, { enabled = true, onSignal, onSessionEnded } = {}) {
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const pcRef = useRef(null);
  const sessionRef = useRef("");
  const stoppedRef = useRef(false);
  const cameraId = camera?.id;

  const ensureSessionId = useCallback(() => {
    if (!sessionRef.current) sessionRef.current = newSessionId();
    return sessionRef.current;
  }, []);

  const connect = useCallback(async () => {
    if (!enabled || !bookingId || !cameraId || stoppedRef.current) return;
    const sessionId = ensureSessionId();
    try {
      const servers = await getIceServers({ cameraId, bookingId }).catch(() => defaultStunServers());
      if (stoppedRef.current) return;
      closePeerConnection(pcRef.current);
      pcRef.current = null;
      setStream(null);
      setError("");
      setStatus("connecting");
      const pc = new RTCPeerConnection({
        iceServers: servers.length ? servers : defaultStunServers(),
      });
      pcRef.current = pc;
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.ontrack = (event) => {
        const next = event.streams?.[0] ?? new MediaStream([event.track]);
        setStream(next);
        setStatus("live");
      };
      pc.onicecandidate = (iceEvent) => {
        const candidate = iceCandidatePayload(iceEvent.candidate);
        if (!candidate) return;
        const body = { type: "ice", sessionId, candidate };
        if (!canSendSignal(body)) return;
        void postViewerSignal(bookingId, cameraId, body).catch((err) => {
          if (err?.status === 413) return;
        });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") setStatus("reconnecting");
        if (pc.connectionState === "disconnected") setStatus("reconnecting");
        if (pc.connectionState === "connected") setStatus("live");
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await postViewerSignal(bookingId, cameraId, {
        type: "offer",
        sessionId,
        sdp: offer.sdp,
      });
    } catch (err) {
      closePeerConnection(pcRef.current);
      pcRef.current = null;
      setStream(null);
      if (err?.status === 409) {
        sessionRef.current = newSessionId();
        setStatus("reconnecting");
        return;
      }
      if (err?.status === 429) {
        setStatus("error");
        setError(signallingErrorMessage(err));
        return;
      }
      setStatus(err?.status === 403 ? "forbidden" : "error");
      setError(signallingErrorMessage(err));
    }
  }, [bookingId, cameraId, enabled, ensureSessionId]);

  const handleSignal = useCallback(
    async (event) => {
      if (String(event.cameraId ?? "") !== String(cameraId)) return;
      if (String(event.sessionId ?? "") !== sessionRef.current) return;
      const pc = pcRef.current;
      if (!pc) return;
      const kind = String(event.kind ?? event.type ?? "");
      try {
        if (kind === "answer" && event.sdp) {
          await pc.setRemoteDescription({ type: "answer", sdp: event.sdp });
        } else if (kind === "ice" && event.candidate) {
          await pc.addIceCandidate(event.candidate);
        }
      } catch {
        // ignore stale descriptions
      }
    },
    [cameraId],
  );

  const handleSessionEnded = useCallback(
    (event) => {
      if (String(event.cameraId ?? "") !== String(cameraId)) return;
      if (event.sessionId && String(event.sessionId) !== sessionRef.current) return;
      closePeerConnection(pcRef.current);
      pcRef.current = null;
      setStream(null);
      sessionRef.current = "";
      stoppedRef.current = SESSION_ENDED_STOP_REASONS.has(String(event.reason ?? ""));
      setStatus(stoppedRef.current ? "ended" : "reconnecting");
    },
    [cameraId],
  );

  useEffect(() => {
    sessionRef.current = "";
    stoppedRef.current = false;
  }, [bookingId, cameraId]);

  useEffect(() => {
    onSignal?.(handleSignal);
  }, [handleSignal, onSignal]);

  useEffect(() => {
    onSessionEnded?.(handleSessionEnded);
  }, [handleSessionEnded, onSessionEnded]);

  useEffect(() => {
    if (!enabled) return undefined;
    stoppedRef.current = false;
    const timer = setTimeout(() => {
      void connect();
    }, 0);
    return () => {
      clearTimeout(timer);
      stoppedRef.current = true;
      closePeerConnection(pcRef.current);
      pcRef.current = null;
    };
  }, [connect, enabled]);

  useEffect(() => {
    if (status !== "reconnecting" || !enabled) return undefined;
    const timer = setTimeout(() => {
      void connect();
    }, 2000);
    return () => clearTimeout(timer);
  }, [connect, enabled, status]);

  return {
    stream,
    status,
    error,
    reconnect: connect,
    handleSignal,
    handleSessionEnded,
  };
}
