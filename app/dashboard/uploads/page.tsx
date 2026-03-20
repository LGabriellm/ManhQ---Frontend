"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  useLocalUploadStage,
  useLocalUploadStageWithSeries,
  useLocalUploadDraft,
  useUpdateLocalUploadDraftItem,
  useBulkUpdateLocalUploadDraftItems,
  useConfirmLocalUploadDraft,
  useCancelLocalUploadDraft,
  useAdminSeries,
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
import type {
  AdminJob,
  UploadDecision,
  UploadDraftItem,
  UploadPlanPatch,
} from "@/types/api";
import { GoogleDrivePanel } from "@/components/GoogleDrivePanel";
import { BulkEditModal } from "@/components/admin/BulkEditModal";
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

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
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

function LocalDraftItemEditor({
  item,
  onSave,
  isSaving,
}: {
  item: UploadDraftItem;
  onSave: (itemId: string, patch: UploadPlanPatch) => Promise<void>;
  isSaving: boolean;
}) {
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

  const applySuggestedSeries = async () => {
    if (!item.suggestion.matchedSeriesId) {
      toast.error("Sem série sugerida para este item");
      return;
    }

    setDecision("EXISTING_SERIES");
    setTargetSeriesId(item.suggestion.matchedSeriesId);
    setSeriesQuery(item.suggestion.matchedSeriesTitle || "");

    await onSave(item.id, {
      decision: "EXISTING_SERIES",
      targetSeriesId: item.suggestion.matchedSeriesId,
      chapterNumber: chapterNumber === "" ? undefined : Number(chapterNumber),
    });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[var(--color-surface)] p-3 space-y-2">
      <p className="text-sm font-medium text-[var(--color-textMain)] truncate">
        {item.originalName}
      </p>
      <p className="text-xs text-[var(--color-textDim)]">
        Sugestão:{" "}
        {item.suggestion.matchedSeriesTitle || item.parsed.normalizedTitle}
      </p>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="text-[11px] text-[var(--color-textDim)]">
          decision
          <select
            value={decision}
            onChange={(event) =>
              setDecision(event.target.value as UploadDecision)
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          >
            <option value="EXISTING_SERIES">EXISTING_SERIES</option>
            <option value="NEW_SERIES">NEW_SERIES</option>
            <option value="SKIP">SKIP</option>
          </select>
        </label>

        {decision === "EXISTING_SERIES" ? (
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--color-textDim)]">
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
              className="w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
            />

            {seriesSearchEnabled && debouncedSeriesQuery.length >= 2 && (
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
                      <p className="text-xs text-[var(--color-textMain)] truncate">
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
        ) : (
          <label className="text-[11px] text-[var(--color-textDim)]">
            newSeriesTitle
            <input
              value={newSeriesTitle}
              onChange={(event) => setNewSeriesTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
            />
          </label>
        )}

        <label className="text-[11px] text-[var(--color-textDim)]">
          chapterNumber
          <input
            type="number"
            value={chapterNumber}
            onChange={(event) =>
              setChapterNumber(
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          />
        </label>

        <label className="text-[11px] text-[var(--color-textDim)]">
          volume
          <input
            type="number"
            value={volume}
            onChange={(event) =>
              setVolume(
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          />
        </label>

        <label className="text-[11px] text-[var(--color-textDim)]">
          year
          <input
            type="number"
            value={year}
            onChange={(event) =>
              setYear(
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          />
        </label>

        <label className="text-[11px] text-[var(--color-textDim)]">
          status
          <input
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          />
        </label>

        <label className="text-[11px] text-[var(--color-textDim)]">
          author
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          />
        </label>

        <label className="text-[11px] text-[var(--color-textDim)]">
          artist
          <input
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          />
        </label>

        <label className="text-[11px] text-[var(--color-textDim)] md:col-span-2">
          tags (vírgula)
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          />
        </label>

        <label className="text-[11px] text-[var(--color-textDim)] md:col-span-2">
          description
          <textarea
            value={description}
            rows={2}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-textMain)]"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-[11px] text-[var(--color-textDim)] md:col-span-2">
          <input
            type="checkbox"
            checked={isOneShot}
            onChange={(event) => setIsOneShot(event.target.checked)}
          />
          isOneShot
        </label>
      </div>

      <button
        onClick={() => void applySuggestedSeries()}
        disabled={isSaving || !item.suggestion.matchedSeriesId}
        className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-[var(--color-textMain)] hover:bg-white/15 disabled:opacity-50"
      >
        Usar sugestão automaticamente
      </button>

      <button
        onClick={() =>
          void onSave(item.id, {
            decision,
            targetSeriesId:
              decision === "EXISTING_SERIES"
                ? targetSeriesId || undefined
                : undefined,
            newSeriesTitle:
              decision === "NEW_SERIES"
                ? newSeriesTitle || undefined
                : undefined,
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
          })
        }
        disabled={isSaving}
        className="mt-1 inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
      >
        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Salvar item
      </button>
    </div>
  );
}

// ===== Upload Zone (Redesigned) =====
function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<UploadMode>("files");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [seriesTitle, setSeriesTitle] = useState("");
  const [folderName, setFolderName] = useState("");
  const [activeDraftId, setActiveDraftId] = useState("");
  const [processingState, setProcessingState] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [localConfirmResult, setLocalConfirmResult] = useState<{
    accepted: number;
    rejected: number;
    skipped: number;
    jobs: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const stageMutation = useLocalUploadStageWithSeries();
  const updateDraftItemMutation = useUpdateLocalUploadDraftItem();
  const bulkUpdateMutation = useBulkUpdateLocalUploadDraftItems();
  const confirmDraftMutation = useConfirmLocalUploadDraft();
  const cancelDraftMutation = useCancelLocalUploadDraft();

  const { data: draftData, isLoading: isDraftLoading } = useLocalUploadDraft(
    activeDraftId,
    !!activeDraftId,
  );

  // Monitor processing state from draft
  useEffect(() => {
    if (!draftData?.draft.processing) return;

    const state = draftData.draft.processing.state;
    if (state === "processing") {
      setProcessingState("processing");
    } else if (state === "completed") {
      setProcessingState("completed");
    } else if (state === "failed") {
      setProcessingState("failed");
    }
  }, [draftData]);

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
      if (detectedFolder && !seriesTitle) {
        setSeriesTitle(detectedFolder);
        setMode("folder");
        setFolderName(detectedFolder);
      }
    },
    [seriesTitle],
  );

  // Handle drag & drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const items = e.dataTransfer.items;
      if (!items) {
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
        return;
      }

      const allFiles: File[] = [];
      let detectedFolder: string | undefined;

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

  const handleFolderSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
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
    setSeriesTitle("");
    setActiveDraftId("");
    setProcessingState("idle");
    setLocalConfirmResult(null);
  };

  const startStage = async () => {
    if (pendingFiles.length === 0) return;
    if (!seriesTitle.trim()) {
      toast.error("Digite o nome da série");
      return;
    }

    try {
      setProcessingState("processing");
      const files = pendingFiles.map((p) => p.file);

      const stageResponse = await stageMutation.mutateAsync({
        files,
        seriesTitle: seriesTitle.trim(),
        folderName: mode === "folder" ? folderName.trim() : undefined,
      });

      setActiveDraftId(stageResponse.draftId);
      setLocalConfirmResult(null);

      toast.success(
        `Análise iniciada: ${stageResponse.processing?.totalReceived || stageResponse.items.length} arquivo(s)`,
      );
    } catch (err) {
      setProcessingState("failed");
      const errorMsg =
        (err as { message?: string })?.message || "Erro ao iniciar stage";
      toast.error(errorMsg);
    }
  };

  const saveLocalItemPatch = async (
    itemId: string,
    originalName: string,
    patch: UploadPlanPatch,
  ) => {
    try {
      await updateDraftItemMutation.mutateAsync({
        draftId: activeDraftId,
        itemId,
        data: patch,
      });
      toast.success(`Item atualizado: ${originalName}`);
    } catch {
      toast.error("Erro ao atualizar item do draft");
    }
  };

  const applyDecisionToAll = async (decision: UploadDecision) => {
    const items = draftData?.draft.items || [];
    if (items.length === 0) {
      return;
    }

    try {
      await Promise.all(
        items.map((item) =>
          updateDraftItemMutation.mutateAsync({
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
                  ? item.plan.targetSeriesId || item.suggestion.matchedSeriesId
                  : undefined,
            },
          }),
        ),
      );
      toast.success(`Decisão ${decision} aplicada em ${items.length} item(ns)`);
    } catch {
      toast.error("Falha ao aplicar decisão em lote");
    }
  };

  const applySuggestionsToAll = async () => {
    const items = (draftData?.draft.items || []).filter(
      (item) => item.suggestion.matchedSeriesId,
    );
    if (items.length === 0) {
      toast.error("Nenhum item com sugestão de série existente");
      return;
    }

    try {
      await Promise.all(
        items.map((item) =>
          updateDraftItemMutation.mutateAsync({
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
      toast.success(`Sugestões aplicadas em ${items.length} item(ns)`);
    } catch {
      toast.error("Falha ao aplicar sugestões em lote");
    }
  };

  const confirmLocalDraft = async () => {
    if (!activeDraftId) {
      return;
    }

    // Validar que processing está completo
    if (processingState !== "completed") {
      if (processingState === "processing") {
        toast.error("Aguarde a conclusão da análise antes de confirmar");
      } else if (processingState === "failed") {
        toast.error("A análise falhou. Revise os erros e tente novamente.");
      }
      return;
    }

    try {
      const result = await confirmDraftMutation.mutateAsync({
        draftId: activeDraftId,
      });

      setLocalConfirmResult({
        accepted: result.totals.accepted,
        rejected: result.totals.rejected,
        skipped: result.totals.skipped,
        jobs: result.accepted.map((item) => item.jobId),
      });

      setPendingFiles([]);
      setFolderName("");
      setSeriesTitle("");
      setActiveDraftId("");
      setProcessingState("idle");

      toast.success("Draft confirmado e jobs enviados");
    } catch (err) {
      const errorMsg =
        (err as unknown as { message?: string } | null)?.message ||
        "Erro ao confirmar draft";
      if ((err as unknown as { status?: number } | null)?.status === 409) {
        toast.error("Processamento ainda em andamento. Aguarde.");
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const cancelLocalDraft = async () => {
    if (!activeDraftId) {
      return;
    }

    try {
      await cancelDraftMutation.mutateAsync(activeDraftId);
      setActiveDraftId("");
      setProcessingState("idle");
      setLocalConfirmResult(null);
      toast.success("Draft local cancelado");
    } catch {
      toast.error("Erro ao cancelar draft local");
    }
  };

  const applyBulkEdit = async (updates: Record<string, any>) => {
    if (!activeDraftId) {
      return;
    }

    try {
      const itemIds = Object.keys(updates);

      // Apply updates to each item individually
      await Promise.all(
        itemIds.map((itemId) =>
          updateDraftItemMutation.mutateAsync({
            draftId: activeDraftId,
            itemId,
            data: updates[itemId] as UploadPlanPatch,
          }),
        ),
      );

      toast.success(`${itemIds.length} item(ns) atualizados`);
    } catch {
      toast.error("Erro ao aplicar edição em lote");
    }
  };

  const isPending =
    stageMutation.isPending ||
    updateDraftItemMutation.isPending ||
    bulkUpdateMutation.isPending ||
    confirmDraftMutation.isPending ||
    cancelDraftMutation.isPending;

  const totalSize = pendingFiles.reduce((sum, p) => sum + p.file.size, 0);

  // Progress during processing
  const processingProgress =
    draftData?.draft.processing?.totalReceived &&
    draftData?.draft.processing?.analyzedCount
      ? (draftData.draft.processing.analyzedCount /
          draftData.draft.processing.totalReceived) *
        100
      : 0;

  // Handle drag & drop — supports folders via webkitGetAsEntry

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
      {/* Series Title Input - Obrigatório */}
      <div className="px-5 pt-4">
        <label className="block text-sm text-[var(--color-textDim)] mb-1.5 font-medium">
          Nome da Série *
        </label>
        <input
          type="text"
          value={seriesTitle}
          onChange={(e) => setSeriesTitle(e.target.value)}
          placeholder="Ex: Chainsaw Man, Asa Noturna"
          disabled={!!activeDraftId}
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
        />
        <p className="text-[10px] text-[var(--color-textDim)] mt-1">
          O nome da série será preservado durante todo o fluxo e honrado no
          processamento final.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-t border-b border-white/5 mt-4">
        <button
          onClick={() => setMode("files")}
          disabled={!!activeDraftId}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
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
          disabled={!!activeDraftId}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
            mode === "folder"
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5"
              : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Pasta
        </button>
      </div>

      {/* Folder Name Input (only in folder mode) */}
      {mode === "folder" && !activeDraftId && (
        <div className="px-5 pt-4">
          <label className="block text-xs text-[var(--color-textDim)] mb-1.5">
            Sobrenome da pasta (opcional)
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Auto-detectado a partir dos arquivos"
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
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
              onClick={startStage}
              disabled={isPending || (mode === "folder" && !folderName.trim())}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Analisar {pendingFiles.length} arquivo(s)
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

      {activeDraftId && (
        <div className="border-t border-white/5 bg-[var(--color-background)] p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-textMain)]">
                {processingState === "processing"
                  ? "Analisando arquivos..."
                  : "Revisão do draft local"}
              </p>
              <p className="text-xs text-[var(--color-textDim)] font-mono mt-0.5">
                draftId: {activeDraftId}
              </p>
            </div>
            <button
              onClick={cancelLocalDraft}
              className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>

          {/* Processing Progress Bar */}
          {processingState === "processing" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-textDim)]">
                  Analisando {draftData?.draft.processing?.analyzedCount || 0}/
                  {draftData?.draft.processing?.totalReceived || 0}
                </span>
                <span className="text-xs text-[var(--color-textDim)]">
                  {Math.round(processingProgress)}%
                </span>
              </div>
              <ProgressBar progress={processingProgress} />
              {draftData?.draft.processing && (
                <p className="text-[10px] text-[var(--color-textDim)]">
                  Aceitos: {draftData.draft.processing.acceptedCount} ·
                  Rejeitados: {draftData.draft.processing.rejectedCount}
                </p>
              )}
            </div>
          )}

          {processingState === "failed" && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <p>Failed to process draft</p>
              {draftData?.draft.processing?.error && (
                <p className="text-[10px] mt-1 opacity-80">
                  {draftData.draft.processing.error}
                </p>
              )}
            </div>
          )}

          {processingState === "completed" && draftData?.draft.items?.length ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="rounded-lg border border-white/10 bg-[var(--color-surface)] p-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setBulkEditOpen(true)}
                  className="px-2 py-1 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[11px] hover:bg-[var(--color-primary)]/30"
                >
                  ⚙️ Edição em Lote
                </button>
                <button
                  onClick={() => void applySuggestionsToAll()}
                  className="px-2 py-1 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[11px] hover:bg-[var(--color-primary)]/30"
                >
                  Usar sugestões
                </button>
                <button
                  onClick={() => void applyDecisionToAll("NEW_SERIES")}
                  className="px-2 py-1 rounded bg-white/10 text-[var(--color-textMain)] text-[11px] hover:bg-white/15"
                >
                  Todos: NEW_SERIES
                </button>
                <button
                  onClick={() => void applyDecisionToAll("SKIP")}
                  className="px-2 py-1 rounded bg-white/10 text-[var(--color-textMain)] text-[11px] hover:bg-white/15"
                >
                  Todos: SKIP
                </button>
              </div>

              {draftData.draft.items.map((item) => (
                <LocalDraftItemEditor
                  key={item.id}
                  item={item}
                  isSaving={
                    updateDraftItemMutation.isPending ||
                    bulkUpdateMutation.isPending
                  }
                  onSave={(itemId, patch) =>
                    saveLocalItemPatch(itemId, item.originalName, {
                      ...patch,
                      chapterNumber:
                        patch.chapterNumber ??
                        item.plan.chapterNumber ??
                        item.parsed.number,
                      newSeriesTitle:
                        patch.decision === "NEW_SERIES"
                          ? patch.newSeriesTitle || item.parsed.normalizedTitle
                          : patch.newSeriesTitle,
                      targetSeriesId:
                        patch.decision === "EXISTING_SERIES"
                          ? patch.targetSeriesId ||
                            item.suggestion.matchedSeriesId
                          : patch.targetSeriesId,
                    })
                  }
                />
              ))}
            </div>
          ) : (
            processingState === "completed" && (
              <p className="text-xs text-[var(--color-textDim)]">
                Nenhum item aceito na análise.
              </p>
            )
          )}

          {processingState === "completed" && (
            <div className="flex items-center gap-2">
              <button
                onClick={confirmLocalDraft}
                disabled={
                  confirmDraftMutation.isPending ||
                  !draftData?.draft.items?.length
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
              >
                {confirmDraftMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirmar & Criar Jobs
              </button>
            </div>
          )}

          {localConfirmResult && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-200 space-y-1">
              <p>
                ✅ {localConfirmResult.accepted} aceitos ·{" "}
                {localConfirmResult.rejected} rejeitados ·{" "}
                {localConfirmResult.skipped} ignorados
              </p>
              {localConfirmResult.jobs.length > 0 && (
                <p className="text-[10px] text-green-300/80">
                  Jobs: {localConfirmResult.jobs.slice(0, 4).join(", ")}
                  {localConfirmResult.jobs.length > 4 ? " ..." : ""}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={bulkEditOpen}
        items={draftData?.draft.items || []}
        onClose={() => setBulkEditOpen(false)}
        onApply={applyBulkEdit}
        isPending={bulkUpdateMutation.isPending}
      />
    </div>
  );
}

// ===== Google Drive Import Panel =====
function GoogleDriveImportPanel() {
  return <GoogleDrivePanel />;
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
  const { data, isLoading, error, refetch, isRefetching } = useAdminJobs();
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

      {/* Google Drive Import */}
      <GoogleDriveImportPanel />

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
        ) : error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-red-400 font-medium">
              Falha ao carregar jobs
            </p>
            <p className="text-xs text-[var(--color-textDim)] mt-1">
              Verifique conexão/sessão e tente atualizar.
            </p>
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
