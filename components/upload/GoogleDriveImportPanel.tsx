"use client";

import { useDeferredValue, useState } from "react";
import { FeedbackState } from "@/components/FeedbackState";
import { useSeriesSearch } from "@/hooks/useApi";
import { useGoogleDrivePopupAuth } from "@/hooks/useGoogleDrivePopupAuth";
import { useGoogleDriveReconnectRecovery } from "@/hooks/useGoogleDriveReconnectRecovery";
import {
  useGoogleDriveDisconnect,
  useGoogleDriveFolders,
  useGoogleDriveNodes,
  useGoogleDrivePreviewRequest,
  useGoogleDriveStatus,
  useImportFromGoogleDrive,
  useStageGoogleDrive,
} from "@/hooks/useUploadWorkflow";
import { getUploadErrorMessage } from "@/lib/uploadErrors";
import { formatDateTime } from "@/lib/upload-workflow";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cloud,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

type GoogleDriveActionMode = "review" | "existing" | "new";

interface GoogleDriveImportPanelProps {
  onOpenSession: (sessionId: string) => void;
}

interface DryRunSummary {
  supportedCount: number;
  unsupportedCount: number;
  files: Array<{ id: string; name: string }>;
}

const FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function getFolderIdValidationMessage(folderId: string): string | null {
  if (!folderId) {
    return null;
  }

  if (!FOLDER_ID_PATTERN.test(folderId)) {
    return "Use apenas o ID da pasta do Google Drive, sem URL completa.";
  }

  return null;
}

export function GoogleDriveImportPanel({
  onOpenSession,
}: GoogleDriveImportPanelProps) {
  const [mode, setMode] = useState<GoogleDriveActionMode>("review");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
  const [navigationStack, setNavigationStack] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [manualFolderId, setManualFolderId] = useState("");
  const [recursive, setRecursive] = useState(true);
  const [maxFiles, setMaxFiles] = useState(200);
  const [reviewSeriesTitle, setReviewSeriesTitle] = useState("");
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState("");
  const [seriesQuery, setSeriesQuery] = useState("");
  const deferredSeriesQuery = useDeferredValue(seriesQuery.trim());
  const [previewFolderId, setPreviewFolderId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [dryRunResult, setDryRunResult] = useState<DryRunSummary | null>(null);

  const normalizedManualFolderId = manualFolderId.trim();
  const folderIdValidationMessage = getFolderIdValidationMessage(
    normalizedManualFolderId,
  );
  const manualFolderIdIsValid =
    !normalizedManualFolderId || !folderIdValidationMessage;
  const effectiveFolderId = normalizedManualFolderId || currentFolderId || "";
  const effectiveFolderLabel = normalizedManualFolderId
    ? `Pasta manual (${normalizedManualFolderId})`
    : currentFolderName;

  const { launchGoogleDriveAuth, isConnecting } = useGoogleDrivePopupAuth();
  const { recoverGoogleDriveReconnect, isReconnectingGoogleDrive } =
    useGoogleDriveReconnectRecovery();

  const statusQuery = useGoogleDriveStatus();
  const disconnectMutation = useGoogleDriveDisconnect();
  const stageMutation = useStageGoogleDrive();
  const importMutation = useImportFromGoogleDrive();
  const previewMutation = useGoogleDrivePreviewRequest();
  const rootFoldersQuery = useGoogleDriveFolders({}, statusQuery.data?.connected);
  const nodesQuery = useGoogleDriveNodes(
    {
      parentId: effectiveFolderId,
    },
    Boolean(effectiveFolderId && statusQuery.data?.connected && manualFolderIdIsValid),
  );
  const searchResults = useSeriesSearch(deferredSeriesQuery, 1, 8);

  const previewData = previewMutation.data;
  const previewFiles = previewData?.supportedFiles || [];
  const currentFolderItems = nodesQuery.data?.files || [];
  const selectedFilesCount = selectedFileIds.length;
  const hasSelectionScope = Boolean(effectiveFolderId);

  const resetPreviewState = () => {
    setPreviewFolderId(null);
    setSelectedFileIds([]);
    setDryRunResult(null);
    previewMutation.reset();
  };

  const resetFolderNavigation = () => {
    setCurrentFolderId(null);
    setCurrentFolderName(null);
    setNavigationStack([]);
    setManualFolderId("");
    resetPreviewState();
  };

  const openFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setCurrentFolderName(folderName);
    setManualFolderId("");
    setNavigationStack((current) => [...current, { id: folderId, name: folderName }]);
    resetPreviewState();
  };

  const goBackOneFolder = () => {
    setNavigationStack((current) => {
      if (current.length <= 1) {
        setCurrentFolderId(null);
        setCurrentFolderName(null);
        return [];
      }

      const nextStack = current.slice(0, -1);
      const previous = nextStack.at(-1) || null;
      setCurrentFolderId(previous?.id || null);
      setCurrentFolderName(previous?.name || null);
      return nextStack;
    });
    resetPreviewState();
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds((current) =>
      current.includes(fileId)
        ? current.filter((entry) => entry !== fileId)
        : [...current, fileId],
    );
  };

  const connect = async () => {
    try {
      const message = await launchGoogleDriveAuth({
        intent: "google_drive_upload",
      });

      if (!message.success || !message.connected) {
        toast.error(message.error || "A conexão com Google Drive foi cancelada.");
        return;
      }

      await statusQuery.refetch();
      toast.success("Google Drive conectado.");
    } catch (error) {
      toast.error(
        getUploadErrorMessage(
          error,
          "Falha ao iniciar a conexão com Google Drive.",
        ),
      );
    }
  };

  const disconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      resetFolderNavigation();
      toast.success("Google Drive desconectado.");
    } catch (error) {
      toast.error(
        getUploadErrorMessage(error, "Falha ao desconectar o Google Drive."),
      );
    }
  };

  const buildDrivePayload = () => ({
    folderId: selectedFileIds.length === 0 ? effectiveFolderId || undefined : undefined,
    fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
    recursive,
    maxFiles,
    folderNameHint: currentFolderName || undefined,
  });

  const previewSelection = async (allowReconnect = true) => {
    if (!hasSelectionScope) {
      toast.error("Escolha uma pasta ou informe um ID antes de gerar o preview.");
      return;
    }

    if (!manualFolderIdIsValid) {
      toast.error(folderIdValidationMessage || "Informe um ID de pasta válido.");
      return;
    }

    try {
      const result = await previewMutation.mutateAsync({
        folderId: effectiveFolderId,
        recursive,
        maxFiles,
      });

      setPreviewFolderId(effectiveFolderId);
      setSelectedFileIds([]);
      setDryRunResult(null);

      if (result.supportedCount === 0) {
        toast.error("Nenhum arquivo compatível foi encontrado nessa seleção.");
        return;
      }

      toast.success("Preview atualizado.");
    } catch (error) {
      if (allowReconnect) {
        try {
          const recovered = await recoverGoogleDriveReconnect({
            error,
            intent: "google_drive_preview",
            onConnected: async () => {
              await statusQuery.refetch();
            },
            retry: async () => {
              await previewSelection(false);
            },
          });

          if (recovered) {
            return;
          }
        } catch (reconnectError) {
          toast.error(
            getUploadErrorMessage(
              reconnectError,
              "Não foi possível restabelecer a conexão com Google Drive.",
            ),
          );
          return;
        }
      }

      toast.error(
        getUploadErrorMessage(
          error,
          "Falha ao gerar o preview do Google Drive.",
        ),
      );
    }
  };

  const stageForReview = async (allowReconnect = true) => {
    if (!hasSelectionScope) {
      toast.error("Escolha uma pasta ou arquivos antes de criar a sessão.");
      return;
    }

    try {
      const result = await stageMutation.mutateAsync({
        data: {
          ...buildDrivePayload(),
          forcedSeriesTitle: reviewSeriesTitle.trim() || undefined,
        },
        idempotencyKey: createIdempotencyKey(),
      });
      toast.success(result.nextStep);
      onOpenSession(result.draftId);
    } catch (error) {
      if (allowReconnect) {
        try {
          const recovered = await recoverGoogleDriveReconnect({
            error,
            intent: "google_drive_stage_review",
            onConnected: async () => {
              await statusQuery.refetch();
            },
            retry: async () => {
              await stageForReview(false);
            },
          });

          if (recovered) {
            return;
          }
        } catch (reconnectError) {
          toast.error(
            getUploadErrorMessage(
              reconnectError,
              "Não foi possível restabelecer a conexão com Google Drive.",
            ),
          );
          return;
        }
      }

      toast.error(
        getUploadErrorMessage(
          error,
          "Falha ao criar a sessão de revisão do Google Drive.",
        ),
      );
    }
  };

  const runDryRun = async (allowReconnect = true) => {
    if (!hasSelectionScope) {
      toast.error("Escolha uma pasta ou gere um preview antes do dry run.");
      return;
    }

    if (mode === "existing" && !selectedSeriesId) {
      toast.error("Escolha a série de destino antes do dry run.");
      return;
    }

    if (mode === "new" && !newSeriesTitle.trim()) {
      toast.error("Defina o título da nova série antes do dry run.");
      return;
    }

    try {
      const result = await importMutation.mutateAsync({
        data: {
          ...buildDrivePayload(),
          dryRun: true,
          targetSeriesId: mode === "existing" ? selectedSeriesId : undefined,
          newSeriesTitle: mode === "new" ? newSeriesTitle.trim() : undefined,
        },
        idempotencyKey: createIdempotencyKey(),
      });

      if ("dryRun" in result) {
        setDryRunResult({
          supportedCount: result.supportedCount,
          unsupportedCount: result.unsupportedCount,
          files: result.files.map((file) => ({
            id: file.id,
            name: file.name,
          })),
        });
        toast.success("Dry run concluído.");
      }
    } catch (error) {
      if (allowReconnect) {
        try {
          const recovered = await recoverGoogleDriveReconnect({
            error,
            intent: "google_drive_dry_run",
            onConnected: async () => {
              await statusQuery.refetch();
            },
            retry: async () => {
              await runDryRun(false);
            },
          });

          if (recovered) {
            return;
          }
        } catch (reconnectError) {
          toast.error(
            getUploadErrorMessage(
              reconnectError,
              "Não foi possível restabelecer a conexão com Google Drive.",
            ),
          );
          return;
        }
      }

      toast.error(
        getUploadErrorMessage(
          error,
          "Falha ao validar a importação do Google Drive.",
        ),
      );
    }
  };

  const startDirectImport = async (allowReconnect = true) => {
    if (!hasSelectionScope) {
      toast.error("Escolha uma pasta ou gere um preview antes de importar.");
      return;
    }

    if (mode === "existing" && !selectedSeriesId) {
      toast.error("Escolha a série de destino para a importação direta.");
      return;
    }

    if (mode === "new" && !newSeriesTitle.trim()) {
      toast.error("Defina o título da nova série antes de importar.");
      return;
    }

    try {
      const result = await importMutation.mutateAsync({
        data: {
          ...buildDrivePayload(),
          targetSeriesId: mode === "existing" ? selectedSeriesId : undefined,
          newSeriesTitle: mode === "new" ? newSeriesTitle.trim() : undefined,
        },
        idempotencyKey: createIdempotencyKey(),
      });

      if (!("dryRun" in result)) {
        toast.success(result.message);
        onOpenSession(result.sessionId);
      }
    } catch (error) {
      if (allowReconnect) {
        try {
          const recovered = await recoverGoogleDriveReconnect({
            error,
            intent: "google_drive_import",
            onConnected: async () => {
              await statusQuery.refetch();
            },
            retry: async () => {
              await startDirectImport(false);
            },
          });

          if (recovered) {
            return;
          }
        } catch (reconnectError) {
          toast.error(
            getUploadErrorMessage(
              reconnectError,
              "Não foi possível restabelecer a conexão com Google Drive.",
            ),
          );
          return;
        }
      }

      toast.error(
        getUploadErrorMessage(
          error,
          "Falha ao iniciar a importação direta do Google Drive.",
        ),
      );
    }
  };

  const currentBrowseFolders = effectiveFolderId
    ? nodesQuery.data?.folders || []
    : rootFoldersQuery.data?.folders || [];
  const browseError = effectiveFolderId ? nodesQuery.error : rootFoldersQuery.error;
  const browseIsLoading = effectiveFolderId
    ? nodesQuery.isLoading
    : rootFoldersQuery.isLoading;
  const browseIsRefreshing = effectiveFolderId
    ? nodesQuery.isFetching
    : rootFoldersQuery.isFetching;
  const browsePathLabel = normalizedManualFolderId
    ? "Pasta informada manualmente"
    : navigationStack.length > 0
      ? navigationStack.map((folder) => folder.name).join(" / ")
      : "Minha unidade do Google Drive";
  const canNavigateBack = navigationStack.length > 0 && !normalizedManualFolderId;
  const canResetBrowser = Boolean(
    normalizedManualFolderId || currentFolderId || navigationStack.length > 0,
  );
  const selectionSummary = selectedFilesCount
    ? `${selectedFilesCount} arquivo(s) marcado(s) manualmente`
    : hasSelectionScope
      ? "A pasta inteira será usada na ação final"
      : "Nenhuma pasta escolhida ainda";

  const isBusy =
    isConnecting ||
    isReconnectingGoogleDrive ||
    stageMutation.isPending ||
    importMutation.isPending ||
    previewMutation.isPending ||
    disconnectMutation.isPending;

  if (!statusQuery.data?.connected) {
    return (
      <section className="surface-panel rounded-[32px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
              Google Drive
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
              Conecte a conta para importar com preview e revisão
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-textDim)]">
              O backend exige conexão ativa para stage, preview, import e confirmação
              do draft. A autenticação agora volta para este workspace sem perder o
              contexto atual.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={isBusy}
            className="ui-btn-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            Conectar Google Drive
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-panel rounded-[32px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Google Drive conectado
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
            {statusQuery.data.account?.name || statusQuery.data.account?.email}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-textDim)]">
            Você pode navegar por pastas, informar um ID manual, gerar preview,
            validar por dry run e iniciar stage ou import sem sair do workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => statusQuery.refetch()}
            className="ui-btn-secondary px-4 py-2.5 text-sm font-medium"
          >
            <RefreshCw
              className={`h-4 w-4 ${browseIsRefreshing ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={isBusy}
            className="ui-btn-secondary px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {disconnectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            Desconectar
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.95fr)]">
        <div className="space-y-4">
          <div className="surface-panel-muted rounded-[28px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                  Origem do conteúdo
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                  {effectiveFolderLabel || "Escolha uma pasta ou informe o ID manual"}
                </p>
                <p className="mt-2 text-xs text-[var(--color-textDim)]">
                  {browsePathLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasSelectionScope ? (
                  <span className="badge-soft text-[var(--color-textMain)]">
                    {selectionSummary}
                  </span>
                ) : null}
                {previewData ? (
                  <span className="badge-soft text-[var(--color-textMain)]">
                    {previewData.supportedCount} compatíveis no preview
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-[30px] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                  Navegador de pastas
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--color-textMain)]">
                  {normalizedManualFolderId ? "Pasta manual" : currentFolderName || "Minha unidade"}
                </p>
                <p className="mt-2 text-sm text-[var(--color-textDim)]">
                  Navegue em uma lista estruturada, visualize subpastas e confira
                  os arquivos detectados antes de gerar o preview.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canNavigateBack ? (
                  <button
                    type="button"
                    onClick={goBackOneFolder}
                    className="ui-btn-secondary px-4 py-2 text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                ) : null}
                {canResetBrowser ? (
                  <button
                    type="button"
                    onClick={resetFolderNavigation}
                    className="ui-btn-ghost px-4 py-2 text-sm font-medium text-[var(--color-textMain)]"
                  >
                    Ir para raiz
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 surface-panel-muted rounded-[26px] p-4">
              <label className="block">
                <span className="mb-2 block text-xs text-[var(--color-textDim)]">
                  ID manual da pasta do Google Drive
                </span>
                <input
                  type="text"
                  value={manualFolderId}
                  onChange={(event) => {
                    setManualFolderId(event.target.value);
                    setCurrentFolderName(null);
                    setCurrentFolderId(null);
                    setNavigationStack([]);
                    resetPreviewState();
                  }}
                  className="field-input rounded-2xl px-4 py-2.5 text-sm"
                  placeholder="Cole somente o ID da pasta"
                />
              </label>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-5 text-[var(--color-textDim)]">
                  Use este campo quando já souber a pasta exata. Exemplo: a parte
                  final da URL após <code>/folders/</code>.
                </p>
                {normalizedManualFolderId ? (
                  <button
                    type="button"
                    onClick={resetFolderNavigation}
                    className="text-xs font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary)]/85"
                  >
                    Limpar ID manual
                  </button>
                ) : null}
              </div>
              {folderIdValidationMessage ? (
                <p className="mt-2 text-xs text-amber-200">
                  {folderIdValidationMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                    Conteúdo disponível
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-textDim)]">
                    {browsePathLabel}
                  </p>
                </div>
                {browseIsRefreshing ? (
                  <span className="badge-soft text-[var(--color-textMain)]">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-300" />
                    Atualizando
                  </span>
                ) : null}
              </div>

              {browseIsLoading ? (
                <FeedbackState
                  icon={<Loader2 className="h-6 w-6 animate-spin" />}
                  title="Carregando conteúdo do Drive"
                  description="Buscando subpastas e arquivos do contexto atual."
                  tone="info"
                />
              ) : browseError ? (
                <FeedbackState
                  icon={<Cloud className="h-6 w-6" />}
                  title="Falha ao listar o conteúdo"
                  description={getUploadErrorMessage(
                    browseError,
                    "Não foi possível consultar esta pasta do Google Drive.",
                  )}
                  tone="danger"
                />
              ) : currentBrowseFolders.length === 0 && currentFolderItems.length === 0 ? (
                <FeedbackState
                  icon={<FolderOpen className="h-6 w-6" />}
                  title="Nenhum item encontrado"
                  description={
                    normalizedManualFolderId
                      ? "Esse ID não retornou subpastas nem arquivos compatíveis."
                      : "Escolha uma pasta para visualizar o conteúdo ou informe um ID manual."
                  }
                  tone="default"
                />
              ) : (
                <div className="space-y-4">
                  <div className="list-panel">
                    {currentBrowseFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => openFolder(folder.id, folder.name)}
                        className="list-row"
                      >
                        <div className="rounded-2xl bg-[var(--color-primary)]/10 p-2 text-[var(--color-primary)]">
                          <FolderOpen className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--color-textMain)]">
                            {folder.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-[var(--color-textDim)]">
                            {folder.modifiedTime
                              ? `Atualizada em ${formatDateTime(folder.modifiedTime)}`
                              : "Abrir pasta para navegar no conteúdo"}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-[var(--color-textDim)]" />
                      </button>
                    ))}
                  </div>

                  {currentFolderItems.length > 0 ? (
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                          Arquivos detectados
                        </p>
                        <span className="badge-soft text-[var(--color-textMain)]">
                          {currentFolderItems.length} arquivo(s)
                        </span>
                      </div>

                      <div className="list-panel max-h-72 overflow-y-auto">
                        {currentFolderItems.map((file) => (
                          <div key={file.id} className="list-row">
                            <div className="rounded-2xl bg-white/5 p-2 text-[var(--color-textDim)]">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-[var(--color-textMain)]">
                                {file.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-[var(--color-textDim)]">
                                {file.mimeType}
                              </p>
                            </div>
                            <span className="badge-soft text-[var(--color-textMain)]">
                              {file.supported ? "Compatível" : "Não suportado"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-textMain)]">
                <input
                  type="checkbox"
                  checked={recursive}
                  onChange={(event) => {
                    setRecursive(event.target.checked);
                    resetPreviewState();
                  }}
                  className="rounded border-white/15 bg-transparent"
                />
                Buscar recursivamente
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-textMain)]">
                Máximo
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxFiles}
                  onChange={(event) => {
                    setMaxFiles(Number(event.target.value) || 200);
                    resetPreviewState();
                  }}
                  className="field-input w-24 rounded-full px-3 py-1.5 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => void previewSelection()}
                disabled={!hasSelectionScope || !manualFolderIdIsValid || isBusy}
                className="ui-btn-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Gerar preview
              </button>
            </div>
          </div>

          {previewData && previewFolderId ? (
            <div className="surface-panel rounded-[30px] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                    Preview da seleção
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                    {previewData.supportedCount} arquivos compatíveis ·{" "}
                    {previewData.unsupportedCount} não compatíveis
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-textDim)]">
                    Sem marcação manual: a ação final usará a pasta inteira.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFileIds(previewFiles.map((file) => file.id))
                    }
                    className="ui-btn-secondary px-4 py-2 text-sm font-medium"
                  >
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFileIds([])}
                    className="ui-btn-ghost px-4 py-2 text-sm font-medium text-[var(--color-textMain)]"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="list-panel mt-4 max-h-80 overflow-y-auto">
                {previewFiles.map((file) => {
                  const isSelected = selectedFileIds.includes(file.id);

                  return (
                    <label
                      key={file.id}
                      className={`list-row cursor-pointer ${isSelected ? "list-row-active" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(file.id)}
                        className="rounded border-white/15 bg-transparent"
                      />
                      <div className="rounded-2xl bg-white/5 p-2 text-[var(--color-textDim)]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--color-textMain)]">
                          {file.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--color-textDim)]">
                          {file.mimeType}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="surface-panel rounded-[30px] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
              Ação
            </p>
            <div className="mt-4 grid gap-2">
              {([
                ["review", "Criar sessão de revisão"],
                ["existing", "Importar para série existente"],
                ["new", "Importar como nova série"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    mode === value
                      ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                      : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:border-white/15 hover:text-[var(--color-textMain)]"
                  }`}
                >
                  <p className="text-sm font-medium">{label}</p>
                </button>
              ))}
            </div>

            {mode === "review" && (
              <label className="mt-4 block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Título final já conhecido? Pré-preencha para revisão
                </span>
                <input
                  type="text"
                  value={reviewSeriesTitle}
                  onChange={(event) => setReviewSeriesTitle(event.target.value)}
                  className="field-input rounded-2xl px-4 py-2.5 text-sm"
                  placeholder="Opcional"
                />
              </label>
            )}

            {mode === "existing" && (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Buscar série existente
                  </span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
                    <input
                      type="text"
                      value={seriesQuery}
                      onChange={(event) => setSeriesQuery(event.target.value)}
                      className="field-input rounded-2xl py-2.5 pl-10 pr-4 text-sm"
                      placeholder="Busque o destino..."
                    />
                  </div>
                </label>

                <div className="grid gap-2">
                  {searchResults.data?.items.map((series) => (
                    <button
                      key={series.id}
                      type="button"
                      onClick={() => {
                        setSelectedSeriesId(series.id);
                        setSelectedSeriesTitle(series.title);
                        setSeriesQuery(series.title);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
                        selectedSeriesId === series.id
                          ? "border-emerald-500/25 bg-emerald-500/10 text-[var(--color-textMain)]"
                          : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:border-white/15 hover:text-[var(--color-textMain)]"
                      }`}
                    >
                      <p className="text-sm font-medium">{series.title}</p>
                        <p className="mt-1 text-xs opacity-80">{series.id}</p>
                      </button>
                  ))}
                </div>

                {seriesQuery.trim().length >= 2 && searchResults.isLoading ? (
                  <p className="text-xs text-[var(--color-textDim)]">
                    Buscando séries existentes...
                  </p>
                ) : null}
                {seriesQuery.trim().length >= 2 &&
                !searchResults.isLoading &&
                (searchResults.data?.items.length ?? 0) === 0 ? (
                  <p className="text-xs text-[var(--color-textDim)]">
                    Nenhuma série encontrada com esse termo.
                  </p>
                ) : null}
                {selectedSeriesTitle && (
                  <p className="text-xs text-emerald-200">
                    Série selecionada: {selectedSeriesTitle}
                  </p>
                )}
              </div>
            )}

            {mode === "new" && (
              <label className="mt-4 block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Título final da nova série
                </span>
                <input
                  type="text"
                  value={newSeriesTitle}
                  onChange={(event) => setNewSeriesTitle(event.target.value)}
                  className="field-input rounded-2xl px-4 py-2.5 text-sm"
                  placeholder="Digite o título definitivo..."
                />
              </label>
            )}

            <div className="surface-panel-muted mt-5 rounded-2xl p-4 text-sm text-[var(--color-textDim)]">
              {mode === "review"
                ? "O stage do Drive cria um draft persistido. Depois disso o workspace acompanha callbacks, análise, revisão e confirmação item a item."
                : mode === "existing"
                  ? "Importação direta pede um destino confirmado e usa o backend para analisar, aprovar e processar o lote."
                  : "Importação direta para nova série exige um título definitivo e ainda pode passar por aprovação ou reprocessamento."}
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => void runDryRun()}
                disabled={!hasSelectionScope || !manualFolderIdIsValid || isBusy}
                className="ui-btn-secondary w-full px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {importMutation.isPending && dryRunResult == null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Validar com dry run
              </button>

              {mode === "review" ? (
                <button
                  type="button"
                  onClick={() => void stageForReview()}
                  disabled={!hasSelectionScope || !manualFolderIdIsValid || isBusy}
                  className="ui-btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {stageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Criar sessão de revisão
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startDirectImport()}
                  disabled={!hasSelectionScope || !manualFolderIdIsValid || isBusy}
                  className="ui-btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Iniciar importação direta
                </button>
              )}
            </div>
          </div>

          <div className="surface-panel rounded-[30px] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
              Resumo da seleção
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="surface-panel-muted rounded-2xl p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Escopo
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {effectiveFolderLabel || "Nenhuma pasta escolhida"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-textDim)]">
                  {selectionSummary}
                </p>
              </div>
              <div className="surface-panel-muted rounded-2xl p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Preview atual
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {previewData
                    ? `${previewData.supportedCount} suportados`
                    : "Nenhum preview gerado"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-textDim)]">
                  {previewData
                    ? `${previewData.unsupportedCount} não compatíveis`
                    : "Gere um preview para revisar os arquivos antes do stage/import"}
                </p>
              </div>
            </div>

            {dryRunResult ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm font-medium text-emerald-200">
                  Dry run pronto
                </p>
                <p className="mt-1 text-xs text-emerald-100">
                  {dryRunResult.supportedCount} suportados ·{" "}
                  {dryRunResult.unsupportedCount} não compatíveis
                </p>
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                  {dryRunResult.files.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-2xl border border-emerald-500/20 bg-black/10 px-3 py-2 text-xs text-emerald-50"
                    >
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
