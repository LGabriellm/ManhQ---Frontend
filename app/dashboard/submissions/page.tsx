"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMySubmissions } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import {
  CONFIDENCE_META,
  ITEM_STATUS_META,
  TONE_STYLES,
  formatDateTime,
} from "@/lib/upload-workflow";
import type { SubmissionItem } from "@/types/api";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";

const EMPTY_SUBMISSIONS: SubmissionItem[] = [];

function approvalTone(status: SubmissionItem["approval"]["status"]) {
  const map = {
    NOT_REQUIRED: { label: "Sem aprovação", tone: "neutral" },
    PENDING: { label: "Aguardando admin", tone: "warning" },
    APPROVED: { label: "Aprovado", tone: "success" },
    REJECTED: { label: "Rejeitado", tone: "danger" },
  } as const;

  return map[status] || map.PENDING;
}

function destinationLabel(item: SubmissionItem) {
  if (item.plan.decision === "EXISTING_SERIES") {
    return item.suggestion.matchedSeriesTitle || item.plan.targetSeriesId || "Série existente";
  }

  if (item.plan.decision === "NEW_SERIES") {
    return item.plan.newSeriesTitle || "Nova série";
  }

  return "Ignorado";
}

function SubmissionCard({ item }: { item: SubmissionItem }) {
  const itemMeta = ITEM_STATUS_META[item.status];
  const approvalMeta = approvalTone(item.approval.status);
  const confidenceMeta = CONFIDENCE_META[item.suggestion.confidence];

  return (
    <article className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--color-textMain)]">
            {item.originalName}
          </p>
          <p className="mt-1 text-xs text-[var(--color-textDim)]">
            Sessão {item.sessionId.slice(0, 8)} · enviado em{" "}
            {formatDateTime(item.createdAt)}
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
            Destino confirmado
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
            {destinationLabel(item)}
          </p>
          <p className="mt-2 text-xs text-[var(--color-textDim)]">
            {item.plan.selectionConfirmed
              ? `Confirmado via ${item.plan.selectionSource || "manual"}`
              : "Ainda sem confirmação final"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
            Sugestão analisada
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
            {item.suggestion.matchedSeriesTitle || "Sem match forte"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-textDim)]">
            score {Math.round(item.suggestion.confidenceScore)} ·{" "}
            {item.suggestion.decision}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
            Resultado
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
            {item.result.seriesTitle || item.result.seriesId || "Ainda sem série final"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-textDim)]">
            {item.result.mediaId
              ? `Mídia ${item.result.mediaId}`
              : "Processamento ainda não concluiu"}
          </p>
        </div>
      </div>

      {(item.approval.reason || item.error?.message) && (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {item.approval.reason || item.error?.message}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-textDim)]">
          Última atualização: {formatDateTime(item.updatedAt)}
        </p>
        <Link
          href="/dashboard/uploads"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)]"
        >
          <ExternalLink className="h-4 w-4" />
          Voltar ao workspace
        </Link>
      </div>
    </article>
  );
}

export default function SubmissionsPage() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("PENDING");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useMySubmissions({
    status,
    page,
    limit: 20,
  });

  const submissions = data?.submissions ?? EMPTY_SUBMISSIONS;
  const pagination = data?.pagination;

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return submissions;
    }

    return submissions.filter((item) => {
      const haystack = [
        item.originalName,
        item.suggestion.matchedSeriesTitle,
        item.plan.newSeriesTitle,
        item.result.seriesTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [search, submissions]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Submission history
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--color-textMain)]">
            Minhas Submissões
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-textDim)]">
            Acompanhe tudo o que já foi confirmado no workspace manual-first:
            aprovação admin, processamento, rejeições e resultado final.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)]">
            Pendentes: {data?.pendingCount || 0}
          </div>
          {isAdmin && (
            <Link
              href="/dashboard/approvals"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir aprovações
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ["PENDING", "Pendentes", Clock],
              ["APPROVED", "Aprovados", CheckCircle2],
              ["REJECTED", "Rejeitados", XCircle],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                  status === value
                    ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                    : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                }`}
              >
                <Icon className="h-4 w-4" />
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
              placeholder="Filtrar nome ou série"
              className="w-full rounded-full border border-white/8 bg-black/10 py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
            />
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-white/10 bg-black/10 p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-[var(--color-textDim)]" />
          <p className="mt-4 text-lg font-medium text-[var(--color-textMain)]">
            Nenhuma submissão encontrada
          </p>
          <p className="mt-2 text-sm text-[var(--color-textDim)]">
            Crie uma sessão de upload ou ajuste os filtros desta página.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <SubmissionCard key={item.approvalId} item={item} />
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.page <= 1}
              className="rounded-full border border-white/10 p-2 text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-full border border-white/10 p-2 text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
