"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  X,
  Pause,
  Play,
  Trash2,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { getDownloadSpeed } from "@/services/offline-download.service";
import { cn } from "@/lib/utils";
import type { DownloadJob } from "@/types/offline";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024)
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatETA(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function JobProgress({ job }: { job: DownloadJob }) {
  const percent =
    job.totalPages > 0
      ? Math.round((job.completedPages / job.totalPages) * 100)
      : 0;
  const isActive = job.status === "downloading";
  const isDone = job.status === "complete";
  const isPaused = job.status === "paused";
  const isError = job.status === "error";
  const isQueued = job.status === "queued";

  const { pauseJob, resumeJob, cancelJob } = useOfflineDownloads();

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        isActive && "border-primary/30 bg-primary/5",
        isDone && "border-emerald-500/20 bg-emerald-500/5",
        isError && "border-red-500/20 bg-red-500/5",
        isPaused && "border-yellow-500/20 bg-yellow-500/5",
        isQueued && "border-white/10 bg-white/5",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {job.seriesTitle}
          </p>
          <p className="truncate text-xs text-white/50">
            {job.chapterTitle || `Capítulo ${job.chapterNumber}`}
          </p>

          {/* Progress bar */}
          {(isActive || isPaused) && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/60">
                  {job.completedPages}/{job.totalPages} páginas
                </span>
                <span className="text-white/80 font-medium">{percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    isActive ? "bg-primary" : "bg-yellow-500",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {isActive && job.failedPages.length > 0 && (
                <p className="mt-1 text-[10px] text-red-400">
                  {job.failedPages.length} página
                  {job.failedPages.length > 1 ? "s" : ""} com erro
                </p>
              )}
            </div>
          )}

          {isDone && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completo · {job.totalPages} páginas
            </div>
          )}

          {isError && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {job.errorMessage || "Erro no download"}
            </div>
          )}

          {isQueued && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
              <Clock className="h-3.5 w-3.5" />
              Na fila · {job.totalPages} páginas
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isActive && (
            <button
              onClick={() => pauseJob(job.id)}
              className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Pausar"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => resumeJob(job.id)}
              className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Retomar"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {(isDone || isError) && (
            <button
              onClick={() => cancelJob(job.id)}
              className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-red-400"
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DownloadManager() {
  const [isOpen, setIsOpen] = useState(false);
  const { jobs, isDownloading, totalProgress, pauseAll, resumeAll, clearErrors } =
    useOfflineDownloads();
  const [speed, setSpeed] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const speedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isDownloading) {
      speedTimer.current = setInterval(() => {
        setSpeed(getDownloadSpeed());
      }, 1000);
    } else {
      setSpeed(0);
    }
    return () => {
      if (speedTimer.current) clearInterval(speedTimer.current);
    };
  }, [isDownloading]);

  const activeJobs = jobs.filter((j) => j.status === "downloading");
  const pendingJobs = jobs.filter((j) => j.status === "queued" || j.status === "paused");
  const doneJobs = jobs.filter((j) => j.status === "complete");
  const errorJobs = jobs.filter((j) => j.status === "error");
  const hasJobs = jobs.length > 0;

  // ETA: remaining pages / current speed
  const remainingPages =
    activeJobs.reduce((sum, j) => sum + (j.totalPages - j.completedPages), 0);
  const estimatedBytesPerPage = 200_000; // approximate
  const remainingBytes = remainingPages * estimatedBytesPerPage;
  const etaSeconds = speed > 0 ? remainingBytes / speed : 0;

  if (!hasJobs && !isOpen) return null;

  return (
    <>
      {/* Floating indicator button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              "fixed bottom-22 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg transition-colors",
              isDownloading
                ? "bg-primary text-white shadow-primary/30"
                : "bg-surface text-white/70 shadow-black/30",
            )}
            style={{
              paddingBottom: "max(0.625rem, env(safe-area-inset-bottom, 0px) + 0.25rem)",
            }}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-semibold">
                  {totalProgress.percent.toFixed(0)}%
                </span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {jobs.length > 0 && (
                  <span className="text-sm font-semibold">{jobs.length}</span>
                )}
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom sheet panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-surface shadow-2xl"
              style={{
                paddingBottom:
                  "max(1rem, env(safe-area-inset-bottom, 0px) + 0.5rem)",
              }}
            >
              {/* Handle + Header */}
              <div className="sticky top-0 z-10 bg-surface pt-2">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
                <div className="flex items-center justify-between px-4 pb-3">
                  <h2 className="text-lg font-bold text-white">Downloads</h2>
                  <div className="flex items-center gap-2">
                    {isDownloading ? (
                      <button
                        onClick={pauseAll}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-yellow-400 transition-colors hover:bg-white/5"
                      >
                        Pausar todos
                      </button>
                    ) : pendingJobs.length > 0 ? (
                      <button
                        onClick={resumeAll}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-white/5"
                      >
                        Retomar todos
                      </button>
                    ) : null}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10"
                      aria-label="Fechar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Aggregate progress */}
                {isDownloading && (
                  <div className="mx-4 mb-3 rounded-xl bg-white/5 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-white/60">
                        {totalProgress.pagesComplete} de{" "}
                        {totalProgress.pagesTotal} páginas
                      </span>
                      <span className="text-white/80 font-medium">
                        {totalProgress.percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${totalProgress.percent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                      <span>{speed > 0 ? formatSpeed(speed) : ""}</span>
                      <span>
                        {etaSeconds > 0 ? `~${formatETA(etaSeconds)} restante` : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Job list */}
              <div className="px-4 pb-4">
                {!hasJobs && (
                  <div className="py-12 text-center">
                    <Download className="mx-auto h-10 w-10 text-white/15" />
                    <p className="mt-3 text-sm text-white/40">
                      Nenhum download ativo
                    </p>
                  </div>
                )}

                {/* Active */}
                {activeJobs.map((job) => (
                  <div key={job.id} className="mb-2">
                    <JobProgress job={job} />
                  </div>
                ))}

                {/* Pending */}
                {pendingJobs.map((job) => (
                  <div key={job.id} className="mb-2">
                    <JobProgress job={job} />
                  </div>
                ))}

                {/* Done */}
                {doneJobs.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-white/50 hover:text-white/70">
                      Concluídos ({doneJobs.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {doneJobs.map((job) => (
                        <JobProgress key={job.id} job={job} />
                      ))}
                    </div>
                  </details>
                )}

                {/* Errors */}
                {errorJobs.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-red-400/70 hover:text-red-400">
                      Erros ({errorJobs.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {errorJobs.map((job) => (
                        <JobProgress key={job.id} job={job} />
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      {confirmClear ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConfirmClear(false)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={async () => {
                              await clearErrors();
                              setConfirmClear(false);
                            }}
                            className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30"
                          >
                            Confirmar limpeza
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmClear(true)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                        >
                          Limpar todos os erros
                        </button>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
