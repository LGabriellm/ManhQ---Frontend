"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * Draft Editor Page — Review, edit, and confirm upload items.
 *
 * Layout:
 *   Top: Draft header with status, progress, global actions
 *   Main: Item list with inline editing
 *   Bottom: Confirm bar (sticky)
 *
 * Designed for high-volume: batch selection, apply-all, partial confirm.
 * ───────────────────────────────────────────────────────────────────────────── */

import { use, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  X,
  AlertTriangle,
  Wifi,
  WifiOff,
  Timer,
  Send,
} from "lucide-react";
import {
  useDraft,
  useUpdateItem,
  useBulkUpdate,
  useApplyAll,
  useConfirmDraft,
  useConfirmSelected,
  useCancelDraft,
  useRetryItem,
  useCancelItem,
  useExtendDraft,
} from "@/hooks/useUpload";
import { useUploadSse } from "@/hooks/useUploadSse";
import type {
  UpdateItemRequest,
  WorkflowState,
} from "@/types/upload";
import { WORKFLOW_STATE_LABELS, WORKFLOW_STATE_TONE } from "@/types/upload";
import { StatusBadge } from "@/components/upload/StatusBadge";
import { ProgressBar } from "@/components/upload/ProgressBar";
import { ItemRow } from "@/components/upload/ItemRow";

type ItemFilter =
  | "all"
  | "review"
  | "ready"
  | "processing"
  | "completed"
  | "failed";

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime() - 3_600_000;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DraftEditorPage({
  params: paramsPromise,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const params = use(paramsPromise);
  const draftId = params.draftId;
  const router = useRouter();

  // Data
  const draftQuery = useDraft(draftId);
  const draft = draftQuery.data;

  // SSE for realtime updates
  const sessionId = draft?.id ?? null;
  const sse = useUploadSse(sessionId, draftId);

  // Mutations
  const updateItem = useUpdateItem(draftId);
  const bulkUpdate = useBulkUpdate(draftId);
  const applyAll = useApplyAll(draftId);
  const confirmDraft = useConfirmDraft(draftId);
  const confirmSelected = useConfirmSelected(draftId);
  const cancelDraft = useCancelDraft(draftId);
  const retryItem = useRetryItem(draftId);
  const cancelItem = useCancelItem(draftId);
  const extendDraft = useExtendDraft(draftId);

  // Local state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [retryError, setRetryError] = useState<{
    itemId: string;
    message: string;
  } | null>(null);

  // Derived data
  const items = useMemo(() => draft?.items ?? [], [draft?.items]);
  const workflow = draft?.workflow;
  const counts = workflow?.counts;

  const filteredItems = useMemo(() => {
    switch (filter) {
      case "review":
        return items.filter((i) => i.status === "READY_FOR_REVIEW");
      case "ready":
        return items.filter(
          (i) => i.status === "READY_FOR_REVIEW" && i.blockers.length === 0,
        );
      case "processing":
        return items.filter((i) => ["QUEUED", "PROCESSING"].includes(i.status));
      case "completed":
        return items.filter((i) => i.status === "COMPLETED");
      case "failed":
        return items.filter((i) => i.status === "FAILED");
      default:
        return items;
    }
  }, [items, filter]);

  const confirmableItems = useMemo(
    () =>
      items.filter(
        (i) => i.status === "READY_FOR_REVIEW" && i.blockers.length === 0,
      ),
    [items],
  );

  const selectedConfirmable = useMemo(
    () => confirmableItems.filter((i) => selectedItems.has(i.id)),
    [confirmableItems, selectedItems],
  );

  const retryableFailedItems = useMemo(
    () => items.filter((i) => i.status === "FAILED" && i.job?.canRetry),
    [items],
  );

  // Derive the series context from item plans.
  // If all items share the same series (new or existing), show a banner.
  const seriesContext = useMemo(() => {
    if (items.length === 0) return null;

    const firstPlan = items[0].plan;
    if (!firstPlan.selectionConfirmed) return null;

    const decision = firstPlan.decision;
    const targetId = firstPlan.targetSeriesId;
    const newTitle = firstPlan.newSeriesTitle;

    // Check if all items share the same series destination
    const allSame = items.every((i) => {
      if (!i.plan.selectionConfirmed) return false;
      if (i.plan.decision !== decision) return false;
      if (decision === "EXISTING_SERIES" && i.plan.targetSeriesId !== targetId)
        return false;
      if (decision === "NEW_SERIES" && i.plan.newSeriesTitle !== newTitle)
        return false;
      return true;
    });

    if (!allSame) return null;

    if (decision === "EXISTING_SERIES" && targetId) {
      // Try to get the series title from suggestion or result
      const title =
        items[0].suggestion?.matchedSeriesTitle ||
        items[0].result?.seriesTitle ||
        targetId;
      return { mode: "existing" as const, title };
    }

    if (decision === "NEW_SERIES" && newTitle) {
      // Check if any item already created the series (has result.seriesId)
      const createdItem = items.find((i) => i.result?.seriesId);
      return {
        mode: "new" as const,
        title: createdItem?.result?.seriesTitle || newTitle,
        created: !!createdItem,
      };
    }

    return null;
  }, [items]);

  // Handlers
  const handleItemSelect = useCallback((id: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const confirmableIds = confirmableItems.map((i) => i.id);
    setSelectedItems(new Set(confirmableIds));
  }, [confirmableItems]);

  const handleDeselectAll = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const handleUpdateItem = useCallback(
    (itemId: string, patch: UpdateItemRequest) => {
      updateItem.mutate({ itemId, patch });
    },
    [updateItem],
  );

  const handleApplyAll = useCallback(() => {
    const firstReviewable = items.find(
      (i) =>
        i.status === "READY_FOR_REVIEW" &&
        i.editableSections.series.selectionConfirmed,
    );
    if (firstReviewable) {
      applyAll.mutate(firstReviewable.id);
    }
  }, [items, applyAll]);

  const handleRetryItem = useCallback(
    (itemId: string) => {
      setRetryError(null);
      retryItem.mutate(itemId, {
        onError: (error) => {
          const err = error as { errorCode?: string; message?: string; details?: Record<string, unknown> };
          if (err.errorCode === "MAX_RETRIES_EXCEEDED") {
            const maxRetries = (err.details?.maxRetries as number) ?? 3;
            setRetryError({
              itemId,
              message: `Este item atingiu o limite máximo de ${maxRetries} tentativas. Cancele e faça o upload novamente.`,
            });
          } else if (err.errorCode === "UPLOAD_ITEM_NOT_RETRYABLE") {
            setRetryError({
              itemId,
              message: err.message || "Este item não pode ser retentado.",
            });
          }
        },
      });
    },
    [retryItem],
  );

  const handleRetryAllFailed = useCallback(() => {
    setRetryError(null);
    const failedItems = items.filter(
      (i) => i.status === "FAILED" && i.job?.canRetry,
    );
    failedItems.forEach((i) => handleRetryItem(i.id));
  }, [items, handleRetryItem]);

  const handleConfirmAll = useCallback(() => {
    confirmDraft.mutate();
  }, [confirmDraft]);

  const handleConfirmSelected = useCallback(() => {
    const ids = Array.from(selectedItems);
    if (ids.length > 0) {
      confirmSelected.mutate(ids);
      setSelectedItems(new Set());
    }
  }, [selectedItems, confirmSelected]);

  const handleCancel = useCallback(() => {
    if (
      window.confirm("Cancelar este draft? Todos os itens serão cancelados.")
    ) {
      cancelDraft.mutate(undefined, {
        onSuccess: () => router.push("/dashboard/uploads"),
      });
    }
  }, [cancelDraft, router]);

  const handleExtend = useCallback(() => {
    extendDraft.mutate();
  }, [extendDraft]);

  // Loading state — includes initial load and retries after error
  if (draftQuery.isLoading || (draftQuery.isError && draftQuery.isFetching)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        {draftQuery.isError && (
          <p className="text-xs text-[var(--color-textDim)]">
            Carregando draft... tentando novamente.
          </p>
        )}
      </div>
    );
  }

  // Error state — only show after all retries are exhausted
  if (draftQuery.isError) {
    const status = (draftQuery.error as { statusCode?: number })?.statusCode;
    const isGone = status === 410;
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
        <h2 className="mt-4 text-lg font-semibold text-[var(--color-textMain)]">
          {isGone ? "Draft expirado" : "Draft não encontrado"}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-textDim)]">
          {isGone
            ? "Este draft expirou e não pode mais ser acessado."
            : "O draft pode ter expirado ou sido cancelado."}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          {!isGone && (
            <button
              type="button"
              onClick={() => draftQuery.refetch()}
              className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </button>
          )}
          <Link
            href="/dashboard/uploads"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para uploads
          </Link>
        </div>
      </div>
    );
  }

  if (!draft || !workflow) return null;

  const wfState = workflow.state as WorkflowState;
  const isTerminal = workflow.isTerminal;
  const canEdit = workflow.canEdit;
  const canConfirm = workflow.canConfirm;
  const isConfirming = confirmDraft.isPending || confirmSelected.isPending;
  const expiring = isExpiringSoon(draft.expiresAt);
  const progressPercent = sse.progressPercent || workflow.progressPercent;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/dashboard/uploads"
          className="mb-3 inline-flex items-center gap-1 text-xs text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Uploads
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-bold text-[var(--color-textMain)]">
              {draft.source === "GOOGLE_DRIVE"
                ? "Importação Google Drive"
                : "Upload Local"}
              <StatusBadge
                label={WORKFLOW_STATE_LABELS[wfState] ?? wfState}
                tone={WORKFLOW_STATE_TONE[wfState] ?? "neutral"}
                pulse={wfState === "ANALYZING" || wfState === "PROCESSING"}
              />
            </h1>
            <p className="mt-1 text-xs text-[var(--color-textDim)]">
              Criado em {formatDateTime(draft.createdAt)}
              {draft.expiresAt &&
                ` · Expira em ${formatDateTime(draft.expiresAt)}`}
            </p>
            {wfState === "PROCESSING" && (
              <p className="mt-0.5 text-[11px] text-emerald-300/70">
                O prazo é estendido automaticamente ao confirmar itens.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* SSE indicator */}
            <span
              className={`flex items-center gap-1 text-xs ${sse.connected ? "text-emerald-300" : "text-[var(--color-textDim)]"}`}
              title={
                sse.connected
                  ? "Conectado em tempo real"
                  : "Sem conexão em tempo real"
              }
            >
              {sse.connected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
            </span>

            {/* Extend */}
            {expiring && !isTerminal && workflow.canExtend && (
              <button
                type="button"
                onClick={handleExtend}
                disabled={extendDraft.isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10"
              >
                <Timer className="h-3 w-3" />
                Estender prazo
              </button>
            )}

            {/* Cancel */}
            {!isTerminal && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelDraft.isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3 w-3" />
                Cancelar draft
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress Bar ──────────────────────────────────────────── */}
      {progressPercent > 0 && progressPercent < 100 && (
        <ProgressBar percent={progressPercent} label="Progresso geral" />
      )}
      {/* ── Series Context Banner ─────────────────────────────── */}
      {seriesContext && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
            seriesContext.mode === "existing"
              ? "border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5"
              : "border-emerald-500/20 bg-emerald-500/5"
          }`}
        >
          {seriesContext.mode === "existing" ? (
            <BookOpen className="h-4 w-4 flex-shrink-0 text-[var(--color-primary)]" />
          ) : (
            <Plus className="h-4 w-4 flex-shrink-0 text-emerald-400" />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium ${
                seriesContext.mode === "existing"
                  ? "text-[var(--color-primary)]"
                  : "text-emerald-300"
              }`}
            >
              {seriesContext.mode === "existing"
                ? "Série existente"
                : seriesContext.created
                  ? "Nova série criada"
                  : "Nova série"}
              {" — "}
              <span className="font-semibold">{seriesContext.title}</span>
            </p>
            <p className="text-xs text-[var(--color-textDim)]">
              {seriesContext.mode === "existing"
                ? "Todos os capítulos deste draft pertencem a esta série."
                : seriesContext.created
                  ? "A série foi criada pelo primeiro capítulo. Os demais serão adicionados a ela."
                  : "O primeiro capítulo confirmado criará esta série. Os demais seguirão automaticamente."}
            </p>
          </div>
        </div>
      )}
      {/* ── Counts Summary ────────────────────────────────────────── */}
      {counts && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            {
              label: "Total",
              value: counts.total,
              color: "text-[var(--color-textMain)]",
            },
            {
              label: "Para revisão",
              value: counts.reviewRequired,
              color: "text-amber-300",
            },
            {
              label: "Confirmáveis",
              value: counts.confirmable,
              color: "text-emerald-300",
            },
            {
              label: "Na fila",
              value: counts.queued,
              color: "text-sky-300",
            },
            {
              label: "Processando",
              value: counts.processing,
              color: "text-sky-400",
            },
            {
              label: "Concluídos",
              value: counts.completed,
              color: "text-emerald-400",
            },
            ...(counts.failed > 0
              ? [
                  {
                    label: "Falhas",
                    value: counts.failed,
                    color: "text-rose-400",
                  },
                ]
              : []),
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-white/5 bg-[var(--color-surface)] px-3 py-2 text-center"
            >
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[var(--color-textDim)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Bulk Actions Bar ──────────────────────────────────────── */}
      {canEdit && items.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-[var(--color-surface)] px-4 py-3">
          <span className="text-xs text-[var(--color-textDim)]">
            Ações em lote:
          </span>

          <button
            type="button"
            onClick={handleSelectAll}
            className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-[var(--color-textMain)] hover:bg-white/5"
          >
            <Check className="mr-1 inline h-3 w-3" />
            Selecionar prontos ({confirmableItems.length})
          </button>

          {selectedItems.size > 0 && (
            <button
              type="button"
              onClick={handleDeselectAll}
              className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-[var(--color-textDim)] hover:bg-white/5"
            >
              Limpar seleção
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyAll}
            disabled={applyAll.isPending}
            className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-[var(--color-textMain)] hover:bg-white/5 disabled:opacity-50"
            title="Copia série, metadados, volume e ano do primeiro item configurado para os demais"
          >
            <Copy className="mr-1 inline h-3 w-3" />
            Aplicar do primeiro a todos
          </button>

          {retryableFailedItems.length > 0 && (
            <button
              type="button"
              onClick={handleRetryAllFailed}
              disabled={retryItem.isPending}
              className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
            >
              <RotateCcw className="mr-1 inline h-3 w-3" />
              Retry falhas ({retryableFailedItems.length})
            </button>
          )}
        </div>
      )}

      {/* ── Filter Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {(
          [
            { key: "all", label: "Todos", count: items.length },
            {
              key: "review",
              label: "Revisão",
              count: counts?.reviewRequired ?? 0,
            },
            { key: "ready", label: "Prontos", count: confirmableItems.length },
            {
              key: "processing",
              label: "Processando",
              count: (counts?.processing ?? 0) + (counts?.queued ?? 0),
            },
            {
              key: "completed",
              label: "Concluídos",
              count: counts?.completed ?? 0,
            },
            { key: "failed", label: "Falhas", count: counts?.failed ?? 0 },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.key
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 rounded-full bg-white/10 px-1.5 text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Item List ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        {filteredItems.length === 0 && (
          <div className="rounded-lg border border-white/5 bg-[var(--color-surface)] py-8 text-center">
            <p className="text-sm text-[var(--color-textDim)]">
              {filter === "all"
                ? "Nenhum item neste draft."
                : "Nenhum item neste filtro."}
            </p>
          </div>
        )}

        {filteredItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            selected={selectedItems.has(item.id)}
            onSelect={handleItemSelect}
            onUpdate={handleUpdateItem}
            onRetry={handleRetryItem}
            onCancel={(id) => cancelItem.mutate(id)}
            isUpdating={updateItem.isPending}
            disabled={!canEdit}
            retryError={retryError?.itemId === item.id ? retryError.message : undefined}
          />
        ))}
      </div>

      {/* ── Sticky Confirm Bar ────────────────────────────────────── */}
      {!isTerminal && (canConfirm || selectedConfirmable.length > 0) && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-white/10 bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur-xl lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="text-sm text-[var(--color-textDim)]">
              {selectedItems.size > 0 ? (
                <span>
                  <strong className="text-[var(--color-textMain)]">
                    {selectedItems.size}
                  </strong>{" "}
                  {selectedItems.size === 1
                    ? "item selecionado"
                    : "itens selecionados"}
                </span>
              ) : (
                <span>
                  <strong className="text-[var(--color-textMain)]">
                    {confirmableItems.length}
                  </strong>{" "}
                  {confirmableItems.length === 1
                    ? "item pronto"
                    : "itens prontos"}{" "}
                  para confirmar
                </span>
              )}
              {counts && counts.reviewRequired > 0 && (
                <span className="ml-2 text-amber-300">
                  · {counts.reviewRequired} ainda precisam de revisão
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmSelected}
                  disabled={isConfirming || selectedConfirmable.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Confirmar selecionados ({selectedConfirmable.length})
                </button>
              )}

              {canConfirm && confirmableItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmAll}
                  disabled={isConfirming}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Confirmar todos ({confirmableItems.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Terminal State Message ─────────────────────────────────── */}
      {isTerminal && (
        <div
          className={`rounded-xl border p-6 text-center ${
            wfState === "COMPLETED"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : wfState === "FAILED" || wfState === "PARTIAL_FAILURE"
                ? "border-rose-500/20 bg-rose-500/5"
                : "border-white/5 bg-[var(--color-surface)]"
          }`}
        >
          {wfState === "COMPLETED" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <h2 className="mt-3 text-lg font-semibold text-emerald-300">
                Upload concluído!
              </h2>
              <p className="mt-1 text-sm text-[var(--color-textDim)]">
                Todos os {counts?.completed ?? 0} itens foram processados com
                sucesso.
              </p>
            </>
          )}
          {wfState === "PARTIAL_FAILURE" && (
            <>
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
              <h2 className="mt-3 text-lg font-semibold text-amber-300">
                Concluído com falhas
              </h2>
              <p className="mt-1 text-sm text-[var(--color-textDim)]">
                {counts?.completed ?? 0} concluídos, {counts?.failed ?? 0}{" "}
                falharam. Use o filtro &quot;Falhas&quot; para ver os itens com
                problema.
              </p>
            </>
          )}
          {wfState === "FAILED" && (
            <>
              <X className="mx-auto h-10 w-10 text-rose-400" />
              <h2 className="mt-3 text-lg font-semibold text-rose-300">
                Upload falhou
              </h2>
              <p className="mt-1 text-sm text-[var(--color-textDim)]">
                Todos os itens falharam. Tente novamente com o botão de retry em
                cada item.
              </p>
            </>
          )}
          {(wfState === "CANCELED" || wfState === "EXPIRED") && (
            <>
              <X className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 text-lg font-semibold text-slate-300">
                {wfState === "EXPIRED" ? "Draft expirado" : "Draft cancelado"}
              </h2>
            </>
          )}

          <Link
            href="/dashboard/uploads"
            className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para uploads
          </Link>
        </div>
      )}
    </div>
  );
}
