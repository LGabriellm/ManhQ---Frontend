"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "@/hooks/useProvider";
import { ImportStatusBadge } from "@/components/provider/ImportStatusBadge";
import type { ChapterImportStatus } from "@/types/api";
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
} from "lucide-react";

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

  const title = data?.providerTitle;

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

  function handleSync() {
    syncChapters.mutate(id, {
      onSuccess: (res) =>
        toast.success(
          res.error
            ? `Erro parcial: ${res.error}`
            : `${res.newChaptersFound} novos capítulos encontrados`,
        ),
      onError: () => toast.error("Erro ao sincronizar"),
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
      onError: () => toast.error("Erro ao verificar atualizações"),
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
      onError: () => toast.error("Erro ao importar capítulo"),
      onSettled: () =>
        setImportingChapters((prev) => {
          const next = new Set(prev);
          next.delete(chapterId);
          return next;
        }),
    });
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
        onSuccess: (res) =>
          toast.success(`${res.queued} capítulo(s) enfileirado(s)`),
        onError: () => toast.error("Erro ao importar capítulos"),
      },
    );
  }

  function handleImportSelected() {
    if (!selectedChapters.size) return;
    if (
      !confirm(
        `Enfileirar ${selectedChapters.size} capítulo(s) selecionado(s) para importação?`,
      )
    )
      return;
    bulkImport.mutate(
      { id, data: { chapterIds: Array.from(selectedChapters) } },
      {
        onSuccess: (res) => {
          toast.success(`${res.queued} capítulo(s) enfileirado(s)`);
          setSelectedChapters(new Set());
        },
        onError: () => toast.error("Erro ao importar capítulos"),
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
            src={title.coverUrl}
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
              onError: () => toast.error("Erro ao atualizar metadados"),
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
                onSuccess: (res) =>
                  toast.success(
                    `${res.reset} capítulo(s) resetado(s) para reimportação`,
                  ),
                onError: () => toast.error("Erro ao retentar capítulos falhos"),
              });
            }}
            disabled={retryFailed.isPending}
            className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
          >
            {retryFailed.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            Retentar Falhos ({failedChapters.length})
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
                          <ImportStatusBadge
                            status={ch.importStatus}
                            pulse={
                              ch.importStatus === "DOWNLOADING" ||
                              importingChapters.has(ch.id)
                            }
                          />
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
                          {ch.importStatus === "IMPORTED" ? (
                            <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" />
                          ) : ch.importStatus === "PENDING" ||
                            ch.importStatus === "FAILED" ? (
                            <button
                              onClick={() => handleImportChapter(ch.id)}
                              disabled={importingChapters.has(ch.id)}
                              title="Importar capítulo"
                              className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors ml-auto"
                            >
                              {importingChapters.has(ch.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
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
                        <ImportStatusBadge status={ch.importStatus} />
                      </div>
                      {ch.title && (
                        <p className="mt-0.5 truncate text-xs text-[var(--color-textDim)]">
                          {ch.title}
                        </p>
                      )}
                      {ch.importError && (
                        <p className="mt-0.5 truncate text-[10px] text-red-400">
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

                    {ch.importStatus === "IMPORTED" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    ) : ch.importStatus === "PENDING" ||
                      ch.importStatus === "FAILED" ? (
                      <button
                        onClick={() => handleImportChapter(ch.id)}
                        disabled={importingChapters.has(ch.id)}
                        className="shrink-0 rounded-lg p-2 text-[var(--color-textDim)] hover:bg-emerald-500/10 hover:text-emerald-400"
                      >
                        {importingChapters.has(ch.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
