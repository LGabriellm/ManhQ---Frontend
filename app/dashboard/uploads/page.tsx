"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  useUpload,
  useUploadBulk,
  useUploadFolder,
  useAdminJobs,
  useClearCompletedJobs,
  useScanLibrary,
  useRetryJob,
  useRetryAllJobs,
  useDeleteJob,
  usePauseJobs,
  useResumeJobs,
  useJobLogs,
} from "@/hooks/useAdmin";
import type { AdminJob } from "@/types/api";
import toast from "react-hot-toast";
import {
  Upload,
  FolderSync,
  FolderOpen,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Cog,
  Files,
  RefreshCw,
  RotateCcw,
  FileText,
  X,
  Copy,
  AlertTriangle,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  File,
  FolderUp,
  Search,
} from "lucide-react";

// ===== Helpers =====
function formatTimestamp(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR");
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remaining = secs % 60;
  return `${mins}m ${remaining}s`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getJobDisplayName(job: AdminJob): string {
  return job.name?.replace(/^upload-/, "") || job.id;
}

const ACCEPTED_EXTENSIONS = [".cbz", ".cbr", ".zip", ".pdf", ".epub"];

function isAcceptedFile(name: string): boolean {
  return ACCEPTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

// ===== Job Status Badge =====
function JobStatusBadge({ state }: { state: AdminJob["state"] }) {
  const config: Record<
    string,
    { color: string; icon: React.ElementType; label: string }
  > = {
    waiting: { color: "#a3a3a3", icon: Clock, label: "Aguardando" },
    delayed: { color: "#f59e0b", icon: Clock, label: "Adiado" },
    active: { color: "#6366f1", icon: Cog, label: "Processando" },
    completed: { color: "#22c55e", icon: CheckCircle2, label: "Concluído" },
    failed: { color: "#ef4444", icon: XCircle, label: "Falhou" },
  };

  const c = config[state] || config.waiting;
  const Icon = c.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${c.color}15`, color: c.color }}
    >
      <Icon
        className={`h-3.5 w-3.5 ${state === "active" ? "animate-spin" : ""}`}
      />
      {c.label}
    </span>
  );
}

// ===== Progress Bar =====
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

// ===== Job Logs Modal =====
function JobLogsModal({
  jobId,
  jobName,
  onClose,
}: {
  jobId: string;
  jobName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useJobLogs(jobId);

  const copyLogs = () => {
    if (data?.logs) {
      navigator.clipboard.writeText(data.logs.join("\n"));
      toast.success("Logs copiados");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--color-textMain)] truncate">
              Logs
            </h2>
            <p className="text-xs text-[var(--color-textDim)] truncate mt-0.5">
              {jobName}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3">
            {data?.logs && data.logs.length > 0 && (
              <button
                onClick={copyLogs}
                className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
                title="Copiar logs"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : data?.logs && data.logs.length > 0 ? (
            <div className="space-y-1 font-mono text-xs">
              {data.logs.map((log, i) => (
                <p
                  key={i}
                  className="text-[var(--color-textDim)] leading-relaxed"
                >
                  <span className="text-[var(--color-textDim)]/50 select-none mr-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {log}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--color-textDim)] py-8 text-sm">
              Nenhum log disponível
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Upload Mode Tabs =====
type UploadMode = "files" | "folder";

// ===== Pending File Item =====
interface PendingFile {
  file: File;
  folder?: string;
}

// ===== Upload Zone (Redesigned) =====
function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<UploadMode>("files");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [folderName, setFolderName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUpload();
  const uploadBulkMutation = useUploadBulk();
  const uploadFolderMutation = useUploadFolder();

  // Process dropped/selected files
  const addFiles = useCallback(
    (files: File[], detectedFolder?: string) => {
      const valid = files.filter((f) => isAcceptedFile(f.name));
      if (valid.length === 0) {
        toast.error(
          "Nenhum arquivo compatível encontrado (.cbz, .cbr, .zip, .pdf, .epub)",
        );
        return;
      }

      const newItems: PendingFile[] = valid.map((f) => ({
        file: f,
        folder: detectedFolder,
      }));

      setPendingFiles((prev) => [...prev, ...newItems]);

      // Auto-detect folder name if uploading a folder
      if (detectedFolder && !folderName) {
        setFolderName(detectedFolder);
        setMode("folder");
      }
    },
    [folderName],
  );

  // Handle drag & drop — supports folders via webkitGetAsEntry
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const items = e.dataTransfer.items;
      if (!items) {
        // Fallback for simple file drops
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
        return;
      }

      const allFiles: File[] = [];
      let detectedFolder: string | undefined;

      // Process entries recursively to support folders
      const processEntry = async (
        entry: FileSystemEntry,
        path = "",
      ): Promise<void> => {
        if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry;
          const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
          });
          if (isAcceptedFile(file.name)) {
            allFiles.push(file);
          }
        } else if (entry.isDirectory) {
          const dirEntry = entry as FileSystemDirectoryEntry;
          if (!path) {
            detectedFolder = entry.name;
          }
          const reader = dirEntry.createReader();
          const entries = await new Promise<FileSystemEntry[]>(
            (resolve, reject) => {
              reader.readEntries(resolve, reject);
            },
          );
          for (const child of entries) {
            await processEntry(child, `${path}${entry.name}/`);
          }
        }
      };

      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }

      if (entries.length > 0) {
        for (const entry of entries) {
          await processEntry(entry);
        }
        addFiles(allFiles, detectedFolder);
      } else {
        // Fallback
        addFiles(Array.from(e.dataTransfer.files));
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle folder input
  const handleFolderSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      // Extract folder name from webkitRelativePath
      const firstPath = fileArray[0]?.webkitRelativePath || "";
      const detectedFolder = firstPath.split("/")[0] || "";

      addFiles(fileArray, detectedFolder || undefined);
      e.target.value = "";
    },
    [addFiles],
  );

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setPendingFiles([]);
    setFolderName("");
  };

  // Upload handler
  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploading(true);

    try {
      const files = pendingFiles.map((p) => p.file);

      if (mode === "folder" && folderName.trim()) {
        // Upload as folder — use POST /upload/folder
        const result = await uploadFolderMutation.mutateAsync({
          folderName: folderName.trim(),
          files,
        });
        const n = result.accepted?.length || 0;
        const r = result.rejected?.length || 0;
        toast.success(
          `${n} arquivo(s) da pasta "${result.seriesTitle}" enviado(s)${r > 0 ? ` · ${r} rejeitado(s)` : ""}`,
        );
        if (result.rejected?.length > 0) {
          result.rejected.forEach((rej) => {
            toast.error(`${rej.filename}: ${rej.reason}`, { duration: 5000 });
          });
        }
      } else if (files.length === 1) {
        // Single file — use POST /upload
        const result = await uploadMutation.mutateAsync(files[0]);
        toast.success(
          result.message || `Upload de "${files[0].name}" iniciado`,
        );
      } else {
        // Multiple files — use POST /upload/bulk
        const result = await uploadBulkMutation.mutateAsync(files);
        const n = result.accepted?.length || 0;
        const r = result.rejected?.length || 0;
        toast.success(
          `${n} upload(s) iniciado(s)${r > 0 ? ` · ${r} rejeitado(s)` : ""}`,
        );
        if (result.rejected?.length > 0) {
          result.rejected.forEach((rej) => {
            toast.error(`${rej.filename}: ${rej.reason}`, { duration: 5000 });
          });
        }
      }

      clearAll();
    } catch {
      toast.error("Erro ao enviar arquivo(s)");
    } finally {
      setIsUploading(false);
    }
  };

  const isPending =
    isUploading ||
    uploadMutation.isPending ||
    uploadBulkMutation.isPending ||
    uploadFolderMutation.isPending;

  const totalSize = pendingFiles.reduce((sum, p) => sum + p.file.size, 0);

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
      {/* Mode Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setMode("files")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
            mode === "files"
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5"
              : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          <File className="h-4 w-4" />
          Arquivos
        </button>
        <button
          onClick={() => setMode("folder")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
            mode === "folder"
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5"
              : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Pasta (Série)
        </button>
      </div>

      {/* Folder Name Input (only in folder mode) */}
      {mode === "folder" && (
        <div className="px-5 pt-4">
          <label className="block text-xs text-[var(--color-textDim)] mb-1.5">
            Nome da pasta / série
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Ex: Asa Noturna"
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
          <p className="text-[10px] text-[var(--color-textDim)] mt-1">
            Todos os arquivos serão associados a esta série. O sistema normaliza
            o título automaticamente.
          </p>
        </div>
      )}

      {/* Drop Zone */}
      <div className="p-5">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (mode === "folder") {
              folderInputRef.current?.click();
            } else {
              fileInputRef.current?.click();
            }
          }}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]"
              : "border-white/10 hover:border-white/20 bg-[var(--color-background)]"
          } ${isPending ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".cbz,.cbr,.zip,.pdf,.epub"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                addFiles(Array.from(e.target.files));
                e.target.value = "";
              }
            }}
            className="hidden"
          />
          {/* Folder input with webkitdirectory */}
          <input
            ref={(el) => {
              (
                folderInputRef as React.MutableRefObject<HTMLInputElement | null>
              ).current = el;
              if (el) {
                el.setAttribute("webkitdirectory", "");
                el.setAttribute("directory", "");
              }
            }}
            type="file"
            multiple
            onChange={handleFolderSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              {mode === "folder" ? (
                <FolderUp className="h-7 w-7 text-[var(--color-primary)]" />
              ) : (
                <Upload className="h-7 w-7 text-[var(--color-primary)]" />
              )}
            </div>
            <div>
              <p className="text-[var(--color-textMain)] font-medium">
                {mode === "folder"
                  ? "Arraste uma pasta aqui ou clique para selecionar"
                  : "Arraste arquivos aqui ou clique para selecionar"}
              </p>
              <p className="text-xs text-[var(--color-textDim)] mt-1">
                Formatos aceitos: .cbz, .cbr, .zip, .pdf, .epub
                {mode === "folder" &&
                  " · Arraste pastas diretamente do explorer"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <div className="border-t border-white/5">
          <div className="flex items-center justify-between px-5 py-3 bg-[var(--color-background)]">
            <div className="flex items-center gap-2">
              <Files className="h-4 w-4 text-[var(--color-textDim)]" />
              <span className="text-sm font-medium text-[var(--color-textMain)]">
                {pendingFiles.length} arquivo(s)
              </span>
              <span className="text-xs text-[var(--color-textDim)]">
                · {formatFileSize(totalSize)}
              </span>
            </div>
            <button
              onClick={clearAll}
              className="text-xs text-[var(--color-textDim)] hover:text-red-400 transition-colors"
            >
              Limpar tudo
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
            {pendingFiles.map((pf, i) => (
              <div
                key={`${pf.file.name}-${i}`}
                className="flex items-center gap-3 px-5 py-2 hover:bg-white/[0.02]"
              >
                <FileText className="h-4 w-4 text-[var(--color-textDim)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-textMain)] truncate">
                    {pf.file.name}
                  </p>
                  <p className="text-[10px] text-[var(--color-textDim)]">
                    {formatFileSize(pf.file.size)}
                    {pf.folder && (
                      <span className="ml-2 text-[var(--color-primary)]">
                        📁 {pf.folder}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 rounded hover:bg-white/5 text-[var(--color-textDim)] hover:text-red-400 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="px-5 py-4 border-t border-white/5">
            <button
              onClick={handleUpload}
              disabled={isPending || (mode === "folder" && !folderName.trim())}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Enviar {pendingFiles.length} arquivo(s)
                  {mode === "folder" && folderName && (
                    <span className="opacity-70">
                      → &quot;{folderName}&quot;
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Job Row =====
function JobRow({
  job,
  onViewLogs,
  onRetry,
  onDelete,
  isRetrying,
}: {
  job: AdminJob;
  onViewLogs: (job: AdminJob) => void;
  onRetry: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  isRetrying: boolean;
}) {
  const progress = job.progress ?? 0;
  const isActive = job.state === "active" || job.state === "waiting";
  const isCompleted = job.state === "completed";
  const isFailed = job.state === "failed";

  return (
    <div className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-textMain)] truncate">
            {getJobDisplayName(job)}
          </p>
          <p className="text-xs text-[var(--color-textDim)] mt-0.5">
            {formatTimestamp(job.createdAt)}
            {job.duration ? ` · ${formatDuration(job.duration)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onViewLogs(job)}
            title="Ver logs"
            className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
          {isFailed && (
            <button
              onClick={() => onRetry(job.id)}
              disabled={isRetrying}
              title="Tentar novamente"
              className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-yellow-500 transition-colors disabled:opacity-50"
            >
              {isRetrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {(isCompleted || isFailed) && (
            <button
              onClick={() => onDelete(job.id)}
              title="Remover job"
              className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <JobStatusBadge state={job.state} />
        </div>
      </div>

      {isActive && progress > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--color-textDim)]">
              Processando
            </span>
            <span className="text-xs text-[var(--color-textDim)]">
              {Math.round(progress)}%
            </span>
          </div>
          <ProgressBar progress={progress} />
        </div>
      )}

      {isCompleted && job.result && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-textDim)]">
          {job.result.seriesTitle && (
            <span>Série: {job.result.seriesTitle}</span>
          )}
          {job.result.chapter != null && (
            <span>Capítulo: {job.result.chapter}</span>
          )}
          {job.result.duplicate && (
            <span className="text-yellow-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Duplicado
            </span>
          )}
          {job.result.stats && (
            <>
              {job.result.stats.originalSize != null &&
                job.result.stats.optimizedSize != null && (
                  <span>
                    {formatFileSize(job.result.stats.originalSize)} →{" "}
                    {formatFileSize(job.result.stats.optimizedSize)}
                    {job.result.stats.compressionRatio != null && (
                      <span className="text-green-500 ml-1">
                        -{Math.round(job.result.stats.compressionRatio)}%
                      </span>
                    )}
                  </span>
                )}
              {job.result.stats.filesProcessed != null && (
                <span>{job.result.stats.filesProcessed} páginas</span>
              )}
            </>
          )}
        </div>
      )}

      {isFailed && job.error && (
        <div className="mt-2 text-xs text-red-400 bg-red-500/5 rounded-lg px-3 py-2">
          <p>{job.error}</p>
          {job.attempts != null && job.maxAttempts != null && (
            <p className="text-[var(--color-textDim)] mt-1">
              Tentativas: {job.attempts}/{job.maxAttempts}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Jobs Filter Tabs =====
type JobFilter = "all" | "active" | "completed" | "failed";

// ===== Main Page =====
export default function UploadsPage() {
  const { data, isLoading, refetch, isRefetching } = useAdminJobs();
  const clearMutation = useClearCompletedJobs();
  const scanMutation = useScanLibrary();
  const retryMutation = useRetryJob();
  const retryAllMutation = useRetryAllJobs();
  const deleteMutation = useDeleteJob();
  const pauseMutation = usePauseJobs();
  const resumeMutation = useResumeJobs();
  const [logsJob, setLogsJob] = useState<AdminJob | null>(null);
  const [jobFilter, setJobFilter] = useState<JobFilter>("all");
  const [jobSearch, setJobSearch] = useState("");
  const [showControls, setShowControls] = useState(false);

  const stats = data?.stats;
  const allJobs = data?.jobs || [];

  // Filter jobs
  const filteredJobs = allJobs.filter((j) => {
    if (jobFilter === "active" && j.state !== "active" && j.state !== "waiting")
      return false;
    if (jobFilter === "completed" && j.state !== "completed") return false;
    if (jobFilter === "failed" && j.state !== "failed") return false;
    if (
      jobSearch &&
      !getJobDisplayName(j).toLowerCase().includes(jobSearch.toLowerCase())
    )
      return false;
    return true;
  });

  const handleClearCompleted = async () => {
    try {
      await clearMutation.mutateAsync();
      toast.success("Jobs concluídos removidos");
    } catch {
      toast.error("Erro ao limpar jobs");
    }
  };

  const handleScan = async (incremental: boolean) => {
    try {
      await scanMutation.mutateAsync(incremental);
      toast.success(
        incremental
          ? "Scan incremental iniciado"
          : "Scan completo da biblioteca iniciado",
      );
    } catch {
      toast.error("Erro ao iniciar scan");
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await retryMutation.mutateAsync(jobId);
      toast.success("Job reenfileirado");
    } catch {
      toast.error("Erro ao reprocessar job");
    }
  };

  const handleRetryAll = async () => {
    try {
      await retryAllMutation.mutateAsync();
      toast.success("Todos os jobs falhados reenfileirados");
    } catch {
      toast.error("Erro ao reprocessar jobs");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteMutation.mutateAsync(jobId);
      toast.success("Job removido");
    } catch {
      toast.error("Erro ao remover job");
    }
  };

  const handlePause = async () => {
    try {
      await pauseMutation.mutateAsync();
      toast.success("Fila pausada");
    } catch {
      toast.error("Erro ao pausar fila");
    }
  };

  const handleResume = async () => {
    try {
      await resumeMutation.mutateAsync();
      toast.success("Fila retomada");
    } catch {
      toast.error("Erro ao retomar fila");
    }
  };

  const failedCount = stats?.failed ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
          Uploads & Jobs
        </h1>
        <p className="text-[var(--color-textDim)] text-sm mt-1">
          Envie arquivos, pastas ou monitore o processamento
        </p>
      </div>

      {/* Upload Zone */}
      <UploadZone />

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-2">
        {/* Scan Buttons */}
        <button
          onClick={() => handleScan(false)}
          disabled={scanMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-surface)] border border-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium transition-colors disabled:opacity-50"
        >
          {scanMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderSync className="h-4 w-4" />
          )}
          Scan Completo
        </button>
        <button
          onClick={() => handleScan(true)}
          disabled={scanMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-surface)] border border-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium transition-colors disabled:opacity-50"
        >
          {scanMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Scan Incremental
        </button>

        {/* Queue Controls Toggle */}
        <button
          onClick={() => setShowControls((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-surface)] border border-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium transition-colors"
        >
          <Cog className="h-4 w-4" />
          Controles
          {showControls ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-surface)] border border-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium transition-colors ml-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
      </div>

      {/* Queue Control Panel (collapsible) */}
      {showControls && (
        <div className="flex flex-wrap gap-2 p-4 bg-[var(--color-surface)] rounded-xl border border-white/5">
          <button
            onClick={handlePause}
            disabled={pauseMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Pause className="h-3.5 w-3.5" />
            Pausar Fila
          </button>
          <button
            onClick={handleResume}
            disabled={resumeMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Retomar Fila
          </button>
          <button
            onClick={handleClearCompleted}
            disabled={clearMutation.isPending || (stats?.completed ?? 0) === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar Concluídos
          </button>
          {failedCount > 0 && (
            <button
              onClick={handleRetryAll}
              disabled={retryAllMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reprocessar Falhados ({failedCount})
            </button>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Cog className="h-5 w-5 text-indigo-500" />
          <div>
            <p className="text-lg font-bold text-[var(--color-textMain)]">
              {stats?.active ?? 0}
            </p>
            <p className="text-xs text-[var(--color-textDim)]">Ativos</p>
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Clock className="h-5 w-5 text-[var(--color-textDim)]" />
          <div>
            <p className="text-lg font-bold text-[var(--color-textMain)]">
              {stats?.waiting ?? 0}
            </p>
            <p className="text-xs text-[var(--color-textDim)]">Na fila</p>
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-lg font-bold text-[var(--color-textMain)]">
              {stats?.delayed ?? 0}
            </p>
            <p className="text-xs text-[var(--color-textDim)]">Adiados</p>
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-lg font-bold text-[var(--color-textMain)]">
              {stats?.completed ?? 0}
            </p>
            <p className="text-xs text-[var(--color-textDim)]">Concluídos</p>
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-lg font-bold text-[var(--color-textMain)]">
              {stats?.failed ?? 0}
            </p>
            <p className="text-xs text-[var(--color-textDim)]">Falharam</p>
          </div>
        </div>
      </div>

      {/* Jobs Section */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
        {/* Jobs Header with filters */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-textMain)]">
              Jobs de Processamento
            </h2>
            {stats && (
              <span className="text-xs text-[var(--color-textDim)]">
                {filteredJobs.length}
                {jobFilter !== "all" ? ` de ${allJobs.length}` : ""} jobs
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter tabs */}
            {(
              [
                { key: "all", label: "Todos" },
                { key: "active", label: "Ativos" },
                { key: "completed", label: "Concluídos" },
                { key: "failed", label: "Falhados" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setJobFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  jobFilter === f.key
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                }`}
              >
                {f.label}
              </button>
            ))}

            {/* Search */}
            <div className="relative flex-1 min-w-36 ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-textDim)]" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Buscar job..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-[var(--color-textDim)]">
            <Files className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">
              {allJobs.length === 0
                ? "Nenhum job encontrado"
                : "Nenhum job corresponde ao filtro"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredJobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onViewLogs={setLogsJob}
                onRetry={handleRetry}
                onDelete={handleDeleteJob}
                isRetrying={retryMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Logs Modal */}
      {logsJob && (
        <JobLogsModal
          jobId={logsJob.id}
          jobName={getJobDisplayName(logsJob)}
          onClose={() => setLogsJob(null)}
        />
      )}
    </div>
  );
}
