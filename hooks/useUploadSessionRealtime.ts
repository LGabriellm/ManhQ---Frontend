"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadWorkflowKeys } from "@/hooks/useUploadWorkflow";
import { workflowNeedsDraft } from "@/lib/upload-workflow";
import {
  normalizeUploadSessionDetail,
  normalizeUploadSessionSummary,
  uploadWorkflowService,
} from "@/services/upload-workflow.service";
import type {
  UploadDraftResponse,
  UploadSessionCallbacks,
  UploadSessionDetail,
  UploadSessionEventType,
  UploadSessionSnapshotEvent,
  UploadSessionSsePayload,
  UploadSessionStreamEvent,
  UploadSource,
} from "@/types/upload-workflow";

const RECONCILE_EVERY_EVENTS = 12;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;
const BASE_FALLBACK_POLL_DELAY_MS = 1000;
const MAX_FALLBACK_POLL_DELAY_MS = 10000;
const MIN_RECONCILE_INTERVAL_MS = 1500;
const DRAFT_RECONCILE_MIN_INTERVAL_MS = 7000;

const CRITICAL_EVENTS = new Set<UploadSessionEventType>([
  "session_confirmed",
  "session_canceled",
  "session_updated",
]);

export type UploadRealtimeStatus =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "polling";

export interface UploadSessionRealtimeState {
  status: UploadRealtimeStatus;
  reconnectAttempts: number;
  eventsReceived: number;
  lastEventType: string | null;
  lastEventAt: string | null;
  usingFallbackPolling: boolean;
  lastError: string | null;
}

export interface UploadSessionRealtimeController
  extends UploadSessionRealtimeState {
  reconcileNow: () => Promise<void>;
  restartStream: () => void;
}

interface UseUploadSessionRealtimeOptions {
  sessionId: string | null;
  source: UploadSource | null;
  callbacks?: UploadSessionCallbacks | null;
  enabled?: boolean;
}

interface ReconcileSessionOptions {
  forceDraft?: boolean;
}

const INITIAL_STATE: UploadSessionRealtimeState = {
  status: "idle",
  reconnectAttempts: 0,
  eventsReceived: 0,
  lastEventType: null,
  lastEventAt: null,
  usingFallbackPolling: false,
  lastError: null,
};

function normalizeRoute(path: string): string {
  const trimmed = path.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return trimmed;
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildProxyPath(path: string): string {
  const normalized = normalizeRoute(path);
  if (normalized.startsWith("/api/")) {
    return normalized;
  }
  return `/api${normalized}`;
}

function parseSsePayload(event: MessageEvent<string>): UploadSessionSsePayload | null {
  if (!event.data) {
    return null;
  }

  try {
    return JSON.parse(event.data) as UploadSessionSsePayload;
  } catch {
    return null;
  }
}

function isSnapshotEvent(
  payload: UploadSessionSsePayload,
): payload is UploadSessionSnapshotEvent {
  return payload.type === "snapshot";
}

function isStreamEvent(
  payload: UploadSessionSsePayload,
): payload is UploadSessionStreamEvent {
  return "payload" in payload && "createdAt" in payload;
}

function getFallbackPollingDelayByWorkflow(
  workflowState: UploadSessionDetail["workflow"]["state"] | undefined,
): number | null {
  if (!workflowState) {
    return BASE_FALLBACK_POLL_DELAY_MS;
  }

  switch (workflowState) {
    case "ANALYZING":
      return 1000;
    case "PROCESSING":
      return 2000;
    case "APPROVAL_PENDING":
      return 4000;
    case "REVIEW_REQUIRED":
    case "READY_TO_CONFIRM":
      return null;
    default:
      return BASE_FALLBACK_POLL_DELAY_MS;
  }
}

export function useUploadSessionRealtime({
  sessionId,
  source,
  callbacks,
  enabled = true,
}: UseUploadSessionRealtimeOptions): UploadSessionRealtimeController {
  const queryClient = useQueryClient();
  const [state, setState] = useState<UploadSessionRealtimeState>(INITIAL_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const fallbackPollTimeoutRef = useRef<number | null>(null);
  const eventCounterRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const fallbackFailuresRef = useRef(0);
  const disposedRef = useRef(false);
  const reconcileInFlightRef = useRef(false);
  const lastReconcileAtRef = useRef(0);
  const lastDraftFetchAtRef = useRef(0);
  const reconnectConnectRef = useRef<((isReconnect: boolean) => void) | null>(
    null,
  );

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current != null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearFallbackPollTimer = useCallback(() => {
    if (fallbackPollTimeoutRef.current != null) {
      window.clearTimeout(fallbackPollTimeoutRef.current);
      fallbackPollTimeoutRef.current = null;
    }
  }, []);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const setSessionCache = useCallback(
    (session: UploadSessionDetail) => {
      queryClient.setQueryData(uploadWorkflowKeys.session(session.id), {
        success: true,
        session,
      });
    },
    [queryClient],
  );

  const setDraftCache = useCallback(
    (activeSource: UploadSource, draftResponse: UploadDraftResponse) => {
      const resolvedDraftId = draftResponse.draft.id;
      queryClient.setQueryData(uploadWorkflowKeys.draft(activeSource, resolvedDraftId), {
        success: true,
        draft: draftResponse.draft,
      });
    },
    [queryClient],
  );

  const reconcileSession = useCallback(
    async (options?: ReconcileSessionOptions): Promise<UploadSessionDetail | null> => {
      if (!sessionId) {
        return null;
      }

      const now = Date.now();
      if (
        !options?.forceDraft &&
        now - lastReconcileAtRef.current < MIN_RECONCILE_INTERVAL_MS
      ) {
        return null;
      }

      if (reconcileInFlightRef.current) {
        return null;
      }

      reconcileInFlightRef.current = true;
      try {
        const sessionResponse = callbacks?.poll
          ? await uploadWorkflowService.getSessionByCallbackPath(callbacks.poll)
          : await uploadWorkflowService.getSession(sessionId);
        const session = sessionResponse.session;
        setSessionCache(session);
        lastReconcileAtRef.current = Date.now();

        const activeSource = source;
        const shouldFetchDraft = Boolean(
          activeSource &&
            workflowNeedsDraft(session.workflow) &&
            (options?.forceDraft ||
              Date.now() - lastDraftFetchAtRef.current >=
                DRAFT_RECONCILE_MIN_INTERVAL_MS),
        );

        if (shouldFetchDraft && activeSource) {
          lastDraftFetchAtRef.current = Date.now();
          try {
            const draftResponse = callbacks?.draft
              ? await uploadWorkflowService.getDraftByCallbackPath(callbacks.draft)
              : await uploadWorkflowService.getDraft(activeSource, sessionId);
            setDraftCache(activeSource, draftResponse);
          } catch {
            // Some sessions do not expose draft anymore after confirm/cancel.
          }
        }

        return session;
      } finally {
        reconcileInFlightRef.current = false;
      }
    },
    [callbacks, sessionId, setDraftCache, setSessionCache, source],
  );

  const scheduleFallbackPolling = useCallback(() => {
    if (disposedRef.current || !sessionId || !enabled) {
      return;
    }

    clearFallbackPollTimer();

    setState((current) => ({
      ...current,
      status: current.status === "live" ? current.status : "polling",
      usingFallbackPolling: true,
    }));

    const runFallbackPoll = async () => {
      if (disposedRef.current || !sessionId || !enabled) {
        return;
      }

      try {
        const session = await reconcileSession();
        fallbackFailuresRef.current = 0;

        if (session?.workflow.isTerminal) {
          setState((current) => ({
            ...current,
            status: "idle",
            usingFallbackPolling: false,
          }));
          clearFallbackPollTimer();
          closeEventSource();
          clearReconnectTimer();
          return;
        }

        const pollingDelay = getFallbackPollingDelayByWorkflow(
          session?.workflow.state,
        );
        if (pollingDelay == null) {
          setState((current) => ({
            ...current,
            status: "reconnecting",
            usingFallbackPolling: false,
          }));
          clearFallbackPollTimer();
          return;
        }

        fallbackPollTimeoutRef.current = window.setTimeout(
          runFallbackPoll,
          pollingDelay,
        );
        return;
      } catch (error) {
        fallbackFailuresRef.current += 1;
        const message =
          error instanceof Error
            ? error.message
            : "Falha ao sincronizar sessão via polling.";
        setState((current) => ({
          ...current,
          lastError: message,
          status: "polling",
          usingFallbackPolling: true,
        }));
      }

      const failureMultiplier = Math.max(fallbackFailuresRef.current - 1, 0);
      const delay = Math.min(
        MAX_FALLBACK_POLL_DELAY_MS,
        BASE_FALLBACK_POLL_DELAY_MS * 2 ** failureMultiplier,
      );

      fallbackPollTimeoutRef.current = window.setTimeout(runFallbackPoll, delay);
    };

    fallbackPollTimeoutRef.current = window.setTimeout(runFallbackPoll, 0);
  }, [
    clearFallbackPollTimer,
    clearReconnectTimer,
    closeEventSource,
    enabled,
    reconcileSession,
    sessionId,
  ]);

  const scheduleReconnect = useCallback(() => {
    if (disposedRef.current || !sessionId || !enabled) {
      return;
    }

    clearReconnectTimer();

    const reconnectAttempt = reconnectAttemptsRef.current;
    const backoff = Math.min(
      MAX_RECONNECT_DELAY_MS,
      BASE_RECONNECT_DELAY_MS * 2 ** Math.max(reconnectAttempt - 1, 0),
    );

    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      reconnectConnectRef.current?.(true);
    }, backoff);
  }, [clearReconnectTimer, enabled, sessionId]);

  const connect = useCallback(
    (isReconnect: boolean) => {
      if (!enabled || !sessionId) {
        return;
      }

      const eventPath = callbacks?.events ?? `/upload/sessions/${sessionId}/events`;
      const streamPath = buildProxyPath(eventPath);

      closeEventSource();
      clearFallbackPollTimer();

      setState((current) => ({
        ...current,
        status: isReconnect ? "reconnecting" : "connecting",
        reconnectAttempts: reconnectAttemptsRef.current,
      }));

      const sourceConnection = new EventSource(streamPath, { withCredentials: true });
      eventSourceRef.current = sourceConnection;

      sourceConnection.addEventListener("open", () => {
        reconnectAttemptsRef.current = 0;
        fallbackFailuresRef.current = 0;
        clearFallbackPollTimer();
        setState((current) => ({
          ...current,
          status: "live",
          reconnectAttempts: 0,
          usingFallbackPolling: false,
          lastError: null,
        }));
      });

      sourceConnection.addEventListener("snapshot", (event) => {
        const payload = parseSsePayload(event as MessageEvent<string>);
        if (!payload || !isSnapshotEvent(payload) || payload.sessionId !== sessionId) {
          return;
        }

        const hasItems = Array.isArray(payload.session.items);
        if (hasItems) {
          setSessionCache(
            normalizeUploadSessionDetail(payload.session as UploadSessionDetail),
          );
        } else {
          const normalized = normalizeUploadSessionSummary(payload.session);
          queryClient.setQueryData(
            uploadWorkflowKeys.session(sessionId),
            (current: { success: true; session: UploadSessionDetail } | undefined) => {
              if (!current) {
                return current;
              }

              return {
                success: true as const,
                session: {
                  ...current.session,
                  ...normalized,
                },
              };
            },
          );
        }

        eventCounterRef.current += 1;
        setState((current) => ({
          ...current,
          eventsReceived: current.eventsReceived + 1,
          lastEventType: payload.type,
          lastEventAt: new Date().toISOString(),
        }));
      });

      sourceConnection.addEventListener("upload_session", (event) => {
        const payload = parseSsePayload(event as MessageEvent<string>);
        if (!payload || !isStreamEvent(payload) || payload.sessionId !== sessionId) {
          return;
        }

        eventCounterRef.current += 1;
        const shouldReconcile =
          CRITICAL_EVENTS.has(payload.type) ||
          eventCounterRef.current % RECONCILE_EVERY_EVENTS === 0;

        if (shouldReconcile) {
          void reconcileSession({ forceDraft: false });
        }

        setState((current) => ({
          ...current,
          eventsReceived: current.eventsReceived + 1,
          lastEventType: payload.type,
          lastEventAt: new Date().toISOString(),
        }));
      });

      sourceConnection.onerror = () => {
        if (disposedRef.current) {
          return;
        }

        closeEventSource();
        reconnectAttemptsRef.current += 1;

        setState((current) => ({
          ...current,
          status: "reconnecting",
          reconnectAttempts: reconnectAttemptsRef.current,
          usingFallbackPolling: true,
          lastError: "Conexão em tempo real interrompida. Mantendo fallback por polling.",
        }));

        scheduleFallbackPolling();
        scheduleReconnect();
      };
    },
    [
      callbacks,
      clearFallbackPollTimer,
      closeEventSource,
      enabled,
      queryClient,
      reconcileSession,
      scheduleFallbackPolling,
      scheduleReconnect,
      sessionId,
      setSessionCache,
    ],
  );

  useEffect(() => {
    reconnectConnectRef.current = connect;
    return () => {
      reconnectConnectRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    disposedRef.current = false;

    if (!enabled || !sessionId) {
      closeEventSource();
      clearReconnectTimer();
      clearFallbackPollTimer();
      return () => {
        disposedRef.current = true;
      };
    }

    void reconcileSession({ forceDraft: true });
    connect(false);

    return () => {
      disposedRef.current = true;
      closeEventSource();
      clearReconnectTimer();
      clearFallbackPollTimer();
    };
  }, [
    clearFallbackPollTimer,
    clearReconnectTimer,
    closeEventSource,
    connect,
    enabled,
    reconcileSession,
    sessionId,
  ]);

  const reconcileNow = useCallback(async () => {
    if (!enabled || !sessionId) {
      return;
    }

    try {
      await reconcileSession({ forceDraft: true });
      setState((current) => ({
        ...current,
        lastError: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        lastError:
          error instanceof Error
            ? error.message
            : "Falha ao sincronizar sessão manualmente.",
      }));
    }
  }, [enabled, reconcileSession, sessionId]);

  const restartStream = useCallback(() => {
    if (!enabled || !sessionId) {
      return;
    }

    closeEventSource();
    clearReconnectTimer();
    clearFallbackPollTimer();
    connect(true);
  }, [
    clearFallbackPollTimer,
    clearReconnectTimer,
    closeEventSource,
    connect,
    enabled,
    sessionId,
  ]);

  if (!enabled || !sessionId) {
    return {
      ...INITIAL_STATE,
      reconcileNow: async () => {},
      restartStream: () => {},
    };
  }

  return {
    ...state,
    reconcileNow,
    restartStream,
  };
}
