"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  X,
  Pause,
  Play,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowDown,
  Circle,
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

type Tab = "active" | "pending" | "errors" | "done";

function JobCard({ job }: { job: DownloadJob }) {
  const percent =
    job.totalPages > 0
      ? Math.round((job.completedPages / job.totalPages) * 100)
      : 0;
  const isActive = job.status === "downloading";
  const isDone = job.status === "complete";
  const isPaused = job.status === "paused";
  const isError = job.status === "error";
  const isQueued = job.status === "queued";

  const { pauseJob, resumeJob, cancelJob, retryJob, clearLog } = useOfflineDownloads();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "rounded-2xl border p-3.5 transition-colors",
        isActive && "border-primary/30 bg-primary/[0.06]",
        isDone && "border-emerald-500/20 bg-emerald-500/[0.04]",
        isError && "border-red-500/20 bg-red-500/[0.04]",
        isPaused && "border-amber-500/20 bg-amber-500/[0.04]",
        isQueued && "border-white/[0.06] bg-white/[0.02]",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="shrink-0 mt-0.5">
          {isActive && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          {isQueued && <Clock className="h-5 w-5 text-white/25" />}
          {isPaused && <Circle className="h-5 w-5 text-amber-400/60" />}
          {isDone && (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          )}
          {isError && <AlertCircle className="h-5 w-5 text-red-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {job.seriesTitle}
          </p>
          <p className="truncate text-xs text-white/45">
            {job.chapterTitle || `Capítulo ${job.chapterNumber}`}
          </p>

          {/* Progress bar */}
          {(isActive || isPaused) && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-white/50 tabular-nums">
                  {job.completedPages}/{job.totalPages} pgs
                </span>
                <span className="text-white/70 font-medium tabular-nums">
                  {percent}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    isActive ? "bg-primary" : "bg-amber-500/60",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {isActive && job.failedPages.length > 0 && (
                <p className="mt-1.5 text-[11px] text-red-400/80">
                  {job.failedPages.length} página
                  {job.failedPages.length > 1 ? "s" : ""} com erro
                </p>
              )}
            </div>
          )}

          {isDone && (
            <p className="mt-1.5 text-xs text-emerald-400/70">
              {job.totalPages} páginas
            </p>
          )}

          {isError && (
            <p className="mt-1.5 text-xs text-red-400/80 leading-relaxed">
              {job.errorMessage || "Erro no download"}
            </p>
          )}

          {isQueued && (
            <p className="mt-1.5 text-xs text-white/30">
              Aguardando · {job.totalPages} páginas
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {isActive && (
            <button
              onClick={() => pauseJob(job.id)}
              className="rounded-xl p-2 text-white/50 transition-all hover:bg-white/[0.08] hover:text-amber-400"
              aria-label="Pausar"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => resumeJob(job.id)}
              className="rounded-xl p-2 text-white/50 transition-all hover:bg-white/[0.08] hover:text-emerald-400"
              aria-label="Retomar"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {isError && (
            <button
              onClick={() => retryJob(job.id)}
              className="rounded-xl p-2 text-white/50 transition-all hover:bg-white/[0.08] hover:text-primary"
              aria-label="Tentar novamente"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {(isDone || isError || isQueued) && (
            <button
              onClick={() => (isDone || isError) ? clearLog(job.id) : cancelJob(job.id)}
              className="rounded-xl p-2 text-white/30 transition-all hover:bg-white/[0.08] hover:text-red-400"
              aria-label={isQueued ? "Remover" : "Limpar Log"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function DownloadManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("active");
  const {
    jobs,
    isDownloading,
    totalProgress,
    pauseAll,
    resumeAll,
    retryAllErrors,
    clearErrors,
    clearCompletedLogs,
    clearLog,
    cancelJob,
  } = useOfflineDownloads();
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

  // Reset confirm state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmClear(false);
      setTab("active");
    }
  }, [isOpen]);

  const activeJobs = jobs.filter((j) => j.status === "downloading");
  const pendingJobs = jobs.filter(
    (j) => j.status === "queued" || j.status === "paused",
  );
  const doneJobs = jobs.filter((j) => j.status === "complete");
  const errorJobs = jobs.filter((j) => j.status === "error");
  const hasJobs = jobs.length > 0;

  // ETA calculation
  const remainingPages = activeJobs.reduce(
    (sum, j) => sum + (j.totalPages - j.completedPages),
    0,
  );
  const estimatedBytesPerPage = 200_000;
  const remainingBytes = remainingPages * estimatedBytesPerPage;
  const etaSeconds = speed > 0 ? remainingBytes / speed : 0;

  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    { key: "active", label: "Ativos", count: activeJobs.length, color: "bg-primary" },
    { key: "pending", label: "Pendentes", count: pendingJobs.length, color: "bg-amber-500/60" },
    { key: "errors", label: "Erros", count: errorJobs.length, color: "bg-red-500" },
    { key: "done", label: "Concluídos", count: doneJobs.length, color: "bg-emerald-500" },
  ];

  // Auto-select first non-empty tab
  useEffect(() => {
    if (!isOpen) return;
    if (activeJobs.length > 0) setTab("active");
    else if (pendingJobs.length > 0) setTab("pending");
    else if (errorJobs.length > 0) setTab("errors");
    else if (doneJobs.length > 0) setTab("done");
  }, [isOpen, activeJobs.length, pendingJobs.length, errorJobs.length, doneJobs.length]);

  const activeTabJobs = (() => {
    switch (tab) {
      case "active": return activeJobs;
      case "pending": return pendingJobs;
      case "errors": return errorJobs;
      case "done": return doneJobs;
    }
  })();

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
              "fixed bottom-22 right-4 z-40 flex items-center gap-2 rounded-2xl pl-3.5 pr-4 py-2.5 shadow-xl transition-all",
              "backdrop-blur-md",
              isDownloading
                ? "bg-primary/90 text-white shadow-primary/25"
                : errorJobs.length > 0
                  ? "bg-red-500/90 text-white shadow-red-500/25"
                  : "bg-surface/90 text-white/70 shadow-black/30 border border-white/[0.06]",
            )}
            style={{
              paddingBottom:
                "max(0.625rem, env(safe-area-inset-bottom, 0px) + 0.25rem)",
            }}
          >
            {isDownloading ? (
              <>
                <div className="relative">
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {totalProgress.percent.toFixed(0)}%
                </span>
                {speed > 0 && (
                  <span className="text-[11px] text-white/50 font-medium">
                    {formatSpeed(speed)}
                  </span>
                )}
              </>
            ) : (
              <>
                {errorJobs.length > 0 ? (
                  <AlertCircle className="h-4.5 w-4.5" />
                ) : (
                  <Download className="h-4.5 w-4.5" />
                )}
                {jobs.length > 0 && (
                  <span className="text-sm font-bold">{jobs.length}</span>
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
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.9 }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[72vh] flex-col rounded-t-3xl bg-[#141414] shadow-2xl border-t border-white/[0.06]"
              style={{
                paddingBottom:
                  "max(1rem, env(safe-area-inset-bottom, 0px) + 0.5rem)",
              }}
            >
              {/* Handle + Header */}
              <div className="shrink-0 pt-2 pb-1">
                <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/15" />
                <div className="flex items-center justify-between px-5 pb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Downloads</h2>
                    {isDownloading && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Ativo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isDownloading ? (
                      <button
                        onClick={pauseAll}
                        className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/10"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        Pausar
                      </button>
                    ) : pendingJobs.length > 0 ? (
                      <button
                        onClick={resumeAll}
                        className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/10"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Retomar
                      </button>
                    ) : null}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="rounded-xl p-1.5 text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/60"
                      aria-label="Fechar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Aggregate progress bar */}
              {isDownloading && (
                <div className="shrink-0 mx-5 mb-1 rounded-2xl bg-white/[0.03] border border-white/[0.04] p-3.5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-white/50">
                      {totalProgress.pagesComplete} de{" "}
                      {totalProgress.pagesTotal} páginas
                    </span>
                    <span className="text-white/80 font-bold tabular-nums">
                      {totalProgress.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80"
                      animate={{ width: `${totalProgress.percent}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/35">
                    <span>{speed > 0 ? formatSpeed(speed) : "—"}</span>
                    <span>
                      {etaSeconds > 0
                        ? `~${formatETA(etaSeconds)} restante`
                        : speed > 0
                          ? "calculando..."
                          : "—"}
                    </span>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="shrink-0 mx-5 mt-2 flex gap-1 rounded-2xl bg-white/[0.03] p-1 border border-white/[0.04]">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTab(t.key);
                      setConfirmClear(false);
                    }}
                    className={cn(
                      "relative flex-1 rounded-xl py-2 text-xs font-medium transition-all",
                      tab === t.key
                        ? "text-white"
                        : "text-white/35 hover:text-white/60",
                    )}
                  >
                    {tab === t.key && (
                      <motion.div
                        layoutId="dm-tab"
                        className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/[0.06]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      {t.label}
                      {t.count > 0 && (
                        <span
                          className={cn(
                            "inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                            tab === t.key
                              ? `${t.color} text-white`
                              : "bg-white/[0.06] text-white/40",
                          )}
                        >
                          {t.count}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Bulk error actions */}
              {tab === "errors" && errorJobs.length > 0 && (
                <div className="shrink-0 mx-5 mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => retryAllErrors()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 border border-primary/15 py-2 text-xs font-medium text-primary transition-all hover:bg-primary/20"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retentar todos ({errorJobs.length})
                  </button>
                  {confirmClear ? (
                    <>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.06] py-2 text-xs font-medium text-white/40 transition-all hover:text-white/60"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          await clearErrors();
                          setConfirmClear(false);
                          if (activeJobs.length === 0 && pendingJobs.length === 0 && doneJobs.length === 0) {
                            setIsOpen(false);
                          }
                        }}
                        className="flex-1 rounded-xl bg-red-500/15 border border-red-500/20 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
                      >
                        Confirmar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] py-2 px-3 text-xs font-medium text-red-400/50 transition-all hover:bg-red-500/5 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpar
                    </button>
                  )}
                </div>
              )}

              {/* Done tab action */}
              {tab === "done" && doneJobs.length > 0 && (
                <div className="shrink-0 mx-5 mt-2.5">
                  <button
                    onClick={async () => {
                      await clearCompletedLogs();
                      if (activeJobs.length === 0 && pendingJobs.length === 0 && errorJobs.length === 0) {
                        setIsOpen(false);
                      }
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] py-2 text-xs font-medium text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Limpar concluídos
                  </button>
                </div>
              )}

              {/* Job list */}
              <div className="flex-1 overflow-y-auto px-5 pt-2.5 pb-3">
                {activeTabJobs.length === 0 ? (
                  <div className="flex flex-col items-center py-14">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                      {tab === "active" && (
                        <ArrowDown className="h-6 w-6 text-white/10" />
                      )}
                      {tab === "pending" && (
                        <Clock className="h-6 w-6 text-white/10" />
                      )}
                      {tab === "errors" && (
                        <CheckCircle2 className="h-6 w-6 text-white/10" />
                      )}
                      {tab === "done" && (
                        <Download className="h-6 w-6 text-white/10" />
                      )}
                    </div>
                    <p className="mt-4 text-sm font-medium text-white/25">
                      {tab === "active" && "Nenhum download ativo"}
                      {tab === "pending" && "Nenhum download pendente"}
                      {tab === "errors" && "Nenhum erro"}
                      {tab === "done" && "Nenhum download concluído"}
                    </p>
                    <p className="mt-1 text-xs text-white/15">
                      {tab === "active" &&
                        "Os downloads ativos aparecerão aqui"}
                      {tab === "pending" &&
                        "Downloads na fila aparecerão aqui"}
                      {tab === "errors" &&
                        "Downloads com erro aparecerão aqui"}
                      {tab === "done" &&
                        "Baixe capítulos para acessar offline"}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-2">
                      {activeTabJobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
