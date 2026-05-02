"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTrackedTitle,
  useSyncChapters,
  useCheckUpdates,
  useImportChapter,
  useBulkImportChapters,
  useUpdateTrackedTitle,
  useDeleteTrackedTitle,
  useRefreshTitle,
  useRetryFailedChapters,
  useRetryChapter,
  useUpdateChapter,
  useCleanupStale,
  useChapterHealth,
  useValidateChapters,
  useFindDuplicates,
  useSeriesSources,
  useSetPrimarySource,
  useRemoveProviderSource,
  useLinkProviderToSeries,
  providerKeys,
} from "@/hooks/useProvider";
import { providerService } from "@/services/provider.service";
import { ImportStatusBadge } from "@/components/provider/ImportStatusBadge";
import { ReimportFromModal } from "@/components/provider/ReimportFromModal";
import { ChapterHealthBadge } from "@/components/provider/ChapterHealthBadge";
import type {
  ChapterImportStatus,
  ApiError,
  ProviderChapter,
} from "@/types/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Download,
  Trash2,
  Pause,
  Play,
  BookOpen,
  User as UserIcon,
  Calendar,
  Tag,
  Globe,
  Link as LinkIcon,
  Settings,
  CheckCircle2,
  Bell,
  Square,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  Clock,
  Zap,
  Repeat,
  ShieldCheck,
  Star,
  X,
  ExternalLink,
  Plus,
} from "lucide-react";

function getErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as { response?: { data?: ApiError }; message?: string };
  return (
    apiErr?.response?.data?.message ||
    apiErr?.response?.data?.error ||
    apiErr?.message ||
    fallback
  );
}

function formatElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}min`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

const CHAPTER_FILTER_OPTIONS: {
  value: ChapterImportStatus | "";
  label: string;
}[] = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendentes" },
  { value: "DOWNLOADING", label: "Baixando" },
  { value: "DOWNLOADED", label: "Baixados" },
  { value: "IMPORTED", label: "Importados" },
  { value: "FAILED", label: "Falhos" },
  { value: "SKIPPED", label: "Ignorados" },
];

export default function TrackedTitleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [chapterFilter, setChapterFilter] = useState<ChapterImportStatus | "">(
    "",
  );
  const [showSettings, setShowSettings] = useState(false);
  const [importingChapters, setImportingChapters] = useState<Set<string>>(
    new Set(),
  );
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(
    new Set(),
  );
  const [intervalHours, setIntervalHours] = useState<number | null>(null);

  const { data, isLoading } = useTrackedTitle(id);
  const syncChapters = useSyncChapters();
  const checkUpdates = useCheckUpdates();
  const importChapter = useImportChapter();
  const bulkImport = useBulkImportChapters();
  const updateTitle = useUpdateTrackedTitle();
  const deleteTitle = useDeleteTrackedTitle();
  const refreshTitle = useRefreshTitle();
  const retryFailed = useRetryFailedChapters();
  const retryChapter = useRetryChapter();
  const updateChapter = useUpdateChapter();
  const cleanupStale = useCleanupStale();
  const [retryingChapters, setRetryingChapters] = useState<Set<string>>(
    new Set(),
  );
  const [skippingChapters, setSkippingChapters] = useState<Set<string>>(
    new Set(),
  );
  const [reimportChapter, setReimportChapter] =
    useState<ProviderChapter | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkPriority, setLinkPriority] = useState<number>(10);
  const [linkNotes, setLinkNotes] = useState("");
  const [seriesSearchQuery, setSeriesSearchQuery] = useState("");
  const [seriesSearchResults, setSeriesSearchResults] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [seriesSearchLoading, setSeriesSearchLoading] = useState(false);
  const [selectedSeriesForLink, setSelectedSeriesForLink] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const title = data?.providerTitle;

  const chapterHealth = useChapterHealth(id);
  const validateChapters = useValidateChapters();
  const findDuplicates = useFindDuplicates(id);
  const seriesId = title?.series?.id ?? null;
  const seriesSources = useSeriesSources(seriesId);
  const setPrimary = useSetPrimarySource();
  const removeSource = useRemoveProviderSource();
  const linkProvider = useLinkProviderToSeries();

  const filteredChapters = useMemo(
    () =>
      title?.chapters?.filter(
        (ch) => !chapterFilter || ch.importStatus === chapterFilter,
      ),
    [title?.chapters, chapterFilter],
  );

  const pendingChapters = useMemo(
    () => title?.chapters?.filter((ch) => ch.importStatus === "PENDING") ?? [],
    [title?.chapters],
  );

  const failedChapters = useMemo(
    () => title?.chapters?.filter((ch) => ch.importStatus === "FAILED") ?? [],
    [title?.chapters],
  );

  const downloadingChapters = useMemo(
    () =>
      title?.chapters?.filter(
        (ch) =>
          ch.importStatus === "DOWNLOADING" || ch.importStatus === "DOWNLOADED",
      ) ?? [],
    [title?.chapters],
  );

  const stuckChapters = useMemo(
    () =>
      downloadingChapters.filter((ch) => {
        const elapsed = Date.now() - new Date(ch.updatedAt).getTime();
        return elapsed > 15 * 60 * 1000; // > 15 minutes
      }),
    [downloadingChapters],
  );

  // Auto-clear stale selections: remove any selected chapter that's no longer
  // in an importable state (PENDING or FAILED) after a query refresh
  useEffect(() => {
    if (!title?.chapters || selectedChapters.size === 0) return;
    const importableIds = new Set(
      title.chapters
        .filter(
          (ch) => ch.importStatus === "PENDING" || ch.importStatus === "FAILED",
        )
        .map((ch) => ch.id),
    );
    setSelectedChapters((prev) => {
      const next = new Set([...prev].filter((id) => importableIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [title?.chapters]);

  function handleSeriesSearch(query: string) {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) {
      setSeriesSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSeriesSearchLoading(true);
      try {
        const result = await providerService.searchSeries(query);
        setSeriesSearchResults(result.series);
      } catch {
        // ignore search errors silently
      } finally {
        setSeriesSearchLoading(false);
      }
    }, 300);
  }

  function closeModal() {
    setShowLinkModal(false);
    setSelectedSeriesForLink(null);
    setSeriesSearchQuery("");
    setSeriesSearchResults([]);
    setLinkPriority(10);
    setLinkNotes("");
  }

  function handleSync() {
    syncChapters.mutate(id, {
      onSuccess: (res) =>
        toast.success(
          res.error
            ? `Erro parcial: ${res.error}`
            : `${res.newChaptersFound} novos capítulos encontrados`,
        ),
      onError: (err) =>
        toast.error(getErrorMessage(err, "Erro ao sincronizar")),
    });
  }

  function handleCheckUpdates() {
    checkUpdates.mutate(id, {
      onSuccess: (res) =>
        toast.success(
          res.newChaptersFound > 0
            ? `${res.newChaptersFound} novos capítulos detectados`
            : "Nenhum novo capítulo encontrado",
        ),
      onError: (err) =>
        toast.error(getErrorMessage(err, "Erro ao verificar atualizações")),
    });
  }

  function handleImportChapter(chapterId: string) {
    setImportingChapters((prev) => new Set(prev).add(chapterId));
    importChapter.mutate(chapterId, {
      onSuccess: (res) => {
        if (res.queued) {
          toast.success("Capítulo enfileirado para importação");
        } else {
          toast.error(res.error || "Erro ao importar");
        }
      },
      onError: (err) =>
        toast.error(getErrorMessage(err, "Erro ao importar capítulo")),
      onSettled: () =>
        setImportingChapters((prev) => {
          const next = new Set(prev);
          next.delete(chapterId);
          return next;
        }),
    });
  }

  function handleRetryChapter(chapterId: string) {
    setRetryingChapters((prev) => new Set(prev).add(chapterId));
    retryChapter.mutate(chapterId, {
      onSuccess: (res) => {
        if (res.queued) {
          toast.success(
            res.previousError
              ? `Reimportando (erro anterior: ${res.previousError.slice(0, 60)}...)`
              : "Capítulo enfileirado para reimportação",
          );
        } else {
          toast.success("Capítulo resetado para reimportação");
        }
      },
      onError: (err) =>
        toast.error(getErrorMessage(err, "Erro ao retentar capítulo")),
      onSettled: () =>
        setRetryingChapters((prev) => {
          const next = new Set(prev);
          next.delete(chapterId);
          return next;
        }),
    });
  }

  function handleCleanupStale() {
    cleanupStale.mutate(15, {
      onSuccess: (res) => {
        if (res.reset > 0) {
          toast.success(
            `${res.reset} capítulo(s) preso(s) resetados para falho`,
          );
        } else {
          toast.success("Nenhum capítulo preso encontrado");
        }
      },
      onError: (err) =>
        toast.error(getErrorMessage(err, "Erro ao limpar capítulos presos")),
    });
  }

  function handleSkipChapter(chapterId: string) {
    setSkippingChapters((prev) => new Set(prev).add(chapterId));
    updateChapter.mutate(
      { chapterId, data: { importStatus: "SKIPPED" } },
      {
        onSuccess: () => toast.success("Capítulo marcado como ignorado"),
        onError: (err) =>
          toast.error(getErrorMessage(err, "Erro ao ignorar capítulo")),
        onSettled: () =>
          setSkippingChapters((prev) => {
            const next = new Set(prev);
            next.delete(chapterId);
            return next;
          }),
      },
    );
  }

  function handleImportAllPending() {
    if (!pendingChapters.length) return;
    if (
      !confirm(
        `Enfileirar ${pendingChapters.length} capítulos pendentes para importação?`,
      )
    )
      return;
    bulkImport.mutate(
      { id },
      {
        onSuccess: (res) => {
          if (res.alreadyProcessing && res.alreadyProcessing > 0) {
            toast.success(
              `${res.queued} enfileirado(s) · ${res.alreadyProcessing} já em processamento`,
            );
          } else {
            toast.success(`${res.queued} capítulo(s) enfileirado(s)`);
          }
        },
        onError: (err) =>
          toast.error(getErrorMessage(err, "Erro ao importar capítulos")),
      },
    );
  }

  function handleImportSelected() {
    if (!selectedChapters.size) return;

    // Filter to only chapters still in importable state (PENDING or FAILED)
    const importableIds = Array.from(selectedChapters).filter((chId) => {
      const ch = title?.chapters?.find((c) => c.id === chId);
      return ch && (ch.importStatus === "PENDING" || ch.importStatus === "FAILED");
    });

    if (!importableIds.length) {
      toast("Os capítulos selecionados já estão sendo processados", {
        icon: "⏳",
      });
      setSelectedChapters(new Set());
      return;
    }

    if (
      !confirm(
        `Enfileirar ${importableIds.length} capítulo(s) selecionado(s) para importação?`,
      )
    )
      return;
    bulkImport.mutate(
      { id, data: { chapterIds: importableIds } },
      {
        onSuccess: (res) => {
          if (res.alreadyProcessing && res.alreadyProcessing > 0) {
            toast.success(
              `${res.queued} enfileirado(s) · ${res.alreadyProcessing} já em processamento`,
            );
          } else {
            toast.success(`${res.queued} capítulo(s) enfileirado(s)`);
          }
          setSelectedChapters(new Set());
        },
        onError: (err) =>
          toast.error(getErrorMessage(err, "Erro ao importar capítulos")),
      },
    );
  }

  function toggleSelectChapter(chapterId: string) {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    const importable =
      filteredChapters?.filter(
        (ch) => ch.importStatus === "PENDING" || ch.importStatus === "FAILED",
      ) ?? [];
    if (selectedChapters.size === importable.length && importable.length > 0) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(importable.map((ch) => ch.id)));
    }
  }

  function handleUpdateInterval() {
    if (intervalHours == null || !title) return;
    const ms = Math.max(1, intervalHours) * 3600000;
    updateTitle.mutate(
      { id, data: { checkIntervalMs: ms } },
      {
        onSuccess: () => {
          toast.success(`Intervalo atualizado para ${intervalHours}h`);
          setIntervalHours(null);
        },
      },
    );
  }

  function handleToggleSync() {
    if (!title) return;
    updateTitle.mutate(
      { id, data: { syncEnabled: !title.syncEnabled } },
      {
        onSuccess: () =>
          toast.success(
            title.syncEnabled ? "Sync desabilitado" : "Sync habilitado",
          ),
      },
    );
  }

  function handleTogglePause() {
    if (!title) return;
    const newStatus = title.importStatus === "PAUSED" ? "TRACKED" : "PAUSED";
    updateTitle.mutate(
      { id, data: { importStatus: newStatus as "TRACKED" | "PAUSED" } },
      {
        onSuccess: () =>
          toast.success(
            newStatus === "PAUSED"
              ? "Importação pausada"
              : "Importação retomada",
          ),
      },
    );
  }

  function handleDelete() {
    if (!title) return;
    if (
      !confirm(
        `Remover "${title.titlePortuguese || title.title}" do rastreamento?`,
      )
    )
      return;
    deleteTitle.mutate(id, {
      onSuccess: () => {
        toast.success("Título removido");
        router.push("/dashboard/providers");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!title) {
    return (
      <div className="py-32 text-center text-sm text-[var(--color-textDim)]">
        Título não encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/providers")}
          className="rounded-lg p-2 text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-[var(--color-textMain)]">
            {title.titlePortuguese || title.title}
          </h1>
          <p className="text-sm text-[var(--color-textDim)]">
            {title.provider} &middot; {title.externalId.slice(0, 8)}...
          </p>
        </div>
        <ImportStatusBadge
          status={title.importStatus}
          pulse={title.importStatus === "IMPORTING"}
        />
      </div>

      {/* Title info card */}
      <div className="surface-panel flex flex-col gap-4 rounded-xl border border-white/5 p-5 sm:flex-row">
        {title.coverUrl ? (
          <img
            src={title.coverUrl.startsWith("/") ? `/api${title.coverUrl}` : title.coverUrl}
            alt={title.title}
            className="h-44 w-32 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-44 w-32 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <BookOpen className="h-8 w-8 text-[var(--color-textDim)]" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="space-y-2">
            {title.titleOriginal && title.titleOriginal !== title.title && (
              <p className="text-xs text-[var(--color-textDim)]">
                Original: {title.titleOriginal}
              </p>
            )}

            {(title.descriptionPtBr || title.description) && (
              <p className="text-sm text-[var(--color-textDim)] line-clamp-3">
                {title.descriptionPtBr || title.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {title.author && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                  <UserIcon className="h-3 w-3" />
                  {title.author}
                </span>
              )}
              {title.year && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                  <Calendar className="h-3 w-3" />
                  {title.year}
                </span>
              )}
              {title.status && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                  <Globe className="h-3 w-3" />
                  {title.status}
                </span>
              )}
              {title.contentRating && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                  <Tag className="h-3 w-3" />
                  {title.contentRating}
                </span>
              )}
            </div>

            {title.tags && title.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {title.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] text-[var(--color-primary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Series link */}
          {title.series && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <LinkIcon className="h-4 w-4 text-emerald-400" />
              <span className="text-[var(--color-textDim)]">Série local:</span>
              <span className="font-medium text-emerald-400">
                {title.series.title}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chapter Health Card */}
      {chapterHealth.data && (
        <div className="surface-panel rounded-xl border border-white/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-[var(--color-textMain)]">
                Saúde dos Capítulos
              </h3>
            </div>
            <button
              onClick={() =>
                validateChapters.mutate(id, {
                  onSuccess: () =>
                    toast.success("Validação de capítulos enfileirada"),
                  onError: (err) =>
                    toast.error(
                      getErrorMessage(err, "Erro ao validar capítulos"),
                    ),
                })
              }
              disabled={validateChapters.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--color-textDim)] hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {validateChapters.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ShieldCheck className="h-3 w-3" />
              )}
              Validar Capítulos
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "Saudável",
                value: chapterHealth.data.healthy,
                cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              },
              {
                label: "Incompleto",
                value: chapterHealth.data.incomplete,
                cls: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
              },
              {
                label: "Quebrado",
                value: chapterHealth.data.broken,
                cls: "bg-red-500/10 border-red-500/20 text-red-400",
              },
              {
                label: "Validando",
                value: chapterHealth.data.pendingValidation,
                cls: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
              },
              {
                label: "Indisponível",
                value: chapterHealth.data.unavailable,
                cls: "bg-slate-500/10 border-slate-500/20 text-slate-400",
              },
            ].map((chip) => (
              <span
                key={chip.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${chip.cls}`}
              >
                {chip.label}: {chip.value}
              </span>
            ))}
          </div>

          {chapterHealth.data.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[var(--color-textDim)]">
                <span>
                  {chapterHealth.data.healthy} / {chapterHealth.data.total}{" "}
                  capítulos saudáveis
                </span>
                <span>
                  {Math.round(
                    (chapterHealth.data.healthy / chapterHealth.data.total) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.round((chapterHealth.data.healthy / chapterHealth.data.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duplicate Detection Banner */}
      {findDuplicates.data &&
        findDuplicates.data.candidates.filter((c) => c.confidence >= 0.7)
          .length > 0 && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 font-medium text-yellow-300">
              <AlertTriangle className="h-4 w-4" />
              Possíveis Duplicatas Detectadas
            </div>
            <p className="text-xs text-yellow-300/70">
              {
                findDuplicates.data.candidates.filter(
                  (c) => c.confidence >= 0.7,
                ).length
              }{" "}
              série(s) que podem já existir na sua biblioteca:
            </p>
            <div className="space-y-1.5">
              {findDuplicates.data.candidates
                .filter((c) => c.confidence >= 0.7)
                .map((candidate) => (
                  <div
                    key={candidate.seriesId}
                    className="flex items-center justify-between gap-3 rounded-lg bg-yellow-500/10 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-yellow-200">
                        {candidate.seriesTitle}
                      </span>
                      <span className="ml-2 text-[10px] text-yellow-300/60">
                        confiança: {Math.round(candidate.confidence * 100)}% ·{" "}
                        {candidate.matchReason}
                      </span>
                    </div>
                    <a
                      href={`/dashboard/series/${candidate.seriesId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-yellow-500/20 px-2.5 py-1 text-[10px] font-medium text-yellow-200 hover:bg-yellow-500/30 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver Série
                    </a>
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* Provider Sources Panel — always show Link button; sources list only when seriesId */}
      <div className="surface-panel rounded-xl border border-white/5 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-[var(--color-textMain)]">
              {seriesId ? "Fontes da Série" : "Vincular a Série"}
            </h3>
            {seriesId && seriesSources.data && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
                {seriesSources.data.sources.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Vincular Provedor
          </button>
        </div>

        {seriesId ? (
          seriesSources.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-textDim)]" />
            </div>
          ) : seriesSources.data?.sources.length === 0 ? (
            <p className="text-xs text-[var(--color-textDim)]">
              Nenhuma fonte vinculada.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {seriesSources.data?.sources.map((src) => (
                <div
                  key={src.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-textMain)]">
                        {src.providerTitle?.title ||
                          src.providerTitle?.provider ||
                          src.providerTitleId.slice(0, 8)}
                      </span>
                      {src.isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <Star className="h-2.5 w-2.5" />
                          PRIMÁRIO
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
                          Fallback
                        </span>
                      )}
                      {src.providerTitle?.importStatus && (
                        <ImportStatusBadge
                          status={src.providerTitle.importStatus}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--color-textDim)]">
                      <span>
                        {src.providerTitle?.provider || "—"} · prioridade{" "}
                        {src.priority}
                      </span>
                      {src.providerTitle?.reliabilityScore != null && (
                        <span>
                          confiabilidade:{" "}
                          {Math.round(src.providerTitle.reliabilityScore * 100)}%
                        </span>
                      )}
                      {src.language && <span>{src.language}</span>}
                    </div>
                    {src.notes && (
                      <p className="text-[10px] text-[var(--color-textDim)] italic">
                        {src.notes}
                      </p>
                    )}
                  </div>

                  {!src.isPrimary && seriesId && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() =>
                          setPrimary.mutate(
                            { seriesId, providerTitleId: src.providerTitleId },
                            {
                              onSuccess: () =>
                                toast.success("Fonte primária atualizada"),
                              onError: (err) =>
                                toast.error(
                                  getErrorMessage(
                                    err,
                                    "Erro ao definir fonte primária",
                                  ),
                                ),
                            },
                          )
                        }
                        disabled={setPrimary.isPending}
                        title="Definir como primário"
                        className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm("Remover esta fonte da série?")) return;
                          removeSource.mutate(
                            { seriesId, mappingId: src.id },
                            {
                              onSuccess: () => toast.success("Fonte removida"),
                              onError: (err) =>
                                toast.error(
                                  getErrorMessage(err, "Erro ao remover fonte"),
                                ),
                            },
                          );
                        }}
                        disabled={removeSource.isPending}
                        title="Remover fonte"
                        className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-xs text-[var(--color-textDim)]">
            Este provedor não está vinculado a nenhuma série. Use o botão acima
            para vincular.
          </p>
        )}
      </div>

      {/* Link Provider Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="surface-panel w-full max-w-sm rounded-xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--color-textMain)]">
                Vincular Provedor à Série
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-[var(--color-textDim)] hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-[var(--color-textDim)]">
                  Série
                </label>
                {selectedSeriesForLink ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                    <span className="text-sm font-medium text-emerald-400">
                      {selectedSeriesForLink.title}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSeriesForLink(null);
                        setSeriesSearchQuery("");
                      }}
                      className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={seriesSearchQuery}
                      onChange={(e) => {
                        setSeriesSearchQuery(e.target.value);
                        handleSeriesSearch(e.target.value);
                      }}
                      placeholder="Buscar série por título..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                    {seriesSearchLoading && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-textDim)]" />
                      </div>
                    )}
                    {seriesSearchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-[#1e1e1e] shadow-xl">
                        {seriesSearchResults.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setSelectedSeriesForLink(s);
                              setSeriesSearchResults([]);
                            }}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--color-textMain)] hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg"
                          >
                            {s.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[var(--color-textDim)]">
                  Prioridade (menor = mais prioritário)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={linkPriority}
                  onChange={(e) => setLinkPriority(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[var(--color-textDim)]">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  placeholder="Fonte de fallback para PT-BR..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--color-textDim)] hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const targetSeriesId = selectedSeriesForLink?.id;
                  if (!targetSeriesId) {
                    toast.error("Selecione uma série");
                    return;
                  }
                  linkProvider.mutate(
                    {
                      providerTitleId: id,
                      seriesId: targetSeriesId,
                      priority: linkPriority,
                      notes: linkNotes.trim() || undefined,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Provedor vinculado à série");
                        closeModal();
                        queryClient.invalidateQueries({
                          queryKey: providerKeys.trackedDetail(id),
                        });
                      },
                      onError: (err) =>
                        toast.error(
                          getErrorMessage(err, "Erro ao vincular provedor"),
                        ),
                    },
                  );
                }}
                disabled={linkProvider.isPending}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {linkProvider.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Vincular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncChapters.isPending}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncChapters.isPending ? "animate-spin" : ""}`}
          />
          Sincronizar
        </button>

        <button
          onClick={handleCheckUpdates}
          disabled={checkUpdates.isPending}
          className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
        >
          {checkUpdates.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          Verificar Atualizações
        </button>

        {pendingChapters.length > 0 && (
          <button
            onClick={handleImportAllPending}
            disabled={bulkImport.isPending}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            {bulkImport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Importar Pendentes ({pendingChapters.length})
          </button>
        )}

        {selectedChapters.size > 0 && (
          <button
            onClick={handleImportSelected}
            disabled={bulkImport.isPending}
            className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
          >
            {bulkImport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Importar Selecionados ({selectedChapters.size})
          </button>
        )}

        <button
          onClick={() => {
            refreshTitle.mutate(id, {
              onSuccess: () =>
                toast.success("Metadados atualizados com sucesso"),
              onError: (err) =>
                toast.error(
                  getErrorMessage(err, "Erro ao atualizar metadados"),
                ),
            });
          }}
          disabled={refreshTitle.isPending}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--color-textDim)] hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {refreshTitle.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Atualizar Metadados
        </button>

        {failedChapters.length > 0 && (
          <button
            onClick={() => {
              if (
                !confirm(
                  `Retentar ${failedChapters.length} capítulo(s) com falha?`,
                )
              )
                return;
              retryFailed.mutate(id, {
                onSuccess: (res) => {
                  if (res.reset > 0) {
                    toast.success(
                      `${res.reset} capítulo(s) resetado(s). Enfileirando importação...`,
                    );
                    bulkImport.mutate(
                      { id },
                      {
                        onSuccess: (importRes) =>
                          toast.success(
                            `${importRes.queued} capítulo(s) enfileirado(s) para importação`,
                          ),
                        onError: (err) =>
                          toast.error(
                            getErrorMessage(
                              err,
                              "Erro ao enfileirar importação",
                            ),
                          ),
                      },
                    );
                  } else {
                    toast.success("Nenhum capítulo com falha para retentar");
                  }
                },
                onError: (err) =>
                  toast.error(
                    getErrorMessage(err, "Erro ao retentar capítulos falhos"),
                  ),
              });
            }}
            disabled={retryFailed.isPending || bulkImport.isPending}
            className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
          >
            {retryFailed.isPending || bulkImport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            Retentar Falhos ({failedChapters.length})
          </button>
        )}

        {stuckChapters.length > 0 && (
          <button
            onClick={handleCleanupStale}
            disabled={cleanupStale.isPending}
            className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
          >
            {cleanupStale.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Limpar Presos ({stuckChapters.length})
          </button>
        )}

        <button
          onClick={handleTogglePause}
          disabled={updateTitle.isPending}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--color-textDim)] hover:bg-white/10 transition-colors"
        >
          {title.importStatus === "PAUSED" ? (
            <>
              <Play className="h-4 w-4" /> Retomar
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" /> Pausar
            </>
          )}
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            showSettings
              ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "border-white/10 bg-white/5 text-[var(--color-textDim)] hover:bg-white/10"
          }`}
        >
          <Settings className="h-4 w-4" />
          Config
        </button>

        <button
          onClick={handleDelete}
          disabled={deleteTitle.isPending}
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors ml-auto"
        >
          <Trash2 className="h-4 w-4" />
          Remover
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="surface-panel rounded-xl border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-textMain)]">
            Configurações de Rastreamento
          </h3>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-[var(--color-textDim)]">
              <input
                type="checkbox"
                checked={title.syncEnabled}
                onChange={handleToggleSync}
                className="rounded border-white/20"
              />
              Sincronização automática
            </label>

            <div className="flex items-center gap-2 text-sm text-[var(--color-textDim)]">
              <span>Intervalo:</span>
              <input
                type="number"
                min={1}
                max={168}
                value={
                  intervalHours ?? Math.round(title.checkIntervalMs / 3600000)
                }
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
              />
              <span>horas</span>
              {intervalHours != null &&
                intervalHours !==
                  Math.round(title.checkIntervalMs / 3600000) && (
                  <button
                    onClick={handleUpdateInterval}
                    disabled={updateTitle.isPending}
                    className="rounded-lg bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                  >
                    Salvar
                  </button>
                )}
            </div>

            {title.lastCheckedAt && (
              <div className="text-xs text-[var(--color-textDim)]">
                Última verificação:{" "}
                {new Date(title.lastCheckedAt).toLocaleString("pt-BR")}
              </div>
            )}

            {title.lastNewChapterAt && (
              <div className="text-xs text-[var(--color-textDim)]">
                Último capítulo novo:{" "}
                {new Date(title.lastNewChapterAt).toLocaleString("pt-BR")}
              </div>
            )}
          </div>

          {title.syncError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              Erro na última sincronização: {title.syncError}
            </div>
          )}

          {failedChapters.length > 0 && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                {failedChapters.length} capítulo(s) com falha na importação
              </div>
              <p className="mt-1 text-xs text-yellow-300/70">
                Filtre por &quot;Falhos&quot; para ver detalhes e re-importar
              </p>
            </div>
          )}

          {stuckChapters.length > 0 && (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4" />
                  {stuckChapters.length} capítulo(s) preso(s) há mais de 15
                  minutos
                </div>
                <button
                  onClick={handleCleanupStale}
                  disabled={cleanupStale.isPending}
                  className="rounded-lg bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-300 hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                >
                  {cleanupStale.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Limpar presos"
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-orange-300/70">
                Esses capítulos podem estar com o worker travado. Clique para
                resetá-los como falhos e tentar novamente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chapter stats */}
      {title.chapterStats && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            {
              label: "Total",
              value: title.chapterStats.total,
              color: "text-blue-400",
            },
            {
              label: "Importados",
              value: title.chapterStats.imported,
              color: "text-emerald-400",
            },
            {
              label: "Pendentes",
              value: title.chapterStats.pending,
              color: "text-slate-400",
            },
            {
              label: "Baixando",
              value: title.chapterStats.downloading,
              color: "text-yellow-400",
            },
            {
              label: "Falhos",
              value: title.chapterStats.failed,
              color: "text-red-400",
            },
            {
              label: "Ignorados",
              value: title.chapterStats.skipped ?? 0,
              color: "text-zinc-500",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="surface-panel rounded-lg border border-white/5 p-3 text-center"
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[var(--color-textDim)]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chapter list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
              Capítulos ({title.chapters?.length ?? 0})
            </h2>
            {filteredChapters &&
              filteredChapters.some(
                (ch) =>
                  ch.importStatus === "PENDING" || ch.importStatus === "FAILED",
              ) && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)] hover:bg-white/10 transition-colors"
                  title="Selecionar todos importáveis"
                >
                  {selectedChapters.size > 0 ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  Selecionar
                </button>
              )}
          </div>
          <select
            value={chapterFilter}
            onChange={(e) =>
              setChapterFilter(e.target.value as ChapterImportStatus | "")
            }
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            {CHAPTER_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {!filteredChapters?.length ? (
          <div className="surface-panel rounded-xl border border-white/5 py-12 text-center text-sm text-[var(--color-textDim)]">
            {title.chapters?.length
              ? "Nenhum capítulo corresponde ao filtro"
              : "Nenhum capítulo sincronizado. Clique em 'Sincronizar' para buscar."}
          </div>
        ) : (
          <div className="surface-panel overflow-hidden rounded-xl border border-white/5">
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6 text-left text-xs text-[var(--color-textDim)]">
                    <th className="w-10 px-2 py-3"></th>
                    <th className="px-4 py-3 font-medium">Cap.</th>
                    <th className="px-4 py-3 font-medium">Título</th>
                    <th className="px-4 py-3 font-medium">Grupo</th>
                    <th className="px-4 py-3 font-medium">Páginas</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Saúde</th>
                    <th className="px-4 py-3 font-medium">Publicado</th>
                    <th className="px-4 py-3 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredChapters.map((ch) => {
                    const isImportable =
                      ch.importStatus === "PENDING" ||
                      ch.importStatus === "FAILED";
                    return (
                      <tr
                        key={ch.id}
                        className="hover:bg-white/[0.025] transition-colors"
                      >
                        <td className="px-2 py-3 text-center">
                          {isImportable && (
                            <button
                              onClick={() => toggleSelectChapter(ch.id)}
                              className="text-[var(--color-textDim)] hover:text-[var(--color-primary)] transition-colors"
                            >
                              {selectedChapters.has(ch.id) ? (
                                <CheckSquare className="h-4 w-4 text-[var(--color-primary)]" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--color-textMain)]">
                          {ch.volume != null ? `Vol.${ch.volume} ` : ""}
                          {ch.chapter}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-textDim)] max-w-[200px]">
                          <span className="block truncate">
                            {ch.title || "—"}
                          </span>
                          {ch.importError && (
                            <span
                              className="block mt-0.5 text-[10px] text-red-400 truncate"
                              title={ch.importError}
                            >
                              {ch.importError}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-textDim)]">
                          {ch.scanlationGroup || "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-textDim)]">
                          {ch.pages ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <ImportStatusBadge
                              status={ch.importStatus}
                              pulse={
                                ch.importStatus === "DOWNLOADING" ||
                                ch.importStatus === "DOWNLOADED" ||
                                importingChapters.has(ch.id)
                              }
                            />
                            {(ch.importStatus === "DOWNLOADING" ||
                              ch.importStatus === "DOWNLOADED") && (
                              <span className="text-[10px] text-yellow-400/70 ml-1">
                                {formatElapsed(ch.updatedAt)}
                              </span>
                            )}
                          </div>
                          {ch.importError &&
                            (ch.importStatus === "DOWNLOADING" ||
                              ch.importStatus === "DOWNLOADED") && (
                              <span
                                className="block mt-0.5 text-[10px] text-orange-400 truncate max-w-[150px]"
                                title={ch.importError}
                              >
                                ⚠ {ch.importError}
                              </span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          {ch.chapterHealth ? (
                            <ChapterHealthBadge status={ch.chapterHealth} />
                          ) : (
                            <span className="text-xs text-[var(--color-textDim)]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-textDim)]">
                          {ch.publishedAt
                            ? new Date(ch.publishedAt).toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {ch.importStatus === "IMPORTED" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : ch.importStatus === "FAILED" ? (
                              <>
                                <button
                                  onClick={() => handleRetryChapter(ch.id)}
                                  disabled={retryingChapters.has(ch.id)}
                                  title="Retentar importação"
                                  className="rounded-lg p-1.5 text-orange-400 hover:bg-orange-500/10 transition-colors"
                                >
                                  {retryingChapters.has(ch.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setReimportChapter(ch)}
                                  title="Reimportar de outro provedor"
                                  className="rounded-lg p-1.5 text-purple-400 hover:bg-purple-500/10 transition-colors"
                                >
                                  <Repeat className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleSkipChapter(ch.id)}
                                  disabled={skippingChapters.has(ch.id)}
                                  title="Ignorar capítulo"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-500/10 transition-colors"
                                >
                                  {skippingChapters.has(ch.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <SkipForward className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            ) : ch.importStatus === "PENDING" ? (
                              <>
                                <button
                                  onClick={() => handleImportChapter(ch.id)}
                                  disabled={importingChapters.has(ch.id)}
                                  title="Importar capítulo"
                                  className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                                >
                                  {importingChapters.has(ch.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleSkipChapter(ch.id)}
                                  disabled={skippingChapters.has(ch.id)}
                                  title="Ignorar capítulo"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-500/10 transition-colors"
                                >
                                  {skippingChapters.has(ch.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <SkipForward className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            ) : ch.importStatus === "DOWNLOADING" ||
                              ch.importStatus === "DOWNLOADED" ? (
                              (() => {
                                const elapsed =
                                  Date.now() - new Date(ch.updatedAt).getTime();
                                const isStuck = elapsed > 15 * 60 * 1000;
                                return isStuck ? (
                                  <button
                                    onClick={() => handleSkipChapter(ch.id)}
                                    disabled={skippingChapters.has(ch.id)}
                                    title="Capítulo preso — marcar como ignorado"
                                    className="rounded-lg p-1.5 text-orange-400 hover:bg-orange-500/10 transition-colors"
                                  >
                                    {skippingChapters.has(ch.id) ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Clock className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : (
                                  <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                                );
                              })()
                            ) : ch.importStatus === "SKIPPED" ? (
                              <button
                                onClick={() => handleImportChapter(ch.id)}
                                disabled={importingChapters.has(ch.id)}
                                title="Reimportar capítulo"
                                className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                              >
                                {importingChapters.has(ch.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-white/5">
              {filteredChapters.map((ch) => {
                const isImportable =
                  ch.importStatus === "PENDING" || ch.importStatus === "FAILED";
                const isInProgress =
                  ch.importStatus === "DOWNLOADING" ||
                  ch.importStatus === "DOWNLOADED";
                return (
                  <div key={ch.id} className="flex items-center gap-3 p-4">
                    {isImportable && (
                      <button
                        onClick={() => toggleSelectChapter(ch.id)}
                        className="shrink-0 text-[var(--color-textDim)]"
                      >
                        {selectedChapters.has(ch.id) ? (
                          <CheckSquare className="h-4 w-4 text-[var(--color-primary)]" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-textMain)]">
                          Cap. {ch.chapter}
                        </span>
                        <ImportStatusBadge
                          status={ch.importStatus}
                          pulse={isInProgress}
                        />
                        {isInProgress && (
                          <span className="text-[10px] text-yellow-400/70">
                            {formatElapsed(ch.updatedAt)}
                          </span>
                        )}
                        {ch.chapterHealth && (
                          <ChapterHealthBadge status={ch.chapterHealth} />
                        )}
                      </div>
                      {ch.title && (
                        <p className="mt-0.5 truncate text-xs text-[var(--color-textDim)]">
                          {ch.title}
                        </p>
                      )}
                      {ch.importError && (
                        <p
                          className={`mt-0.5 truncate text-[10px] ${
                            isInProgress ? "text-orange-400" : "text-red-400"
                          }`}
                        >
                          {isInProgress ? "⚠ " : ""}
                          {ch.importError}
                        </p>
                      )}
                      <div className="mt-1 flex gap-3 text-[10px] text-[var(--color-textDim)]">
                        {ch.scanlationGroup && (
                          <span>{ch.scanlationGroup}</span>
                        )}
                        {ch.pages != null && <span>{ch.pages} pág.</span>}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {ch.importStatus === "IMPORTED" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : ch.importStatus === "FAILED" ? (
                        <>
                          <button
                            onClick={() => handleRetryChapter(ch.id)}
                            disabled={retryingChapters.has(ch.id)}
                            title="Retentar"
                            className="rounded-lg p-2 text-orange-400 hover:bg-orange-500/10"
                          >
                            {retryingChapters.has(ch.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setReimportChapter(ch)}
                            title="Reimportar de outro provedor"
                            className="rounded-lg p-2 text-purple-400 hover:bg-purple-500/10"
                          >
                            <Repeat className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSkipChapter(ch.id)}
                            disabled={skippingChapters.has(ch.id)}
                            title="Ignorar"
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-500/10"
                          >
                            {skippingChapters.has(ch.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SkipForward className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      ) : ch.importStatus === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleImportChapter(ch.id)}
                            disabled={importingChapters.has(ch.id)}
                            className="rounded-lg p-2 text-[var(--color-textDim)] hover:bg-emerald-500/10 hover:text-emerald-400"
                          >
                            {importingChapters.has(ch.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleSkipChapter(ch.id)}
                            disabled={skippingChapters.has(ch.id)}
                            title="Ignorar"
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-500/10"
                          >
                            {skippingChapters.has(ch.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SkipForward className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      ) : ch.importStatus === "DOWNLOADING" ||
                        ch.importStatus === "DOWNLOADED" ? (
                        (() => {
                          const elapsed =
                            Date.now() - new Date(ch.updatedAt).getTime();
                          const isStuck = elapsed > 15 * 60 * 1000;
                          return isStuck ? (
                            <button
                              onClick={() => handleSkipChapter(ch.id)}
                              disabled={skippingChapters.has(ch.id)}
                              title="Capítulo preso"
                              className="rounded-lg p-2 text-orange-400 hover:bg-orange-500/10"
                            >
                              {skippingChapters.has(ch.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                          );
                        })()
                      ) : ch.importStatus === "SKIPPED" ? (
                        <button
                          onClick={() => handleImportChapter(ch.id)}
                          disabled={importingChapters.has(ch.id)}
                          title="Reimportar"
                          className="rounded-lg p-2 text-[var(--color-textDim)] hover:bg-emerald-500/10 hover:text-emerald-400"
                        >
                          {importingChapters.has(ch.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reimport from another provider modal */}
      {reimportChapter && title && (
        <ReimportFromModal
          chapter={reimportChapter}
          currentProvider={title.provider}
          titleName={title.titlePortuguese || title.title}
          onClose={() => setReimportChapter(null)}
        />
      )}
    </div>
  );
}
