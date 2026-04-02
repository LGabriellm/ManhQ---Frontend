"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  HardDrive,
  Loader2,
  Search,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import { GoogleDriveImportPanel } from "@/components/upload/GoogleDriveImportPanel";
import { LocalUploadEntryPanel } from "@/components/upload/LocalUploadEntryPanel";
import { UploadItemCard } from "@/components/upload/UploadItemCard";
import { UploadPipelineStepper } from "@/components/upload/UploadPipelineStepper";
import { UploadRealtimePanel } from "@/components/upload/UploadRealtimePanel";
import { UploadSessionList } from "@/components/upload/UploadSessionList";
import { useAuth } from "@/contexts/AuthContext";
import { useSeriesSearch } from "@/hooks/useApi";
import { useUploadCenterStore } from "@/hooks/useUploadCenterStore";
import { useUploadDraftSync } from "@/hooks/useUploadDraftSync";
import { useGoogleDriveReconnectRecovery } from "@/hooks/useGoogleDriveReconnectRecovery";
import { useUploadSessionRealtime } from "@/hooks/useUploadSessionRealtime";
import {
  useCancelUploadDraft,
  useCancelUploadItem,
  useConfirmUploadDraft,
  useRetryUploadItem,
  useUpdateUploadDraftItem,
  useUploadDraft,
  useUploadSession,
  useUploadSessions,
} from "@/hooks/useUploadWorkflow";
import {
  NEXT_ACTION_META,
  OPERATIONAL_STATE_META,
  SESSION_STATUS_META,
  TONE_STYLES,
  WORKFLOW_STATE_META,
  countItemsFailed,
  countItemsNeedingManualChoice,
  formatDateTime,
  getSessionProgress,
  getSourceLabel,
  getWorkflowSummary,
  itemCanBeEdited,
  itemNeedsManualChoice,
  workflowNeedsDraft,
} from "@/lib/upload-workflow";
import {
  getUploadErrorMessage,
  getUploadErrorStatus,
  isUploadConflictError,
  isUploadMissingError,
} from "@/lib/uploadErrors";
import type {
  UpdateUploadDraftItemRequest,
  UploadDraft,
  UploadItem,
  UploadSource,
  UploadSessionSummary,
} from "@/types/upload-workflow";

const EMPTY_SESSIONS: UploadSessionSummary[] = [];
const ACTIVE_SESSION_STORAGE_KEY = "manhq-upload-active-session-id";

type UploadCenterTab = "LOCAL" | "GOOGLE_DRIVE" | "REVIEW" | "PROCESSING";

interface ConfirmRejectedItem {
  itemId: string;
  filename: string;
  reason: string;
}

interface ConfirmFeedbackState {
  sessionId: string;
  rejected: ConfirmRejectedItem[];
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function resolveRetryAfterMs(error: unknown): number {
  const retryAfterRaw = (error as { retryAfter?: unknown } | null | undefined)
    ?.retryAfter;

  if (typeof retryAfterRaw !== "number" || !Number.isFinite(retryAfterRaw)) {
    return 1500;
  }

  if (retryAfterRaw <= 0) {
    return 1500;
  }

  return retryAfterRaw <= 60 ? retryAfterRaw * 1000 : retryAfterRaw;
}

function getInitialActiveSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
}

function getDraftAnalysisProgress(draft: UploadDraft): number {
  if (!draft.processing.totalReceived) {
    return 0;
  }

  return Math.round(
    (draft.processing.analyzedCount / draft.processing.totalReceived) * 100,
  );
}

function extractDraftIdFromCallbackPath(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  const match = path.match(/\/drafts\/([^/?]+)/i);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getItemDisabledReason(
  item: UploadItem,
  activeDraft: UploadDraft | null,
  workflowFallback: UploadDraft["workflow"] | UploadSessionSummary["workflow"] | null,
): string | null {
  if (item.job.isCancelRequested) {
    return "Este item já está cancelando no backend. Aguarde a sincronização do worker.";
  }

  if (!activeDraft && !workflowFallback) {
    return "Este item está em modo de acompanhamento. Carregue um draft editável para revisar.";
  }

  const effectiveWorkflow = activeDraft?.workflow ?? workflowFallback;

  if (!effectiveWorkflow) {
    return "A sessão ainda não expôs workflow editável para este item.";
  }

  if (!effectiveWorkflow.canEdit) {
    if (effectiveWorkflow.canConfirm) {
      return "A edição manual foi encerrada. O draft já está pronto para confirmação.";
    }

    if (effectiveWorkflow.isTerminal) {
      return "O draft já foi finalizado e não aceita novas edições.";
    }

    return NEXT_ACTION_META[effectiveWorkflow.nextAction].description;
  }

  if (item.status !== "READY_FOR_REVIEW") {
    return "Somente itens em READY_FOR_REVIEW continuam editáveis.";
  }

  return null;
}

export default function UploadsPage() {
  const { isAdmin, isEditor } = useAuth();
  const {
    state: uploadCenterState,
    actions: uploadCenterActions,
  } = useUploadCenterStore("LOCAL");
  const [bulkSeriesId, setBulkSeriesId] = useState("");
  const [bulkSeriesTitle, setBulkSeriesTitle] = useState("");
  const [bulkSeriesQuery, setBulkSeriesQuery] = useState("");
  const [bulkNewSeriesTitle, setBulkNewSeriesTitle] = useState("");
  const [manualCenterTab, setManualCenterTab] = useState<UploadCenterTab | null>(
    null,
  );
  const [confirmReplayBlockedSessionId, setConfirmReplayBlockedSessionId] =
    useState<string | null>(null);
  const [confirmCooldownUntil, setConfirmCooldownUntil] = useState<number | null>(
    null,
  );
  const [lastConfirmFeedback, setLastConfirmFeedback] =
    useState<ConfirmFeedbackState | null>(null);
  const handledMissingSelectionRef = useRef<string | null>(null);
  const workspaceSectionRef = useRef<HTMLElement | null>(null);
  const confirmInFlightRef = useRef(false);
  const confirmCooldownTimerRef = useRef<number | null>(null);
  const deferredBulkSeriesQuery = useDeferredValue(bulkSeriesQuery.trim());

  const { recoverGoogleDriveReconnect, isReconnectingGoogleDrive } =
    useGoogleDriveReconnectRecovery();

  const sessionsQuery = useUploadSessions({ page: 1, limit: 12 });
  const sessions = sessionsQuery.data?.sessions ?? EMPTY_SESSIONS;
  const resolvedActiveSessionId =
    uploadCenterState.activeSessionId ?? sessions[0]?.id ?? null;
  const activeSummary =
    sessions.find((session) => session.id === resolvedActiveSessionId) || null;

  const activeSessionQuery = useUploadSession(
    resolvedActiveSessionId || "",
    Boolean(resolvedActiveSessionId),
    false,
  );
  const activeSession = activeSessionQuery.data?.session || null;
  const activeSource =
    activeSession?.source ||
    activeSummary?.source ||
    uploadCenterState.selectedSource;
  const sessionCallbacks = activeSession?.callbacks || activeSummary?.callbacks || null;
  const callbackDraftId = extractDraftIdFromCallbackPath(sessionCallbacks?.draft);
  const candidateDraftId =
    callbackDraftId || (activeSession ? resolvedActiveSessionId : null);
  const activeWorkflow =
    activeSession?.workflow || activeSummary?.workflow || null;
  const shouldLoadDraft = Boolean(
    candidateDraftId &&
      activeSource &&
      activeWorkflow &&
      workflowNeedsDraft(activeWorkflow),
  );
  const activeDraftQuery = useUploadDraft(
    activeSource || "LOCAL",
    candidateDraftId || "",
    shouldLoadDraft,
    false,
  );
  const activeDraft =
    (activeDraftQuery.data as { draft?: UploadDraft } | undefined)?.draft || null;
  const resolvedActiveDraftId = activeDraft?.id || candidateDraftId || null;
  const workspaceWorkflow =
    activeDraft?.workflow || activeSession?.workflow || activeSummary?.workflow || null;
  const realtimeCallbacks =
    activeDraft?.callbacks || sessionCallbacks;
  const realtimeState = useUploadSessionRealtime({
    sessionId: resolvedActiveSessionId,
    source: activeSource,
    callbacks: realtimeCallbacks,
    enabled: Boolean(resolvedActiveSessionId && activeSource),
  });

  const updateDraftItemMutation = useUpdateUploadDraftItem();
  const confirmDraftMutation = useConfirmUploadDraft();
  const cancelDraftMutation = useCancelUploadDraft();
  const cancelItemMutation = useCancelUploadItem();
  const retryItemMutation = useRetryUploadItem();

  const draftSync = useUploadDraftSync({
    source: activeSource,
    draftId: resolvedActiveDraftId,
    enabled: Boolean(resolvedActiveDraftId && activeSource),
    debounceMs: 800,
    onReconnectRequired: async (error) => {
      if (activeSource !== "GOOGLE_DRIVE" || !resolvedActiveDraftId) {
        return;
      }

      try {
        await recoverGoogleDriveReconnect({
          error,
          draftId: resolvedActiveDraftId,
          intent: "google_drive_bulk_sync",
          onConnected: async () => {
            await activeSessionQuery.refetch();
            if (resolvedActiveDraftId) {
              await activeDraftQuery.refetch();
            }
          },
        });
      } catch {
        // O hook já mantém o erro visível via status/lastError.
      }
    },
  });

  const bulkSeriesSearch = useSeriesSearch(deferredBulkSeriesQuery, 1, 6);
  const activeItems = useMemo(
    () => activeDraft?.items ?? activeSession?.items ?? [],
    [activeDraft?.items, activeSession?.items],
  );
  const activeOperational =
    activeDraft?.operational ||
    activeSession?.operational ||
    activeSummary?.operational ||
    null;
  const reviewPendingFromItems = countItemsNeedingManualChoice(activeItems);
  const reviewPendingFromWorkflow =
    activeDraft?.workflow.counts.reviewRequired ??
    workspaceWorkflow?.counts.reviewRequired ??
    0;
  const reviewPendingCount = activeItems.length
    ? reviewPendingFromItems
    : reviewPendingFromWorkflow;
  const hasReviewCountDrift = Boolean(
    activeItems.length &&
      reviewPendingFromWorkflow !== reviewPendingFromItems,
  );
  const failedItemsCount =
    workspaceWorkflow?.counts.failed || countItemsFailed(activeItems);
  const confirmableCount = workspaceWorkflow?.counts.confirmable || 0;
  const pendingAnalysisCount = workspaceWorkflow?.counts.pendingAnalysis || 0;
  const sessionProgress =
    activeSession && activeSession.items.length > 0 ? getSessionProgress(activeSession) : 0;
  const draftProgress = activeDraft ? getDraftAnalysisProgress(activeDraft) : 0;
  const workflowSummary = getWorkflowSummary(workspaceWorkflow);
  const activeDraftCanEdit =
    (workspaceWorkflow?.canEdit ?? false) &&
    activeOperational?.state !== "cancel_requested";
  const activeDraftCanConfirm = workspaceWorkflow?.canConfirm ?? false;
  const activeDraftWorkflowState = activeDraft?.workflow.state ?? null;
  const runtimeMeta = activeOperational
    ? OPERATIONAL_STATE_META[activeOperational.state]
    : null;
  const confirmReplayBlocked = Boolean(
    resolvedActiveSessionId &&
      confirmReplayBlockedSessionId === resolvedActiveSessionId,
  );
  const sessionCancelInFlight = activeOperational?.state === "cancel_requested";
  const isConfirmCoolingDown = Boolean(
    confirmCooldownUntil && confirmCooldownUntil > Date.now(),
  );
  const confirmCooldownSeconds = isConfirmCoolingDown && confirmCooldownUntil
    ? Math.max(1, Math.ceil((confirmCooldownUntil - Date.now()) / 1000))
    : 0;
  const canRefreshConfirmState = Boolean(
    resolvedActiveSessionId &&
      !activeDraftCanConfirm &&
      reviewPendingCount === 0 &&
      pendingAnalysisCount === 0 &&
      !sessionCancelInFlight,
  );
  const confirmBackendStateLagging = Boolean(
    !activeDraftCanConfirm &&
      reviewPendingCount === 0 &&
      pendingAnalysisCount === 0 &&
      !sessionCancelInFlight,
  );
  const canAttemptConfirm = Boolean(
    resolvedActiveSessionId &&
      activeDraft &&
      reviewPendingCount === 0 &&
      pendingAnalysisCount === 0 &&
      !sessionCancelInFlight &&
      !isConfirmCoolingDown &&
      !confirmReplayBlocked &&
      draftSync.status !== "syncing",
  );
  const canCancelSession = Boolean(
    activeSource &&
      resolvedActiveSessionId &&
      activeOperational?.canCancel &&
      !sessionCancelInFlight,
  );
  const roleSummary = isEditor && !isAdmin
    ? "Você pode criar sessões, revisar sugestões, reconectar o Google Drive e acompanhar aprovações pendentes."
    : "Sessões persistidas, revisão manual, estados operacionais da pipeline e acompanhamento de jobs em um único workspace.";
  const centerTab = useMemo<UploadCenterTab>(() => {
    if (manualCenterTab) {
      return manualCenterTab;
    }

    if (!resolvedActiveSessionId) {
      return uploadCenterState.selectedSource;
    }

    if (
      uploadCenterState.activeStep === "REVIEW" ||
      uploadCenterState.activeStep === "CONFIRM"
    ) {
      return "REVIEW";
    }

    if (uploadCenterState.activeStep === "PROCESSING") {
      return "PROCESSING";
    }

    return uploadCenterState.selectedSource;
  }, [
    manualCenterTab,
    resolvedActiveSessionId,
    uploadCenterState.activeStep,
    uploadCenterState.selectedSource,
  ]);

  const focusWorkspace = useCallback(() => {
    workspaceSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const focusUploadItem = useCallback((itemId: string) => {
    const selector = `[data-upload-item-id="${itemId}"]`;
    const target = document.querySelector(selector);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  const handleCenterTabChange = useCallback(
    (tab: UploadCenterTab) => {
      if ((tab === "REVIEW" || tab === "PROCESSING") && !resolvedActiveSessionId) {
        toast.error("Abra uma sessão para acessar revisão e processamento.");
        return;
      }

      setManualCenterTab(tab);

      if (tab === "LOCAL" || tab === "GOOGLE_DRIVE") {
        uploadCenterActions.selectSource(tab);
        uploadCenterActions.setPreStageStep("SELECT_CONTENT");
      } else {
        focusWorkspace();
      }
    },
    [focusWorkspace, resolvedActiveSessionId, uploadCenterActions],
  );

  useEffect(() => {
    uploadCenterActions.syncWorkflow(workspaceWorkflow);
  }, [uploadCenterActions, workspaceWorkflow]);

  useEffect(() => {
    return () => {
      if (confirmCooldownTimerRef.current != null) {
        window.clearTimeout(confirmCooldownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    uploadCenterActions.syncStream({
      status: realtimeState.status,
      reconnectAttempts: realtimeState.reconnectAttempts,
      eventsReceived: realtimeState.eventsReceived,
      lastEventType: realtimeState.lastEventType,
      lastEventAt: realtimeState.lastEventAt,
      usingFallbackPolling: realtimeState.usingFallbackPolling,
      lastError: realtimeState.lastError,
    });
  }, [
    realtimeState.eventsReceived,
    realtimeState.lastError,
    realtimeState.lastEventAt,
    realtimeState.lastEventType,
    realtimeState.reconnectAttempts,
    realtimeState.status,
    realtimeState.usingFallbackPolling,
    uploadCenterActions,
  ]);

  const openSession = (
    sessionId: string,
    source?: UploadSource | null,
  ) => {
    setManualCenterTab(null);
    uploadCenterActions.openSession(
      sessionId,
      source ?? uploadCenterState.selectedSource,
    );
  };

  useEffect(() => {
    if (uploadCenterState.activeSessionId || sessions.length === 0) {
      return;
    }

    const storedSessionId = getInitialActiveSessionId();
    if (storedSessionId) {
      const storedSession = sessions.find((session) => session.id === storedSessionId);
      if (storedSession) {
        uploadCenterActions.openSession(storedSession.id, storedSession.source);
        return;
      }
    }

    uploadCenterActions.openSession(sessions[0].id, sessions[0].source);
  }, [
    sessions,
    uploadCenterActions,
    uploadCenterState.activeSessionId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (resolvedActiveSessionId) {
      window.localStorage.setItem(
        ACTIVE_SESSION_STORAGE_KEY,
        resolvedActiveSessionId,
      );
      return;
    }

    window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }, [resolvedActiveSessionId]);

  useEffect(() => {
    if (!lastConfirmFeedback || !resolvedActiveSessionId) {
      return;
    }

    if (lastConfirmFeedback.sessionId !== resolvedActiveSessionId) {
      setLastConfirmFeedback(null);
    }
  }, [lastConfirmFeedback, resolvedActiveSessionId]);

  const clearActiveSelection = useCallback(
    (message?: string) => {
      setManualCenterTab(null);
      uploadCenterActions.clearSession();
      setConfirmReplayBlockedSessionId(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      }
      if (message) {
        toast.error(message);
      }
    },
    [uploadCenterActions],
  );

  useEffect(() => {
    const missingError =
      (activeSessionQuery.error && isUploadMissingError(activeSessionQuery.error)
        ? activeSessionQuery.error
        : null) ||
      (activeDraftQuery.error && isUploadMissingError(activeDraftQuery.error)
        ? activeDraftQuery.error
        : null);

    if (!missingError || !resolvedActiveSessionId) {
      return;
    }

    if (handledMissingSelectionRef.current === resolvedActiveSessionId) {
      return;
    }

    handledMissingSelectionRef.current = resolvedActiveSessionId;
    const timeoutId = window.setTimeout(() => {
      clearActiveSelection(
        "A sessão ou o draft não existe mais. Se necessário, inicie um novo upload.",
      );
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeDraftQuery.error,
    activeSessionQuery.error,
    clearActiveSelection,
    resolvedActiveSessionId,
  ]);

  const refreshActiveWorkspace = async () => {
    await activeSessionQuery.refetch();
    if (activeSource && resolvedActiveDraftId) {
      await activeDraftQuery.refetch();
    }
    await sessionsQuery.refetch();
  };

  const startConfirmCooldown = useCallback((retryAfterMs: number) => {
    const safeDelay = Math.max(1000, retryAfterMs);
    const until = Date.now() + safeDelay;
    setConfirmCooldownUntil(until);

    if (confirmCooldownTimerRef.current != null) {
      window.clearTimeout(confirmCooldownTimerRef.current);
    }

    confirmCooldownTimerRef.current = window.setTimeout(() => {
      setConfirmCooldownUntil((current) => (current === until ? null : current));
    }, safeDelay);
  }, []);

  const handleRecoverableActionError = async ({
    error,
    intent,
    retry,
  }: {
    error: unknown;
    intent: string;
    retry?: () => Promise<void>;
  }) => {
    if (isUploadConflictError(error)) {
      await refreshActiveWorkspace();
      toast.error(
        "O draft mudou no backend. A tela foi atualizada com o estado mais recente.",
      );
      return true;
    }

    if (getUploadErrorStatus(error) === 429 && retry) {
      const retryAfterMs = resolveRetryAfterMs(error);
      toast.error(
        `Muitas requisições no momento. Tentando novamente em ${Math.ceil(
          retryAfterMs / 1000,
        )}s...`,
      );
      await new Promise((resolve) => {
        window.setTimeout(resolve, retryAfterMs);
      });
      await retry();
      return true;
    }

    if (isUploadMissingError(error)) {
      clearActiveSelection(
        "O draft não está mais disponível. Reabra a sessão correta ou inicie um novo upload.",
      );
      return true;
    }

    if (activeSource === "GOOGLE_DRIVE") {
      try {
        const recovered = await recoverGoogleDriveReconnect({
          error,
          draftId: resolvedActiveDraftId,
          intent,
          onConnected: async () => {
            await refreshActiveWorkspace();
          },
          retry,
        });

        if (recovered) {
          toast.success("Google Drive reconectado. O fluxo foi retomado.");
          return true;
        }
      } catch (reconnectError) {
        toast.error(
          getUploadErrorMessage(
            reconnectError,
            "Não foi possível restabelecer a conexão com Google Drive.",
          ),
        );
        return true;
      }
    }

    return false;
  };

  const patchItem = async (
    itemId: string,
    data: UpdateUploadDraftItemRequest,
    allowRecovery = true,
  ) => {
    if (!activeSource || !resolvedActiveDraftId) {
      return;
    }

    const freshDraft = activeDraft ?? null;
    if (!freshDraft) {
      toast.error("O draft não está disponível para edição no momento.");
      return;
    }

    if (!freshDraft.workflow.canEdit) {
      toast.error(NEXT_ACTION_META[freshDraft.workflow.nextAction].description);
      return;
    }

    try {
      await updateDraftItemMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveDraftId,
        itemId,
        data,
      });
      setConfirmReplayBlockedSessionId(null);
      toast.success("Plano do item atualizado.");
    } catch (error) {
      if (
        allowRecovery &&
        (await handleRecoverableActionError({
          error,
          intent: "google_drive_edit_draft_item",
          retry: async () => {
            await patchItem(itemId, data, false);
          },
        }))
      ) {
        return;
      }

      toast.error(
        getUploadErrorMessage(error, "Falha ao atualizar o item da sessão."),
      );
    }
  };

  const retryItem = async (itemId: string) => {
    try {
      await retryItemMutation.mutateAsync(itemId);
      await realtimeState.reconcileNow();
      toast.success("Item reenfileirado para nova tentativa.");
    } catch (error) {
      toast.error(getUploadErrorMessage(error, "Falha ao reenfileirar o item."));
    }
  };

  const cancelItem = async (itemId: string) => {
    try {
      const result = await cancelItemMutation.mutateAsync(itemId);
      const message =
        result.cancellation.outcome === "requested"
          ? "Cancelamento solicitado. O worker vai encerrar no próximo checkpoint."
          : result.cancellation.outcome === "canceled"
            ? "Item cancelado."
            : "O item já estava em estado terminal.";
      toast.success(message);
      openSession(
        result.cancellation.session.id,
        result.cancellation.session.source,
      );
      await realtimeState.reconcileNow();
    } catch (error) {
      toast.error(getUploadErrorMessage(error, "Falha ao cancelar o item."));
    }
  };

  const applyBulkExistingSeries = async () => {
    if (!activeSource || !resolvedActiveDraftId || !bulkSeriesId) {
      toast.error("Escolha uma série para aplicar em lote.");
      return;
    }

    if (!activeDraft) {
      toast.error("O draft não está mais pronto para edição em lote.");
      return;
    }

    const reviewableItems = activeDraft.items
      .filter((item) => item.status === "READY_FOR_REVIEW")
      .filter((item) => !item.job.isCancelRequested)
      .map((item) => ({
        itemId: item.id,
        selected: true,
      }));

    draftSync.enqueueBulkUpdate({
      targetSeriesId: bulkSeriesId,
      items: reviewableItems.length ? reviewableItems : undefined,
    });
    setConfirmReplayBlockedSessionId(null);
    toast.success("Série aplicada e itens pendentes marcados para revisão.");
  };

  const applyBulkNewSeries = async () => {
    if (!activeSource || !resolvedActiveDraftId || !bulkNewSeriesTitle.trim()) {
      toast.error("Defina o novo título para aplicar em lote.");
      return;
    }

    if (!activeDraft) {
      toast.error("O draft não está mais pronto para edição em lote.");
      return;
    }

    const reviewableItems = activeDraft.items
      .filter((item) => item.status === "READY_FOR_REVIEW")
      .filter((item) => !item.job.isCancelRequested)
      .map((item) => ({
        itemId: item.id,
        selected: true,
      }));

    draftSync.enqueueBulkUpdate({
      seriesTitle: bulkNewSeriesTitle.trim(),
      items: reviewableItems.length ? reviewableItems : undefined,
    });
    setConfirmReplayBlockedSessionId(null);
    toast.success("Novo título aplicado e itens pendentes marcados para revisão.");
  };

  const skipPendingItems = async () => {
    if (!activeSource || !resolvedActiveDraftId || !activeDraft) {
      return;
    }

    const pendingItems = activeDraft.items
      .filter((item) => item.status === "READY_FOR_REVIEW")
      .filter((item) => !item.job.isCancelRequested)
      .map((item) => ({
        itemId: item.id,
        selected: false,
      }));

    if (pendingItems.length === 0) {
      toast.error("Não há itens editáveis pendentes para ignorar.");
      return;
    }

    draftSync.enqueueBulkUpdate({
      items: pendingItems,
    });
    setConfirmReplayBlockedSessionId(null);
    toast.success("Itens pendentes adicionados ao lote de sincronização.");
  };

  const acceptPendingItems = async () => {
    if (!activeSource || !resolvedActiveDraftId || !activeDraft) {
      return;
    }

    const editablePendingItems = activeDraft.items
      .filter((item) => item.status === "READY_FOR_REVIEW")
      .filter((item) => !item.job.isCancelRequested);

    if (editablePendingItems.length === 0) {
      toast.error("Não há itens pendentes liberados para revisão em lote.");
      return;
    }

    const itemsNeedingSeries = editablePendingItems.filter(
      (item) => item.plan.decision !== "SKIP" && item.plan.destinationReady !== true,
    );

    let autoTargetSeriesId: string | undefined;
    let autoTargetSeriesTitle: string | undefined;

    if (itemsNeedingSeries.length > 0) {
      const suggestedSeriesIds = Array.from(
        new Set(
          itemsNeedingSeries
            .map((item) => item.suggestion.matchedSeriesId)
            .filter((value): value is string => Boolean(value)),
        ),
      );

      if (suggestedSeriesIds.length !== 1) {
        toast.error(
          "Alguns itens ainda não têm série definida. Use 'Aplicar série existente' antes de confirmar.",
        );
        return;
      }

      autoTargetSeriesId = suggestedSeriesIds[0];
      autoTargetSeriesTitle =
        itemsNeedingSeries.find(
          (item) => item.suggestion.matchedSeriesId === autoTargetSeriesId,
        )?.suggestion.matchedSeriesTitle || undefined;
    }

    const pendingItems = editablePendingItems.map((item) => ({
      itemId: item.id,
      selected: true,
    }));

    draftSync.enqueueBulkUpdate(
      autoTargetSeriesId
        ? {
            targetSeriesId: autoTargetSeriesId,
            items: pendingItems,
          }
        : {
            items: pendingItems,
          },
    );
    if (autoTargetSeriesId) {
      setBulkSeriesId(autoTargetSeriesId);
      if (autoTargetSeriesTitle) {
        setBulkSeriesTitle(autoTargetSeriesTitle);
        setBulkSeriesQuery(autoTargetSeriesTitle);
      }
    }
    setConfirmReplayBlockedSessionId(null);
    toast.success(
      autoTargetSeriesTitle
        ? `Itens pendentes revisados e vinculados a ${autoTargetSeriesTitle}.`
        : "Itens pendentes marcados como revisados no lote.",
    );
  };

  const confirmDraft = async (allowRecovery = true) => {
    if (!activeSource || !resolvedActiveDraftId || !activeDraft) {
      return;
    }

    if (confirmInFlightRef.current) {
      return;
    }

    if (isConfirmCoolingDown) {
      toast.error(
        `Aguarde ${confirmCooldownSeconds}s para tentar confirmar novamente.`,
      );
      return;
    }

    confirmInFlightRef.current = true;

    if (draftSync.hasPendingChanges || draftSync.status === "syncing") {
      const synced = await draftSync.flushNow();
      if (!synced) {
        toast.error(
          "Não foi possível sincronizar as alterações pendentes antes da confirmação.",
        );
        confirmInFlightRef.current = false;
        return;
      }
    }

    const currentDraftResult = await activeDraftQuery.refetch();
    const currentDraft = currentDraftResult.data?.draft || activeDraft;
    const unresolvedDestinationItems = currentDraft.items.filter(
      (item) =>
        item.status === "READY_FOR_REVIEW" &&
        item.plan.decision !== "SKIP" &&
        item.plan.destinationReady !== true,
    );

    if (unresolvedDestinationItems.length > 0) {
      toast.error(
        `Ainda existem ${unresolvedDestinationItems.length} item(ns) sem série/destino válido. Aplique a série existente antes de confirmar.`,
      );
      confirmInFlightRef.current = false;
      return;
    }

    try {
      const result = await confirmDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveDraftId,
        idempotencyKey: createIdempotencyKey(),
      });
      setConfirmCooldownUntil(null);

      const segments = [
        `${result.totals.accepted} aceitos`,
        `${result.totals.alreadyHandled} já movimentados`,
        `${result.totals.rejected} rejeitados`,
        `${result.totals.skipped} ignorados`,
      ];

      toast.success(
        result.noOp
          ? `Nenhuma nova transição foi criada. ${segments.join(" · ")}`
          : segments.join(" · "),
      );
      setLastConfirmFeedback({
        sessionId: result.session.id,
        rejected: result.rejected.map((entry) => ({
          itemId: entry.itemId,
          filename: entry.filename,
          reason: entry.reason,
        })),
      });

      if (result.rejected.length > 0) {
        toast.error(
          `${result.rejected.length} item(ns) foram rejeitados. Revise os motivos e confirme novamente.`,
        );
      }

      if (result.noOp || result.alreadyHandled.length > 0) {
        setConfirmReplayBlockedSessionId(result.session.id);
      } else {
        setConfirmReplayBlockedSessionId(null);
      }
      openSession(result.session.id, result.session.source);
    } catch (error) {
      const statusCode = getUploadErrorStatus(error);
      if (statusCode === 429) {
        const retryAfterMs = resolveRetryAfterMs(error);
        startConfirmCooldown(retryAfterMs);
        toast.error(
          `Muitas requisições neste momento. Tente confirmar novamente em ${Math.ceil(
            retryAfterMs / 1000,
          )}s.`,
        );
        return;
      }

      if (
        allowRecovery &&
        (await handleRecoverableActionError({
          error,
          intent: "google_drive_confirm_draft",
          retry: async () => {
            await confirmDraft(false);
          },
        }))
      ) {
        return;
      }

      toast.error(
        getUploadErrorMessage(error, "Falha ao confirmar a sessão."),
      );
    } finally {
      confirmInFlightRef.current = false;
    }
  };

  const cancelDraft = async () => {
    if (!activeSource || !resolvedActiveDraftId) {
      return;
    }

    try {
      const result = await cancelDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveDraftId,
      });
      if (result.totals) {
        toast.success(
          `${result.totals.canceled} cancelados · ${result.totals.requested} em cancelamento · ${result.totals.alreadyTerminal} já terminais`,
        );
      } else {
        toast.success("Sessão cancelada.");
      }
      setConfirmReplayBlockedSessionId(null);
      if (result.session) {
        openSession(result.session.id, result.session.source);
      } else {
        clearActiveSelection();
      }
      await refreshActiveWorkspace();
      await realtimeState.reconcileNow();
    } catch (error) {
      toast.error(getUploadErrorMessage(error, "Falha ao cancelar a sessão."));
    }
  };

  const stateMeta = workspaceWorkflow
    ? WORKFLOW_STATE_META[workspaceWorkflow.state]
    : activeSummary
      ? SESSION_STATUS_META[activeSummary.status]
      : null;
  const activeContext = activeSession || activeSummary;
  const hasActiveSession = Boolean(resolvedActiveSessionId && activeContext);
  const workspaceTitle = activeContext?.inputName || "Selecione uma sessão";
  const reviewWorkspaceVisible = Boolean(
    activeDraft &&
      workspaceWorkflow &&
      !workspaceWorkflow.isTerminal &&
      activeOperational?.state !== "cancel_requested" &&
      (workspaceWorkflow.canEdit || workspaceWorkflow.canConfirm),
  );
  const sortedActiveItems = useMemo(() => {
    if (!activeItems.length) {
      return activeItems;
    }

    return [...activeItems].sort((left, right) => {
      const leftPending = itemNeedsManualChoice(left) ? 1 : 0;
      const rightPending = itemNeedsManualChoice(right) ? 1 : 0;
      if (leftPending !== rightPending) {
        return rightPending - leftPending;
      }

      const leftReady = left.status === "READY_FOR_REVIEW" ? 1 : 0;
      const rightReady = right.status === "READY_FOR_REVIEW" ? 1 : 0;
      if (leftReady !== rightReady) {
        return rightReady - leftReady;
      }

      return left.originalName.localeCompare(right.originalName);
    });
  }, [activeItems]);
  const confirmBlockedReasons = useMemo(() => {
    const reasons: string[] = [];

    if (draftSync.status === "syncing") {
      reasons.push("Aguardando sincronização das alterações em lote.");
    }
    if (reviewPendingCount > 0) {
      reasons.push(
        `${reviewPendingCount} item(ns) ainda precisam de revisão manual.`,
      );
    }
    if (pendingAnalysisCount > 0) {
      reasons.push(
        `${pendingAnalysisCount} item(ns) ainda estão em análise no backend.`,
      );
    }
    if (isConfirmCoolingDown) {
      reasons.push(`Aguardar ${confirmCooldownSeconds}s por limite de requisições.`);
    }
    if (confirmReplayBlocked) {
      reasons.push(
        "Esta sessão já foi confirmada recentemente. Ajuste algum item antes de reenviar.",
      );
    }
    if (sessionCancelInFlight) {
      reasons.push("A sessão está cancelando e bloqueia novas confirmações.");
    }

    return reasons;
  }, [
    confirmReplayBlocked,
    confirmCooldownSeconds,
    draftSync.status,
    isConfirmCoolingDown,
    pendingAnalysisCount,
    reviewPendingCount,
    sessionCancelInFlight,
  ]);
  const confirmRejectedItems = useMemo(
    () =>
      lastConfirmFeedback?.sessionId === resolvedActiveSessionId
        ? lastConfirmFeedback.rejected
        : [],
    [lastConfirmFeedback, resolvedActiveSessionId],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/70">
            Upload Center
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--color-textMain)]">
            Upload Simples Com Revisão Manual
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-textDim)]">
            {roleSummary}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <Link
              href="/dashboard/approvals"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprovações
            </Link>
          ) : null}
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
          >
            <Workflow className="h-4 w-4" />
            Jobs
          </Link>
        </div>
      </header>

      <UploadPipelineStepper
        activeStep={uploadCenterState.activeStep}
        selectedSource={uploadCenterState.selectedSource}
        stream={uploadCenterState.stream}
      />

      <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
        <div
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          role="tablist"
          aria-label="Navegação do Upload Center"
        >
          <button
            type="button"
            role="tab"
            aria-selected={centerTab === "LOCAL"}
            onClick={() => handleCenterTabChange("LOCAL")}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
              centerTab === "LOCAL"
                ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                : "border-white/10 bg-white/[0.03] text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
            }`}
          >
            <HardDrive className="h-4 w-4" />
            1) Local
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={centerTab === "GOOGLE_DRIVE"}
            onClick={() => handleCenterTabChange("GOOGLE_DRIVE")}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
              centerTab === "GOOGLE_DRIVE"
                ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                : "border-white/10 bg-white/[0.03] text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
            }`}
          >
            <Cloud className="h-4 w-4" />
            1) Google Drive
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={centerTab === "REVIEW"}
            onClick={() => handleCenterTabChange("REVIEW")}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
              centerTab === "REVIEW"
                ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                : "border-white/10 bg-white/[0.03] text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            5) Revisão
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={centerTab === "PROCESSING"}
            onClick={() => handleCenterTabChange("PROCESSING")}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
              centerTab === "PROCESSING"
                ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                : "border-white/10 bg-white/[0.03] text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
            }`}
          >
            <Workflow className="h-4 w-4" />
            7) Processamento
          </button>
        </div>

        {(centerTab === "REVIEW" || centerTab === "PROCESSING") && hasActiveSession ? (
          <button
            type="button"
            onClick={focusWorkspace}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-[var(--color-textMain)] hover:bg-white/[0.07]"
          >
            Ir para sessão ativa
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.38fr)_minmax(320px,0.62fr)]">
        <main className="space-y-5">
          {centerTab === "LOCAL" ? (
            <LocalUploadEntryPanel
              onStepChange={uploadCenterActions.setPreStageStep}
              onOpenSession={(sessionId) => {
                setConfirmReplayBlockedSessionId(null);
                openSession(sessionId, "LOCAL");
              }}
            />
          ) : null}

          {centerTab === "GOOGLE_DRIVE" ? (
            <GoogleDriveImportPanel
              onStepChange={uploadCenterActions.setPreStageStep}
              onOpenSession={(sessionId) => {
                setConfirmReplayBlockedSessionId(null);
                openSession(sessionId, "GOOGLE_DRIVE");
              }}
            />
          ) : null}

          <section
            ref={workspaceSectionRef}
            className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/70">
                  Sessão ativa
                </p>
                <h2 className="mt-2 truncate text-xl font-semibold text-[var(--color-textMain)]">
                  {workspaceTitle}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-textDim)]">
                  {activeContext
                    ? `${getSourceLabel(activeContext.source)} · criada em ${formatDateTime(activeContext.createdAt)}`
                    : "Selecione uma sessão para começar a revisão."}
                </p>
              </div>

              {stateMeta ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${TONE_STYLES[stateMeta.tone]}`}
                  >
                    {stateMeta.label}
                  </span>
                  {runtimeMeta ? (
                    <span
                      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${TONE_STYLES[runtimeMeta.tone]}`}
                    >
                      {runtimeMeta.label}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {!hasActiveSession ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-[var(--color-textDim)]">
                Nenhuma sessão ativa. Crie um stage local ou Google Drive para iniciar.
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                      Em análise
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
                      {pendingAnalysisCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                      Revisão pendente
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
                      {reviewPendingCount}
                    </p>
                    {hasReviewCountDrift ? (
                      <p className="mt-1 text-[11px] text-sky-200">
                        Contagem ajustada pelo estado real dos itens.
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                      Confirmáveis
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
                      {confirmableCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                      Falhas
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
                      {failedItemsCount}
                    </p>
                  </div>
                </div>

                {workflowSummary ? (
                  <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                      Próxima ação
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--color-textMain)]">
                      {workflowSummary.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-textDim)]">
                      {workflowSummary.description}
                    </p>
                    {isReconnectingGoogleDrive ? (
                      <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Reconectando Google Drive
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {activeSession ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-textDim)]">
                      <span>Progresso da sessão</span>
                      <span>{sessionProgress}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                        style={{ width: `${sessionProgress}%` }}
                      />
                    </div>
                    {activeDraft ? (
                      <p className="mt-2 text-[11px] text-[var(--color-textDim)]">
                        Draft {activeDraft.processing.analyzedCount}/
                        {activeDraft.processing.totalReceived} · workflow{" "}
                        {activeDraftWorkflowState} · análise {draftProgress}%
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {reviewWorkspaceVisible ? (
                  <section className="rounded-[28px] border border-white/8 bg-black/10 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                          Revisão rápida
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-textDim)]">
                          Foque em série, capítulo e ano. Campos avançados são opcionais por item.
                        </p>
                        <p className="mt-2 text-xs text-[var(--color-textDim)]">
                          {draftSync.status === "pending"
                            ? `Alterações pendentes (${draftSync.pendingCount}).`
                            : draftSync.status === "syncing"
                              ? "Sincronizando alterações..."
                              : draftSync.status === "error"
                                ? "Falha na sincronização."
                                : "Sincronizado."}
                        </p>
                        {draftSync.lastError ? (
                          <p className="mt-1 text-xs text-rose-200">
                            {draftSync.lastError}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {draftSync.status === "pending" || draftSync.status === "error" ? (
                          <button
                            type="button"
                            onClick={() => void draftSync.flushNow()}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--color-textMain)] disabled:opacity-50"
                          >
                            Sincronizar agora
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void acceptPendingItems()}
                          disabled={
                            draftSync.status === "syncing" ||
                            !activeDraftCanEdit ||
                            sessionCancelInFlight
                          }
                          className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 disabled:opacity-50"
                        >
                          Aceitar pendentes
                        </button>
                        <button
                          type="button"
                          onClick={() => void skipPendingItems()}
                          disabled={
                            draftSync.status === "syncing" ||
                            !activeDraftCanEdit ||
                            sessionCancelInFlight
                          }
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--color-textMain)] disabled:opacity-50"
                        >
                          Ignorar pendentes
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          Aplicar série existente
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
                            <input
                              type="text"
                              value={bulkSeriesQuery}
                              onChange={(event) => setBulkSeriesQuery(event.target.value)}
                              className="w-full rounded-2xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                              placeholder="Busque a série..."
                            />
                          </div>
                          <div className="list-panel max-h-52 scroll-region">
                            {bulkSeriesSearch.data?.items?.map((series) => (
                              <button
                                key={series.id}
                                type="button"
                                onClick={() => {
                                  setBulkSeriesId(series.id);
                                  setBulkSeriesTitle(series.title);
                                  setBulkSeriesQuery(series.title);
                                }}
                                className={`list-row ${
                                  bulkSeriesId === series.id ? "list-row-active" : ""
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--color-textMain)]">
                                    {series.title}
                                  </p>
                                  <p className="mt-1 text-xs text-[var(--color-textDim)]">
                                    {series.id}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                          {bulkSeriesTitle ? (
                            <p className="text-xs text-emerald-200">
                              Série escolhida: {bulkSeriesTitle}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void applyBulkExistingSeries()}
                            disabled={
                              draftSync.status === "syncing" ||
                              !bulkSeriesId ||
                              !activeDraftCanEdit ||
                              sessionCancelInFlight
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                          >
                            Aplicar série existente
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          Aplicar novo título
                        </p>
                        <div className="mt-3 space-y-3">
                          <input
                            type="text"
                            value={bulkNewSeriesTitle}
                            onChange={(event) => setBulkNewSeriesTitle(event.target.value)}
                            className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                            placeholder="Título canônico da nova série"
                          />
                          <button
                            type="button"
                            onClick={() => void applyBulkNewSeries()}
                            disabled={
                              draftSync.status === "syncing" ||
                              !bulkNewSeriesTitle.trim() ||
                              !activeDraftCanEdit ||
                              sessionCancelInFlight
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                          >
                            Aplicar novo título
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-textMain)]">
                            6) Confirmação manual da sessão
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-textDim)]">
                            O processamento só começa após esta confirmação.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void confirmDraft()}
                          disabled={
                            confirmDraftMutation.isPending ||
                            !canAttemptConfirm
                          }
                          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                        >
                          {confirmDraftMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {confirmReplayBlocked
                            ? "Confirmação já sincronizada"
                            : isConfirmCoolingDown
                              ? `Aguardar ${confirmCooldownSeconds}s`
                              : draftSync.status === "syncing"
                                ? "Sincronizando alterações..."
                              : "Confirmar sessão"}
                        </button>
                      </div>

                      {confirmBackendStateLagging ? (
                        <div className="mt-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-100">
                          O backend ainda não atualizou o indicador de confirmação, mas a revisão local já está concluída.
                          Você pode confirmar agora.
                        </div>
                      ) : null}

                      {confirmBlockedReasons.length > 0 ? (
                        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                          <p className="font-medium">Pendências para confirmar</p>
                          <ul className="mt-2 space-y-1">
                            {confirmBlockedReasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {confirmRejectedItems.length > 0 ? (
                        <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
                          <p className="font-medium">
                            Itens rejeitados na última confirmação
                          </p>
                          <p className="mt-1 text-[11px] text-rose-200">
                            Corrija os itens abaixo e confirme novamente.
                          </p>
                          <div className="mt-2 max-h-40 space-y-2 scroll-region pr-1">
                            {confirmRejectedItems.map((item) => (
                              <button
                                key={`${item.itemId}-${item.filename}`}
                                type="button"
                                onClick={() => {
                                  setManualCenterTab("REVIEW");
                                  focusWorkspace();
                                  window.setTimeout(() => {
                                    focusUploadItem(item.itemId);
                                  }, 180);
                                }}
                                className="w-full rounded-2xl border border-rose-500/25 bg-black/15 px-3 py-2 text-left text-xs text-rose-50 transition-colors hover:bg-black/25"
                              >
                                <p className="truncate font-medium">{item.filename}</p>
                                <p className="mt-1 line-clamp-2 text-[11px] text-rose-200">
                                  {item.reason}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {canRefreshConfirmState ? (
                        <button
                          type="button"
                          onClick={() => void refreshActiveWorkspace()}
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-100 transition-colors hover:bg-sky-500/15"
                        >
                          Atualizar estado da sessão
                        </button>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {activeOperational?.state === "stuck" ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                    <p className="flex items-center gap-2 font-medium">
                      <ShieldAlert className="h-4 w-4" />
                      Sessão com itens travados
                    </p>
                    <p className="mt-1 text-xs">Use retry/cancel por item para destravar o lote.</p>
                  </div>
                ) : null}

                {activeOperational?.state === "cancel_requested" ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    <p className="flex items-center gap-2 font-medium">
                      <ShieldAlert className="h-4 w-4" />
                      Cancelamento em andamento
                    </p>
                    <p className="mt-1 text-xs">
                      O backend está encerrando a sessão; ações adicionais ficam bloqueadas.
                    </p>
                  </div>
                ) : null}

                {workspaceWorkflow?.isTerminal ? (
                  <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-[var(--color-textDim)]">
                    {workspaceWorkflow.state === "COMPLETED"
                      ? "Sessão concluída."
                      : workspaceWorkflow.state === "PARTIAL_FAILURE"
                        ? "Sessão concluída com falhas parciais."
                        : workspaceWorkflow.state === "FAILED"
                          ? "Sessão falhou."
                          : workspaceWorkflow.state === "EXPIRED"
                            ? "Draft expirado."
                            : "Sessão cancelada."}
                  </div>
                ) : null}

                {activeOperational && runtimeMeta ? (
                  <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          {runtimeMeta.label}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-textDim)]">
                          Ativos {activeOperational.counts.active} · cancelando{" "}
                          {activeOperational.counts.cancelRequested} · travados{" "}
                          {activeOperational.counts.stuck}
                        </p>
                      </div>
                      {canCancelSession ? (
                        <button
                          type="button"
                          onClick={() => void cancelDraft()}
                          disabled={cancelDraftMutation.isPending}
                          className="rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 disabled:opacity-50"
                        >
                          {cancelDraftMutation.isPending ? "Cancelando..." : "Cancelar sessão"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {activeSessionQuery.isLoading ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--color-textDim)]">
                      Carregando detalhes da sessão...
                    </div>
                  ) : null}

                  {!sortedActiveItems.length && !activeSessionQuery.isLoading ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--color-textDim)]">
                      Nenhum item disponível para esta sessão.
                    </div>
                  ) : null}

                  {sortedActiveItems.map((item) => (
                    <UploadItemCard
                      key={item.id}
                      item={item}
                      disabled={!itemCanBeEdited(item, workspaceWorkflow)}
                      disabledReason={getItemDisabledReason(
                        item,
                        activeDraft,
                        workspaceWorkflow,
                      )}
                      retryDisabled={sessionCancelInFlight}
                      cancelDisabled={sessionCancelInFlight}
                      onPatch={patchItem}
                      onRetry={retryItem}
                      onCancel={cancelItem}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
            {hasActiveSession ? (
              <UploadRealtimePanel realtime={realtimeState} callbacks={realtimeCallbacks} />
            ) : (
              <p className="text-sm text-[var(--color-textDim)]">
                A telemetria SSE/polling aparece após abrir uma sessão.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Sessões recentes
                </p>
                <p className="mt-1 text-sm text-[var(--color-textDim)]">
                  Reabra uma sessão para continuar de onde parou.
                </p>
              </div>
              <button
                type="button"
                onClick={() => sessionsQuery.refetch()}
                className="text-xs text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)]"
              >
                Atualizar
              </button>
            </div>
            <UploadSessionList
              sessions={sessions}
              activeSessionId={resolvedActiveSessionId}
              onSelect={(sessionId) => {
                const selectedSession = sessions.find(
                  (session) => session.id === sessionId,
                );
                openSession(sessionId, selectedSession?.source);
              }}
            />
          </section>

          <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
              Como usar (rápido)
            </p>
            <ol className="mt-3 space-y-2 text-sm text-[var(--color-textDim)]">
              <li>1. Escolha a origem (Local ou Google Drive) e crie uma sessão.</li>
              <li>2. Ajuste série/título, capítulo e ano nos itens pendentes.</li>
              <li>3. Use ações em lote para acelerar revisão.</li>
              <li>4. Sincronize alterações pendentes.</li>
              <li>5. Confirme manualmente a sessão para iniciar processamento.</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
