"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAdminSeries,
  useGoogleDriveFolders,
  useGoogleDriveStatus,
  useGoogleDriveAuthUrl,
  useGoogleDriveDisconnect,
  useGoogleDriveStage,
  useGoogleDriveDraft,
  useUpdateGoogleDriveDraftItem,
  useCancelGoogleDriveDraft,
  useConfirmGoogleDriveDraft,
} from "@/hooks/useAdmin";
import type { UploadDecision, UploadDraftItem } from "@/types/api";
import { DetectionEvidencePanel } from "@/components/upload/DetectionEvidencePanel";
import {
  countUnresolvedManualReviews,
  isItemMarkedForManualReview,
} from "@/lib/uploadReview";
import { getUploadErrorMessage } from "@/lib/uploadErrors";
import toast from "react-hot-toast";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Cloud,
  FolderOpen,
  Home,
  Loader2,
  LogOut,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

interface GoogleDrivePanelProps {
  compact?: boolean;
}

interface ImportHistoryItem {
  id: string;
  timestamp: string;
  folderId: string;
  folderName: string;
  draftId: string;
  accepted: number;
  rejected: number;
  skipped: number;
  jobs: string[];
}

const IMPORT_HISTORY_STORAGE_KEY = "manhq_google_drive_import_history";
const MAX_IMPORT_HISTORY_ITEMS = 12;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 600;

const decisionOptions: UploadDecision[] = [
  "EXISTING_SERIES",
  "NEW_SERIES",
  "SKIP",
];

const decisionLabel: Record<UploadDecision, string> = {
  EXISTING_SERIES: "Série existente",
  NEW_SERIES: "Nova série",
  SKIP: "Ignorar",
};

function readImportHistoryFromStorage(): ImportHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ImportHistoryItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, MAX_IMPORT_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

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

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function DraftItemEditor({
  draftId,
  item,
}: {
  draftId: string;
  item: UploadDraftItem;
}) {
  const updateItemMutation = useUpdateGoogleDriveDraftItem();
  const [isOpen, setIsOpen] = useState(false);
  const [decision, setDecision] = useState<UploadDecision>(
    item.plan.decision || "NEW_SERIES",
  );
  const [targetSeriesId, setTargetSeriesId] = useState(
    item.plan.targetSeriesId || item.suggestion.matchedSeriesId || "",
  );
  const [newSeriesTitle, setNewSeriesTitle] = useState(
    item.plan.newSeriesTitle || item.parsed.normalizedTitle || "",
  );
  const [chapterNumber, setChapterNumber] = useState<number | "">(
    item.plan.chapterNumber ?? item.parsed.number ?? "",
  );
  const [volume, setVolume] = useState<number | "">(item.plan.volume ?? "");
  const [year, setYear] = useState<number | "">(item.plan.year ?? "");
  const [isOneShot, setIsOneShot] = useState(Boolean(item.plan.isOneShot));
  const [tagsInput, setTagsInput] = useState((item.plan.tags || []).join(", "));
  const [description, setDescription] = useState(item.plan.description || "");
  const [status, setStatus] = useState(item.plan.status || "");
  const [author, setAuthor] = useState(item.plan.author || "");
  const [artist, setArtist] = useState(item.plan.artist || "");
  const [seriesQuery, setSeriesQuery] = useState(
    item.suggestion.matchedSeriesTitle || "",
  );
  const [seriesSearchEnabled, setSeriesSearchEnabled] = useState(false);

  const debouncedSeriesQuery = useDebouncedValue(seriesQuery, 300);
  const shouldSearchSeries =
    seriesSearchEnabled &&
    decision === "EXISTING_SERIES" &&
    debouncedSeriesQuery.length >= 2;
  const { data: seriesSearchData, isLoading: isSeriesSearching } =
    useAdminSeries(
      {
        search: shouldSearchSeries ? debouncedSeriesQuery : undefined,
        page: 1,
        limit: 8,
      },
      shouldSearchSeries,
    );

  const seriesOptions = shouldSearchSeries
    ? (seriesSearchData?.series ?? [])
    : [];

  const save = useCallback(async () => {
    try {
      await updateItemMutation.mutateAsync({
        draftId,
        itemId: item.id,
        data: {
          decision,
          targetSeriesId:
            decision === "EXISTING_SERIES"
              ? targetSeriesId || undefined
              : undefined,
          newSeriesTitle:
            decision === "NEW_SERIES" ? newSeriesTitle || undefined : undefined,
          chapterNumber:
            chapterNumber === "" ? undefined : Number(chapterNumber),
          volume: volume === "" ? null : Number(volume),
          year: year === "" ? null : Number(year),
          isOneShot,
          tags: tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          description: description || undefined,
          status: status || undefined,
          author: author || undefined,
          artist: artist || undefined,
        },
      });
      toast.success(`Item atualizado: ${item.originalName}`);
    } catch {
      toast.error("Falha ao atualizar item do draft");
    }
  }, [
    updateItemMutation,
    draftId,
    item.id,
    item.originalName,
    decision,
    targetSeriesId,
    newSeriesTitle,
    chapterNumber,
    volume,
    year,
    isOneShot,
    tagsInput,
    description,
    status,
    author,
    artist,
  ]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {item.originalName}
          </p>
          <p className="text-[11px] text-[var(--color-textDim)] mt-0.5">
            Sugestão:{" "}
            {item.suggestion.matchedSeriesTitle || item.parsed.normalizedTitle}{" "}
            · confiança {item.suggestion.confidence}
          </p>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white hover:bg-white/15"
        >
          <Pencil className="h-3.5 w-3.5" />
          {isOpen ? "Fechar" : "Editar"}
        </button>
      </div>
      <DetectionEvidencePanel item={item} />

      {isOpen && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="text-xs text-[var(--color-textDim)]">
            Decisão
            <select
              value={decision}
              onChange={(event) =>
                setDecision(event.target.value as UploadDecision)
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            >
              {decisionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {decisionLabel[opt]}
                </option>
              ))}
            </select>
          </label>

          {decision === "EXISTING_SERIES" && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-textDim)]">
                Série existente (buscar por nome)
              </label>
              <input
                value={seriesQuery}
                onFocus={() => setSeriesSearchEnabled(true)}
                onChange={(event) => {
                  setSeriesSearchEnabled(true);
                  setSeriesQuery(event.target.value);
                }}
                placeholder="Digite nome da série..."
                className="w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
              />

              {shouldSearchSeries && (
                <div className="rounded-lg border border-white/10 bg-[var(--color-background)] max-h-32 overflow-y-auto">
                  {isSeriesSearching ? (
                    <p className="px-2 py-1.5 text-[11px] text-[var(--color-textDim)]">
                      Buscando séries...
                    </p>
                  ) : seriesOptions.length > 0 ? (
                    seriesOptions.map((serie) => (
                      <button
                        key={serie.id}
                        type="button"
                        onClick={() => {
                          setTargetSeriesId(serie.id);
                          setSeriesQuery(serie.title);
                          setSeriesSearchEnabled(false);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-white/5 transition-colors"
                      >
                        <p className="text-xs text-white truncate">
                          {serie.title}
                        </p>
                        <p className="text-[10px] text-[var(--color-textDim)] font-mono truncate">
                          {serie.id}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-1.5 text-[11px] text-[var(--color-textDim)]">
                      Nenhuma série encontrada
                    </p>
                  )}
                </div>
              )}

              {targetSeriesId && (
                <p className="text-[10px] text-[var(--color-primary)] font-mono truncate">
                  Selecionada: {targetSeriesId}
                </p>
              )}
            </div>
          )}

          {decision === "NEW_SERIES" && (
            <label className="text-xs text-[var(--color-textDim)] md:col-span-2">
              newSeriesTitle
              <input
                value={newSeriesTitle}
                onChange={(event) => setNewSeriesTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
              />
            </label>
          )}

          <label className="text-xs text-[var(--color-textDim)]">
            chapterNumber
            <input
              type="number"
              value={chapterNumber}
              onChange={(event) =>
                setChapterNumber(
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <label className="text-xs text-[var(--color-textDim)]">
            volume
            <input
              type="number"
              value={volume}
              onChange={(event) =>
                setVolume(
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <label className="text-xs text-[var(--color-textDim)]">
            year
            <input
              type="number"
              value={year}
              onChange={(event) =>
                setYear(
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <label className="text-xs text-[var(--color-textDim)]">
            status
            <input
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <label className="text-xs text-[var(--color-textDim)]">
            author
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <label className="text-xs text-[var(--color-textDim)]">
            artist
            <input
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <label className="text-xs text-[var(--color-textDim)] md:col-span-2">
            tags (separadas por vírgula)
            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <label className="text-xs text-[var(--color-textDim)] md:col-span-2">
            description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-xs text-[var(--color-textDim)] md:col-span-2">
            <input
              type="checkbox"
              checked={isOneShot}
              onChange={(event) => setIsOneShot(event.target.checked)}
            />
            isOneShot
          </label>

          <div className="md:col-span-2">
            <button
              onClick={() =>
                void updateItemMutation.mutateAsync({
                  draftId,
                  itemId: item.id,
                  data: {
                    decision: "EXISTING_SERIES",
                    targetSeriesId: item.suggestion.matchedSeriesId,
                    chapterNumber:
                      chapterNumber === "" ? undefined : Number(chapterNumber),
                  },
                })
              }
              disabled={
                updateItemMutation.isPending || !item.suggestion.matchedSeriesId
              }
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white hover:bg-white/15 disabled:opacity-50 mr-2"
            >
              Usar sugestão automaticamente
            </button>

            <button
              onClick={() => void save()}
              disabled={updateItemMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {updateItemMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GoogleDrivePanel({ compact = false }: GoogleDrivePanelProps) {
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [folderTrail, setFolderTrail] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [manualFolderId, setManualFolderId] = useState("");
  const [manualFolderName, setManualFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [stageMaxFiles, setStageMaxFiles] = useState(120);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<{
    accepted: number;
    rejected: number;
    skipped: number;
    jobs: string[];
  } | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>(
    readImportHistoryFromStorage,
  );

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
  } = useGoogleDriveFolders(
    { parentId, pageSize: 100 },
    !!statusData?.connected,
  );

  const {
    data: draftData,
    isLoading: isDraftLoading,
    refetch: refetchDraft,
  } = useGoogleDriveDraft(activeDraftId || "", Boolean(activeDraftId));

  const authUrlMutation = useGoogleDriveAuthUrl();
  const disconnectMutation = useGoogleDriveDisconnect();
  const stageMutation = useGoogleDriveStage();
  const cancelDraftMutation = useCancelGoogleDriveDraft();
  const confirmDraftMutation = useConfirmGoogleDriveDraft();
  const updateGoogleDraftItemMutation = useUpdateGoogleDriveDraftItem();

  const isConnected = Boolean(statusData?.connected);
  const account = statusData?.account;

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

  const connect = useCallback(async () => {
    try {
      const { url } = await authUrlMutation.mutateAsync();
      if (!url) {
        toast.error("Não foi possível iniciar autenticação");
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
      setActiveDraftId(null);
      setConfirmResult(null);
      await refetchStatus();
      toast.success("Conta Google desconectada");
    } catch {
      toast.error("Erro ao desconectar");
    }
  }, [disconnectMutation, refetchStatus]);

  const selectFolder = useCallback((folder: { id: string; name: string }) => {
    setSelectedFolder(folder);
    setActiveDraftId(null);
    setConfirmResult(null);
  }, []);

  const openFolder = useCallback((id: string, name: string) => {
    setFolderTrail((prev) => [...prev, { id, name }]);
    setParentId(id);
  }, []);

  const goHome = useCallback(() => {
    setParentId(undefined);
    setFolderTrail([]);
    setSelectedFolder(null);
  }, []);

  const applyManualFolderSelection = useCallback(() => {
    const id = manualFolderId.trim();
    if (!id) {
      toast.error("Informe o ID da pasta");
      return;
    }

    setSelectedFolder({
      id,
      name: manualFolderName.trim() || `Pasta (${id.slice(0, 8)}...)`,
    });
    setActiveDraftId(null);
    setConfirmResult(null);
    toast.success("Pasta selecionada por ID");
  }, [manualFolderId, manualFolderName]);

  const draftItems = useMemo(
    () => draftData?.draft.items ?? [],
    [draftData?.draft.items],
  );
  const driveProcessingState = draftData?.draft.processing?.state ?? "completed";
  const reviewRequiredCount = useMemo(
    () => draftItems.filter(isItemMarkedForManualReview).length,
    [draftItems],
  );
  const unresolvedReviewCount = useMemo(
    () => countUnresolvedManualReviews(draftItems),
    [draftItems],
  );

  const stageFolder = useCallback(async () => {
    if (!selectedFolder?.id) {
      toast.error("Selecione uma pasta para analisar");
      return;
    }

    try {
      const response = await retryWithBackoff(() =>
        stageMutation.mutateAsync({
          data: {
            folderId: selectedFolder.id,
            recursive: true,
            maxFiles: Math.max(1, Math.min(stageMaxFiles, 500)),
          },
          idempotencyKey: createIdempotencyKey(),
        }),
      );

      setActiveDraftId(response.draftId);
      setConfirmResult(null);
      toast.success(`Draft criado com ${response.items.length} item(ns)`);
    } catch (error) {
      toast.error(getUploadErrorMessage(error, "Falha ao analisar pasta (stage)"));
    }
  }, [selectedFolder, stageMutation, stageMaxFiles]);

  const cancelDraft = useCallback(async () => {
    if (!activeDraftId) {
      return;
    }

    try {
      await cancelDraftMutation.mutateAsync(activeDraftId);
      setActiveDraftId(null);
      setConfirmResult(null);
      toast.success("Draft cancelado");
    } catch {
      toast.error("Falha ao cancelar draft");
    }
  }, [activeDraftId, cancelDraftMutation]);

  const confirmDraft = useCallback(async () => {
    if (!activeDraftId || !selectedFolder) {
      toast.error("Nenhum draft ativo");
      return;
    }
    if (driveProcessingState !== "completed") {
      toast.error("Aguarde a conclusão da análise antes de confirmar o draft.");
      return;
    }
    if (unresolvedReviewCount > 0) {
      toast.error(
        `Há ${unresolvedReviewCount} item(ns) com revisão manual pendente.`,
      );
      return;
    }

    try {
      const result = await retryWithBackoff(() =>
        confirmDraftMutation.mutateAsync({
          draftId: activeDraftId,
          idempotencyKey: createIdempotencyKey(),
        }),
      );

      const jobs = result.accepted.map((item) => item.jobId);

      setConfirmResult({
        accepted: result.totals.accepted,
        rejected: result.totals.rejected,
        skipped: result.totals.skipped,
        jobs,
      });

      setImportHistory((prev) =>
        [
          {
            id: createIdempotencyKey(),
            timestamp: new Date().toISOString(),
            folderId: selectedFolder.id,
            folderName: selectedFolder.name,
            draftId: activeDraftId,
            accepted: result.totals.accepted,
            rejected: result.totals.rejected,
            skipped: result.totals.skipped,
            jobs,
          },
          ...prev,
        ].slice(0, MAX_IMPORT_HISTORY_ITEMS),
      );

      setActiveDraftId(null);
      toast.success("Draft confirmado e jobs enviados");
    } catch (error) {
      toast.error(getUploadErrorMessage(error, "Falha ao confirmar draft"));
    }
  }, [
    activeDraftId,
    selectedFolder,
    confirmDraftMutation,
    driveProcessingState,
    unresolvedReviewCount,
  ]);

  const clearImportHistory = useCallback(() => {
    setImportHistory([]);
    toast.success("Histórico limpo");
  }, []);

  const currentPath = useMemo(() => {
    if (folderTrail.length === 0) {
      return "Meu Drive";
    }
    return folderTrail[folderTrail.length - 1]?.name || "Pasta";
  }, [folderTrail]);

  const applyDecisionToAllDraftItems = useCallback(
    async (decision: UploadDecision) => {
      if (!activeDraftId || draftItems.length === 0) {
        return;
      }

      try {
        await Promise.all(
          draftItems.map((item) =>
            updateGoogleDraftItemMutation.mutateAsync({
              draftId: activeDraftId,
              itemId: item.id,
              data: {
                decision,
                chapterNumber: item.plan.chapterNumber ?? item.parsed.number,
                newSeriesTitle:
                  decision === "NEW_SERIES"
                    ? item.plan.newSeriesTitle || item.parsed.normalizedTitle
                    : undefined,
                targetSeriesId:
                  decision === "EXISTING_SERIES"
                    ? item.plan.targetSeriesId ||
                      item.suggestion.matchedSeriesId
                    : undefined,
              },
            }),
          ),
        );
        toast.success(
          `Decisão ${decision} aplicada em ${draftItems.length} item(ns)`,
        );
      } catch {
        toast.error("Falha ao aplicar decisão em lote");
      }
    },
    [activeDraftId, draftItems, updateGoogleDraftItemMutation],
  );

  const applySuggestionsToAllDraftItems = useCallback(async () => {
    if (!activeDraftId) {
      return;
    }

    const suggestedItems = draftItems.filter(
      (item) => item.suggestion.matchedSeriesId,
    );
    if (suggestedItems.length === 0) {
      toast.error("Nenhum item com sugestão de série existente");
      return;
    }

    try {
      await Promise.all(
        suggestedItems.map((item) =>
          updateGoogleDraftItemMutation.mutateAsync({
            draftId: activeDraftId,
            itemId: item.id,
            data: {
              decision: "EXISTING_SERIES",
              targetSeriesId: item.suggestion.matchedSeriesId,
              chapterNumber: item.plan.chapterNumber ?? item.parsed.number,
            },
          }),
        ),
      );
      toast.success(`Sugestões aplicadas em ${suggestedItems.length} item(ns)`);
    } catch {
      toast.error("Falha ao aplicar sugestões em lote");
    }
  }, [activeDraftId, draftItems, updateGoogleDraftItemMutation]);

  return (
    <div className={`space-y-4 ${compact ? "text-sm" : ""}`}>
      <div className="rounded-lg border border-white/8 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Cloud className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white">
                Google Drive (workflow por draft)
              </h2>
              <p className="text-xs text-gray-300 truncate">
                {isConnected && account
                  ? `${account.name || account.email || "Conectado"}`
                  : "Conecte sua conta Google"}
              </p>
            </div>
          </div>

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

      {statusError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            Não foi possível verificar status.
          </p>
        </div>
      )}

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
          </>
        )}
      </div>

      {isConnected && (
        <>
          <div className="rounded-lg border border-white/8 bg-white/5 p-3 space-y-2">
            <p className="text-xs uppercase tracking-wide text-[var(--color-textDim)]">
              Seleção manual por ID
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
              <input
                value={manualFolderId}
                onChange={(event) => setManualFolderId(event.target.value)}
                placeholder="ID da pasta do Google Drive"
                className="w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2.5 py-2 text-xs text-white"
              />
              <input
                value={manualFolderName}
                onChange={(event) => setManualFolderName(event.target.value)}
                placeholder="Nome opcional da pasta"
                className="w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2.5 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={applyManualFolderSelection}
                className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium hover:bg-[var(--color-primary)]/90"
              >
                Usar ID
              </button>
            </div>
            <p className="text-[10px] text-[var(--color-textDim)]">
              Use quando a pasta não aparece na listagem ou para importar direto
              por ID.
            </p>
          </div>

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
                    const nextTrail = folderTrail.slice(0, idx + 1);
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

          <div className="rounded-lg border border-white/8 overflow-hidden">
            {foldersError && (
              <div className="px-4 py-4 bg-red-500/10 border-b border-red-500/20 text-sm text-red-300 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Falha ao listar pastas</p>
                  <p className="text-xs text-red-400 mt-1">
                    Verifique a conectividade e tente novamente
                  </p>
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
                            <div
                              className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-blue-500/30"
                                  : "bg-white/5 group-hover:bg-white/10"
                              }`}
                            >
                              <FolderOpen
                                className={`h-4 w-4 ${isSelected ? "text-blue-300" : "text-gray-400"}`}
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
                              <p
                                className={`text-sm font-medium truncate ${isSelected ? "text-blue-200" : "text-white"}`}
                              >
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

          {selectedFolder && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-blue-300 font-semibold">
                  📁 Pasta selecionada
                </p>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {selectedFolder.name}
                    </p>
                    <p className="text-xs text-blue-300/70 truncate font-mono">
                      {selectedFolder.id}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-blue-500/20">
                <p className="text-xs font-medium text-blue-300 uppercase">
                  ✓ Etapa 1: Analisar e criar draft
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">maxFiles</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={stageMaxFiles}
                      onChange={(event) =>
                        setStageMaxFiles(Number(event.target.value || 100))
                      }
                      className="w-full mt-1 px-2 py-1.5 rounded bg-white/10 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <button
                    onClick={() => void stageFolder()}
                    disabled={stageMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/40 hover:bg-blue-600/60 text-blue-100 font-medium text-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {stageMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Criando draft...
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-3.5 w-3.5" />
                        Analisar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {activeDraftId && (
                <div className="space-y-3 pt-1 border-t border-blue-500/20">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-blue-300 uppercase">
                      🧩 Etapa 2: Revisar/editar itens do draft
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void refetchDraft()}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white hover:bg-white/15"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Atualizar draft
                      </button>
                      <button
                        onClick={() => void cancelDraft()}
                        disabled={cancelDraftMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/30"
                      >
                        {cancelDraftMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Cancelar draft
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-textDim)] font-mono">
                    draftId: {activeDraftId}
                  </p>

                  {draftData?.draft.rejected && draftData.draft.rejected.length > 0 && (
                    <details className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                      <summary className="cursor-pointer font-medium">
                        {draftData.draft.rejected.length} arquivo(s) rejeitado(s)
                      </summary>
                      <div className="mt-2 space-y-1">
                        {draftData.draft.rejected
                          .slice(0, 10)
                          .map((entry, index) => (
                            <p
                              key={`${entry.filename || entry.fileId || "rejected"}-${index}`}
                            >
                              {(entry.filename || entry.fileId || "Arquivo")} —{" "}
                              {entry.reason}
                            </p>
                          ))}
                      </div>
                    </details>
                  )}

                  {draftData?.draft.processing?.state === "processing" && (
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200">
                      Analisando {draftData.draft.processing.analyzedCount}/
                      {draftData.draft.processing.totalReceived} arquivo(s)...
                    </div>
                  )}

                  {draftData?.draft.processing?.state === "failed" && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                      Falha ao analisar draft.
                      {draftData.draft.processing.error && (
                        <p className="mt-1 text-[11px] text-red-200/80">
                          {draftData.draft.processing.error}
                        </p>
                      )}
                    </div>
                  )}

                  {isDraftLoading ? (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
                    </div>
                  ) : draftItems.length > 0 ? (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-[11px] text-[var(--color-textDim)]">
                        Itens com review manual: {reviewRequiredCount} ·
                        pendentes:{" "}
                        <span
                          className={
                            unresolvedReviewCount > 0
                              ? "text-yellow-300 font-medium"
                              : "text-green-300 font-medium"
                          }
                        >
                          {unresolvedReviewCount}
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => void applySuggestionsToAllDraftItems()}
                          className="px-2 py-1 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[11px] hover:bg-[var(--color-primary)]/30"
                        >
                          Usar sugestões (lote)
                        </button>
                        <button
                          onClick={() =>
                            void applyDecisionToAllDraftItems("NEW_SERIES")
                          }
                          className="px-2 py-1 rounded bg-white/10 text-white text-[11px] hover:bg-white/15"
                        >
                          Todos: NEW_SERIES
                        </button>
                        <button
                          onClick={() =>
                            void applyDecisionToAllDraftItems("SKIP")
                          }
                          className="px-2 py-1 rounded bg-white/10 text-white text-[11px] hover:bg-white/15"
                        >
                          Todos: SKIP
                        </button>
                      </div>

                      {draftItems.map((item) => (
                        <DraftItemEditor
                          key={item.id}
                          draftId={activeDraftId}
                          item={item}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-[var(--color-textDim)]">
                      Nenhum item no draft.
                    </div>
                  )}

                  <div className="pt-2 border-t border-blue-500/20">
                    <p className="text-xs font-medium text-blue-300 uppercase mb-2">
                      ⚡ Etapa 3: Confirmar draft
                    </p>
                    <button
                      onClick={() => void confirmDraft()}
                      disabled={
                        confirmDraftMutation.isPending ||
                        draftItems.length === 0 ||
                        driveProcessingState !== "completed" ||
                        unresolvedReviewCount > 0
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/70 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {confirmDraftMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Confirmar e enviar jobs
                    </button>
                    {unresolvedReviewCount > 0 && (
                      <p className="mt-2 text-xs text-yellow-300">
                        Resolva os itens com review manual antes de confirmar.
                      </p>
                    )}
                    {driveProcessingState !== "completed" && (
                      <p className="mt-2 text-xs text-blue-300">
                        Aguarde o processamento do draft terminar para confirmar.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {confirmResult && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30 text-xs space-y-2">
                  <p className="font-semibold text-green-200">
                    ✅ Draft confirmado
                  </p>
                  <p className="text-green-300/90">
                    {confirmResult.accepted} aceitos · {confirmResult.rejected}{" "}
                    rejeitados · {confirmResult.skipped} ignorados
                  </p>
                  {confirmResult.jobs.length > 0 && (
                    <div className="pt-2 border-t border-green-500/20">
                      <p className="text-green-300/75 text-[10px] uppercase tracking-wide">
                        Jobs criados
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {confirmResult.jobs.slice(0, 8).map((jobId) => (
                          <span
                            key={jobId}
                            className="px-2 py-1 rounded bg-green-500/20 text-green-300 font-mono text-[9px] border border-green-500/30"
                            title={jobId}
                          >
                            {jobId.substring(0, 12)}...
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {importHistory.length > 0 && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
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
                        className="text-[11px] text-gray-300 rounded-lg border border-white/8 bg-white/3 px-2.5 py-2"
                      >
                        <p className="font-medium truncate text-white">
                          {item.folderName}
                        </p>
                        <p className="text-gray-500 text-[10px]">
                          {new Date(item.timestamp).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {item.accepted} aceitos · {item.rejected} rejeitados ·{" "}
                          {item.skipped} ignorados
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!isConnected && !isStatusLoading && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300">
          👉 Fluxo oficial: conectar → listar pastas → stage draft → revisar
          itens → confirmar.
        </div>
      )}
    </div>
  );
}
