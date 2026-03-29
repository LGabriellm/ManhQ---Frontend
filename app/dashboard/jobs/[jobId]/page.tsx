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
} from "lucide-react";
import { FeedbackState } from "@/components/FeedbackState";
import { useAdminJob, useRetryJob } from "@/hooks/useAdmin";

function formatJobTimestamp(value?: number): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function formatJobProgress(progress: unknown): string {
  if (typeof progress === "number") {
    return `${Math.round(progress)}%`;
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
  const retryJobMutation = useRetryJob();

  const retryJob = async () => {
    if (!jobId) {
      return;
    }

    try {
      await retryJobMutation.mutateAsync(jobId);
      toast.success("Job reenfileirado.");
      await jobQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao reenfileirar o job.";
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
          description="Esse job não retornou detalhes. Volte ao workspace de uploads e escolha outro item."
          tone="danger"
          actionLabel="Voltar aos uploads"
          actionHref="/dashboard/uploads"
          className="grid min-h-[52vh] place-content-center"
        />
      </main>
    );
  }

  const job = jobQuery.data;
  const progressLabel = formatJobProgress(job.progress);
  const progressValue =
    typeof job.progress === "number"
      ? Math.max(0, Math.min(100, job.progress))
      : null;

  return (
    <main className="page-shell space-y-6">
      <header className="page-header">
        <div>
          <p className="section-kicker">Fila</p>
          <h1 className="section-title">Job {job.id}</h1>
          <p className="section-description">
            Acompanhe o estado da fila, o progresso do processamento e os dados
            associados ao item enviado pelo workspace de uploads.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/uploads"
            className="ui-btn-ghost px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos uploads
          </Link>
          <button
            type="button"
            onClick={() => {
              void jobQuery.refetch();
            }}
            className="ui-btn-secondary px-4 py-2.5 text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          {job.state === "failed" ? (
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
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="surface-panel rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
            Estado
          </p>
          <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
            {job.state}
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
            {job.duration != null ? `${job.duration} ms` : "—"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="surface-panel rounded-[30px] p-5">
            <p className="section-kicker">Identificação</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">Nome do job</p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {job.name}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">Arquivo original</p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {job.data?.originalName || "—"}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">Criado em</p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {formatJobTimestamp(job.createdAt)}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-4">
                <p className="text-xs text-[var(--color-textDim)]">Finalizado em</p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {formatJobTimestamp(job.finishedAt || job.processedAt)}
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
            <p className="section-kicker">Payload</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/8 bg-black/20 p-4 text-xs text-[var(--color-textDim)]">
              {JSON.stringify(job.data ?? {}, null, 2)}
            </pre>
          </div>

          {job.logs?.length ? (
            <div className="surface-panel rounded-[30px] p-5">
              <p className="section-kicker">Logs</p>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                {job.logs.map((log, index) => (
                  <div
                    key={`${job.id}-log-${index}`}
                    className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-[var(--color-textDim)]"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
