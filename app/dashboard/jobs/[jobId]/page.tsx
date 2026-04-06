"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  RotateCcw,
  SquareX,
} from "lucide-react";
import { FeedbackState } from "@/components/FeedbackState";
import {
  useAdminJob,
  useDeleteJob,
  useJobLogs,
  useRetryJob,
} from "@/hooks/useAdmin";
import {
  OPERATIONAL_STATE_META,
  TONE_STYLES,
  formatDateTime,
  formatDurationMs,
  formatPercent,
  formatUploadStage,
} from "@/types/upload";

function formatJobProgress(progress: unknown): string {
  if (typeof progress === "number") {
    return formatPercent(progress);
  }

  if (!progress) {
    return "—";
  }

  try {
    return JSON.stringify(progress, null, 2);
  } catch {
    return String(progress);
  }
}

export default function DashboardJobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const jobQuery = useAdminJob(jobId || "", Boolean(jobId));
  const jobLogsQuery = useJobLogs(jobId || "", Boolean(jobId));
  const retryJobMutation = useRetryJob();
  const deleteJobMutation = useDeleteJob();

  const retryJob = async () => {
    if (!jobId) {
      return;
    }

    try {
      await retryJobMutation.mutateAsync(jobId);
      toast.success("Job reenfileirado.");
      await Promise.all([jobQuery.refetch(), jobLogsQuery.refetch()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao reenfileirar o job.";
      toast.error(message);
    }
  };

  const cancelJob = async () => {
    if (!jobId) {
      return;
    }

    try {
      const result = await deleteJobMutation.mutateAsync(jobId);
      toast.success(result.message);
      await Promise.all([jobQuery.refetch(), jobLogsQuery.refetch()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao cancelar o job.";
      toast.error(message);
    }
  };

  if (jobQuery.isLoading) {
    return (
      <main className="page-shell">
        <FeedbackState
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title="Carregando job"
          description="Buscando os detalhes do processamento para este item."
          tone="info"
          className="grid min-h-[52vh] place-content-center"
        />
      </main>
    );
  }

  if (!jobQuery.data) {
    return (
      <main className="page-shell">
        <FeedbackState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Job não encontrado"
          description="Esse job não retornou detalhes. Volte ao centro de jobs ou ao workspace de uploads."
          tone="danger"
          actionLabel="Voltar aos jobs"
          actionHref="/dashboard/jobs"
          className="grid min-h-[52vh] place-content-center"
        />
      </main>
    );
  }

  const job = jobQuery.data;
  const logs = jobLogsQuery.data?.logs ?? job.logs ?? [];
  const progressLabel = formatJobProgress(job.progress);
  const progressValue =
    typeof job.progress === "number"
      ? Math.max(0, Math.min(100, job.progress))
      : null;
  const displayState =
    job.dashboardState && job.dashboardState in OPERATIONAL_STATE_META
      ? OPERATIONAL_STATE_META[
          job.dashboardState as keyof typeof OPERATIONAL_STATE_META
        ]
      : null;
  const canRetry = job.lifecycle?.canRetry || job.state === "failed";
  const canCancel =
    job.upload?.operational.canCancel ||
    (!job.upload && job.lifecycle?.canCancel);

  return (
    <main className="page-shell space-y-6">
      <header className="page-header">
        <div>
          <p className="section-kicker">Fila</p>
          <h1 className="section-title">Job {job.id}</h1>
          <p className="section-description">
            Acompanhe BullMQ e, quando este for um upload, também o estado
            operacional persistido do item.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/jobs"
            className="ui-btn-ghost px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos jobs
          </Link>
          <button
            type="button"
            onClick={() => {
              void Promise.all([jobQuery.refetch(), jobLogsQuery.refetch()]);
            }}
            className="ui-btn-secondary px-4 py-2.5 text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          {canRetry ? (
            <button
              type="button"
              onClick={() => {
                void retryJob();
              }}
              disabled={retryJobMutation.isPending}
              className="ui-btn-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {retryJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reenfileirar
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              onClick={() => {
                void cancelJob();
              }}
              disabled={deleteJobMutation.isPending}
              className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 disabled:opacity-50"
            >
              {deleteJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SquareX className="h-4 w-4" />
              )}
              Cancelar
            </button>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="surface-panel rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
            Runtime
          </p>
          <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
            {displayState?.label || job.lifecycle?.state || job.state}
          </p>
          <p className="mt-2 text-xs text-[var(--color-textDim)]">
            {displayState?.description || "Estado técnico do BullMQ."}
          </p>
        </div>
        <div className="surface-panel rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
            Progresso
          </p>
          <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
            {progressLabel}
          </p>
          {progressValue != null ? (
            <div className="mt-4 h-2 rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          ) : null}
        </div>
        <div className="surface-panel rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
            Tentativas
          </p>
          <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
            {job.attempts ?? "—"}
            {job.maxAttempts ? ` / ${job.maxAttempts}` : ""}
          </p>
        </div>
        <div className="surface-panel rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
            Duração
          </p>
          <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
            {formatDurationMs(job.duration)}
          </p>
        </div>
      </section>

      {job.upload && (
        <section className="surface-panel rounded-[30px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Upload Runtime</p>
              <p className="mt-2 text-sm text-[var(--color-textDim)]">
                Sessão {job.upload.sessionId} · item {job.upload.itemId}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${
                TONE_STYLES[
                  OPERATIONAL_STATE_META[job.upload.operational.state].tone
                ]
              }`}
            >
              {OPERATIONAL_STATE_META[job.upload.operational.state].label}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="surface-panel-muted rounded-2xl p-4">
              <p className="text-xs text-[var(--color-textDim)]">
                Estado da sessão
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                {job.upload.sessionStatus}
              </p>
            </div>
            <div className="surface-panel-muted rounded-2xl p-4">
              <p className="text-xs text-[var(--color-textDim)]">Etapa</p>
              <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                {formatUploadStage(job.upload.operational.stage)}
              </p>
            </div>
            <div className="surface-panel-muted rounded-2xl p-4">
              <p className="text-xs text-[var(--color-textDim)]">Heartbeat</p>
              <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                {formatDurationMs(job.upload.operational.heartbeatAgeMs)}
              </p>
            </div>
            <div className="surface-panel-muted rounded-2xl p-4">
              <p className="text-xs text-[var(--color-textDim)]">
                Progresso persistido
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                {formatPercent(job.upload.operational.lastProgressPercent)}
              </p>
            </div>
          </div>

          {(job.upload.operational.isStuck ||
            job.upload.operational.isCancelRequested) && (
            <div
              className={`mt-4 rounded-2xl border p-4 text-sm ${
                job.upload.operational.isStuck
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-100"
              }`}
            >
              <p className="font-medium">
                {job.upload.operational.isStuck
                  ? "O item excedeu a janela de heartbeat."
                  : "O cancelamento já foi aceito pelo backend."}
              </p>
              <p className="mt-2 text-xs">
                {job.upload.operational.cancelReason ||
                  OPERATIONAL_STATE_META[job.upload.operational.state]
                    .description}
              </p>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="surface-panel rounded-[30px] p-5">
            <p className="section-kicker">Identificação</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">
                  Nome do job
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {job.name}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">Fila</p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {job.queue || "—"}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">Criado em</p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {formatDateTime(job.createdAt)}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">
                  Finalizado em
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {formatDateTime(job.finishedAt || job.processedAt)}
                </p>
              </div>
            </div>
          </div>

          {job.error ? (
            <div className="state-panel state-panel-danger">
              <p className="text-sm font-medium">Erro do job</p>
              <p className="mt-2 text-xs">{job.error}</p>
            </div>
          ) : null}

          {job.result ? (
            <div className="surface-panel rounded-[30px] p-5">
              <p className="section-kicker">Resultado</p>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/8 bg-black/20 p-4 text-xs text-[var(--color-textDim)]">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="surface-panel rounded-[30px] p-5">
            <p className="section-kicker">BullMQ</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">
                  Estado bruto
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {job.state}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">Lifecycle</p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {job.lifecycle?.state || "—"}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">
                  Stalled count
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {job.stalledCount ?? "—"}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">
                  Attempts started
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {job.attemptsStarted ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-[30px] p-5">
            <p className="section-kicker">Payload</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/8 bg-black/20 p-4 text-xs text-[var(--color-textDim)]">
              {JSON.stringify(job.data ?? {}, null, 2)}
            </pre>
          </div>

          {logs.length ? (
            <div className="surface-panel rounded-[30px] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="section-kicker">Logs</p>
                {jobLogsQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--color-textDim)]" />
                ) : null}
              </div>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                {logs.map((log, index) => (
                  <div
                    key={`${job.id}-log-${index}`}
                    className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-[var(--color-textDim)]"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="surface-panel rounded-[30px] p-5">
              <p className="section-kicker">Logs</p>
              <p className="mt-4 text-sm text-[var(--color-textDim)]">
                Nenhum log disponível para este job.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
