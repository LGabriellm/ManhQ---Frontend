"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  useGoogleDriveFolders,
  useGoogleDrivePreview,
  useGoogleDriveImport,
  useGoogleDriveStatus,
  useGoogleDriveAuthUrl,
  useGoogleDriveDisconnect,
} from "@/hooks/useAdmin";
import toast from "react-hot-toast";
import {
  Cloud,
  Loader2,
  FolderOpen,
  ChevronRight,
  RefreshCw,
  LogOut,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Home,
  History,
  RotateCcw,
} from "lucide-react";

interface GoogleDrivePanelProps {
  compact?: boolean;
}

interface GoogleDriveImportHistoryItem {
  id: string;
  timestamp: string;
  folderId: string;
  folderName: string;
  maxFiles: number;
  selected: number;
  accepted: number;
  rejected: number;
  jobs: string[];
}

const IMPORT_HISTORY_STORAGE_KEY = "manhq_google_drive_import_history";
const MAX_IMPORT_HISTORY_ITEMS = 8;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 600;

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  attempts = MAX_RETRY_ATTEMPTS,
  baseDelay = BASE_RETRY_DELAY_MS,
): Promise<T> {
  let currentError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      currentError = error;
      if (attempt === attempts) {
        break;
      }

      const waitMs = baseDelay * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw currentError;
}

export function GoogleDrivePanel({ compact = false }: GoogleDrivePanelProps) {
  const [sharedOnly, setSharedOnly] = useState(true);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [folderTrail, setFolderTrail] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedFolder, setSelectedFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [previewMaxFiles, setPreviewMaxFiles] = useState(100);
  const [importMaxFiles, setImportMaxFiles] = useState(50);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<{
    accepted: number;
    rejected: number;
    selected: number;
    jobs: string[];
  } | null>(null);
  const [importHistory, setImportHistory] = useState<
    GoogleDriveImportHistoryItem[]
  >([]);

  // ===== Queries =====
  const {
    data: statusData,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useGoogleDriveStatus();

  const {
    data: foldersData,
    isLoading: isFoldersLoading,
    error: foldersError,
    refetch: refetchFolders,
  } = useGoogleDriveFolders(
    { parentId, sharedOnly, pageSize: 100 },
    !!statusData?.connected,
  );

  const authUrlMutation = useGoogleDriveAuthUrl();
  const disconnectMutation = useGoogleDriveDisconnect();
  const previewMutation = useGoogleDrivePreview();
  const importMutation = useGoogleDriveImport();

  const isConnected = !!statusData?.connected;
  const account = statusData?.account;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as GoogleDriveImportHistoryItem[];
      if (!Array.isArray(parsed)) {
        return;
      }

      setImportHistory(parsed.slice(0, MAX_IMPORT_HISTORY_ITEMS));
    } catch {
      setImportHistory([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        IMPORT_HISTORY_STORAGE_KEY,
        JSON.stringify(importHistory.slice(0, MAX_IMPORT_HISTORY_ITEMS)),
      );
    } catch {
      // noop
    }
  }, [importHistory]);

  // ===== Handlers =====
  const connect = useCallback(async () => {
    try {
      const { url } = await authUrlMutation.mutateAsync();
      if (!url) {
        toast.error("Não foi possível iniciar autenticação");
        return;
      }

      let oauthUrl: URL;
      try {
        oauthUrl = new URL(url);
      } catch {
        toast.error("URL de autenticação inválida");
        return;
      }

      const clientId = oauthUrl.searchParams.get("client_id");
      if (
        !clientId?.trim() ||
        clientId.includes("undefined") ||
        clientId === "null"
      ) {
        toast.error("Configuração OAuth inválida no backend");
        return;
      }

      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao conectar");
    }
  }, [authUrlMutation]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectMutation.mutateAsync();
      setParentId(undefined);
      setFolderTrail([]);
      setSelectedFolder(null);
      setImportResult(null);
      await refetchStatus();
      toast.success("Conta Google desconectada");
    } catch (error) {
      toast.error("Erro ao desconectar");
    }
  }, [disconnectMutation, refetchStatus]);

  const openFolder = useCallback((id: string, name: string) => {
    setFolderTrail((prev) => [...prev, { id, name }]);
    setParentId(id);
  }, []);

  const goBack = useCallback(() => {
    setFolderTrail((prev) => {
      const next = prev.slice(0, -1);
      const last = next[next.length - 1];
      setParentId(last?.id);
      return next;
    });
  }, []);

  const goHome = useCallback(() => {
    setParentId(undefined);
    setFolderTrail([]);
    setSelectedFolder(null);
  }, []);

  const selectFolder = useCallback(
    (folder: typeof selectedFolder) => {
      setSelectedFolder(folder);
      setImportResult(null);
      setShowPreview(false);
      previewMutation.reset();
    },
    [previewMutation],
  );

  const validateSelectedFolder = useCallback(() => {
    if (!selectedFolder) {
      toast.error("Selecione uma pasta");
      return false;
    }

    if (!selectedFolder.id?.trim()) {
      toast.error("Pasta inválida: id ausente");
      return false;
    }

    if (!selectedFolder.name?.trim()) {
      toast.error("Pasta inválida: nome ausente");
      return false;
    }

    return true;
  }, [selectedFolder]);

  const runPreview = useCallback(async () => {
    if (!validateSelectedFolder()) {
      return;
    }

    try {
      await retryWithBackoff(() =>
        previewMutation.mutateAsync({
          folderId: selectedFolder!.id,
          recursive: true,
          maxFiles: previewMaxFiles,
        }),
      );
      setShowPreview(true);
      toast.success("Preview gerado");
    } catch {
      toast.error("Erro ao gerar preview após múltiplas tentativas");
    }
  }, [validateSelectedFolder, previewMaxFiles, previewMutation]);

  const runImport = useCallback(
    async (maxFiles: number) => {
      if (!validateSelectedFolder()) {
        return;
      }

      if (!showPreview || !previewMutation.data) {
        toast.error("Gere o preview da pasta antes de importar");
        return;
      }

      const supportedCount = previewMutation.data.supportedCount;
      if (supportedCount <= 0) {
        toast.error("A pasta não possui arquivos suportados para importação");
        return;
      }

      const effectiveMaxFiles = Math.max(1, Math.min(maxFiles, supportedCount));
      if (effectiveMaxFiles !== maxFiles) {
        toast("Ajustamos o limite para a quantidade suportada no preview", {
          icon: "ℹ️",
        });
      }

      if (previewMutation.data.unsupportedCount > 0) {
        toast("Alguns arquivos serão ignorados por formato não suportado", {
          icon: "⚠️",
        });
      }

      try {
        const idempotencyKey =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;

        const result = await retryWithBackoff(() =>
          importMutation.mutateAsync({
            data: {
              folderId: selectedFolder!.id,
              recursive: true,
              maxFiles: effectiveMaxFiles,
              dryRun: false,
            },
            idempotencyKey,
          }),
        );

        const nextResult = {
          selected: result.totals.selected,
          accepted: result.totals.accepted,
          rejected: result.totals.rejected,
          jobs: result.accepted.map((item) => item.jobId),
        };

        setImportResult(nextResult);

        const historyItem: GoogleDriveImportHistoryItem = {
          id: idempotencyKey,
          timestamp: new Date().toISOString(),
          folderId: selectedFolder!.id,
          folderName: selectedFolder!.name,
          maxFiles: effectiveMaxFiles,
          selected: nextResult.selected,
          accepted: nextResult.accepted,
          rejected: nextResult.rejected,
          jobs: nextResult.jobs,
        };

        setImportHistory((prev) =>
          [historyItem, ...prev].slice(0, MAX_IMPORT_HISTORY_ITEMS),
        );

        toast.success(
          `${result.totals.accepted} aceitos, ${result.totals.rejected} rejeitados`,
        );
      } catch {
        toast.error("Erro ao importar após múltiplas tentativas");
        return;
      }
    },
    [
      validateSelectedFolder,
      showPreview,
      previewMutation.data,
      previewMutation.data?.supportedCount,
      previewMutation.data?.unsupportedCount,
      importMutation,
      selectedFolder,
    ],
  );

  const toggleSharedOnly = useCallback(() => {
    setSharedOnly((v) => !v);
    setParentId(undefined);
    setFolderTrail([]);
    setSelectedFolder(null);
    setShowPreview(false);
    previewMutation.reset();
  }, [previewMutation]);

  const clearImportHistory = useCallback(() => {
    setImportHistory([]);
    toast.success("Histórico de importações limpo");
  }, []);

  // ===== Computed =====
  const currentPath = useMemo(() => {
    if (folderTrail.length === 0) return "Meu Drive";
    return folderTrail[folderTrail.length - 1]?.name || "Pasta";
  }, [folderTrail]);

  return (
    <div className={`space-y-4 ${compact ? "text-sm" : ""}`}>
      {/* Header */}
      <div className="rounded-lg border border-white/8 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Cloud className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white flex items-center gap-2">
                Google Drive
              </h2>
              <p className="text-xs text-gray-300 truncate">
                {isConnected && account
                  ? `${account.name || account.email || "Conectado"}`
                  : "Conecte sua conta Google"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isConnected
                  ? "bg-green-500/20 text-green-300"
                  : "bg-gray-500/20 text-gray-300"
              }`}
            >
              {isConnected ? "✓ Conectado" : "○ Desconectado"}
            </span>
          </div>
        </div>
      </div>

      {/* Account Info */}
      {isConnected && account?.picture && (
        <div className="rounded-lg border border-white/8 bg-white/5 p-3 flex items-center gap-3">
          <img
            src={account.picture}
            alt="Account"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {account.name}
            </p>
            <p className="text-xs text-gray-400 truncate">{account.email}</p>
          </div>
        </div>
      )}

      {/* Errors */}
      {statusError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            Não foi possível verificar status. Tente novamente.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!isConnected ? (
          <button
            onClick={() => void connect()}
            disabled={authUrlMutation.isPending}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {authUrlMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Conectar Google Drive
          </button>
        ) : (
          <>
            <button
              onClick={() => void disconnect()}
              disabled={disconnectMutation.isPending}
              className="px-4 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {disconnectMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <LogOut className="h-4 w-4" />
              Desconectar
            </button>

            <button
              onClick={() => void refetchStatus()}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>

            <button
              onClick={toggleSharedOnly}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors"
            >
              {sharedOnly ? "📌 Compartilhados" : "📂 Todos"}
            </button>
          </>
        )}
      </div>

      {/* Folder Navigation */}
      {isConnected && (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 text-sm">
            <button
              onClick={goHome}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </button>

            {folderTrail.map((folder, idx) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <button
                  onClick={() => {
                    const targetIdx = idx;
                    const nextTrail = folderTrail.slice(0, targetIdx + 1);
                    setFolderTrail(nextTrail);
                    setParentId(nextTrail[nextTrail.length - 1]?.id);
                  }}
                  className="px-2 py-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors truncate text-xs"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}

            <span className="ml-auto text-[11px] text-gray-500 pr-1">
              Atual: {currentPath}
            </span>
          </div>

          {/* Folder List - Enhanced */}
          <div className="rounded-lg border border-white/8 overflow-hidden">
            {foldersError && (
              <div className="px-4 py-4 bg-red-500/10 border-b border-red-500/20 text-sm text-red-300 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Falha ao listar pastas</p>
                  <p className="text-xs text-red-400 mt-1">Verifique a conectividade e tente novamente</p>
                </div>
              </div>
            )}

            {isFoldersLoading && (
              <div className="px-4 py-12 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <p className="text-sm">Carregando pastas...</p>
              </div>
            )}

            {!isFoldersLoading && !foldersError && (
              <>
                {foldersData?.folders && foldersData.folders.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 p-3 max-h-96 overflow-y-auto">
                    {foldersData.folders.map((folder) => {
                      const isSelected = selectedFolder?.id === folder.id;
                      return (
                        <div
                          key={folder.id}
                          className={`group rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "border-blue-500/50 bg-blue-500/15 shadow-lg shadow-blue-500/10"
                              : "border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/15"
                          }`}
                        >
                          <div className="flex items-center gap-3 p-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                              isSelected ? "bg-blue-500/30" : "bg-white/5 group-hover:bg-white/10"
                            }`}>
                              <FolderOpen
                                className={`h-4 w-4 ${
                                  isSelected ? "text-blue-300" : "text-gray-400"
                                }`}
                              />
                            </div>
                            <div
                              className="flex-1 min-w-0"
                              onClick={() =>
                                selectFolder({
                                  id: folder.id,
                                  name: folder.name,
                                })
                              }
                            >
                              <p className={`text-sm font-medium truncate ${
                                isSelected ? "text-blue-200" : "text-white"
                              }`}>
                                {folder.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {folder.id}
                              </p>
                            </div>
                            <button
                              onClick={() => openFolder(folder.id, folder.name)}
                              className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                                isSelected
                                  ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                                  : "text-gray-500 hover:bg-white/10 hover:text-gray-300"
                              }`}
                              title="Abrir subpastas"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-12 text-center text-gray-500 flex flex-col items-center gap-2">
                    <FolderOpen className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Nenhuma pasta encontrada</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Folder Actions */}
          {selectedFolder && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-blue-300 font-semibold">📁 Pasta selecionada</p>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedFolder.name}</p>
                    <p className="text-xs text-blue-300/70 truncate font-mono">{selectedFolder.id}</p>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-2 pt-1 border-t border-blue-500/20">
                <p className="text-xs font-medium text-blue-300 uppercase">
                  ✓ Etapa 1: Visualizar
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">
                      Máximo de arquivos
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={500}
                      value={previewMaxFiles}
                      onChange={(e) =>
                        setPreviewMaxFiles(Number(e.target.value || 100))
                      }
                      className="w-full mt-1 px-2 py-1.5 rounded bg-white/10 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <button
                    onClick={() => void runPreview()}
                    disabled={previewMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 font-medium text-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {previewMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-3.5 w-3.5" />
                        Visualizar
                      </>
                    )}
                  </button>
                </div>

                {showPreview && previewMutation.data && (
                  <div className="mt-2 p-3 rounded-lg bg-blue-600/10 border border-blue-500/20 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-green-300 font-medium">
                        {previewMutation.data.supportedCount} arquivo(s) suportado(s)
                      </span>
                    </div>
                    {previewMutation.data.unsupportedCount > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-300">
                          {previewMutation.data.unsupportedCount} formato(s) não suportado(s)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Import Section */}
              <div className="space-y-2 pt-1 border-t border-blue-500/20">
                <p className="text-xs font-medium text-blue-300 uppercase">
                  ⚡ Etapa 2: Importar
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">
                      Máximo para importação
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={importMaxFiles}
                      onChange={(e) =>
                        setImportMaxFiles(Number(e.target.value || 50))
                      }
                      className="w-full mt-1 px-2 py-1.5 rounded bg-white/10 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        void runImport(Math.max(1, importMaxFiles))
                      }
                      disabled={importMutation.isPending}
                      className="px-3 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                    >
                      {importMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Importar {importMaxFiles}
                    </button>
                    <button
                      onClick={() => void runImport(100)}
                      disabled={importMutation.isPending}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                    >
                      {importMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Importar 100
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30 text-xs space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-200 mb-1">
                        ✨ Importação enviada com sucesso!
                      </p>
                      <p className="text-green-300/90">
                        <span className="font-medium">{importResult.accepted}</span> arquivo(s) aceito(s)
                        {importResult.rejected > 0 && (
                          <span className="ml-2">· <span className="font-medium text-yellow-400">{importResult.rejected}</span> rejeitado(s)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {importResult.jobs && importResult.jobs.length > 0 && (
                    <div className="pt-2 border-t border-green-500/20">
                      <p className="text-green-300/75 text-[10px] uppercase tracking-wide">📋 Jobs em processamento</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {importResult.jobs.slice(0, 5).map((jobId) => (
                          <span
                            key={jobId}
                            className="px-2 py-1 rounded bg-green-500/20 text-green-300 font-mono text-[9px] truncate max-w-xs border border-green-500/30"
                            title={jobId}
                          >
                            {jobId.substring(0, 12)}...
                          </span>
                        ))}
                        {importResult.jobs.length > 5 && (
                          <span className="px-2 py-1 text-green-400 text-[9px]">+{importResult.jobs.length - 5} mais</span>
                        )}
                      </div>
                      <p className="text-green-400/70 text-[9px] mt-2">💡 Os jobs aparecerão na fila automaticamente</p>
                    </div>
                  )}
                </div>
              )}

              {importHistory.length > 0 && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      Histórico recente
                    </p>
                    <button
                      onClick={clearImportHistory}
                      className="text-[11px] text-gray-400 hover:text-white inline-flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Limpar
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {importHistory.map((item) => (
                      <div
                        key={item.id}
                        className="text-[11px] text-gray-300 rounded-lg border border-white/8 bg-white/3 px-2.5 py-2 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium truncate text-white">{item.folderName}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${
                            item.accepted > 0 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {item.accepted} ok
                          </span>
                        </div>
                        <p className="text-gray-500 text-[10px]">
                          {new Date(item.timestamp).toLocaleString("pt-BR")} · 
                          <span className="ml-1">{item.accepted} aceitos / {item.rejected} rejeitados</span>
                        </p>
                        {item.jobs.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-white/5 flex flex-wrap gap-1">
                            {item.jobs.slice(0, 3).map((jobId) => (
                              <span
                                key={jobId}
                                className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono truncate"
                                title={jobId}
                              >
                                {jobId.substring(0, 8)}
                              </span>
                            ))}
                            {item.jobs.length > 3 && (
                              <span className="px-1 py-0.5 text-gray-500 text-[9px]">+{item.jobs.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Not Connected Message */}
      {!isConnected && !isStatusLoading && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300">
          👉 Conecte o Google Drive para listar e importar pastas diretamente.
        </div>
      )}
    </div>
  );
}
