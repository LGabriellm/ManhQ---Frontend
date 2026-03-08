"use client";

import React, { useState, useRef, useCallback } from "react";
import { useUpload, useUploadBulk, useUploadFolder } from "@/hooks/useAdmin";
import {
  Upload,
  FileText,
  FolderOpen,
  Files,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function EditorUploadPage() {
  const [mode, setMode] = useState<"files" | "folder">("files");
  const [folderName, setFolderName] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResults, setUploadResults] = useState<
    { name: string; success: boolean; error?: string }[]
  >([]);
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
        toast.error("Nenhum arquivo válido (CBZ, CBR, PDF, EPUB, ZIP)");
        return;
      }
      setPendingFiles((prev) => [...prev, ...arr]);
      setUploadResults([]);

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
        const result = await uploadFolderMutation.mutateAsync({
          folderName: folderName.trim(),
          files: pendingFiles,
        });
        const results = [
          ...result.accepted.map((a) => ({
            name: a.filename,
            success: true,
          })),
          ...result.rejected.map((r) => ({
            name: r.filename,
            success: false,
            error: r.reason,
          })),
        ];
        setUploadResults(results);
        toast.success(`${result.accepted.length} arquivo(s) enviado(s)!`);
      } else if (pendingFiles.length === 1) {
        await uploadMutation.mutateAsync(pendingFiles[0]);
        setUploadResults([{ name: pendingFiles[0].name, success: true }]);
        toast.success("Arquivo enviado para aprovação!");
      } else {
        const result = await uploadBulkMutation.mutateAsync(pendingFiles);
        const results = [
          ...result.accepted.map((a) => ({
            name: a.filename,
            success: true,
          })),
          ...result.rejected.map((r) => ({
            name: r.filename,
            success: false,
            error: r.reason,
          })),
        ];
        setUploadResults(results);
        toast.success(`${result.accepted.length} arquivo(s) enviado(s)!`);
      }
      setPendingFiles([]);
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

  const totalSize = pendingFiles.reduce((acc, f) => acc + f.size, 0);

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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/editor"
          className="p-2 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
            Enviar Conteúdo
          </h1>
          <p className="text-sm text-[var(--color-textDim)] mt-1">
            Selecione arquivos ou uma pasta para enviar
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-1 flex gap-1">
        <button
          onClick={() => setMode("files")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            mode === "files"
              ? "bg-blue-500/10 text-blue-400"
              : "text-[var(--color-textDim)] hover:bg-white/5"
          }`}
        >
          <Files className="h-5 w-5" />
          Arquivos Individuais
        </button>
        <button
          onClick={() => setMode("folder")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            mode === "folder"
              ? "bg-blue-500/10 text-blue-400"
              : "text-[var(--color-textDim)] hover:bg-white/5"
          }`}
        >
          <FolderOpen className="h-5 w-5" />
          Pasta (Série Inteira)
        </button>
      </div>

      {/* Folder Name */}
      {mode === "folder" && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
          <label className="block text-sm text-[var(--color-textDim)] mb-2">
            Nome da Série (nome da pasta)
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Ex: Asa Noturna"
            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-4 py-2.5 text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-[var(--color-textDim)] mt-2">
            Este nome será usado como título da série. Se já existir uma série
            similar, os capítulos serão associados a ela.
          </p>
        </div>
      )}

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
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-400 bg-blue-400/5 scale-[1.01]"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.01]"
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          {mode === "folder" ? (
            <FolderOpen className="h-8 w-8 text-blue-400" />
          ) : (
            <Upload className="h-8 w-8 text-blue-400" />
          )}
        </div>
        <p className="text-lg font-medium text-[var(--color-textMain)]">
          {mode === "folder"
            ? "Arraste uma pasta aqui"
            : "Arraste arquivos aqui"}
        </p>
        <p className="text-sm text-[var(--color-textDim)] mt-2">
          ou clique para selecionar
        </p>
        <p className="text-xs text-[var(--color-textDim)] mt-4">
          Formatos aceitos: CBZ, CBR, PDF, EPUB, ZIP — Máx. 100MB por arquivo
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

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--color-textMain)]">
                {pendingFiles.length} arquivo(s)
              </span>
              <span className="text-xs text-[var(--color-textDim)] flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {formatSize(totalSize)}
              </span>
            </div>
            <button
              onClick={() => {
                setPendingFiles([]);
                setUploadResults([]);
              }}
              className="text-xs text-red-400 hover:underline"
            >
              Limpar tudo
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
            {pendingFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-[var(--color-textDim)] flex-shrink-0" />
                  <span className="text-sm text-[var(--color-textMain)] truncate">
                    {file.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-[var(--color-textDim)]">
                    {formatSize(file.size)}
                  </span>
                  <button
                    onClick={() => removePendingFile(i)}
                    className="text-[var(--color-textDim)] hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-white/5">
            <button
              onClick={handleUpload}
              disabled={
                isUploading || (mode === "folder" && !folderName.trim())
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              Enviar para Aprovação
            </button>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4 space-y-3">
          <h3 className="text-sm font-medium text-[var(--color-textMain)]">
            Resultado do Envio
          </h3>
          <div className="space-y-2">
            {uploadResults.map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  r.success
                    ? "bg-green-500/5 border border-green-500/10"
                    : "bg-red-500/5 border border-red-500/10"
                }`}
              >
                {r.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm text-[var(--color-textMain)] truncate">
                    {r.name}
                  </div>
                  {r.error && (
                    <div className="text-xs text-red-400">{r.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/editor"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg border border-white/10 text-sm text-[var(--color-textDim)] hover:bg-white/5 transition-colors"
          >
            Ver Minhas Submissões
          </Link>
        </div>
      )}

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
        <AlertTriangle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[var(--color-textDim)] space-y-1">
          <p>
            <strong className="text-[var(--color-textMain)]">
              Como funciona:
            </strong>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Seus uploads são enviados para uma fila de aprovação</li>
            <li>Um administrador irá revisar o conteúdo</li>
            <li>
              Você receberá uma notificação quando for aprovado ou rejeitado
            </li>
            <li>
              Conteúdo aprovado será processado automaticamente (otimização,
              registro, etc.)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
