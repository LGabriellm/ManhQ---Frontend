"use client";

import { useDeferredValue, useState } from "react";
import { useSeriesSearch } from "@/hooks/useApi";
import {
  useGoogleDriveAuthUrl,
  useGoogleDriveDisconnect,
  useGoogleDriveFolders,
  useGoogleDriveNodes,
  useGoogleDrivePreview,
  useGoogleDriveStatus,
  useImportFromGoogleDrive,
  useStageGoogleDrive,
} from "@/hooks/useUploadWorkflow";
import { formatDateTime } from "@/lib/upload-workflow";
import toast from "react-hot-toast";
import {
  ArrowLeft,
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

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
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
  const [dryRunResult, setDryRunResult] = useState<{
    supportedCount: number;
    unsupportedCount: number;
    files: Array<{ id: string; name: string }>;
  } | null>(null);

  const statusQuery = useGoogleDriveStatus();
  const authUrlMutation = useGoogleDriveAuthUrl();
  const disconnectMutation = useGoogleDriveDisconnect();
  const stageMutation = useStageGoogleDrive();
  const importMutation = useImportFromGoogleDrive();
  const rootFoldersQuery = useGoogleDriveFolders({}, statusQuery.data?.connected);
  const nodesQuery = useGoogleDriveNodes(
    {
      parentId: currentFolderId || "",
    },
    Boolean(currentFolderId && statusQuery.data?.connected),
  );
  const previewQuery = useGoogleDrivePreview({
    folderId: previewFolderId || "",
    recursive,
    maxFiles,
  });
  const searchResults = useSeriesSearch(deferredSeriesQuery, 1, 8);

  const currentFolderNodes = currentFolderId ? nodesQuery.data : null;
  const previewFiles = previewQuery.data?.supportedFiles || [];
  const currentFolderItems = currentFolderNodes?.files || [];

  const connect = async () => {
    try {
      const result = await authUrlMutation.mutateAsync();
      window.location.href = result.url;
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao iniciar a conexão com Google Drive";
      toast.error(message);
    }
  };

  const disconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      setCurrentFolderId(null);
      setCurrentFolderName(null);
      setNavigationStack([]);
      setPreviewFolderId(null);
      setSelectedFileIds([]);
      setDryRunResult(null);
      toast.success("Google Drive desconectado");
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao desconectar o Google Drive";
      toast.error(message);
    }
  };

  const openFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setCurrentFolderName(folderName);
    setNavigationStack((current) => [...current, { id: folderId, name: folderName }]);
    setPreviewFolderId(null);
    setSelectedFileIds([]);
    setDryRunResult(null);
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
    setPreviewFolderId(null);
    setSelectedFileIds([]);
    setDryRunResult(null);
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds((current) =>
      current.includes(fileId)
        ? current.filter((entry) => entry !== fileId)
        : [...current, fileId],
    );
  };

  const previewSelection = () => {
    if (!currentFolderId) {
      toast.error("Escolha uma pasta antes de gerar o preview.");
      return;
    }

    setSelectedFileIds([]);
    setDryRunResult(null);
    setPreviewFolderId(currentFolderId);
  };

  const stageForReview = async () => {
    if (!previewFolderId && !currentFolderId) {
      toast.error("Escolha uma pasta ou arquivos antes de criar a sessão.");
      return;
    }

    try {
      const result = await stageMutation.mutateAsync({
        data: {
          folderId: selectedFileIds.length === 0 ? currentFolderId || undefined : undefined,
          fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
          recursive,
          maxFiles,
          forcedSeriesTitle: reviewSeriesTitle.trim() || undefined,
          folderNameHint: currentFolderName || undefined,
        },
        idempotencyKey: createIdempotencyKey(),
      });
      toast.success(result.nextStep);
      onOpenSession(result.draftId);
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao criar a sessão de revisão do Google Drive";
      toast.error(message);
    }
  };

  const runDryRun = async () => {
    try {
      const result = await importMutation.mutateAsync({
        data: {
          folderId: selectedFileIds.length === 0 ? currentFolderId || undefined : undefined,
          fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
          recursive,
          maxFiles,
          dryRun: true,
          targetSeriesId: mode === "existing" ? selectedSeriesId : undefined,
          newSeriesTitle: mode === "new" ? newSeriesTitle.trim() : undefined,
          folderNameHint: currentFolderName || undefined,
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
        toast.success("Dry run concluído");
      }
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao validar a importação do Google Drive";
      toast.error(message);
    }
  };

  const startDirectImport = async () => {
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
          folderId: selectedFileIds.length === 0 ? currentFolderId || undefined : undefined,
          fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
          recursive,
          maxFiles,
          targetSeriesId: mode === "existing" ? selectedSeriesId : undefined,
          newSeriesTitle: mode === "new" ? newSeriesTitle.trim() : undefined,
          folderNameHint: currentFolderName || undefined,
        },
        idempotencyKey: createIdempotencyKey(),
      });

      if (!("dryRun" in result)) {
        toast.success(result.message);
        onOpenSession(result.sessionId);
      }
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao iniciar a importação direta do Google Drive";
      toast.error(message);
    }
  };

  const selectedFilesCount = selectedFileIds.length;

  if (!statusQuery.data?.connected) {
    return (
      <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
              Google Drive
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
              Conecte a conta para importar com preview e revisão
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-textDim)]">
              A análise inicial é metadata-first: você pode navegar por pastas,
              pré-visualizar arquivos compatíveis, escolher subconjuntos e só
              depois criar a sessão ou iniciar a importação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={authUrlMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
          >
            {authUrlMutation.isPending ? (
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
    <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Google Drive conectado
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
            {statusQuery.data.account?.name || statusQuery.data.account?.email}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-textDim)]">
            Revise primeiro ou importe direto com destino já confirmado.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => statusQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={disconnectMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07] disabled:opacity-50"
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                  Navegação
                </p>
                <p className="mt-1 text-sm text-[var(--color-textMain)]">
                  {currentFolderName || "Selecione uma pasta para continuar"}
                </p>
                {navigationStack.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--color-textDim)]">
                    {navigationStack.map((folder) => folder.name).join(" / ")}
                  </p>
                )}
              </div>
              {currentFolderId && (
                <button
                  type="button"
                  onClick={goBackOneFolder}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(currentFolderId ? currentFolderNodes?.folders : rootFoldersQuery.data?.folders)?.map(
                (folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => openFolder(folder.id, folder.name)}
                    className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-2xl bg-[var(--color-primary)]/10 p-2 text-[var(--color-primary)]">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          {folder.name}
                        </p>
                        {folder.modifiedTime && (
                          <p className="mt-1 text-xs text-[var(--color-textDim)]">
                            Atualizada em {formatDateTime(folder.modifiedTime)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ),
              )}
            </div>

            {currentFolderItems.length > 0 && (
              <div className="mt-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                  Arquivos detectados na pasta atual
                </p>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {currentFolderItems.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/10 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-4 w-4 text-[var(--color-textDim)]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-[var(--color-textMain)]">
                            {file.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-textDim)]">
                            {file.supported ? "Compatível" : "Não suportado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--color-textMain)]">
                <input
                  type="checkbox"
                  checked={recursive}
                  onChange={(event) => setRecursive(event.target.checked)}
                  className="rounded border-white/15 bg-transparent"
                />
                Buscar recursivamente
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--color-textMain)]">
                Máximo
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxFiles}
                  onChange={(event) => setMaxFiles(Number(event.target.value) || 200)}
                  className="w-24 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[var(--color-textMain)] outline-none"
                />
              </label>
              <button
                type="button"
                onClick={previewSelection}
                disabled={!currentFolderId}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
              >
                {previewQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Gerar preview
              </button>
            </div>
          </div>

          {previewFolderId && (
            <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                    Preview
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-textMain)]">
                    {previewQuery.data?.supportedCount || 0} arquivos compatíveis ·{" "}
                    {previewQuery.data?.unsupportedCount || 0} não compatíveis
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFileIds(previewFiles.map((file) => file.id))
                    }
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--color-textMain)]"
                  >
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFileIds([])}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--color-textMain)]"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {previewFiles.map((file) => {
                  const isSelected = selectedFileIds.includes(file.id);

                  return (
                    <label
                      key={file.id}
                      className={`flex items-center gap-3 rounded-2xl border px-3 py-2 transition-colors ${
                        isSelected
                          ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10"
                          : "border-white/8 bg-white/[0.03]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(file.id)}
                        className="rounded border-white/15 bg-transparent"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[var(--color-textMain)]">
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-textDim)]">
                          {file.mimeType}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
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
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
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
                      className="w-full rounded-2xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
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
                  Título da nova série
                </span>
                <input
                  type="text"
                  value={newSeriesTitle}
                  onChange={(event) => setNewSeriesTitle(event.target.value)}
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                />
              </label>
            )}

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--color-textDim)]">
              {selectedFilesCount > 0 ? (
                <p>{selectedFilesCount} arquivo(s) selecionado(s) do preview.</p>
              ) : (
                <p>
                  Nenhum subconjunto marcado. A ação usará a pasta inteira
                  selecionada.
                </p>
              )}
            </div>

            {dryRunResult && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p className="font-medium">
                  Dry run: {dryRunResult.supportedCount} suportados ·{" "}
                  {dryRunResult.unsupportedCount} ignorados
                </p>
                <p className="mt-2 text-xs text-emerald-50/85">
                  {dryRunResult.files.slice(0, 5).map((file) => file.name).join(", ")}
                  {dryRunResult.files.length > 5 ? "..." : ""}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {mode === "review" ? (
                <button
                  type="button"
                  onClick={() => void stageForReview()}
                  disabled={stageMutation.isPending || (!currentFolderId && selectedFileIds.length === 0)}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                >
                  {stageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Criar sessão de revisão
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void runDryRun()}
                    disabled={importMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07] disabled:opacity-50"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Dry run
                  </button>
                  <button
                    type="button"
                    onClick={() => void startDirectImport()}
                    disabled={importMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Iniciar importação direta
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
