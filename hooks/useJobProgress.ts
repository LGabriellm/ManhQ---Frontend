"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getStoredToken } from "@/services/api";

export type JobProgressEvent =
  | {
      type: "snapshot";
      stats: Record<string, unknown>;
      jobs: unknown[];
    }
  | {
      type: "progress";
      queue: "uploads" | "scans";
      jobId: string;
      progress: number | { current: number; total: number; percent: number };
    }
  | {
      type: "completed";
      queue: "uploads" | "scans";
      jobId: string;
      result: Record<string, unknown>;
    }
  | {
      type: "failed";
      queue: "uploads" | "scans";
      jobId: string;
      error: string;
    }
  | {
      type: "stalled";
      queue: "uploads";
      jobId: string;
    };

interface UseJobProgressStreamOptions {
  enabled?: boolean;
  onEvent?: (event: JobProgressEvent) => void;
}

export function useJobProgressStream({
  enabled = true,
  onEvent,
}: UseJobProgressStreamOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<JobProgressEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    const token = getStoredToken();
    if (!token) return;

    // Proxy via Next.js Route Handler (mesmo domínio, sem CORS)
    const url = `/api/jobs/progress/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobProgressEvent;
        setLastEvent(data);
        onEventRef.current?.(data);
      } catch {
        // Ignore parse errors (heartbeat comments)
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [enabled, disconnect]);

  return { connected, lastEvent, disconnect };
}
