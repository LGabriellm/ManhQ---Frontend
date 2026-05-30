"use client";

import Link from "next/link";
import { useState, useDeferredValue, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  useSeriesSources,
  useSetPrimarySource,
  useRemoveProviderSource,
  useTrackTitle,
  useProviders,
} from "@/hooks/useProvider";
import { useSeriesDetails } from "@/hooks/useAdmin";
import { providerService } from "@/services/provider.service";
import type { CatalogTitle } from "@/types/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Search,
  Link as LinkIcon,
  Star,
  Trash2,
  BookOpen,
  CheckCircle2,
  Plus,
} from "lucide-react";

export default function SeriesProvidersPage() {
  const params = useParams<{ id: string }>();
  const seriesId = params.id;

  const { data: seriesDetails, isLoading: isLoadingSeries } =
    useSeriesDetails(seriesId);
  const {
    data: sourcesData,
    isLoading: isLoadingSources,
    refetch: refetchSources,
  } = useSeriesSources(seriesId);
  const { data: providersData, isLoading: isLoadingProviders } = useProviders();

  const setPrimaryMutation = useSetPrimarySource();
  const removeSourceMutation = useRemoveProviderSource();
  const trackMutation = useTrackTitle();

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [searchResults, setSearchResults] = useState<CatalogTitle[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Set default provider if available
  useEffect(() => {
    if (
      !selectedProvider &&
      providersData?.providers &&
      providersData.providers.length > 0
    ) {
      setSelectedProvider(providersData.providers[0].name);
    }
  }, [providersData, selectedProvider]);

  // Default search query to series title
  useEffect(() => {
    if (seriesDetails?.title && !searchQuery) {
      setSearchQuery(seriesDetails.title);
    }
  }, [seriesDetails, searchQuery]);

  useEffect(() => {
    if (!selectedProvider || !deferredQuery) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;
    const fetchResults = async () => {
      setIsSearching(true);
      try {
        const res = await providerService.searchCatalog(selectedProvider, {
          q: deferredQuery,
          limit: 15,
        });
        if (isMounted) {
          setSearchResults(res.titles || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
        if (isMounted) {
          setSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    const debounceTimer = setTimeout(fetchResults, 500);
    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [deferredQuery, selectedProvider]);

  const handleSetPrimary = async (mappingId: string, providerTitleId: string) => {
    try {
      await setPrimaryMutation.mutateAsync({ seriesId, providerTitleId });
      toast.success("Fonte definida como principal");
    } catch (error) {
      toast.error("Erro ao definir como principal");
    }
  };

  const handleRemoveSource = async (mappingId: string) => {
    if (!confirm("Tem certeza que deseja desvincular esta fonte?")) return;
    try {
      await removeSourceMutation.mutateAsync({ seriesId, mappingId });
      toast.success("Fonte removida com sucesso");
    } catch (error) {
      toast.error("Erro ao remover fonte");
    }
  };

  const handleTrackAndLink = async (title: CatalogTitle) => {
    try {
      await trackMutation.mutateAsync({
        provider: title.provider,
        externalId: title.externalId,
        seriesId: seriesId,
      });
      toast.success("Fonte vinculada com sucesso!");
      refetchSources();
    } catch (error) {
      const message =
        (error as any)?.response?.data?.error || "Erro ao vincular fonte";
      toast.error(message);
    }
  };

  if (isLoadingSeries) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const sources = sourcesData?.sources || [];
  const linkedExternalIds = new Set(
    sources
      .filter((s) => s.providerTitle)
      .map((s) => `${s.providerTitle!.provider}:${s.providerTitle!.externalId}`),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/series"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para séries
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-[var(--color-textMain)] flex items-center gap-3">
            {seriesDetails?.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-textDim)]">
            Gerencie as fontes de capítulos (provedores) vinculadas a esta série.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Linked Sources Section */}
        <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                Fontes Vinculadas
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--color-textMain)]">
                Provedores atuais
              </h2>
            </div>
            <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold">
              {sources.length} Fontes
            </span>
          </div>

          {isLoadingSources ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : sources.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 p-8 text-center">
              <LinkIcon className="mx-auto h-8 w-8 text-white/20 mb-3" />
              <p className="text-sm text-[var(--color-textDim)]">
                Nenhuma fonte vinculada a esta série ainda.
              </p>
              <p className="text-xs text-[var(--color-textDim)]/70 mt-1">
                Busque e adicione provedores usando o painel ao lado.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {sources.map((source) => {
                const isPrimary = source.isPrimary;
                const pTitle = source.providerTitle;

                if (!pTitle) return null;

                return (
                  <div
                    key={source.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      isPrimary
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-white/8 bg-black/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex gap-4">
                      {pTitle.coverUrl ? (
                        <Image
                          src={pTitle.coverUrl}
                          alt={pTitle.title}
                          width={60}
                          height={80}
                          unoptimized
                          className="w-[60px] h-[80px] rounded-md object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-[60px] h-[80px] rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="h-6 w-6 text-white/20" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-textMain)] truncate">
                              {pTitle.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {pTitle.provider.includes(":") ? (
                                <>
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                                    {pTitle.provider.split(":")[0]}
                                  </span>
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/80 uppercase">
                                    {pTitle.provider.split(":").slice(1).join(":")}
                                  </span>
                                </>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/80 uppercase">
                                  {pTitle.provider}
                                </span>
                              )}
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400">
                                {source.language.toUpperCase()}
                              </span>
                              {isPrimary && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
                                  <Star className="h-3 w-3 fill-amber-400" />
                                  Principal
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--color-textDim)]/50 mt-1 font-mono truncate">
                              ID: {pTitle.externalId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          {!isPrimary && (
                            <button
                              onClick={() =>
                                handleSetPrimary(source.id, pTitle.id)
                              }
                              disabled={setPrimaryMutation.isPending}
                              className="text-xs font-medium text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Star className="h-3.5 w-3.5" />
                              Tornar Principal
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveSource(source.id)}
                            disabled={removeSourceMutation.isPending}
                            className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ml-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Search New Sources Section */}
        <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5 flex flex-col h-[750px]">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
              Busca
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--color-textMain)]">
              Adicionar Nova Fonte
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)] mb-4">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                Provedor
              </span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={isLoadingProviders}
                className="w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 appearance-none"
              >
                {isLoadingProviders ? (
                  <option>Carregando...</option>
                ) : providersData?.providers.length === 0 ? (
                  <option>Nenhum provedor ativo</option>
                ) : (
                  providersData?.providers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName || p.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                Título da Obra
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar..."
                  className="w-full rounded-2xl border border-white/8 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                />
              </div>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 bg-black/5 rounded-2xl border border-white/5 p-3">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                <p className="text-sm text-[var(--color-textDim)]">Buscando no catálogo...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Search className="h-8 w-8 text-white/10 mb-2" />
                <p className="text-sm text-[var(--color-textDim)]">
                  {searchQuery.trim().length > 0
                    ? "Nenhum resultado encontrado."
                    : "Digite para pesquisar no provedor."}
                </p>
              </div>
            ) : (
              searchResults.map((result) => {
                const isAlreadyLinked = linkedExternalIds.has(
                  `${result.provider}:${result.externalId}`,
                );

                return (
                  <div
                    key={`${result.provider}-${result.externalId}`}
                    className="flex gap-3 p-3 rounded-xl border border-white/10 bg-black/20 hover:bg-white/[0.02] transition-colors group"
                  >
                    {result.coverUrl ? (
                      <Image
                        src={result.coverUrl}
                        alt={result.title}
                        width={48}
                        height={64}
                        unoptimized
                        className="w-12 h-16 rounded-md object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-white/20" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {result.provider.includes(":") ? (
                            <>
                              <span className="text-[9px] font-bold text-indigo-300 uppercase">
                                {result.provider.split(":")[0]}
                              </span>
                              <span className="text-[9px] font-medium text-white/60 uppercase">
                                {result.provider.split(":").slice(1).join(":")}
                              </span>
                            </>
                          ) : (
                            <span className="text-[9px] font-medium text-white/60 uppercase">
                              {result.provider}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[var(--color-textMain)] truncate">
                          {result.title}
                        </p>
                        {result.author && (
                          <p className="text-[11px] text-[var(--color-textDim)] truncate">
                            {result.author}
                          </p>
                        )}
                        <p className="text-[10px] font-mono text-[var(--color-textDim)]/50 mt-1 truncate">
                          ID: {result.externalId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center pl-2">
                      {isAlreadyLinked ? (
                        <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Vinculado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTrackAndLink(result)}
                          disabled={trackMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50 opacity-80 group-hover:opacity-100"
                        >
                          <Plus className="h-4 w-4" />
                          Vincular
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
