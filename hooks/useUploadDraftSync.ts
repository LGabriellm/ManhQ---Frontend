"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getUploadErrorStatus } from "@/lib/uploadErrors";
import { uploadWorkflowService } from "@/services/upload-workflow.service";
import { uploadWorkflowKeys } from "@/hooks/useUploadWorkflow";
import type {
  BulkUpdateUploadDraftRequest,
  UploadDraft,
  UploadSource,
} from "@/types/upload-workflow";

type BulkItemPatch = NonNullable<BulkUpdateUploadDraftRequest["items"]>[number];

interface DraftQueueState {
  targetSeriesId?: string;
  seriesTitle?: string;
  items: Record<string, BulkItemPatch>;
}

function createEmptyQueueState(): DraftQueueState {
  return {
    items: {},
  };
}

function normalizeItemPatch(item: BulkItemPatch): BulkItemPatch {
  const normalized: BulkItemPatch = {
    itemId: item.itemId,
  };

  if ("selected" in item && typeof item.selected === "boolean") {
    normalized.selected = item.selected;
  }
  if ("chapterNumber" in item && typeof item.chapterNumber === "number") {
    normalized.chapterNumber = item.chapterNumber;
  }
  if ("volume" in item) {
    normalized.volume = item.volume ?? null;
  }
  if ("year" in item) {
    normalized.year = item.year ?? null;
  }
  if ("isOneShot" in item && typeof item.isOneShot === "boolean") {
    normalized.isOneShot = item.isOneShot;
  }

  return normalized;
}

function mergeQueueState(
  base: DraftQueueState,
  incoming: DraftQueueState,
): DraftQueueState {
  const merged: DraftQueueState = {
    ...base,
    items: { ...base.items },
  };

  if (incoming.targetSeriesId !== undefined) {
    merged.targetSeriesId = incoming.targetSeriesId;
    delete merged.seriesTitle;
  }

  if (incoming.seriesTitle !== undefined) {
    merged.seriesTitle = incoming.seriesTitle;
    delete merged.targetSeriesId;
  }

  for (const patch of Object.values(incoming.items)) {
    const existing = merged.items[patch.itemId] ?? { itemId: patch.itemId };
    merged.items[patch.itemId] = {
      ...existing,
      ...normalizeItemPatch(patch),
    };
  }

  return merged;
}

function queueStateFromPayload(payload: BulkUpdateUploadDraftRequest): DraftQueueState {
  const next = createEmptyQueueState();

  if (payload.targetSeriesId !== undefined) {
    next.targetSeriesId = payload.targetSeriesId;
  }
  if (payload.seriesTitle !== undefined) {
    next.seriesTitle = payload.seriesTitle;
  }
  if (payload.items?.length) {
    for (const item of payload.items) {
      next.items[item.itemId] = normalizeItemPatch(item);
    }
  }

  return next;
}

function buildBulkPayload(
  queueState: DraftQueueState,
): BulkUpdateUploadDraftRequest | null {
  const payload: BulkUpdateUploadDraftRequest = {};

  if (queueState.targetSeriesId !== undefined) {
    payload.targetSeriesId = queueState.targetSeriesId;
  }
  if (queueState.seriesTitle !== undefined) {
    payload.seriesTitle = queueState.seriesTitle;
  }

  const items = Object.values(queueState.items);
  if (items.length > 0) {
    payload.items = items;
  }

  if (
    payload.targetSeriesId === undefined &&
    payload.seriesTitle === undefined &&
    payload.items === undefined
  ) {
    return null;
  }

  return payload;
}

function buildScopeSignature(
  payload: BulkUpdateUploadDraftRequest,
  draft: UploadDraft | null,
): string {
  if (!draft) {
    return "no-draft";
  }

  if (payload.items?.length) {
    const scopedItems = payload.items
      .map((patch) => {
        const item = draft.items.find((entry) => entry.id === patch.itemId);
        return {
          itemId: patch.itemId,
          updatedAt: item?.updatedAt ?? null,
          selectionConfirmed: item?.plan.selectionConfirmed ?? null,
          destinationReady: item?.plan.destinationReady ?? null,
        };
      })
      .sort((a, b) => a.itemId.localeCompare(b.itemId));

    return JSON.stringify(scopedItems);
  }

  if (payload.targetSeriesId !== undefined || payload.seriesTitle !== undefined) {
    const scopedItems = draft.items
      .filter(
        (item) =>
          item.status === "READY_FOR_REVIEW" &&
          item.job.canReview &&
          !item.job.isCancelRequested,
      )
      .map((item) => ({
        itemId: item.id,
        updatedAt: item.updatedAt,
        currentDecision: item.plan.decision,
        targetSeriesId: item.plan.targetSeriesId,
        newSeriesTitle: item.plan.newSeriesTitle,
        selectionConfirmed: item.plan.selectionConfirmed,
        destinationReady: item.plan.destinationReady,
      }))
      .sort((a, b) => a.itemId.localeCompare(b.itemId));

    return JSON.stringify(scopedItems);
  }

  return "no-scope";
}

function stablePayloadHash(
  payload: BulkUpdateUploadDraftRequest,
  draft: UploadDraft | null,
): string {
  const normalized = {
    targetSeriesId: payload.targetSeriesId ?? null,
    seriesTitle: payload.seriesTitle ?? null,
    items: (payload.items ?? [])
      .map((item) => normalizeItemPatch(item))
      .sort((a, b) => a.itemId.localeCompare(b.itemId))
      .map((item) => ({
        itemId: item.itemId,
        selected: "selected" in item ? item.selected : undefined,
        chapterNumber:
          "chapterNumber" in item ? item.chapterNumber : undefined,
        volume: "volume" in item ? item.volume : undefined,
        year: "year" in item ? item.year : undefined,
        isOneShot: "isOneShot" in item ? item.isOneShot : undefined,
      })),
  };

  return JSON.stringify({
    payload: normalized,
    scope: buildScopeSignature(payload, draft),
  });
}

function getPendingCount(queueState: DraftQueueState): number {
  let count = Object.keys(queueState.items).length;
  if (queueState.targetSeriesId !== undefined) {
    count += 1;
  }
  if (queueState.seriesTitle !== undefined) {
    count += 1;
  }
  return count;
}

function getRetryDelayMs(error: unknown, attempt: number): number {
  const retryAfter = (error as { retryAfter?: unknown } | null | undefined)
    ?.retryAfter;
  if (typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter <= 60 ? retryAfter * 1000 : retryAfter;
  }

  const base = Math.min(4000, 600 * 2 ** Math.max(attempt - 1, 0));
  const jitter = Math.floor(Math.random() * 220) + 80;
  return base + jitter;
}

function shouldRetryBulkSync(error: unknown, attempt: number): boolean {
  if (attempt >= 3) {
    return false;
  }

  const status = getUploadErrorStatus(error);
  return status === 429 || (status !== undefined && status >= 500);
}

export type UploadDraftSyncStatus =
  | "synced"
  | "pending"
  | "syncing"
  | "error";

interface UseUploadDraftSyncOptions {
  source: UploadSource | null;
  draftId: string | null;
  enabled?: boolean;
  debounceMs?: number;
  onConflict?: (error: unknown) => Promise<void> | void;
  onReconnectRequired?: (error: unknown) => Promise<void> | void;
}

interface UploadDraftSyncController {
  status: UploadDraftSyncStatus;
  pendingCount: number;
  lastError: string | null;
  hasPendingChanges: boolean;
  enqueueBulkUpdate: (payload: BulkUpdateUploadDraftRequest) => void;
  flushNow: () => Promise<boolean>;
}

export function useUploadDraftSync({
  source,
  draftId,
  enabled = true,
  debounceMs = 800,
  onConflict,
  onReconnectRequired,
}: UseUploadDraftSyncOptions): UploadDraftSyncController {
  const queryClient = useQueryClient();
  const queueStateRef = useRef<DraftQueueState>(createEmptyQueueState());
  const flushTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const lastPayloadHashRef = useRef<string | null>(null);

  const [status, setStatus] = useState<UploadDraftSyncStatus>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearFlushTimer = useCallback(() => {
    if (flushTimerRef.current != null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const hasPendingChanges = pendingCount > 0;

  const updatePendingState = useCallback((nextQueueState: DraftQueueState) => {
    queueStateRef.current = nextQueueState;
    const nextPendingCount = getPendingCount(nextQueueState);
    setPendingCount(nextPendingCount);
    if (nextPendingCount > 0 && !inFlightRef.current) {
      setStatus("pending");
    }
  }, []);

  const runFlush = useCallback(async (): Promise<boolean> => {
    if (!enabled || !source || !draftId) {
      return true;
    }

    if (inFlightRef.current) {
      return false;
    }

    const payload = buildBulkPayload(queueStateRef.current);
    if (!payload) {
      setStatus("synced");
      setLastError(null);
      setPendingCount(0);
      return true;
    }

    const cachedDraftBefore =
      queryClient.getQueryData<{ success: true; draft: UploadDraft }>(
        uploadWorkflowKeys.draft(source, draftId),
      )?.draft ?? null;
    const payloadHash = stablePayloadHash(payload, cachedDraftBefore);
    if (payloadHash === lastPayloadHashRef.current) {
      updatePendingState(createEmptyQueueState());
      setStatus("synced");
      return true;
    }

    const queuedSnapshot = queueStateRef.current;
    updatePendingState(createEmptyQueueState());
    inFlightRef.current = true;
    setStatus("syncing");
    setLastError(null);

    try {
      let response:
        | Awaited<ReturnType<typeof uploadWorkflowService.bulkUpdateDraft>>
        | null = null;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          response = await uploadWorkflowService.bulkUpdateDraft(
            source,
            draftId,
            payload,
          );
          break;
        } catch (error) {
          if (!shouldRetryBulkSync(error, attempt)) {
            throw error;
          }

          const delayMs = getRetryDelayMs(error, attempt);
          await new Promise((resolve) => {
            window.setTimeout(resolve, delayMs);
          });
        }
      }

      if (!response) {
        throw new Error("Falha ao sincronizar alterações em lote.");
      }

      queryClient.setQueryData(uploadWorkflowKeys.draft(source, draftId), {
        success: true,
        draft: response.draft,
      });

      lastPayloadHashRef.current = stablePayloadHash(payload, response.draft);
      setLastError(null);

      const hasQueuedAfterFlush =
        buildBulkPayload(queueStateRef.current) !== null;
      setStatus(hasQueuedAfterFlush ? "pending" : "synced");
      return true;
    } catch (error) {
      const pendingWhileInFlight = queueStateRef.current;
      const restoredQueue = mergeQueueState(
        queuedSnapshot,
        pendingWhileInFlight,
      );
      updatePendingState(restoredQueue);

      const statusCode = getUploadErrorStatus(error);
      if (statusCode === 409) {
        await queryClient.invalidateQueries({
          queryKey: uploadWorkflowKeys.draft(source, draftId),
        });
        await queryClient.invalidateQueries({
          queryKey: uploadWorkflowKeys.session(draftId),
        });
        if (onConflict) {
          await onConflict(error);
        }
      }

      if (statusCode === 428 && onReconnectRequired) {
        await onReconnectRequired(error);
      }

      const message =
        (error as { message?: string } | null | undefined)?.message ||
        "Falha ao sincronizar alterações em lote.";
      setLastError(message);
      setStatus("error");
      return false;
    } finally {
      inFlightRef.current = false;
      if (buildBulkPayload(queueStateRef.current)) {
        clearFlushTimer();
        flushTimerRef.current = window.setTimeout(() => {
          void runFlush();
        }, debounceMs);
      }
    }
  }, [
    clearFlushTimer,
    debounceMs,
    draftId,
    enabled,
    onConflict,
    onReconnectRequired,
    queryClient,
    source,
    updatePendingState,
  ]);

  const enqueueBulkUpdate = useCallback(
    (payload: BulkUpdateUploadDraftRequest) => {
      if (!enabled || !source || !draftId) {
        return;
      }

      const incomingQueue = queueStateFromPayload(payload);
      const merged = mergeQueueState(queueStateRef.current, incomingQueue);
      updatePendingState(merged);

      clearFlushTimer();
      flushTimerRef.current = window.setTimeout(() => {
        void runFlush();
      }, debounceMs);
    },
    [
      clearFlushTimer,
      debounceMs,
      draftId,
      enabled,
      runFlush,
      source,
      updatePendingState,
    ],
  );

  const flushNow = useCallback(async () => {
    clearFlushTimer();
    return runFlush();
  }, [clearFlushTimer, runFlush]);

  useEffect(() => {
    if (!enabled || !source || !draftId) {
      clearFlushTimer();
      queueStateRef.current = createEmptyQueueState();
      setPendingCount(0);
      setLastError(null);
      setStatus("synced");
      return;
    }

    return () => {
      clearFlushTimer();
    };
  }, [clearFlushTimer, draftId, enabled, source]);

  return useMemo(
    () => ({
      status,
      pendingCount,
      lastError,
      hasPendingChanges,
      enqueueBulkUpdate,
      flushNow,
    }),
    [
      enqueueBulkUpdate,
      flushNow,
      hasPendingChanges,
      lastError,
      pendingCount,
      status,
    ],
  );
}
