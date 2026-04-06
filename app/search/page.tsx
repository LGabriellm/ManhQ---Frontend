"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Search as SearchIcon,
  Sparkles,
  TrendingUp,
  WifiOff,
  X,
} from "lucide-react";
import { FeedbackState } from "@/components/FeedbackState";
import { MangaCard } from "@/components/MangaCard";
import { useSearchSuggestions, useSeriesSearch } from "@/hooks/useApi";
import { getPublicCoverUrl } from "@/lib/coverUrl";

const TRENDING_SEARCHES = [
  "One Piece",
  "Naruto",
  "Attack on Titan",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "My Hero Academia",
];

const SEARCH_LIMIT = 24;
const SUGGESTIONS_LIMIT = 6;

interface PaginationButtonProps {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}

function PaginationButton({
  direction,
  disabled,
  onClick,
}: PaginationButtonProps) {
  const isPrevious = direction === "previous";

  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className="ui-btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45"
    >
      {isPrevious ? <ArrowLeft className="h-4 w-4" /> : null}
      {isPrevious ? "Página anterior" : "Próxima página"}
      {!isPrevious ? <ArrowRight className="h-4 w-4" /> : null}
    </motion.button>
  );
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const deferredQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredQuery.trim();
  const visibleQuery = searchQuery.trim();
  const isSearching = visibleQuery.length > 0;
  const isQueryReady = normalizedQuery.length >= 2;
  const shouldLoadSuggestions = isInputFocused && isQueryReady;

  const {
    data: searchResult,
    isLoading,
    isFetching,
    error,
    refetch: refetchSearch,
  } = useSeriesSearch(normalizedQuery, currentPage, SEARCH_LIMIT, {
    enabled: isQueryReady,
    staleTime: 1000 * 45,
  });
  const { data: suggestionData, isFetching: isFetchingSuggestions } =
    useSearchSuggestions(normalizedQuery, SUGGESTIONS_LIMIT, {
      enabled: shouldLoadSuggestions,
      staleTime: 1000 * 60 * 2,
    });

  const filteredSeries = searchResult?.items ?? [];
  const totalResults = searchResult?.total ?? filteredSeries.length;
  const totalPages =
    searchResult?.totalPages ??
    (totalResults > 0 ? Math.ceil(totalResults / SEARCH_LIMIT) : 0);
  const canGoPrevious = currentPage > 1;
  const canGoNext = totalPages > 0 && currentPage < totalPages;

  const dynamicSuggestions = useMemo(() => {
    const normalizedCurrentQuery = normalizedQuery.toLocaleLowerCase("pt-BR");

    return (suggestionData ?? [])
      .filter((suggestion) => suggestion.trim().length > 0)
      .filter(
        (suggestion) =>
          suggestion.toLocaleLowerCase("pt-BR") !== normalizedCurrentQuery,
      )
      .slice(0, SUGGESTIONS_LIMIT);
  }, [normalizedQuery, suggestionData]);

  const landingSuggestions =
    dynamicSuggestions.length > 0 ? dynamicSuggestions : TRENDING_SEARCHES;
  const showSuggestionTray =
    shouldLoadSuggestions &&
    (isFetchingSuggestions || dynamicSuggestions.length > 0);

  const applySearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setIsInputFocused(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage((page) => (page === 1 ? page : 1));
  };

  return (
    <main className="page-shell space-y-6">
      <header className="space-y-4">
        <div>
          <p className="section-kicker">Catálogo</p>
          <h1 className="section-title">Buscar mangás e HQs</h1>
          <p className="section-description">
            Encontre séries rapidamente, receba sugestões só quando fizer
            sentido e avance por páginas sem refazer consultas desnecessárias.
          </p>
        </div>

        <div className="surface-panel rounded-[30px] p-4 sm:p-5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-textDim)]" />
            <input
              type="text"
              name="search"
              aria-label="Buscar mangás e HQs"
              autoComplete="off"
              placeholder="Buscar mangás, HQs, autores ou títulos alternativos…"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              className="field-input rounded-[24px] py-4 pl-12 pr-12 text-sm"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--color-textDim)] transition-colors hover:bg-white/5 hover:text-[var(--color-textMain)]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {showSuggestionTray ? (
            <div className="mt-3 rounded-[24px] border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-textDim)]">
                  Sugestões rápidas
                </p>
                {isFetchingSuggestions ? (
                  <span className="inline-flex items-center gap-2 text-xs text-[var(--color-textDim)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Refinando termos
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2.5">
                {dynamicSuggestions.map((suggestion) => (
                  <motion.button
                    key={suggestion}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applySearch(suggestion);
                    }}
                    className="ui-btn-secondary px-4 py-2.5 text-sm font-medium"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {!isSearching ? (
        <section className="surface-panel rounded-[30px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Sugestões</p>
              <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-[var(--color-textMain)]">
                <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
                Buscas em destaque
              </h2>
            </div>
            <span className="badge-soft text-[var(--color-textMain)]">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              A API entra em cena quando você começa a digitar
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {landingSuggestions.map((search) => (
              <motion.button
                key={search}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => applySearch(search)}
                className="ui-btn-secondary px-4 py-2.5 text-sm font-medium"
              >
                {search}
              </motion.button>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="page-header gap-4">
            <div>
              <p className="section-kicker">Resultados</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
                {isQueryReady
                  ? `${totalResults} resultado(s) para "${visibleQuery}"`
                  : `Buscando por "${visibleQuery}"`}
              </h2>
            </div>
            <div className="space-y-1 text-sm text-[var(--color-textDim)]">
              {isQueryReady ? (
                <p>
                  Página {currentPage}
                  {totalPages > 0 ? ` de ${totalPages}` : ""} com limite de{" "}
                  {SEARCH_LIMIT} itens por consulta.
                </p>
              ) : (
                <p>A busca só dispara quando houver contexto suficiente.</p>
              )}
              {isFetching && !isLoading ? (
                <p>Atualizando resultados sem recarregar toda a página.</p>
              ) : null}
            </div>
          </div>

          {!isQueryReady ? (
            <FeedbackState
              icon={<SearchIcon className="h-6 w-6" />}
              title="Digite ao menos 2 caracteres"
              description="A busca é ativada quando houver contexto suficiente para resultados melhores."
              tone="info"
            />
          ) : isLoading ? (
            <FeedbackState
              icon={<Loader2 className="h-6 w-6 animate-spin" />}
              title={
                currentPage > 1
                  ? `Carregando a página ${currentPage}`
                  : "Buscando no catálogo"
              }
              description="Carregando capas e resultados correspondentes ao termo informado."
              tone="info"
            />
          ) : error ? (
            <FeedbackState
              icon={<WifiOff className="h-6 w-6" />}
              title="Erro ao carregar os resultados"
              description={`Não foi possível concluir a busca por "${visibleQuery}". Verifique a conexão e tente novamente.`}
              tone="danger"
              actionLabel="Tentar novamente"
              onAction={() => {
                void refetchSearch();
              }}
            />
          ) : filteredSeries.length === 0 ? (
            <div className="space-y-4">
              <FeedbackState
                icon={<SearchIcon className="h-6 w-6" />}
                title="Nenhum resultado encontrado"
                description={`Não encontramos títulos compatíveis com "${visibleQuery}". Tente um nome alternativo ou um termo mais amplo.`}
                tone="default"
              />

              {dynamicSuggestions.length > 0 ? (
                <div className="surface-panel rounded-[26px] p-5">
                  <p className="text-sm font-medium text-[var(--color-textMain)]">
                    Tente um destes termos sugeridos:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {dynamicSuggestions.map((suggestion) => (
                      <motion.button
                        key={suggestion}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => applySearch(suggestion)}
                        className="ui-btn-secondary px-4 py-2.5 text-sm font-medium"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                {filteredSeries.map((series) => (
                  <MangaCard
                    key={series.id}
                    id={series.id}
                    title={series.title}
                    coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
                    rating={series.rating}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="surface-panel flex flex-col gap-3 rounded-[26px] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-[var(--color-textDim)]">
                    Exibindo {filteredSeries.length} item(ns) nesta página de um
                    total de {totalResults}.
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <PaginationButton
                      direction="previous"
                      disabled={!canGoPrevious || isFetching}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                    />
                    <PaginationButton
                      direction="next"
                      disabled={!canGoNext || isFetching}
                      onClick={() =>
                        setCurrentPage((page) =>
                          totalPages > 0 ? Math.min(totalPages, page + 1) : page,
                        )
                      }
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}
    </main>
  );
}
