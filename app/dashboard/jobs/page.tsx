"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  AlertTriangle,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SquareX,
} from "lucide-react";
import { FeedbackState } from "@/components/FeedbackState";
import {
  useAdminJobs,
  useDeleteJob,
  useJobsStats,
  useRetryJob,
} from "@/hooks/useAdmin";
import { useJobProgressStream } from "@/hooks/useJobProgress";
import {
  OPERATIONAL_STATE_META,
  TONE_STYLES,
  formatDateTime,
  formatDurationMs,
  formatPercent,
} from "@/types/upload";
import type { AdminJob } from "@/types/api";

type JobConsoleFilter = "all" | "uploads" | "upload-intake" | "scans";

function getJobDisplayState(job: AdminJob): {
  label: string;
  tone: keyof typeof TONE_STYLES;
  description: string;
} {
  const dashboardState = job.dashboardState;
  if (dashboardState && dashboardState in OPERATIONAL_STATE_META) {
    return OPERATIONAL_STATE_META[
      dashboardState as keyof typeof OPERATIONAL_STATE_META
    ];
  }

  if (job.lifecycle?.state === "failed" || job.state === "failed") {
    return {
      label: "Falhou",
      tone: "danger",
      description: "O job falhou no BullMQ.",
    };
  }

  if (job.lifecycle?.state === "completed" || job.state === "completed") {
    return {
      label: "Concluído",
      tone: "success",
      description: "O job concluiu no BullMQ.",
    };
  }

  if (job.lifecycle?.state === "running" || job.state === "active") {
    return {
      label: "Executando",
      tone: "info",
      description: "O worker está processando este job.",
    };
  }

  if (job.lifecycle?.state === "retrying") {
    return {
      label: "Reprocessando",
      tone: "warning",
      description: "O job está em uma nova tentativa.",
    };
  }

  if (job.lifecycle?.state === "stalled") {
    return {
      label: "Travado",
      tone: "danger",
      description: "O BullMQ marcou este job como stalled.",
    };
  }

  return {
    label: job.lifecycle?.state || job.state || "Desconhecido",
    tone: "neutral",
    description: "Estado técnico do job na fila.",
  };
}

export default function DashboardJobsPage() {
  const [search, setSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState<JobConsoleFilter>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const jobsQuery = useAdminJobs();
  const statsQuery = useJobsStats();
  const retryJobMutation = useRetryJob();
  const deleteJobMutation = useDeleteJob();

  const { connected, lastEvent } = useJobProgressStream({
    onEvent: (event) => {
      if (
        event.type === "completed" ||
        event.type === "failed" ||
        event.type === "stalled"
      ) {
        void jobsQuery.refetch();
        void statsQuery.refetch();
      }
    },
  });

  const filteredJobs = useMemo(() => {
    const jobs = jobsQuery.data?.jobs ?? [];
    return jobs.filter((job) => {
      if (queueFilter !== "all" && job.queue !== queueFilter) {
        return false;
      }

      if (!deferredSearch) {
        return true;
      }

      const haystack = [
        job.id,
        job.name,
        job.queue,
        job.data?.originalName,
        job.data?.safeName,
        job.dashboardState,
        job.upload?.originalName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearch);
    });
  }, [deferredSearch, jobsQuery.data?.jobs, queueFilter]);

  const handleRetry = async (jobId: string) => {
    try {
      await retryJobMutation.mutateAsync(jobId);
      toast.success("Job reenfileirado.");
      await jobsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao reenfileirar o job.";
      toast.error(message);
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      const result = await deleteJobMutation.mutateAsync(jobId);
      toast.success(result.message);
      await Promise.all([jobsQuery.refetch(), statsQuery.refetch()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao cancelar o job.";
      toast.error(message);
    }
  };

  if (jobsQuery.isLoading && !jobsQuery.data) {
    return (
      <main className="page-shell">
        <FeedbackState
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title="Carregando jobs"
          description="Montando a visão operacional das filas e da pipeline de upload."
          tone="info"
          className="grid min-h-[52vh] place-content-center"
        />
      </main>
    );
  }

  const stats = statsQuery.data;
  const uploadPipeline = stats?.uploadPipeline;

  return (
    <main className="page-shell space-y-6">
      <header className="page-header">
        <div>
          <p className="section-kicker">Jobs</p>
          <h1 className="section-title">Central de Jobs</h1>
          <p className="section-description">
            Monitore BullMQ e a runtime real dos uploads no mesmo painel. Para
            uploads, a fonte principal é o estado persistido em
            <code> dashboardState</code> e <code>upload.operational</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${
              connected
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/[0.04] text-[var(--color-textDim)]"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Stream {connected ? "conectado" : "reconectando"}
          </div>
          <button
            type="button"
            onClick={() => {
              void Promise.all([jobsQuery.refetch(), statsQuery.refetch()]);
            }}
            className="ui-btn-secondary px-4 py-2.5 text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </header>

      {stats && (
        <>
          <section className="grid gap-4 xl:grid-cols-4">
            <div className="surface-panel rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                Uploads
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
                {stats.uploads.active} ativos
              </p>
              <p className="mt-2 text-xs text-[var(--color-textDim)]">
                {stats.uploads.waiting} na fila · {stats.uploads.failed} falhos
              </p>
            </div>
            <div className="surface-panel rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                Intake
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
                {stats.uploadIntake.active} ativos
              </p>
              <p className="mt-2 text-xs text-[var(--color-textDim)]">
                {stats.uploadIntake.waiting} na fila ·{" "}
                {stats.uploadIntake.failed} falhos
              </p>
            </div>
            <div className="surface-panel rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                Scans
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
                {stats.scans.active} ativos
              </p>
              <p className="mt-2 text-xs text-[var(--color-textDim)]">
                {stats.scans.waiting} aguardando · {stats.scans.failed} falhos
              </p>
            </div>
            <div className="surface-panel rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                Pipeline de upload
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--color-textMain)]">
                {uploadPipeline?.items.active ?? 0} em voo
              </p>
              <p className="mt-2 text-xs text-[var(--color-textDim)]">
                {uploadPipeline?.items.cancelRequested ?? 0} cancelando ·{" "}
                {uploadPipeline?.items.stuck ?? 0} travados
              </p>
            </div>
          </section>

          {((uploadPipeline?.items.stuck ?? 0) > 0 ||
            (uploadPipeline?.items.cancelRequested ?? 0) > 0) && (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="state-panel state-panel-danger">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas da pipeline
                </p>
                <p className="mt-2 text-xs">
                  Travados {uploadPipeline?.items.stuck ?? 0} · cancelando{" "}
                  {uploadPipeline?.items.cancelRequested ?? 0}
                </p>
                <p className="mt-1 text-xs">
                  Janela de heartbeat{" "}
                  {formatDurationMs(
                    uploadPipeline?.thresholds.heartbeatTimeoutMs ?? 0,
                  )}{" "}
                  · snapshot{" "}
                  {formatDateTime(uploadPipeline?.generatedAt || null)}
                </p>
              </div>
              <div className="surface-panel rounded-[28px] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                  Último evento do stream
                </p>
                <p className="mt-3 text-sm font-medium text-[var(--color-textMain)]">
                  {lastEvent ? lastEvent.type : "Sem eventos ainda"}
                </p>
                <p className="mt-2 text-xs text-[var(--color-textDim)]">
                  O stream ajuda a detectar conclusão, falha e stalled sem
                  esperar o próximo polling.
                </p>
              </div>
            </section>
          )}
        </>
      )}

      <section className="surface-panel rounded-[30px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Fila consolidada</p>
            <p className="mt-2 text-sm text-[var(--color-textDim)]">
              {filteredJobs.length} job(s) visíveis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por job, fila ou arquivo"
                className="w-full rounded-full border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
              />
            </div>
            {(
              ["all", "uploads", "upload-intake", "scans"] as JobConsoleFilter[]
            ).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setQueueFilter(value)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  queueFilter === value
                    ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-white/10 bg-white/[0.04] text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                }`}
              >
                {value === "all" ? "Tudo" : value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {!filteredJobs.length ? (
            <FeedbackState
              icon={<Search className="h-5 w-5" />}
              title="Nenhum job encontrado"
              description="Ajuste os filtros ou aguarde a próxima atualização das filas."
              tone="info"
              className="rounded-[28px] border border-white/8 bg-white/[0.02] p-8"
            />
          ) : (
            filteredJobs.map((job) => {
              const displayState = getJobDisplayState(job);
              const canRetry =
                job.lifecycle?.canRetry || job.state === "failed";
              const canCancel =
                job.upload?.operational.canCancel ||
                (!job.upload && job.lifecycle?.canCancel);

              return (
                <article
                  key={job.id}
                  className="rounded-[28px] border border-white/8 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--color-textMain)]">
                          {job.data?.originalName ||
                            job.upload?.originalName ||
                            job.name}
                        </p>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[displayState.tone]}`}
                        >
                          {displayState.label}
                        </span>
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-[var(--color-textDim)]">
                          {job.queue || "queue"}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-textDim)]">
                        <span>Job {job.id}</span>
                        <span>BullMQ {job.lifecycle?.state || job.state}</span>
                        <span>
                          Progresso{" "}
                          {formatPercent(
                            typeof job.progress === "number"
                              ? job.progress
                              : null,
                          )}
                        </span>
                        <span>Criado em {formatDateTime(job.createdAt)}</span>
                      </div>

                      {job.upload && (
                        <p className="mt-2 text-xs text-[var(--color-textDim)]">
                          Sessão {job.upload.sessionId} · upload runtime{" "}
                          {job.upload.operational.stage || "sem etapa"} ·
                          heartbeat{" "}
                          {formatDurationMs(
                            job.upload.operational.heartbeatAgeMs,
                          )}
                        </p>
                      )}

                      {job.error && (
                        <p className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                          {job.error}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="ui-btn-ghost px-4 py-2 text-xs font-medium text-[var(--color-textMain)]"
                      >
                        Abrir
                      </Link>
                      {canRetry ? (
                        <button
                          type="button"
                          onClick={() => void handleRetry(job.id)}
                          disabled={retryJobMutation.isPending}
                          className="ui-btn-secondary px-4 py-2 text-xs font-medium disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      ) : null}
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={() => void handleCancel(job.id)}
                          disabled={deleteJobMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-200 disabled:opacity-50"
                        >
                          <SquareX className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
