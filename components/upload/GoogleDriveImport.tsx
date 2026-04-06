"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * GoogleDriveImport — Google Drive connection + folder browser + staging.
 *
 * Receives series mode context from the parent (UploadsPage).
 * The parent decides new/existing/auto — this component just stages files.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import {
  Cloud,
  FolderOpen,
  Link,
  Loader2,
  LogOut,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  useGoogleDriveStatus,
  useGoogleDriveNodes,
  useStageFromGoogleDrive,
  useDisconnectGoogleDrive,
} from "@/hooks/useUpload";
import { useGoogleDriveAuth } from "@/hooks/useGoogleDriveAuth";

type SeriesMode = "new" | "existing" | "auto";

interface GoogleDriveImportProps {
  onDraftCreated: (draftId: string) => void;
  seriesMode: SeriesMode;
  seriesTitle: string;
  existingSeriesId: string | null;
  disabled?: boolean;
}

export function GoogleDriveImport({
  onDraftCreated,
  seriesMode,
  seriesTitle,
  existingSeriesId,
  disabled,
}: GoogleDriveImportProps) {
  const { data: status, isLoading: statusLoading } = useGoogleDriveStatus();
  const { launch: launchAuth, isConnecting } = useGoogleDriveAuth();
  const disconnectMutation = useDisconnectGoogleDrive();
  const stageMutation = useStageFromGoogleDrive();

  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(
    undefined,
  );
  const [folderPath, setFolderPath] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [recursive, setRecursive] = useState(true);
  const [maxFiles, setMaxFiles] = useState(500);
  const [directFolderId, setDirectFolderId] = useState("");
  const [directError, setDirectError] = useState("");

  const isConnected = status?.connected === true;

  const nodesQuery = useGoogleDriveNodes(currentFolderId, isConnected);

  const navigateToFolder = useCallback(
    (folderId: string, folderName: string) => {
      setCurrentFolderId(folderId);
      setFolderPath((prev) => [...prev, { id: folderId, name: folderName }]);
    },
    [],
  );

  const navigateUp = useCallback(() => {
    setFolderPath((prev) => {
      const newPath = prev.slice(0, -1);
      setCurrentFolderId(
        newPath.length > 0 ? newPath[newPath.length - 1].id : undefined,
      );
      return newPath;
    });
  }, []);

  // Build the stage payload based on series mode from parent
  const buildStagePayload = useCallback(
    (folderId: string) => ({
      folderId,
      recursive,
      maxFiles,
      forcedSeriesTitle:
        seriesMode === "new" || seriesMode === "existing"
          ? seriesTitle || undefined
          : undefined,
    }),
    [recursive, maxFiles, seriesMode, seriesTitle],
  );

  const handleStage = useCallback(async () => {
    if (!currentFolderId || disabled) return;
    try {
      const result = await stageMutation.mutateAsync(
        buildStagePayload(currentFolderId),
      );
      onDraftCreated(result.draftId);
    } catch {
      // error handled by mutation
    }
  }, [
    currentFolderId,
    disabled,
    buildStagePayload,
    stageMutation,
    onDraftCreated,
  ]);

  const parseFolderIdFromInput = useCallback((input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Accept Google Drive folder URLs:
    // https://drive.google.com/drive/folders/<ID>
    // https://drive.google.com/drive/u/0/folders/<ID>
    const urlMatch = trimmed.match(
      /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/,
    );
    if (urlMatch) return urlMatch[1];

    // Accept raw folder IDs (alphanumeric, hyphens, underscores, typically 20+ chars)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

    return null;
  }, []);

  const handleStageDirectId = useCallback(async () => {
    if (disabled) return;
    const folderId = parseFolderIdFromInput(directFolderId);
    if (!folderId) {
      setDirectError("Cole um ID de pasta ou URL do Google Drive válido.");
      return;
    }
    setDirectError("");
    try {
      const result = await stageMutation.mutateAsync(
        buildStagePayload(folderId),
      );
      setDirectFolderId("");
      onDraftCreated(result.draftId);
    } catch {
      // error handled by mutation
    }
  }, [
    directFolderId,
    disabled,
    buildStagePayload,
    stageMutation,
    onDraftCreated,
    parseFolderIdFromInput,
  ]);

  // Not connected state
  if (statusLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-white/5 bg-[var(--color-surface)] p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-textDim)]" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-white/5 bg-[var(--color-surface)] p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10">
          <Cloud className="h-6 w-6 text-sky-400" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-[var(--color-textMain)]">
            Conecte seu Google Drive
          </h3>
          <p className="mt-1 text-xs text-[var(--color-textDim)]">
            Importe arquivos diretamente do seu Drive.
          </p>
        </div>
        <button
          type="button"
          onClick={() => launchAuth("import")}
          disabled={isConnecting}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Cloud className="h-4 w-4" />
          )}
          Conectar Google Drive
        </button>
      </div>
    );
  }

  // Connected: show folder browser
  return (
    <div className="rounded-xl border border-white/5 bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-medium text-[var(--color-textMain)]">
            Google Drive
          </span>
        </div>
        <button
          type="button"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          className="text-xs text-[var(--color-textDim)] hover:text-rose-300"
        >
          <LogOut className="mr-1 inline h-3 w-3" />
          Desconectar
        </button>
      </div>

      {/* Direct folder ID input */}
      <div className="border-b border-white/5 px-4 py-3">
        <label className="mb-1.5 flex items-center gap-1.5 text-xs text-[var(--color-textDim)]">
          <Link className="h-3 w-3" />
          Colar ID ou URL da pasta
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={directFolderId}
            onChange={(e) => {
              setDirectFolderId(e.target.value);
              if (directError) setDirectError("");
            }}
            disabled={disabled}
            placeholder="ID da pasta ou URL do Google Drive"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleStageDirectId}
            disabled={
              !directFolderId.trim() || stageMutation.isPending || disabled
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
          >
            {stageMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5" />
            )}
            Importar
          </button>
        </div>
        {directError && (
          <p className="mt-1.5 text-xs text-rose-400">{directError}</p>
        )}
        {!directError && stageMutation.isError && !currentFolderId && (
          <p className="mt-1.5 text-xs text-rose-400">
            {(stageMutation.error as { message?: string })?.message ||
              "Falha ao importar do Google Drive. Tente novamente."}
          </p>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 border-b border-white/5 px-4 py-2 text-xs text-[var(--color-textDim)]">
        <button
          type="button"
          onClick={() => {
            setCurrentFolderId(undefined);
            setFolderPath([]);
          }}
          className="hover:text-[var(--color-textMain)]"
        >
          Raiz
        </button>
        {folderPath.map((folder) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <button
              type="button"
              onClick={() => navigateToFolder(folder.id, folder.name)}
              className="hover:text-[var(--color-textMain)]"
            >
              {folder.name}
            </button>
          </span>
        ))}
      </div>

      {/* Folder list */}
      <div className="max-h-64 overflow-y-auto px-2 py-2">
        {folderPath.length > 0 && (
          <button
            type="button"
            onClick={navigateUp}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-textDim)] hover:bg-white/5"
          >
            ← Voltar
          </button>
        )}

        {nodesQuery.isFetching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-textDim)]" />
          </div>
        )}

        {nodesQuery.data?.folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => navigateToFolder(folder.id, folder.name)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-textMain)] hover:bg-white/5"
          >
            <FolderOpen className="h-4 w-4 text-amber-300" />
            <span className="truncate">{folder.name}</span>
          </button>
        ))}

        {nodesQuery.data?.files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-textDim)]"
          >
            <span className="truncate">{file.name}</span>
          </div>
        ))}

        {!nodesQuery.isFetching &&
          !nodesQuery.data?.folders.length &&
          !nodesQuery.data?.files.length && (
            <div className="px-3 py-4 text-center text-xs text-[var(--color-textDim)]">
              {nodesQuery.isError ? (
                <button
                  type="button"
                  onClick={() => nodesQuery.refetch()}
                  className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Tentar novamente
                </button>
              ) : (
                "Nenhum item nesta pasta."
              )}
            </div>
          )}
      </div>

      {/* Stage controls */}
      {currentFolderId && (
        <div className="space-y-3 border-t border-white/5 px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-[var(--color-textMain)]">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-[var(--color-primary)]"
            />
            Incluir subpastas
          </label>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs text-[var(--color-textDim)]">
              <span>Máximo de arquivos</span>
              <span className="font-medium text-[var(--color-textMain)]">{maxFiles}</span>
            </label>
            <input
              type="range"
              min={50}
              max={1000}
              step={50}
              value={maxFiles}
              onChange={(e) => setMaxFiles(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-[var(--color-textDim)]">
              <span>50</span>
              <span>500</span>
              <span>1000</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStage}
            disabled={stageMutation.isPending || disabled}
            className="w-full rounded-lg bg-[var(--color-primary)] py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
          >
            {stageMutation.isPending ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Importar desta pasta"
            )}
          </button>
          {stageMutation.isError && (
            <p className="text-xs text-rose-400">
              {(stageMutation.error as { message?: string })?.message ||
                "Falha ao importar do Google Drive. Tente novamente."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
