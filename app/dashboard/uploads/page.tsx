"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
} from "lucide-react";
import { GoogleDriveImportPanel } from "@/components/upload/GoogleDriveImportPanel";
import { LocalUploadEntryPanel } from "@/components/upload/LocalUploadEntryPanel";
import { UploadItemCard } from "@/components/upload/UploadItemCard";
import { UploadSessionList } from "@/components/upload/UploadSessionList";
import { useAuth } from "@/contexts/AuthContext";
import { useSeriesSearch } from "@/hooks/useApi";
import { useMySubmissions } from "@/hooks/useAdmin";
import { useGoogleDriveReconnectRecovery } from "@/hooks/useGoogleDriveReconnectRecovery";
import {
  useBulkUpdateUploadDraft,
  useCancelUploadDraft,
  useConfirmUploadDraft,
  useRetryUploadItem,
  useUpdateUploadDraftItem,
  useUploadDraft,
  useUploadSession,
  useUploadSessions,
} from "@/hooks/useUploadWorkflow";
import {
  NEXT_ACTION_META,
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
  workflowNeedsDraft,
} from "@/lib/upload-workflow";
import {
  getUploadErrorMessage,
  isUploadConflictError,
  isUploadMissingError,
} from "@/lib/uploadErrors";
import type {
  UpdateUploadDraftItemRequest,
  UploadDraft,
  UploadItem,
  UploadSessionSummary,
} from "@/types/upload-workflow";

const EMPTY_SESSIONS: UploadSessionSummary[] = [];
const ACTIVE_SESSION_STORAGE_KEY = "manhq-upload-active-session-id";

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
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

function getItemDisabledReason(
  item: UploadItem,
  activeDraft: UploadDraft | null,
): string | null {
  if (!activeDraft) {
    return "Este item está em modo de acompanhamento. Carregue um draft editável para revisar.";
  }

  if (!activeDraft.workflow.canEdit) {
    if (activeDraft.workflow.canConfirm) {
      return "A edição manual foi encerrada. O draft já está pronto para confirmação.";
    }

    if (activeDraft.workflow.isTerminal) {
      return "O draft já foi finalizado e não aceita novas edições.";
    }

    return NEXT_ACTION_META[activeDraft.workflow.nextAction].description;
  }

  if (!item.job.canReview) {
    if (item.job.userActionRequired) {
      return "O backend ainda não liberou a revisão deste item. Atualize a sessão para continuar.";
    }

    return "Este item não aceita mais revisão manual.";
  }

  if (item.status !== "READY_FOR_REVIEW") {
    return "Somente itens em READY_FOR_REVIEW continuam editáveis.";
  }

  return null;
}

export default function UploadsPage() {
  const { isAdmin, isEditor } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    getInitialActiveSessionId,
  );
  const [bulkSeriesId, setBulkSeriesId] = useState("");
  const [bulkSeriesTitle, setBulkSeriesTitle] = useState("");
  const [bulkSeriesQuery, setBulkSeriesQuery] = useState("");
  const [bulkNewSeriesTitle, setBulkNewSeriesTitle] = useState("");
  const [confirmReplayBlockedSessionId, setConfirmReplayBlockedSessionId] =
    useState<string | null>(null);
  const handledMissingSelectionRef = useRef<string | null>(null);
  const deferredBulkSeriesQuery = useDeferredValue(bulkSeriesQuery.trim());

  const { recoverGoogleDriveReconnect, isReconnectingGoogleDrive } =
    useGoogleDriveReconnectRecovery();

  const sessionsQuery = useUploadSessions({ page: 1, limit: 12 });
  const sessions = sessionsQuery.data?.sessions ?? EMPTY_SESSIONS;
  const resolvedActiveSessionId = activeSessionId ?? sessions[0]?.id ?? null;
  const activeSummary =
    sessions.find((session) => session.id === resolvedActiveSessionId) || null;

  const activeSessionQuery = useUploadSession(
    resolvedActiveSessionId || "",
    Boolean(resolvedActiveSessionId),
  );
  const activeSession = activeSessionQuery.data?.session || null;
  const activeSource = activeSession?.source || activeSummary?.source || null;
  const activeWorkflow =
    activeSession?.workflow || activeSummary?.workflow || null;
  const shouldLoadDraft = Boolean(
    resolvedActiveSessionId &&
      activeSource &&
      activeWorkflow &&
      workflowNeedsDraft(activeWorkflow),
  );
  const activeDraftQuery = useUploadDraft(
    activeSource || "LOCAL",
    resolvedActiveSessionId || "",
    shouldLoadDraft,
  );
  const activeDraft =
    (activeDraftQuery.data as { draft?: UploadDraft } | undefined)?.draft || null;
  const workspaceWorkflow = activeDraft?.workflow || activeWorkflow || null;

  const updateDraftItemMutation = useUpdateUploadDraftItem();
  const bulkUpdateDraftMutation = useBulkUpdateUploadDraft();
  const confirmDraftMutation = useConfirmUploadDraft();
  const cancelDraftMutation = useCancelUploadDraft();
  const retryItemMutation = useRetryUploadItem();
  const submissionsQuery = useMySubmissions({ page: 1, limit: 5 });

  const bulkSeriesSearch = useSeriesSearch(deferredBulkSeriesQuery, 1, 6);
  const activeItems = activeDraft?.items || activeSession?.items || [];
  const reviewPendingCount =
    activeDraft?.workflow.counts.reviewRequired ||
    workspaceWorkflow?.counts.reviewRequired ||
    countItemsNeedingManualChoice(activeItems);
  const failedItemsCount =
    workspaceWorkflow?.counts.failed || countItemsFailed(activeItems);
  const confirmableCount = workspaceWorkflow?.counts.confirmable || 0;
  const pendingAnalysisCount = workspaceWorkflow?.counts.pendingAnalysis || 0;
  const sessionProgress =
    activeSession && activeSession.items.length > 0 ? getSessionProgress(activeSession) : 0;
  const draftProgress = activeDraft ? getDraftAnalysisProgress(activeDraft) : 0;
  const workflowSummary = getWorkflowSummary(workspaceWorkflow);
  const activeDraftCanEdit = activeDraft?.workflow.canEdit ?? false;
  const activeDraftCanConfirm = activeDraft?.workflow.canConfirm ?? false;
  const activeDraftWorkflowState = activeDraft?.workflow.state ?? null;
  const confirmReplayBlocked = Boolean(
    resolvedActiveSessionId &&
      workspaceWorkflow?.canConfirm &&
      confirmReplayBlockedSessionId === resolvedActiveSessionId,
  );
  const roleSummary = isEditor && !isAdmin
    ? "Você pode criar sessões, revisar sugestões, reconectar o Google Drive e acompanhar aprovações pendentes."
    : "Sessões persistidas, revisão manual, callbacks do Google Drive e estados de processamento em um único workspace.";

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

  const clearActiveSelection = (message?: string) => {
    setActiveSessionId(null);
    setConfirmReplayBlockedSessionId(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
    if (message) {
      toast.error(message);
    }
  };

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
    resolvedActiveSessionId,
  ]);

  const refreshActiveWorkspace = async () => {
    await activeSessionQuery.refetch();
    if (activeSource) {
      await activeDraftQuery.refetch();
    }
    await sessionsQuery.refetch();
  };

  const ensureFreshDraft = async () => {
    if (!activeSource || !resolvedActiveSessionId) {
      return false;
    }

    const result = await activeDraftQuery.refetch();
    return Boolean(result.data?.draft);
  };

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
          draftId: resolvedActiveSessionId,
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
    if (!activeSource || !resolvedActiveSessionId || !activeDraft?.workflow.canEdit) {
      return;
    }

    const draftReady = await ensureFreshDraft();
    if (!draftReady) {
      toast.error("O draft não está disponível para edição no momento.");
      return;
    }

    try {
      await updateDraftItemMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
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
      toast.success("Item reenfileirado para nova tentativa.");
    } catch (error) {
      toast.error(getUploadErrorMessage(error, "Falha ao reenfileirar o item."));
    }
  };

  const applyBulkExistingSeries = async (allowRecovery = true) => {
    if (!activeSource || !resolvedActiveSessionId || !bulkSeriesId) {
      toast.error("Escolha uma série para aplicar em lote.");
      return;
    }

    const draftReady = await ensureFreshDraft();
    if (!draftReady) {
      toast.error("O draft não está mais pronto para edição em lote.");
      return;
    }

    try {
      await bulkUpdateDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        data: {
          targetSeriesId: bulkSeriesId,
        },
      });
      setConfirmReplayBlockedSessionId(null);
      toast.success("Série existente aplicada a todos os itens editáveis.");
    } catch (error) {
      if (
        allowRecovery &&
        (await handleRecoverableActionError({
          error,
          intent: "google_drive_bulk_existing_series",
          retry: async () => {
            await applyBulkExistingSeries(false);
          },
        }))
      ) {
        return;
      }

      toast.error(
        getUploadErrorMessage(error, "Falha ao aplicar a série em lote."),
      );
    }
  };

  const applyBulkNewSeries = async (allowRecovery = true) => {
    if (!activeSource || !resolvedActiveSessionId || !bulkNewSeriesTitle.trim()) {
      toast.error("Defina o novo título para aplicar em lote.");
      return;
    }

    const draftReady = await ensureFreshDraft();
    if (!draftReady) {
      toast.error("O draft não está mais pronto para edição em lote.");
      return;
    }

    try {
      await bulkUpdateDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        data: {
          seriesTitle: bulkNewSeriesTitle.trim(),
        },
      });
      setConfirmReplayBlockedSessionId(null);
      toast.success("Novo título aplicado ao draft.");
    } catch (error) {
      if (
        allowRecovery &&
        (await handleRecoverableActionError({
          error,
          intent: "google_drive_bulk_new_series",
          retry: async () => {
            await applyBulkNewSeries(false);
          },
        }))
      ) {
        return;
      }

      toast.error(
        getUploadErrorMessage(error, "Falha ao aplicar o título em lote."),
      );
    }
  };

  const skipPendingItems = async (allowRecovery = true) => {
    if (!activeSource || !resolvedActiveSessionId || !activeDraft) {
      return;
    }

    const pendingItems = activeDraft.items
      .filter((item) => item.status === "READY_FOR_REVIEW" && item.job.canReview)
      .map((item) => ({
        itemId: item.id,
        selected: false,
      }));

    if (pendingItems.length === 0) {
      toast.error("Não há itens editáveis pendentes para ignorar.");
      return;
    }

    const draftReady = await ensureFreshDraft();
    if (!draftReady) {
      toast.error("O draft não está mais pronto para edição em lote.");
      return;
    }

    try {
      await bulkUpdateDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        data: {
          items: pendingItems,
        },
      });
      setConfirmReplayBlockedSessionId(null);
      toast.success("Itens pendentes marcados como ignorados.");
    } catch (error) {
      if (
        allowRecovery &&
        (await handleRecoverableActionError({
          error,
          intent: "google_drive_skip_pending_items",
          retry: async () => {
            await skipPendingItems(false);
          },
        }))
      ) {
        return;
      }

      toast.error(
        getUploadErrorMessage(error, "Falha ao ignorar itens pendentes."),
      );
    }
  };

  const confirmDraft = async (allowRecovery = true) => {
    if (!activeSource || !resolvedActiveSessionId || !activeDraft) {
      return;
    }

    const draftReady = await ensureFreshDraft();
    if (!draftReady) {
      toast.error("O draft não está mais disponível para confirmação.");
      return;
    }

    try {
      const result = await confirmDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        idempotencyKey: createIdempotencyKey(),
      });

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

      if (result.noOp || result.alreadyHandled.length > 0) {
        setConfirmReplayBlockedSessionId(result.session.id);
      } else {
        setConfirmReplayBlockedSessionId(null);
      }
      setActiveSessionId(result.session.id);
    } catch (error) {
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
    }
  };

  const cancelDraft = async () => {
    if (!activeSource || !resolvedActiveSessionId) {
      return;
    }

    try {
      await cancelDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
      });
      toast.success("Sessão cancelada.");
      setConfirmReplayBlockedSessionId(null);
      clearActiveSelection();
      await sessionsQuery.refetch();
    } catch (error) {
      toast.error(getUploadErrorMessage(error, "Falha ao cancelar a sessão."));
    }
  };

  const stateMeta = workspaceWorkflow
    ? WORKFLOW_STATE_META[workspaceWorkflow.state]
    : activeSummary
      ? SESSION_STATUS_META[activeSummary.status]
      : null;
  const reviewWorkspaceVisible = Boolean(
    activeDraft &&
      workspaceWorkflow &&
      !workspaceWorkflow.isTerminal &&
      (workspaceWorkflow.canEdit || workspaceWorkflow.canConfirm),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Upload system remodelado
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--color-textMain)]">
            Uploads & Importações
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-textDim)]">
            {roleSummary}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              href="/dashboard/approvals"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Fila de aprovações
            </Link>
          )}
          <Link
            href="/dashboard/submissions"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
          >
            <Clock className="h-4 w-4" />
            Minhas submissões
          </Link>
        </div>
      </div>

      <div className="grid gap-8">
        <LocalUploadEntryPanel onOpenSession={setActiveSessionId} />
        <GoogleDriveImportPanel onOpenSession={setActiveSessionId} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Workspace da sessão
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
                  {activeSession?.inputName ||
                    activeSummary?.inputName ||
                    "Selecione uma sessão"}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-textDim)]">
                  {activeSession || activeSummary
                    ? `${getSourceLabel(
                        (activeSession || activeSummary)!.source,
                      )} · criada em ${formatDateTime(
                        (activeSession || activeSummary)!.createdAt,
                      )}`
                    : "Escolha uma sessão na coluna ao lado para reconstruir a tela a partir de workflow.state e workflow.nextAction."}
                </p>
              </div>

              {stateMeta && (
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${TONE_STYLES[stateMeta.tone]}`}
                >
                  {stateMeta.label}
                </span>
              )}
            </div>

            {!resolvedActiveSessionId ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-[var(--color-textDim)]">
                Nenhuma sessão ativa. Use os painéis acima para começar um upload
                local ou uma importação do Google Drive.
              </div>
            ) : (
              <>
                {workspaceWorkflow && workflowSummary && (
                  <div className="mt-5 rounded-[28px] border border-white/8 bg-black/10 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                          Próxima ação
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[var(--color-textMain)]">
                          {workflowSummary.label}
                        </p>
                        <p className="mt-2 max-w-2xl text-sm text-[var(--color-textDim)]">
                          {workflowSummary.description}
                        </p>
                      </div>
                      {isReconnectingGoogleDrive && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Reconectando Google Drive
                        </div>
                      )}
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-4">
                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                          Em análise
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                          {pendingAnalysisCount}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                          Revisão pendente
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                          {reviewPendingCount}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                          Confirmáveis
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                          {confirmableCount}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                          Falhas
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                          {failedItemsCount}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSession && (
                  <div className="mt-5 rounded-3xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          Progresso da sessão
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-textDim)]">
                          {sessionProgress}% concluído
                        </p>
                      </div>
                      {activeSession.lastError?.message && (
                        <p className="text-xs text-rose-200">
                          {activeSession.lastError.message}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                        style={{ width: `${sessionProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {activeDraft && (
                  <div className="mt-5 rounded-3xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          Estado do draft
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-textDim)]">
                          {activeDraft.processing.analyzedCount}/
                          {activeDraft.processing.totalReceived} analisados
                        </p>
                      </div>
                      <p className="text-xs text-[var(--color-textDim)]">
                        workflow.state = {activeDraftWorkflowState}
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                        style={{ width: `${draftProgress}%` }}
                      />
                    </div>
                    {activeDraft.processing.error && (
                      <p className="mt-3 text-xs text-rose-200">
                        {activeDraft.processing.error}
                      </p>
                    )}
                  </div>
                )}

                {reviewWorkspaceVisible && (
                  <div className="mt-6 rounded-[32px] border border-white/8 bg-black/10 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                          Ações do draft
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-textDim)]">
                          As edições são aceitas somente enquanto o backend
                          mantiver <code>workflow.canEdit</code> e
                          <code> item.job.canReview</code> ativos.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void skipPendingItems()}
                          disabled={
                            bulkUpdateDraftMutation.isPending || !activeDraftCanEdit
                          }
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--color-textMain)] disabled:opacity-50"
                        >
                          Ignorar pendentes
                        </button>
                        <button
                          type="button"
                          onClick={() => void cancelDraft()}
                          disabled={cancelDraftMutation.isPending}
                          className="rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 disabled:opacity-50"
                        >
                          Cancelar sessão
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
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
                          <div className="grid gap-2">
                            {bulkSeriesSearch.data?.items.map((series) => (
                              <button
                                key={series.id}
                                type="button"
                                onClick={() => {
                                  setBulkSeriesId(series.id);
                                  setBulkSeriesTitle(series.title);
                                  setBulkSeriesQuery(series.title);
                                }}
                                className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
                                  bulkSeriesId === series.id
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-[var(--color-textMain)]"
                                    : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)]"
                                }`}
                              >
                                <p className="text-sm font-medium">{series.title}</p>
                                <p className="mt-1 text-xs opacity-80">{series.id}</p>
                              </button>
                            ))}
                          </div>
                          {bulkSeriesTitle && (
                            <p className="text-xs text-emerald-200">
                              Selecionada: {bulkSeriesTitle}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => void applyBulkExistingSeries()}
                            disabled={
                              bulkUpdateDraftMutation.isPending ||
                              !bulkSeriesId ||
                              !activeDraftCanEdit
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                          >
                            Aplicar série existente
                          </button>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
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
                              bulkUpdateDraftMutation.isPending ||
                              !bulkNewSeriesTitle.trim() ||
                              !activeDraftCanEdit
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                          >
                            Aplicar novo título
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-textMain)]">
                            Confirmar sessão
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-textDim)]">
                            A confirmação é idempotente. Se o backend responder com
                            itens já tratados ou <code>noOp</code>, a UI avança para
                            o workflow retornado sem repetir a chamada.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void confirmDraft()}
                          disabled={
                            confirmDraftMutation.isPending ||
                            !activeDraftCanConfirm ||
                            confirmReplayBlocked
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
                            : "Confirmar e enviar"}
                        </button>
                      </div>

                      {activeDraftCanEdit && reviewPendingCount > 0 && (
                        <p className="mt-3 text-xs text-amber-200">
                          Ainda existem {reviewPendingCount} item(ns) aguardando
                          revisão manual.
                        </p>
                      )}
                      {confirmReplayBlocked && (
                        <p className="mt-3 text-xs text-sky-200">
                          A última confirmação retornou <code>noOp</code> ou itens
                          já tratados. A UI aguardará uma nova mudança do backend
                          antes de liberar outra confirmação.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {workspaceWorkflow?.state === "APPROVAL_PENDING" && (
                  <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    {isAdmin ? (
                      <span>
                        Há itens aguardando aprovação administrativa.{" "}
                        <Link
                          href="/dashboard/approvals"
                          className="font-semibold underline"
                        >
                          Abrir fila de aprovações
                        </Link>
                        .
                      </span>
                    ) : (
                      "Seu envio foi aceito, mas ainda depende de aprovação administrativa antes do processamento."
                    )}
                  </div>
                )}

                {workspaceWorkflow?.isTerminal && (
                  <div className="mt-6 rounded-3xl border border-white/8 bg-black/10 p-4 text-sm text-[var(--color-textDim)]">
                    {workspaceWorkflow.state === "COMPLETED"
                      ? "A sessão foi concluída. Abra os itens abaixo para ver os resultados finais."
                      : workspaceWorkflow.state === "PARTIAL_FAILURE"
                        ? "A sessão terminou com falhas parciais. Use os botões de retry nos itens que falharam."
                        : workspaceWorkflow.state === "FAILED"
                          ? "A sessão falhou. Revise os erros e tente novamente apenas os itens aplicáveis."
                          : workspaceWorkflow.state === "EXPIRED"
                            ? "O draft expirou antes da confirmação. Inicie um novo stage."
                            : "A sessão foi cancelada e não aceita novas ações."}
                  </div>
                )}
              </>
            )}
          </div>

          {resolvedActiveSessionId && (
            <div className="space-y-4">
              {activeSessionQuery.isLoading && (
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--color-textDim)]">
                  Carregando detalhes da sessão...
                </div>
              )}

              {!activeItems.length && !activeSessionQuery.isLoading && (
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--color-textDim)]">
                  Nenhum item disponível para esta sessão no momento.
                </div>
              )}

              {activeItems.map((item) => (
                <UploadItemCard
                  key={item.id}
                  item={item}
                  disabled={!itemCanBeEdited(item, activeDraft?.workflow || null)}
                  disabledReason={getItemDisabledReason(item, activeDraft)}
                  onPatch={patchItem}
                  onRetry={retryItem}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Sessões recentes
                </p>
                <p className="mt-1 text-sm text-[var(--color-textDim)]">
                  A seleção ativa fica persistida para retomar o fluxo depois.
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
              onSelect={setActiveSessionId}
            />
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
              Minhas submissões
            </p>
            <div className="mt-4 space-y-3">
              {submissionsQuery.data?.submissions?.map((submission) => (
                <div
                  key={`${submission.approvalId}-${submission.id}`}
                  className="rounded-2xl border border-white/8 bg-black/10 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-textMain)]">
                        {submission.originalName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-textDim)]">
                        {formatDateTime(submission.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        submission.approval.status === "APPROVED"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                          : submission.approval.status === "REJECTED"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {submission.approval.status}
                    </span>
                  </div>
                  {submission.approval.reason && (
                    <p className="mt-2 text-xs text-rose-200">
                      {submission.approval.reason}
                    </p>
                  )}
                </div>
              ))}
              {!submissionsQuery.data?.submissions?.length && (
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-[var(--color-textDim)]">
                  Nenhuma submissão recente.
                </div>
              )}
            </div>
            <Link
              href="/dashboard/submissions"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
            >
              Abrir histórico completo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
              Regras do fluxo
            </p>
            <div className="mt-4 space-y-3 text-sm text-[var(--color-textDim)]">
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                A UI agora lê <code className="text-[var(--color-textMain)]">workflow.state</code>{" "}
                e <code className="text-[var(--color-textMain)]">workflow.nextAction</code>{" "}
                como fonte principal.
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                Erros <code className="text-[var(--color-textMain)]">409</code>{" "}
                atualizam o draft; erros{" "}
                <code className="text-[var(--color-textMain)]">428</code>{" "}
                reabrem o fluxo de autenticação do Google Drive.
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                O draft só fica editável enquanto o backend mantiver itens em{" "}
                <code className="text-[var(--color-textMain)]">READY_FOR_REVIEW</code>{" "}
                com <code className="text-[var(--color-textMain)]">job.canReview</code>.
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
