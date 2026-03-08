"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  useMySubmissions,
  useUpload,
  useUploadBulk,
  useUploadFolder,
} from "@/hooks/useAdmin";
import type {
  EditorSubmission,
  EditorSubmissionsParams,
  ApprovalStatus,
} from "@/types/api";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  FolderOpen,
  Files,
  X,
  HardDrive,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import toast from "react-hot-toast";

// ===== Status config =====
const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; className: string; bgClass: string }
> = {
  PENDING: {
    label: "Pendente",
    icon: Clock,
    className: "text-yellow-400",
    bgClass: "bg-yellow-400/10 border-yellow-400/20",
  },
  APPROVED: {
    label: "Aprovado",
    icon: CheckCircle2,
    className: "text-green-400",
    bgClass: "bg-green-400/10 border-green-400/20",
  },
  REJECTED: {
    label: "Rejeitado",
    icon: XCircle,
    className: "text-red-400",
    bgClass: "bg-red-400/10 border-red-400/20",
  },
};

const statusTabs: { key: ApprovalStatus | ""; label: string }[] = [
  { key: "", label: "Todas" },
  { key: "PENDING", label: "Pendentes" },
  { key: "APPROVED", label: "Aprovadas" },
  { key: "REJECTED", label: "Rejeitadas" },
];

// ===== Upload Zone =====
function EditorUploadZone() {
  const [mode, setMode] = useState<"files" | "folder">("files");
  const [folderName, setFolderName] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUpload();
  const uploadBulkMutation = useUploadBulk();
  const uploadFolderMutation = useUploadFolder();

  const isUploading =
    uploadMutation.isPending ||
    uploadBulkMutation.isPending ||
    uploadFolderMutation.isPending;

  const ACCEPTED = ".cbz,.cbr,.pdf,.epub,.zip";

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        return ["cbz", "cbr", "pdf", "epub", "zip"].includes(ext);
      });
      if (arr.length === 0) {
        toast.error("Nenhum arquivo válido selecionado");
        return;
      }
      setPendingFiles((prev) => [...prev, ...arr]);

      if (mode === "folder" && !folderName && arr.length > 0) {
        const path = (arr[0] as File & { webkitRelativePath?: string })
          .webkitRelativePath;
        if (path) {
          const parts = path.split("/");
          if (parts.length > 1) setFolderName(parts[0]);
        }
      }
    },
    [mode, folderName],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const allFiles: File[] = [];
        let pending = 0;
        let folderDetected = "";

        const processEntry = (entry: FileSystemEntry) => {
          if (entry.isFile) {
            pending++;
            (entry as FileSystemFileEntry).file((file) => {
              allFiles.push(file);
              pending--;
              if (pending === 0) handleFiles(allFiles);
            });
          } else if (entry.isDirectory) {
            if (!folderDetected) folderDetected = entry.name;
            pending++;
            const reader = (entry as FileSystemDirectoryEntry).createReader();
            reader.readEntries((entries) => {
              entries.forEach((e) => processEntry(e));
              pending--;
              if (pending === 0) {
                if (folderDetected && !folderName) {
                  setFolderName(folderDetected);
                  setMode("folder");
                }
                handleFiles(allFiles);
              }
            });
          }
        };

        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.();
          if (entry) {
            processEntry(entry);
          } else {
            const file = items[i].getAsFile();
            if (file) allFiles.push(file);
          }
        }

        if (allFiles.length > 0 && pending === 0) {
          handleFiles(allFiles);
        }
      }
    },
    [handleFiles, folderName],
  );

  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    try {
      if (mode === "folder" && folderName.trim()) {
        await uploadFolderMutation.mutateAsync({
          folderName: folderName.trim(),
          files: pendingFiles,
        });
        toast.success(
          `${pendingFiles.length} arquivo(s) enviados para aprovação!`,
        );
      } else if (pendingFiles.length === 1) {
        await uploadMutation.mutateAsync(pendingFiles[0]);
        toast.success("Arquivo enviado para aprovação!");
      } else {
        await uploadBulkMutation.mutateAsync(pendingFiles);
        toast.success(
          `${pendingFiles.length} arquivo(s) enviados para aprovação!`,
        );
      }
      setPendingFiles([]);
      setFolderName("");
    } catch {
      toast.error("Erro ao enviar arquivo(s)");
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const folderInputCallbackRef = useCallback((el: HTMLInputElement | null) => {
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
      (
        folderInputRef as React.MutableRefObject<HTMLInputElement | null>
      ).current = el;
    }
  }, []);

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
          Enviar Conteúdo
        </h2>
        <div className="flex gap-1 bg-[var(--color-background)] rounded-lg p-1">
          <button
            onClick={() => setMode("files")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "files"
                ? "bg-blue-500/10 text-blue-400"
                : "text-[var(--color-textDim)] hover:bg-white/5"
            }`}
          >
            <Files className="h-3.5 w-3.5" />
            Arquivos
          </button>
          <button
            onClick={() => setMode("folder")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "folder"
                ? "bg-blue-500/10 text-blue-400"
                : "text-[var(--color-textDim)] hover:bg-white/5"
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Pasta
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() =>
          mode === "folder"
            ? folderInputRef.current?.click()
            : fileInputRef.current?.click()
        }
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-400/5"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-[var(--color-textDim)] opacity-50" />
        <p className="text-sm text-[var(--color-textMain)]">
          Arraste {mode === "folder" ? "uma pasta" : "arquivos"} aqui ou clique
          para selecionar
        </p>
        <p className="text-xs text-[var(--color-textDim)] mt-1">
          CBZ, CBR, PDF, EPUB, ZIP — Máx. 100MB cada
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <input
          ref={folderInputCallbackRef}
          type="file"
          multiple
          accept={ACCEPTED}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Folder name */}
      {mode === "folder" && (
        <div>
          <label className="block text-sm text-[var(--color-textDim)] mb-1">
            Nome da série (pasta)
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Ex: Asa Noturna"
            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-blue-400"
          />
        </div>
      )}

      {/* Pending Files */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-textDim)]">
              {pendingFiles.length} arquivo(s) selecionado(s)
            </span>
            <button
              onClick={() => setPendingFiles([])}
              className="text-xs text-red-400 hover:underline"
            >
              Limpar
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {pendingFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between px-3 py-2 bg-[var(--color-background)] rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-[var(--color-textDim)] flex-shrink-0" />
                  <span className="text-sm text-[var(--color-textMain)] truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-[var(--color-textDim)] flex-shrink-0">
                    {formatSize(file.size)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePendingFile(i);
                  }}
                  className="text-[var(--color-textDim)] hover:text-red-400 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={isUploading || (mode === "folder" && !folderName.trim())}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Enviar para Aprovação
          </button>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
        <AlertTriangle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--color-textDim)]">
          Seus uploads serão revisados por um administrador antes de serem
          publicados. Você receberá uma notificação quando o conteúdo for
          aprovado ou rejeitado.
        </p>
      </div>
    </div>
  );
}

// ===== Submission Card =====
function SubmissionCard({ submission }: { submission: EditorSubmission }) {
  const config = statusConfig[submission.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-[var(--color-surface)] rounded-xl border border-white/5 hover:bg-white/[0.02] transition-colors">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${config.bgClass}`}
      >
        <StatusIcon className={`h-5 w-5 ${config.className}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--color-textMain)] truncate">
              {submission.originalName}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-textDim)]">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {formatSize(submission.fileSize)}
              </span>
              <span>{formatDate(submission.createdAt)}</span>
            </div>
          </div>
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${config.className} ${config.bgClass}`}
          >
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </span>
        </div>

        {submission.status === "REJECTED" && submission.rejectionReason && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
            <p className="text-xs text-red-400">
              <strong>Motivo:</strong> {submission.rejectionReason}
            </p>
            {submission.reviewer && (
              <p className="text-xs text-[var(--color-textDim)] mt-0.5">
                Revisado por {submission.reviewer.name} em{" "}
                {submission.reviewedAt && formatDate(submission.reviewedAt)}
              </p>
            )}
          </div>
        )}

        {submission.status === "APPROVED" && submission.reviewer && (
          <div className="mt-2 text-xs text-green-400/70">
            Aprovado por {submission.reviewer.name}
            {submission.reviewedAt &&
              ` em ${formatDate(submission.reviewedAt)}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Main Page =====
export default function EditorDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo<EditorSubmissionsParams>(() => {
    const p: EditorSubmissionsParams = { page, limit: 20 };
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [statusFilter, page]);

  const { data, isLoading } = useMySubmissions(params);

  const filteredSubmissions = useMemo(() => {
    if (!data?.submissions || !search) return data?.submissions || [];
    const q = search.toLowerCase();
    return data.submissions.filter((s) =>
      s.originalName.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
          Painel do Editor
        </h1>
        <p className="text-sm text-[var(--color-textDim)] mt-1">
          Envie conteúdo e acompanhe suas submissões
        </p>
      </div>

      {/* Upload Zone */}
      <EditorUploadZone />

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {data.pendingCount}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Pendentes
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {data.pagination.total -
                data.pendingCount -
                (filteredSubmissions.filter((s) => s.status === "REJECTED")
                  .length || 0)}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Aprovadas
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {filteredSubmissions.filter((s) => s.status === "REJECTED")
                .length || 0}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Rejeitadas
            </div>
          </div>
        </div>
      )}

      {/* Submissions Header */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
          Minhas Submissões
        </h2>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--color-surface)] rounded-xl border border-white/5 p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key as ApprovalStatus | "");
                setPage(1);
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-[var(--color-textDim)] hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-textDim)]" />
          <input
            type="text"
            placeholder="Buscar por nome do arquivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : !filteredSubmissions.length ? (
        <div className="flex flex-col items-center justify-center h-48 text-[var(--color-textDim)]">
          <Inbox className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">Nenhuma submissão encontrada</p>
          <p className="text-xs mt-1">
            Envie seu primeiro arquivo usando a área acima
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-textDim)]">
            {data.pagination.total} submissão(ões) — Página {page} /{" "}
            {data.pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                setPage(Math.min(data.pagination.totalPages, page + 1))
              }
              disabled={page >= data.pagination.totalPages}
              className="p-2 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
