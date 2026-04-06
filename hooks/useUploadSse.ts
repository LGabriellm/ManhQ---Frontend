"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * Upload Pipeline — Server-Sent Events Hook
 *
 * Connects to /upload/sessions/:sessionId/events for realtime updates.
 * Falls back to polling when SSE is not available.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadKeys } from "@/hooks/useUpload";
import type {
  SseEventType,
  WorkflowState,
  WorkflowCounts,
  WorkflowNextAction,
  UploadSessionStatus,
  SessionSummary,
} from "@/types/upload";

export interface SseState {
  connected: boolean;
  progressPercent: number;
  workflowState: WorkflowState | null;
  nextAction: WorkflowNextAction | null;
  finalStatus: UploadSessionStatus | null;
  itemProgress: Map<string, number>;
}

const INITIAL_SSE_STATE: SseState = {
  connected: false,
  progressPercent: 0,
  workflowState: null,
  nextAction: null,
  finalStatus: null,
  itemProgress: new Map(),
};

const RECONNECT_DELAY_MS = 3_000;
const HEARTBEAT_TIMEOUT_MS = 45_000;

export function useUploadSse(sessionId: string | null, draftId: string | null) {
  const qc = useQueryClient();
  const [state, setState] = useState<SseState>(INITIAL_SSE_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Stable refs for values used inside the EventSource callbacks.
  // This prevents `connect` from being recreated when draftId changes
  // (which would close/reopen the SSE connection unnecessarily).
  const draftIdRef = useRef(draftId);
  draftIdRef.current = draftId;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const invalidateDraft = useCallback(() => {
    const id = draftIdRef.current;
    if (id) {
      qc.invalidateQueries({ queryKey: uploadKeys.draft(id) });
    }
    qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
  }, [qc]);

  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setTimeout(() => {
      // No events for too long — reconnect
      eventSourceRef.current?.close();
      setState((prev) => ({ ...prev, connected: false }));
    }, HEARTBEAT_TIMEOUT_MS);
  }, []);

  const connect = useCallback(() => {
    const sid = sessionIdRef.current;
    if (!sid || !isMountedRef.current) return;

    // Clean up previous
    eventSourceRef.current?.close();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

    const url = `/api/upload/sessions/${sid}/events`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("snapshot", (event) => {
      if (!isMountedRef.current) return;
      resetHeartbeatTimer();
      try {
        const payload = JSON.parse(event.data);
        const session = payload.session as SessionSummary;
        if (session?.workflow) {
          setState((prev) => ({
            ...prev,
            connected: true,
            progressPercent: session.workflow.progressPercent,
            workflowState: session.workflow.state,
            nextAction: session.workflow.nextAction,
          }));
        }
        invalidateDraft();
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("upload_session", (event) => {
      if (!isMountedRef.current) return;
      resetHeartbeatTimer();
      try {
        const payload = JSON.parse(event.data);
        handleSessionEvent(payload);
      } catch {
        // ignore
      }
    });

    es.onopen = () => {
      if (!isMountedRef.current) return;
      setState((prev) => ({ ...prev, connected: true }));
      resetHeartbeatTimer();
    };

    es.onerror = () => {
      if (!isMountedRef.current) return;
      es.close();
      setState((prev) => ({ ...prev, connected: false }));
      // Reconnect after delay
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) connect();
      }, RECONNECT_DELAY_MS);
    };

    function handleSessionEvent(event: {
      type: SseEventType;
      payload: Record<string, unknown>;
    }) {
      switch (event.type) {
        case "session_progress": {
          const p = event.payload as {
            progressPercent: number;
            state: WorkflowState;
            nextAction: WorkflowNextAction;
            counts: WorkflowCounts;
          };
          setState((prev) => ({
            ...prev,
            progressPercent: p.progressPercent,
            workflowState: p.state,
            nextAction: p.nextAction,
          }));
          break;
        }

        case "item_heartbeat": {
          const h = event.payload as {
            itemId: string;
            progressPercent: number;
          };
          setState((prev) => {
            const map = new Map(prev.itemProgress);
            map.set(h.itemId, h.progressPercent);
            return { ...prev, itemProgress: map };
          });
          break;
        }

        case "item_updated": {
          invalidateDraft();
          break;
        }

        case "session_confirmed":
        case "session_updated": {
          invalidateDraft();
          break;
        }

        case "session_finalized": {
          const f = event.payload as { finalStatus: UploadSessionStatus };
          setState((prev) => ({
            ...prev,
            finalStatus: f.finalStatus,
          }));
          invalidateDraft();
          es.close();
          break;
        }

        case "session_expired": {
          setState((prev) => ({ ...prev, finalStatus: "EXPIRED" }));
          invalidateDraft();
          es.close();
          break;
        }

        case "session_canceled": {
          setState((prev) => ({ ...prev, finalStatus: "CANCELED" }));
          invalidateDraft();
          es.close();
          break;
        }
      }
    }
    // invalidateDraft and resetHeartbeatTimer are stable (use refs internally).
    // sessionId is read via sessionIdRef — we intentionally exclude it to
    // prevent the SSE connection from being torn down on every render cycle.
  }, [invalidateDraft, resetHeartbeatTimer]);

  // Connect/reconnect only when sessionId actually changes
  const prevSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    isMountedRef.current = true;

    // Only reconnect if sessionId actually changed
    if (sessionId !== prevSessionIdRef.current) {
      prevSessionIdRef.current = sessionId;
      connect();
    }

    return () => {
      isMountedRef.current = false;
      eventSourceRef.current?.close();
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [sessionId, connect]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    setState(INITIAL_SSE_STATE);
  }, []);

  return { ...state, disconnect };
}
