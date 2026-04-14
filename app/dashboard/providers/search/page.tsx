"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCatalogSearch,
  useCatalogTitle,
  useTrackTitle,
  useProviders,
  providerKeys,
} from "@/hooks/useProvider";
import type { CatalogTitle } from "@/types/api";
import toast from "react-hot-toast";
import {
  Search,
  ArrowLeft,
  Loader2,
  Plus,
  CheckCircle2,
  BookOpen,
  Calendar,
  Tag,
  Globe,
  Filter,
  TrendingUp,
  ChevronDown,
  X,
  User,
  Paintbrush,
  Info,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Qualquer status" },
  { value: "ongoing", label: "Em andamento" },
  { value: "completed", label: "Completo" },
  { value: "hiatus", label: "Hiato" },
  { value: "cancelled", label: "Cancelado" },
];

const CONTENT_RATING_OPTIONS = [
  { value: "", label: "Qualquer classificação" },
  { value: "safe", label: "Safe" },
  { value: "suggestive", label: "Suggestive" },
  { value: "erotica", label: "Erotica" },
];

const PAGE_SIZE = 20;

export default function CatalogSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [contentRating, setContentRating] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [provider, setProvider] = useState("");
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [allTitles, setAllTitles] = useState<CatalogTitle[]>([]);
  const [offset, setOffset] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<CatalogTitle | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevQueryRef = useRef("");

  const { data: providersData, isRefetching: providersRefetching } =
    useProviders();

  const queryClient = useQueryClient();
  const providers = providersData?.providers ?? [];

  function handleRefreshProviders() {
    queryClient.invalidateQueries({ queryKey: providerKeys.list() });
  }

  // Auto-select first provider when providers load
  useEffect(() => {
    if (providers.length > 0 && !provider) {
      setProvider(providers[0].name);
    }
  }, [providers, provider]);

  const searchParams = {
    q: debouncedQuery || undefined,
    availableLanguage: "pt-br",
    limit: PAGE_SIZE,
    offset,
    status: statusFilter || undefined,
    contentRating: contentRating || undefined,
  };

  const { data, isLoading, isFetching } = useCatalogSearch(
    provider,
    searchParams,
    !!provider,
  );

  const trackTitle = useTrackTitle();

  const { data: titleDetail, isLoading: detailLoading } = useCatalogTitle(
    selectedTitle?.provider || provider,
    selectedTitle?.externalId ?? "",
    !!selectedTitle,
  );

  // Reset accumulated titles when query/filters change
  useEffect(() => {
    if (debouncedQuery !== prevQueryRef.current || offset === 0) {
      prevQueryRef.current = debouncedQuery;
      if (offset === 0 && data?.titles) {
        setAllTitles(data.titles);
      }
    }
  }, [debouncedQuery, offset, data?.titles]);

  // Append new results when offset changes (load more)
  useEffect(() => {
    if (data?.titles && offset > 0) {
      setAllTitles((prev) => {
        const existingIds = new Set(prev.map((t) => t.externalId));
        const newTitles = data.titles.filter(
          (t) => !existingIds.has(t.externalId),
        );
        return [...prev, ...newTitles];
      });
    } else if (data?.titles && offset === 0) {
      setAllTitles(data.titles);
    }
  }, [data?.titles, offset]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setOffset(0);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [statusFilter, contentRating, provider]);

  const handleLoadMore = useCallback(() => {
    setOffset((prev) => prev + PAGE_SIZE);
  }, []);

  function handleTrack(title: CatalogTitle) {
    trackTitle.mutate(
      {
        provider: title.provider || provider,
        externalId: title.externalId,
        language: "pt-br",
      },
      {
        onSuccess: () => {
          setTrackedIds((prev) => new Set(prev).add(title.externalId));
          toast.success(`"${title.titlePortuguese || title.title}" rastreado`);
        },
        onError: () => toast.error("Erro ao rastrear título"),
      },
    );
  }

  const statusLabel: Record<string, string> = {
    ongoing: "Em andamento",
    completed: "Completo",
    hiatus: "Hiato",
    cancelled: "Cancelado",
  };

  const isBrowseMode = !debouncedQuery;
  const displayTitles = allTitles;
  const hasMore = data?.hasMore ?? false;

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
        <div>
          <h1 className="text-xl font-bold text-[var(--color-textMain)]">
            Buscar no Catálogo
          </h1>
          <p className="text-sm text-[var(--color-textDim)]">
            Pesquise títulos ou navegue populares nos catálogos externos
          </p>
        </div>
      </div>

      {/* Provider selector + Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex gap-1.5">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            {providers.length === 0 && (
              <option value="">Carregando provedores...</option>
            )}
            {providers.map((p) => (
              <option key={p.name} value={p.name}>
                {p.displayName}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefreshProviders}
            disabled={providersRefetching}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 text-[var(--color-textDim)] hover:bg-white/10 hover:text-[var(--color-textMain)] transition-colors disabled:opacity-50"
            title="Atualizar lista de provedores"
          >
            <RefreshCw
              className={`h-4 w-4 ${providersRefetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
          <input
            type="text"
            placeholder="Buscar manga ou deixe vazio para ver populares..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--color-primary)]" />
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
            showFilters
              ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "border-white/10 bg-white/5 text-[var(--color-textDim)] hover:bg-white/10"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col gap-3 sm:flex-row surface-panel rounded-xl border border-white/5 p-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={contentRating}
            onChange={(e) => setContentRating(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            {CONTENT_RATING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Browse mode label */}
      {isBrowseMode && displayTitles.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-textDim)]">
          <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" />
          Títulos populares
        </div>
      )}

      {/* Loading state (initial) */}
      {isLoading && displayTitles.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      )}

      {/* Empty state */}
      {data && data.titles.length === 0 && displayTitles.length === 0 && (
        <div className="py-16 text-center text-sm text-[var(--color-textDim)]">
          {debouncedQuery
            ? `Nenhum resultado encontrado para "${debouncedQuery}"`
            : "Nenhum título encontrado nesta fonte"}
        </div>
      )}

      {/* Results grid */}
      {displayTitles.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayTitles.map((title) => {
              const isTracked = trackedIds.has(title.externalId);
              return (
                <div
                  key={title.externalId}
                  onClick={() => setSelectedTitle(title)}
                  className="surface-panel flex gap-3 rounded-xl border border-white/5 p-4 transition-colors hover:border-white/10 cursor-pointer"
                >
                  {/* Cover */}
                  {title.coverUrl ? (
                    <img
                      src={title.coverUrl}
                      alt={title.title}
                      className="h-32 w-22 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-32 w-22 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <BookOpen className="h-6 w-6 text-[var(--color-textDim)]" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--color-textMain)] line-clamp-1">
                        {title.titlePortuguese || title.title}
                      </h3>
                      {title.author && (
                        <p className="mt-0.5 text-xs text-[var(--color-textDim)]">
                          {title.author}
                        </p>
                      )}
                      {(title.descriptionPtBr || title.description) && (
                        <p className="mt-1 text-xs text-[var(--color-textDim)] line-clamp-2">
                          {title.descriptionPtBr || title.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {title.status && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
                          <Calendar className="h-3 w-3" />
                          {statusLabel[title.status] || title.status}
                        </span>
                      )}
                      {title.lastChapter != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
                          <BookOpen className="h-3 w-3" />
                          Cap. {title.lastChapter}
                        </span>
                      )}
                      {title.chaptersAvailable != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
                          <BookOpen className="h-3 w-3" />
                          {title.chaptersAvailable} cap.
                        </span>
                      )}
                      {title.tags && title.tags.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
                          <Tag className="h-3 w-3" />
                          {title.tags.slice(0, 2).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Track button */}
                  <div className="flex shrink-0 items-start">
                    <button
                      onClick={() => handleTrack(title)}
                      disabled={isTracked || trackTitle.isPending}
                      className={`rounded-lg p-2 transition-colors ${
                        isTracked
                          ? "text-emerald-400 cursor-default"
                          : "text-[var(--color-textDim)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
                      }`}
                      title={isTracked ? "Já rastreado" : "Rastrear título"}
                    >
                      {isTracked ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={isFetching}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-[var(--color-textMain)] hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Carregar mais
              </button>
            </div>
          )}
        </div>
      )}

      {/* Title Detail Modal */}
      {selectedTitle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedTitle(null)}
        >
          <div
            className="surface-panel relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTitle(null)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-[var(--color-textDim)] hover:bg-white/10 hover:text-[var(--color-textMain)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : (
              (() => {
                const detail = titleDetail?.title ?? selectedTitle;
                const isTracked = trackedIds.has(detail.externalId);
                return (
                  <div className="space-y-5">
                    {/* Cover + basic info */}
                    <div className="flex gap-4">
                      {detail.coverUrl ? (
                        <img
                          src={detail.coverUrl}
                          alt={detail.title}
                          className="h-44 w-30 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-44 w-30 shrink-0 items-center justify-center rounded-xl bg-white/5">
                          <BookOpen className="h-8 w-8 text-[var(--color-textDim)]" />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-[var(--color-textMain)] leading-tight">
                            {detail.titlePortuguese || detail.title}
                          </h2>
                          {detail.titlePortuguese &&
                            detail.title !== detail.titlePortuguese && (
                              <p className="mt-0.5 text-xs text-[var(--color-textDim)]">
                                {detail.title}
                              </p>
                            )}
                          {detail.titleOriginal &&
                            detail.titleOriginal !== detail.title && (
                              <p className="mt-0.5 text-xs text-[var(--color-textDim)] italic">
                                {detail.titleOriginal}
                              </p>
                            )}
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {detail.author && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--color-textDim)]">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{detail.author}</span>
                            </div>
                          )}
                          {detail.artist && detail.artist !== detail.author && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--color-textDim)]">
                              <Paintbrush className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{detail.artist}</span>
                            </div>
                          )}
                          {detail.year && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--color-textDim)]">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              {detail.year}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status badges row */}
                    <div className="flex flex-wrap gap-2">
                      {detail.status && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                          <Info className="h-3 w-3" />
                          {statusLabel[detail.status] || detail.status}
                        </span>
                      )}
                      {detail.contentRating && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                          {detail.contentRating}
                        </span>
                      )}
                      {detail.lastChapter != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                          <BookOpen className="h-3 w-3" />
                          Cap. {detail.lastChapter}
                        </span>
                      )}
                      {detail.chaptersAvailable != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                          <BookOpen className="h-3 w-3" />
                          {detail.chaptersAvailable} capítulos
                        </span>
                      )}
                      {detail.availableLanguages &&
                        detail.availableLanguages.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-textDim)]">
                            <Globe className="h-3 w-3" />
                            {detail.availableLanguages.join(", ")}
                          </span>
                        )}
                    </div>

                    {/* Description */}
                    {(detail.descriptionPtBr || detail.description) && (
                      <div>
                        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-textDim)]">
                          Sinopse
                        </h3>
                        <p className="text-sm leading-relaxed text-[var(--color-textMain)]">
                          {detail.descriptionPtBr || detail.description}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    {detail.tags && detail.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {detail.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* External ID */}
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-textDim)]">
                      <ExternalLink className="h-3 w-3" />
                      {detail.provider} &middot; {detail.externalId}
                    </div>

                    {/* Source URL */}
                    {detail.sourceUrl && (
                      <a
                        href={detail.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        Ver na fonte original
                      </a>
                    )}

                    {/* Initialized status */}
                    {detail.initialized === false && (
                      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2.5 text-xs text-yellow-300">
                        Este título ainda não foi completamente inicializado
                        pelo provedor. Alguns dados podem estar incompletos.
                      </div>
                    )}

                    {/* Track action */}
                    <button
                      onClick={() => handleTrack(detail)}
                      disabled={isTracked || trackTitle.isPending}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
                        isTracked
                          ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                          : "bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
                      }`}
                    >
                      {isTracked ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Já rastreado
                        </>
                      ) : trackTitle.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Rastreando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Rastrear título
                        </>
                      )}
                    </button>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
