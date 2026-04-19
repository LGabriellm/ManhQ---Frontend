"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  useTrackedTitles,
  useProviderStats,
  useDeleteTrackedTitle,
  useSyncChapters,
  useCleanupStale,
} from "@/hooks/useProvider";
import { ImportStatusBadge } from "@/components/provider/ImportStatusBadge";
import { ChapterStatsBar } from "@/components/provider/ChapterStatsBar";
import type { TrackedTitlesParams, TitleImportStatus } from "@/types/api";
import toast from "react-hot-toast";
import {
  Globe,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Download,
  CheckCircle2,
  Pause,
  AlertTriangle,
  ExternalLink,
  Server,
  Image,
  Zap,
} from "lucide-react";

const IMPORT_STATUSES: { value: TitleImportStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "TRACKED", label: "Rastreando" },
  { value: "IMPORTING", label: "Importando" },
  { value: "IMPORTED", label: "Importado" },
  { value: "PAUSED", label: "Pausado" },
  { value: "FAILED", label: "Falhou" },
];

const PAGE_SIZE = 20;

export default function ProvidersPage() {
  const [params, setParams] = useState<TrackedTitlesParams>({
    limit: PAGE_SIZE,
    offset: 0,
  });
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: stats } = useProviderStats();
  const { data, isLoading } = useTrackedTitles(params);
  const deleteTitle = useDeleteTrackedTitle();
  const syncChapters = useSyncChapters();
  const cleanupStale = useCleanupStale();

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setParams((p) => ({ ...p, offset: 0, search: search || undefined }));
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const currentPage = Math.floor((params.offset ?? 0) / PAGE_SIZE) + 1;
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  function handleDelete(id: string, title: string) {
    if (
      !confirm(
        `Remover "${title}" do rastreamento? Capítulos importados serão mantidos.`,
      )
    )
      return;
    deleteTitle.mutate(id, {
      onSuccess: () => toast.success("Título removido"),
      onError: () => toast.error("Erro ao remover título"),
    });
  }

  function handleSync(id: string) {
    syncChapters.mutate(id, {
      onSuccess: (res) =>
        toast.success(`Sincronizado: ${res.newChaptersFound} novos capítulos`),
      onError: () => toast.error("Erro ao sincronizar"),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-[var(--color-primary)]" />
          <div>
            <h1 className="text-xl font-bold text-[var(--color-textMain)]">
              Provedores
            </h1>
            <p className="text-sm text-[var(--color-textDim)]">
              Gerencie títulos rastreados e importações de catálogos externos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/providers/suwayomi"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--color-textMain)] hover:bg-white/10 transition-colors"
          >
            <Server className="h-4 w-4" />
            Suwayomi
          </Link>
          <Link
            href="/dashboard/providers/keiyoushi"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--color-textMain)] hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Keiyoushi
          </Link>
          <Link
            href="/dashboard/providers/search"
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Buscar no Catálogo
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: "Títulos",
              value: stats.titles.total,
              icon: BookOpen,
              color: "text-blue-400",
            },
            {
              label: "Importando",
              value: stats.titles.importing,
              icon: Download,
              color: "text-yellow-400",
            },
            {
              label: "Importados",
              value: stats.titles.imported,
              icon: CheckCircle2,
              color: "text-emerald-400",
            },
            {
              label: "Pausados",
              value: stats.titles.paused,
              icon: Pause,
              color: "text-slate-400",
            },
            {
              label: "Falhos",
              value: stats.titles.failed,
              icon: AlertTriangle,
              color: "text-red-400",
            },
            {
              label: "Capítulos",
              value: `${stats.chapters.imported}/${stats.chapters.total}`,
              icon: BookOpen,
              color: "text-cyan-400",
              sub:
                [
                  stats.chapters.pending
                    ? `${stats.chapters.pending} pendentes`
                    : null,
                  stats.chapters.downloading
                    ? `${stats.chapters.downloading} baixando`
                    : null,
                  stats.chapters.failed
                    ? `${stats.chapters.failed} falhos`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="surface-panel rounded-xl border border-white/5 p-4"
            >
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-[var(--color-textDim)]">
                  {stat.label}
                </span>
              </div>
              <p className="mt-1 text-lg font-bold text-[var(--color-textMain)]">
                {stat.value}
              </p>
              {stat.sub && (
                <p className="mt-0.5 text-[10px] text-[var(--color-textDim)]">
                  {stat.sub}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
          <input
            type="text"
            placeholder="Buscar título, autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>

        <select
          value={params.importStatus ?? ""}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              offset: 0,
              importStatus: (e.target.value as TitleImportStatus) || undefined,
            }))
          }
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
        >
          {IMPORT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Stale chapters alert */}
      {stats && stats.staleReset !== undefined && stats.staleReset > 0 && (
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              {stats.staleReset} capítulo(s) preso(s) foram resetados
              automaticamente
            </div>
          </div>
        </div>
      )}

      {stats && stats.chapters.downloading > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
          <div className="flex items-center gap-2 text-sm text-yellow-300">
            <Download className="h-4 w-4 animate-pulse" />
            <span>{stats.chapters.downloading} capítulo(s) sendo baixados</span>
          </div>
          <button
            onClick={() =>
              cleanupStale.mutate(15, {
                onSuccess: (res) =>
                  res.reset > 0
                    ? toast.success(
                        `${res.reset} capítulo(s) preso(s) resetados`,
                      )
                    : toast.success("Nenhum capítulo preso encontrado"),
                onError: () => toast.error("Erro ao limpar capítulos presos"),
              })
            }
            disabled={cleanupStale.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-300 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
          >
            {cleanupStale.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            Limpar presos
          </button>
        </div>
      )}

      {/* Table */}
      <div className="surface-panel overflow-hidden rounded-xl border border-white/5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : !data?.titles.length ? (
          <div className="py-16 text-center text-sm text-[var(--color-textDim)]">
            Nenhum título rastreado encontrado
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6 text-left text-xs text-[var(--color-textDim)]">
                    <th className="px-4 py-3 font-medium">Título</th>
                    <th className="px-4 py-3 font-medium">Provedor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Capítulos</th>
                    <th className="px-4 py-3 font-medium">Série Local</th>
                    <th className="px-4 py-3 font-medium">
                      Última Verificação
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.titles.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/[0.025] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/providers/${t.id}`}
                          className="font-medium text-[var(--color-textMain)] hover:text-[var(--color-primary)] transition-colors"
                        >
                          {t.titlePortuguese || t.title}
                        </Link>
                        {t.author && (
                          <p className="text-xs text-[var(--color-textDim)]">
                            {t.author}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-textDim)]">
                        {t.provider}
                      </td>
                      <td className="px-4 py-3">
                        <ImportStatusBadge
                          status={t.importStatus}
                          pulse={t.importStatus === "IMPORTING"}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ChapterStatsBar title={t} />
                      </td>
                      <td className="px-4 py-3">
                        {t.series ? (
                          <div className="flex items-center gap-1.5">
                            {t.hasCover && (
                              <Image className="h-3 w-3 text-emerald-400" />
                            )}
                            <span className="text-emerald-400 text-xs">
                              {t.series.title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--color-textDim)] text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-textDim)]">
                        {t.lastCheckedAt
                          ? new Date(t.lastCheckedAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Nunca"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSync(t.id)}
                            disabled={syncChapters.isPending}
                            title="Sincronizar capítulos"
                            className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(t.id, t.titlePortuguese || t.title)
                            }
                            disabled={deleteTitle.isPending}
                            title="Remover rastreamento"
                            className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-white/5">
              {data.titles.map((t) => (
                <div key={t.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/providers/${t.id}`}
                      className="font-medium text-[var(--color-textMain)] hover:text-[var(--color-primary)]"
                    >
                      {t.titlePortuguese || t.title}
                    </Link>
                    <ImportStatusBadge
                      status={t.importStatus}
                      pulse={t.importStatus === "IMPORTING"}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-textDim)]">
                    <span>{t.provider}</span>
                    <ChapterStatsBar title={t} compact />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleSync(t.id)}
                      className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-blue-500/10 hover:text-blue-400"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(t.id, t.titlePortuguese || t.title)
                      }
                      className="rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-textDim)]">
            {data?.total ?? 0} título(s) encontrado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  offset: (p.offset ?? 0) - PAGE_SIZE,
                }))
              }
              className="rounded-lg border border-white/10 p-2 text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[var(--color-textMain)]">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  offset: (p.offset ?? 0) + PAGE_SIZE,
                }))
              }
              className="rounded-lg border border-white/10 p-2 text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
