"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  useProviders,
  useCatalogSearch,
  useReimportFrom,
  useTrackTitle,
  useSyncChapters,
  useTrackedTitle,
} from "@/hooks/useProvider";
import type {
  ProviderChapter,
  CatalogTitle,
  ProviderInfo,
  ApiError,
} from "@/types/api";
import toast from "react-hot-toast";
import {
  X,
  Loader2,
  Search,
  ArrowRight,
  ArrowLeft,
  Download,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
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

interface ReimportFromModalProps {
  chapter: ProviderChapter;
  currentProvider: string;
  titleName: string;
  onClose: () => void;
}

type Step = "select-provider" | "search-title" | "select-chapter";

export function ReimportFromModal({
  chapter,
  currentProvider,
  titleName,
  onClose,
}: ReimportFromModalProps) {
  const [step, setStep] = useState<Step>("select-provider");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState(titleName);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<CatalogTitle | null>(null);
  const [trackedTitleId, setTrackedTitleId] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const { data: providersData } = useProviders();
  const reimportFrom = useReimportFrom();
  const trackTitle = useTrackTitle();
  const syncChapters = useSyncChapters();

  const { data: trackedTitleData } = useTrackedTitle(
    trackedTitleId ?? "",
    !!trackedTitleId && synced,
  );

  const alternativeProviders = useMemo(
    () =>
      providersData?.providers.filter(
        (p: ProviderInfo) => p.name !== currentProvider,
      ) ?? [],
    [providersData, currentProvider],
  );

  const { data: searchResults, isLoading: isSearching } = useCatalogSearch(
    selectedProvider,
    { q: searchQuery, limit: 20, offset: 0, availableLanguage: "pt-br" },
    searchSubmitted && !!selectedProvider && !!searchQuery,
  );

  const matchingChapters = useMemo(() => {
    if (!trackedTitleData?.providerTitle?.chapters) return [];
    return trackedTitleData.providerTitle.chapters.filter(
      (ch) => ch.chapter === chapter.chapter,
    );
  }, [trackedTitleData, chapter.chapter]);

  const handleSelectProvider = useCallback((providerName: string) => {
    setSelectedProvider(providerName);
    setStep("search-title");
    setSearchSubmitted(false);
    setSelectedTitle(null);
    setTrackedTitleId(null);
    setSynced(false);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setSearchSubmitted(true);
    },
    [searchQuery],
  );

  const handleSelectTitle = useCallback(
    (title: CatalogTitle) => {
      setSelectedTitle(title);
      setStep("select-chapter");
      setSynced(false);
      setTrackedTitleId(null);

      // Track the title first, then sync chapters
      trackTitle.mutate(
        {
          provider: selectedProvider,
          externalId: title.externalId,
        },
        {
          onSuccess: (res) => {
            const titleId = res.providerTitle.id;
            setTrackedTitleId(titleId);
            // Now sync chapters
            syncChapters.mutate(titleId, {
              onSuccess: (syncRes) => {
                setSynced(true);
                if (
                  syncRes.newChaptersFound === 0 &&
                  syncRes.chaptersCreated === 0
                ) {
                  toast.success("Capítulos já sincronizados");
                } else {
                  toast.success(
                    `${syncRes.newChaptersFound} capítulos encontrados`,
                  );
                }
              },
              onError: (err) =>
                toast.error(
                  getErrorMessage(err, "Erro ao sincronizar capítulos"),
                ),
            });
          },
          onError: (err) =>
            toast.error(getErrorMessage(err, "Erro ao rastrear título")),
        },
      );
    },
    [selectedProvider, trackTitle, syncChapters],
  );

  const handleReimport = useCallback(
    (externalChapterId: string) => {
      reimportFrom.mutate(
        {
          chapterId: chapter.id,
          data: {
            provider: selectedProvider,
            externalChapterId,
          },
        },
        {
          onSuccess: (res) => {
            toast.success(
              res.previousError
                ? `Reimportando de provedor alternativo (erro anterior: ${res.previousError.slice(0, 60)}...)`
                : "Capítulo enfileirado para reimportação de provedor alternativo",
            );
            onClose();
          },
          onError: (err) =>
            toast.error(getErrorMessage(err, "Erro ao reimportar capítulo")),
        },
      );
    },
    [chapter.id, selectedProvider, reimportFrom, onClose],
  );

  const isProcessing =
    trackTitle.isPending || syncChapters.isPending || reimportFrom.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-[var(--color-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--color-textMain)]">
              Reimportar de Outro Provedor
            </h2>
            <p className="text-sm text-[var(--color-textDim)] truncate">
              Cap. {chapter.chapter}
              {chapter.title ? ` — ${chapter.title}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error banner */}
        {chapter.importError && (
          <div className="mx-6 mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Erro na importação original:</p>
              <p className="mt-0.5 text-xs text-red-400/80">
                {chapter.importError}
              </p>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 text-xs text-[var(--color-textDim)]">
          <span
            className={
              step === "select-provider"
                ? "font-semibold text-[var(--color-primary)]"
                : "text-[var(--color-textDim)]"
            }
          >
            1. Provedor
          </span>
          <ChevronRight className="h-3 w-3" />
          <span
            className={
              step === "search-title"
                ? "font-semibold text-[var(--color-primary)]"
                : "text-[var(--color-textDim)]"
            }
          >
            2. Buscar Título
          </span>
          <ChevronRight className="h-3 w-3" />
          <span
            className={
              step === "select-chapter"
                ? "font-semibold text-[var(--color-primary)]"
                : "text-[var(--color-textDim)]"
            }
          >
            3. Selecionar Capítulo
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Step 1: Select Provider */}
          {step === "select-provider" && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-textDim)]">
                Selecione um provedor alternativo para buscar o capítulo{" "}
                {chapter.chapter}:
              </p>
              {alternativeProviders.length === 0 ? (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] py-8 text-center text-sm text-[var(--color-textDim)]">
                  Nenhum provedor alternativo disponível. Instale mais extensões
                  no Suwayomi.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {alternativeProviders.map((p: ProviderInfo) => (
                    <button
                      key={p.name}
                      onClick={() => handleSelectProvider(p.name)}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textMain)] group-hover:text-[var(--color-primary)]">
                          {p.displayName}
                        </p>
                        <p className="text-xs text-[var(--color-textDim)]">
                          {p.defaultLanguage}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[var(--color-textDim)] group-hover:text-[var(--color-primary)]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Search Title */}
          {step === "search-title" && (
            <div className="space-y-4">
              <button
                onClick={() => setStep("select-provider")}
                className="flex items-center gap-1 text-sm text-[var(--color-textDim)] hover:text-[var(--color-primary)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>

              <p className="text-sm text-[var(--color-textDim)]">
                Busque o mesmo título no provedor{" "}
                <span className="font-medium text-[var(--color-textMain)]">
                  {alternativeProviders.find(
                    (p: ProviderInfo) => p.name === selectedProvider,
                  )?.displayName ?? selectedProvider}
                </span>
                :
              </p>

              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-textDim)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchSubmitted(false);
                    }}
                    placeholder="Nome do mangá..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Buscar
                </button>
              </form>

              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
                </div>
              )}

              {searchSubmitted && !isSearching && searchResults && (
                <div className="space-y-2">
                  {searchResults.titles.length === 0 ? (
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] py-8 text-center text-sm text-[var(--color-textDim)]">
                      Nenhum resultado encontrado
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-[var(--color-textDim)]">
                        {searchResults.total} resultado(s) encontrado(s)
                      </p>
                      <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-white/5">
                        {searchResults.titles.map((t: CatalogTitle) => (
                          <button
                            key={`${t.provider}-${t.externalId}`}
                            onClick={() => handleSelectTitle(t)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0"
                          >
                            {t.coverUrl ? (
                              <img
                                src={t.coverUrl}
                                alt={t.title}
                                className="h-14 w-10 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <div className="h-14 w-10 shrink-0 rounded bg-white/5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[var(--color-textMain)] truncate">
                                {t.titlePortuguese || t.title}
                              </p>
                              {t.titleOriginal &&
                                t.titleOriginal !== t.title && (
                                  <p className="text-xs text-[var(--color-textDim)] truncate">
                                    {t.titleOriginal}
                                  </p>
                                )}
                              <div className="flex gap-2 mt-0.5 text-[10px] text-[var(--color-textDim)]">
                                {t.author && <span>{t.author}</span>}
                                {t.chaptersAvailable != null && (
                                  <span>{t.chaptersAvailable} cap.</span>
                                )}
                                {t.status && <span>{t.status}</span>}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-textDim)]" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Chapter */}
          {step === "select-chapter" && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setStep("search-title");
                  setSelectedTitle(null);
                  setTrackedTitleId(null);
                  setSynced(false);
                }}
                className="flex items-center gap-1 text-sm text-[var(--color-textDim)] hover:text-[var(--color-primary)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>

              {selectedTitle && (
                <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  {selectedTitle.coverUrl ? (
                    <img
                      src={selectedTitle.coverUrl}
                      alt={selectedTitle.title}
                      className="h-12 w-9 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-9 shrink-0 rounded bg-white/5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-textMain)] truncate">
                      {selectedTitle.titlePortuguese || selectedTitle.title}
                    </p>
                    <p className="text-xs text-[var(--color-textDim)]">
                      Buscando capítulo {chapter.chapter}...
                    </p>
                  </div>
                </div>
              )}

              {(trackTitle.isPending || syncChapters.isPending) && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                  <p className="text-sm text-[var(--color-textDim)]">
                    {trackTitle.isPending
                      ? "Rastreando título..."
                      : "Sincronizando capítulos..."}
                  </p>
                </div>
              )}

              {synced && matchingChapters.length === 0 && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Capítulo {chapter.chapter} não encontrado neste provedor
                  </div>
                  <p className="mt-1 text-xs text-yellow-300/70">
                    Tente outro provedor ou verifique se o mangá possui este
                    capítulo na fonte selecionada.
                  </p>
                </div>
              )}

              {synced && matchingChapters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--color-textDim)]">
                    Capítulo(s) correspondente(s) encontrado(s). Selecione qual
                    usar para reimportação:
                  </p>
                  <div className="space-y-2">
                    {matchingChapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--color-textMain)]">
                            Cap. {ch.chapter}
                            {ch.volume != null ? ` (Vol. ${ch.volume})` : ""}
                          </p>
                          {ch.title && (
                            <p className="text-xs text-[var(--color-textDim)]">
                              {ch.title}
                            </p>
                          )}
                          <div className="flex gap-3 mt-1 text-[10px] text-[var(--color-textDim)]">
                            {ch.scanlationGroup && (
                              <span>{ch.scanlationGroup}</span>
                            )}
                            {ch.pages != null && <span>{ch.pages} pág.</span>}
                            {ch.language && <span>{ch.language}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleReimport(ch.externalId)}
                          disabled={reimportFrom.isPending}
                          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {reimportFrom.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Reimportar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {synced &&
                trackedTitleData?.providerTitle?.chapters &&
                matchingChapters.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--color-textDim)]">
                      Capítulos disponíveis neste provedor (
                      {trackedTitleData.providerTitle.chapters.length}):
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-white/5">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-left text-[var(--color-textDim)]">
                            <th className="px-3 py-2">Cap.</th>
                            <th className="px-3 py-2">Título</th>
                            <th className="px-3 py-2">Grupo</th>
                            <th className="px-3 py-2 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {trackedTitleData.providerTitle.chapters
                            .sort((a, b) => a.chapter - b.chapter)
                            .map((ch) => (
                              <tr
                                key={ch.id}
                                className={`hover:bg-white/[0.02] ${
                                  ch.chapter === chapter.chapter
                                    ? "bg-[var(--color-primary)]/5"
                                    : ""
                                }`}
                              >
                                <td className="px-3 py-2 text-[var(--color-textMain)]">
                                  {ch.chapter}
                                </td>
                                <td className="px-3 py-2 text-[var(--color-textDim)] truncate max-w-[150px]">
                                  {ch.title || "—"}
                                </td>
                                <td className="px-3 py-2 text-[var(--color-textDim)]">
                                  {ch.scanlationGroup || "—"}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    onClick={() =>
                                      handleReimport(ch.externalId)
                                    }
                                    disabled={reimportFrom.isPending}
                                    className="rounded px-2 py-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors disabled:opacity-50"
                                  >
                                    Usar
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
