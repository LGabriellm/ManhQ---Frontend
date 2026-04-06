"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  useAdminApprovals,
  useApproveContent,
  useApprovalsStats,
  useBulkApprove,
  useBulkReject,
  useRejectContent,
} from "@/hooks/useAdmin";
import {
  CONFIDENCE_META,
  ITEM_STATUS_META,
  TONE_STYLES,
  formatDateTime,
} from "@/types/upload";
import type { ApprovalItem, ApprovalsParams } from "@/types/api";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

const EMPTY_APPROVALS: ApprovalItem[] = [];

function approvalTone(status: ApprovalItem["approval"]["status"]) {
  const map = {
    NOT_REQUIRED: { label: "Sem aprovação", tone: "neutral" },
    PENDING: { label: "Pendente", tone: "warning" },
    APPROVED: { label: "Aprovado", tone: "success" },
    REJECTED: { label: "Rejeitado", tone: "danger" },
  } as const;

  return map[status] || map.PENDING;
}

function formatDecision(item: ApprovalItem) {
  if (item.plan.decision === "EXISTING_SERIES") {
    return (
      item.suggestion.matchedSeriesTitle ||
      item.plan.targetSeriesId ||
      "Série existente"
    );
  }

  if (item.plan.decision === "NEW_SERIES") {
    return item.plan.newSeriesTitle || "Nova série";
  }

  return "Ignorar item";
}

function RejectDialog({
  title,
  itemCount,
  isPending,
  onClose,
  onSubmit,
}: {
  title: string;
  itemCount: number;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason.trim()) {
      return;
    }

    await onSubmit(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[var(--color-surface)] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
              Aprovação
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
              {title}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-textDim)]">
              {itemCount} item(ns) será(ão) marcado(s) como rejeitado(s).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm text-[var(--color-textDim)]">
            Motivo da rejeição
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            required
            className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-rose-500/40"
            placeholder="Explique o motivo para o editor corrigir ou reenviar."
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !reason.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Rejeitar
          </button>
        </div>
      </form>
    </div>
  );
}

function ApprovalCard({
  approval,
  checked,
  onToggle,
  onApprove,
  onReject,
  isApproving,
}: {
  approval: ApprovalItem;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  onApprove: () => Promise<void>;
  onReject: () => void;
  isApproving: boolean;
}) {
  const approvalMeta = approvalTone(approval.approval.status);
  const itemMeta = ITEM_STATUS_META[approval.status];
  const confidenceMeta = CONFIDENCE_META[approval.suggestion.confidence];
  const submitterLabel =
    approval.submitterName || approval.submitterEmail || approval.submitterId;

  return (
    <article className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <label className="mt-1 flex items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onToggle(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-transparent text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-[var(--color-textMain)]">
                {approval.originalName}
              </p>
              <p className="mt-1 text-xs text-[var(--color-textDim)]">
                Enviado em {formatDateTime(approval.createdAt)} por{" "}
                {submitterLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[approvalMeta.tone]}`}
              >
                {approvalMeta.label}
              </span>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[itemMeta.tone]}`}
              >
                {itemMeta.label}
              </span>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[confidenceMeta.tone]}`}
              >
                {confidenceMeta.label}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                Destino manual
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                {formatDecision(approval)}
              </p>
              <p className="mt-2 text-xs text-[var(--color-textDim)]">
                {approval.plan.selectionConfirmed
                  ? `Confirmado via ${approval.plan.selectionSource || "fluxo manual"}`
                  : "Ainda não confirmado manualmente"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                Sugestão backend
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                {approval.suggestion.matchedSeriesTitle || "Sem match forte"}
              </p>
              <p className="mt-2 text-xs text-[var(--color-textDim)]">
                score {Math.round(approval.suggestion.confidenceScore)} ·{" "}
                {approval.suggestion.decision}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                Sessão e arquivo
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                Sessão {approval.sessionId.slice(0, 8)}
              </p>
              <p className="mt-2 text-xs text-[var(--color-textDim)]">
                {approval.fileExists === false
                  ? "Arquivo remoto diferido: esperado em imports do Drive."
                  : "Arquivo disponível para processamento/aprovação."}
              </p>
            </div>
          </div>

          {(approval.suggestion.warnings.length > 0 ||
            approval.suggestion.conflicts.length > 0) && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {approval.suggestion.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-medium text-amber-100">Warnings</p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-50/90">
                    {approval.suggestion.warnings.slice(0, 4).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {approval.suggestion.conflicts.length > 0 && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                  <p className="text-sm font-medium text-rose-100">Conflitos</p>
                  <ul className="mt-2 space-y-1 text-xs text-rose-50/90">
                    {approval.suggestion.conflicts
                      .slice(0, 4)
                      .map((conflict) => (
                        <li key={conflict}>{conflict}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {approval.suggestion.candidates.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-sm font-medium text-[var(--color-textMain)]">
                Ranking de candidatos
              </p>
              <div className="mt-3 grid gap-2">
                {approval.suggestion.candidates
                  .slice(0, 3)
                  .map((candidate, index) => (
                    <div
                      key={`${candidate.normalizedTitle}-${index}`}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          {candidate.matchedSeriesTitle ||
                            candidate.normalizedTitle}
                        </p>
                        <p className="text-xs text-[var(--color-textDim)]">
                          score {Math.round(candidate.combinedScore)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-textDim)]">
                        evidências: {candidate.evidenceSources.join(", ")}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {(approval.approval.reason || approval.error?.message) && (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              {approval.approval.reason || approval.error?.message}
            </div>
          )}

          {approval.result.seriesId && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Resultado atual:{" "}
              {approval.result.seriesTitle || approval.result.seriesId}
              {approval.result.mediaId
                ? ` · mídia ${approval.result.mediaId}`
                : ""}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard/uploads"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)]"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir workspace de uploads
            </Link>

            {approval.approval.status === "PENDING" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onReject}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-500/15"
                >
                  <XCircle className="h-4 w-4" />
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => void onApprove()}
                  disabled={isApproving}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Aprovar
                </button>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-textDim)]">
                Revisado em {formatDateTime(approval.approval.reviewedAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  tone: "warning" | "success" | "danger" | "info";
}) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-textDim)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-textMain)]">
            {value}
          </p>
        </div>
        <div className={`rounded-2xl border p-3 ${TONE_STYLES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const [params, setParams] = useState<ApprovalsParams>({
    status: "PENDING",
    page: 1,
    limit: 20,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminApprovals(params);
  const { data: stats } = useApprovalsStats();
  const approveMutation = useApproveContent();
  const rejectMutation = useRejectContent();
  const bulkApproveMutation = useBulkApprove();
  const bulkRejectMutation = useBulkReject();

  const approvals = data?.approvals ?? EMPTY_APPROVALS;
  const pagination = data?.pagination;

  const filteredApprovals = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return approvals;
    }

    return approvals.filter((approval) => {
      const haystack = [
        approval.originalName,
        approval.suggestion.matchedSeriesTitle,
        approval.plan.newSeriesTitle,
        approval.submitterName,
        approval.submitterEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [approvals, search]);

  const toggleOne = (approvalId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(approvalId);
      } else {
        next.delete(approvalId);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredApprovals.map((approval) => approval.approvalId);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((approvalId) => selectedIds.has(approvalId));

    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) {
        visibleIds.forEach((approvalId) => next.delete(approvalId));
      } else {
        visibleIds.forEach((approvalId) => next.add(approvalId));
      }
      return next;
    });
  };

  const approveOne = async (approvalId: string) => {
    try {
      const result = await approveMutation.mutateAsync(approvalId);
      toast.success(result.message);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(approvalId);
        return next;
      });
    } catch (error) {
      const message =
        (error as { message?: string })?.message || "Falha ao aprovar item.";
      toast.error(message);
    }
  };

  const rejectMany = async (ids: string[], reason: string) => {
    try {
      if (ids.length === 1) {
        await rejectMutation.mutateAsync({ id: ids[0], data: { reason } });
      } else {
        await bulkRejectMutation.mutateAsync({ ids, reason });
      }
      toast.success(
        ids.length === 1
          ? "Item rejeitado."
          : `${ids.length} item(ns) rejeitado(s).`,
      );
      setSelectedIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setRejectingIds(null);
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao rejeitar seleção.";
      toast.error(message);
    }
  };

  const approveSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    try {
      const result = await bulkApproveMutation.mutateAsync({ ids });
      toast.success(result.message);
      setSelectedIds(new Set());
    } catch (error) {
      const message =
        (error as { message?: string })?.message || "Falha ao aprovar seleção.";
      toast.error(message);
    }
  };

  const selectionCount = selectedIds.size;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Admin review
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--color-textMain)]">
            Fila de Aprovações
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-textDim)]">
            Revise decisões manuais de editor, evidências de matching e estado
            do item antes de aprovar ou rejeitar.
          </p>
        </div>

        <Link
          href="/dashboard/uploads"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir uploads
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pendentes"
          value={stats?.pending || 0}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Aprovados"
          value={stats?.approved || 0}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Rejeitados"
          value={stats?.rejected || 0}
          icon={XCircle}
          tone="danger"
        />
        <StatCard
          label="Pendentes hoje"
          value={stats?.todayPending || 0}
          icon={AlertTriangle}
          tone="info"
        />
      </div>

      <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["PENDING", "Pendentes"],
                ["APPROVED", "Aprovados"],
                ["REJECTED", "Rejeitados"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setParams((current) => ({
                    ...current,
                    status: value,
                    page: 1,
                  }))
                }
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  params.status === value
                    ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                    : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="relative block w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar nome, série ou submitter"
              className="w-full rounded-full border border-white/8 bg-black/10 py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
            />
          </label>
        </div>

        {selectionCount > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/8 bg-black/10 px-4 py-3">
            <p className="text-sm text-[var(--color-textMain)]">
              {selectionCount} item(ns) selecionado(s)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void approveSelected()}
                disabled={bulkApproveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
              >
                {bulkApproveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Aprovar seleção
              </button>
              <button
                type="button"
                onClick={() => setRejectingIds(Array.from(selectedIds))}
                className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-500/15"
              >
                <XCircle className="h-4 w-4" />
                Rejeitar seleção
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-[var(--color-textDim)]">
          <button
            type="button"
            onClick={toggleAllVisible}
            className="text-left transition-colors hover:text-[var(--color-textMain)]"
          >
            Marcar/desmarcar todos os itens filtrados
          </button>
          <p>{filteredApprovals.length} item(ns) na tela</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-white/10 bg-black/10 p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-[var(--color-textDim)]" />
          <p className="mt-4 text-lg font-medium text-[var(--color-textMain)]">
            Nenhuma aprovação encontrada
          </p>
          <p className="mt-2 text-sm text-[var(--color-textDim)]">
            Ajuste os filtros ou aguarde novas submissões de editor.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((approval) => (
            <ApprovalCard
              key={approval.approvalId}
              approval={approval}
              checked={selectedIds.has(approval.approvalId)}
              onToggle={(checked) => toggleOne(approval.approvalId, checked)}
              onApprove={() => approveOne(approval.approvalId)}
              onReject={() => setRejectingIds([approval.approvalId])}
              isApproving={approveMutation.isPending}
            />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-[28px] border border-white/8 bg-white/[0.03] px-5 py-4">
          <p className="text-sm text-[var(--color-textDim)]">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setParams((current) => ({
                  ...current,
                  page: Math.max(1, (current.page || 1) - 1),
                }))
              }
              disabled={pagination.page <= 1}
              className="rounded-full border border-white/10 p-2 text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setParams((current) => ({
                  ...current,
                  page: Math.min(
                    pagination.totalPages,
                    (current.page || 1) + 1,
                  ),
                }))
              }
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-full border border-white/10 p-2 text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {rejectingIds && (
        <RejectDialog
          title={
            rejectingIds.length === 1
              ? "Rejeitar item"
              : "Rejeitar itens selecionados"
          }
          itemCount={rejectingIds.length}
          isPending={rejectMutation.isPending || bulkRejectMutation.isPending}
          onClose={() => setRejectingIds(null)}
          onSubmit={(reason) => rejectMany(rejectingIds, reason)}
        />
      )}
    </div>
  );
}
