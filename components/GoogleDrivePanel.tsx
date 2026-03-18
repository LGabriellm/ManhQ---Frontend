"use client";

import React, { useState, useCallback, useMemo } from "react";
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
  Search,
} from "lucide-react";

interface GoogleDrivePanelProps {
  compact?: boolean;
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
    !!statusData?.connected
  );

  const authUrlMutation = useGoogleDriveAuthUrl();
  const disconnectMutation = useGoogleDriveDisconnect();
  const previewMutation = useGoogleDrivePreview();
  const importMutation = useGoogleDriveImport();

  const isConnected = !!statusData?.connected;
  const account = statusData?.account;

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
      if (!clientId?.trim() || clientId.includes("undefined") || clientId === "null") {
        toast.error("Configuração OAuth inválida no backend");
        return;
      }

      window.location.href = url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao conectar"
      );
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

  const openFolder = useCallback(
    (id: string, name: string) => {
      setFolderTrail((prev) => [...prev, { id, name }]);
      setParentId(id);
    },
    []
  );

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
    },
    []
  );

  const runPreview = useCallback(async () => {
    if (!selectedFolder) {
      toast.error("Selecione uma pasta");
      return;
    }

    try {
      await previewMutation.mutateAsync({
        folderId: selectedFolder.id,
        recursive: true,
        maxFiles: previewMaxFiles,
      });
      setShowPreview(true);
      toast.success("Preview gerado");
    } catch (error) {
      toast.error("Erro ao gerar preview");
    }
  }, [selectedFolder, previewMaxFiles, previewMutation]);

  const runImport = useCallback(
    async (maxFiles: number) => {
      if (!selectedFolder) {
        toast.error("Selecione uma pasta");
        return;
      }

      try {
        const idempotencyKey =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;

        const result = await importMutation.mutateAsync({
          data: {
            folderId: selectedFolder.id,
            recursive: true,
            maxFiles,
            dryRun: false,
          },
          idempotencyKey,
        });

        setImportResult({
          selected: result.totals.selected,
          accepted: result.totals.accepted,
          rejected: result.totals.rejected,
          jobs: result.accepted.map((item) => item.jobId),
        });

        toast.success(
          `${result.totals.accepted} aceitos, ${result.totals.rejected} rejeitados`
        );
      } catch (error) {
        toast.error("Erro ao importar");
      }
    },
    [selectedFolder, importMutation]
  );

  const toggleSharedOnly = useCallback(() => {
    setSharedOnly((v) => !v);
    setParentId(undefined);
    setFolderTrail([]);
    setSelectedFolder(null);
  }, []);

  // ===== Computed =====
  const currentPath = useMemo(() => {
    if (folderTrail.length === 0) return "Meu Drive";
    return folderTrail[folderTrail.length - 1]?.name || "Pasta";
  }, [folderTrail]);

  return (
    <div className="space-y-4">
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
          </div>

          {/* Folder List */}
          <div className="rounded-lg border border-white/8 bg-white/3 overflow-hidden">
            {foldersError && (
              <div className="px-4 py-3 text-sm text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Falha ao listar pastas
              </div>
            )}

            {isFoldersLoading && (
              <div className="px-4 py-8 flex items-center justify-center text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!isFoldersLoading && !foldersError && (
              <>
                {foldersData?.folders && foldersData.folders.length > 0 ? (
                  <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                    {foldersData.folders.map((folder) => {
                      const isSelected = selectedFolder?.id === folder.id;
                      return (
                        <div
                          key={folder.id}
                          className={`px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer ${
                            isSelected ? "bg-blue-500/15" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FolderOpen
                              className={`h-4 w-4 flex-shrink-0 ${
                                isSelected
                                  ? "text-blue-400"
                                  : "text-gray-500"
                              }`}
                            />
                            <div
                              className="flex-1 min-w-0"
                              onClick={() =>
                                selectFolder({
                                  id: folder.id,
                                  name: folder.name,
                                })
                              }
                            >
                              <p className="text-sm font-medium text-white truncate">
                                {folder.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {folder.id}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                openFolder(folder.id, folder.name)
                              }
                              className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 flex-shrink-0"
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
                  <div className="px-4 py-8 text-center text-gray-500">
                    Nenhuma pasta encontrada
                  </div>
                )}
              </>
            )}
          </div>

          {/* Folder Actions */}
          {selectedFolder && (
            <div className="rounded-lg border border-white/8 bg-white/3 p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-white mb-2">
                  📁 Pasta: {selectedFolder.name}
                </p>
              </div>

              {/* Preview Section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase">
                  Preview
                </p>
                <div className="flex items-end gap-2">
                  <div>
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
                      className="w-24 mt-1 px-2 py-1.5 rounded bg-white/10 border border-white/10 text-sm text-white"
                    />
                  </div>
                  <button
                    onClick={() => void runPreview()}
                    disabled={previewMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium text-white disabled:opacity-50 transition-colors"
                  >
                    {previewMutation.isPending ? "..." : "Gerar"}
                  </button>
                </div>

                {showPreview && previewMutation.data && (
                  <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/8 text-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-green-300 font-medium">
                        {previewMutation.data.supportedCount} suportados
                      </span>
                    </div>
                    {previewMutation.data.unsupportedCount > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-300">
                          {previewMutation.data.unsupportedCount} ignorados
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Import Section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase">
                  Importar
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void runImport(50)}
                    disabled={importMutation.isPending}
                    className="px-3 py-2 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <BookOpen className="h-4 w-4" />
                    50
                  </button>
                  <button
                    onClick={() => void runImport(100)}
                    disabled={importMutation.isPending}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                  >
                    {importMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    100
                  </button>
                </div>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="font-medium text-green-300">
                      Importação enviada
                    </span>
                  </div>
                  <p className="text-green-200">
                    {importResult.accepted} aceitos · {importResult.rejected}{" "}
                    rejeitados
                  </p>
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
