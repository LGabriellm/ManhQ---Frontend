"use client";

import { useDeferredValue, useState } from "react";
import { motion } from "framer-motion";
import {
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

const TRENDING_SEARCHES = [
  "One Piece",
  "Naruto",
  "Attack on Titan",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "My Hero Academia",
];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredQuery.trim();
  const isSearching = searchQuery.trim().length > 0;
  const isQueryReady = normalizedQuery.length >= 2;

  const {
    data: searchResult,
    isLoading,
    error,
    refetch: refetchSearch,
  } = useSeriesSearch(normalizedQuery, 1, 24);
  const { data: suggestionData } = useSearchSuggestions(normalizedQuery, 6);

  const filteredSeries = searchResult?.items ?? [];
  const dynamicSuggestions = suggestionData?.filter(Boolean) ?? [];
  const suggestions =
    dynamicSuggestions.length > 0 ? dynamicSuggestions : TRENDING_SEARCHES;

  return (
    <main className="page-shell space-y-6">
      <header className="space-y-4">
        <div>
          <p className="section-kicker">Catálogo</p>
          <h1 className="section-title">Buscar mangás e HQs</h1>
          <p className="section-description">
            Encontre séries rapidamente, aproveite sugestões dinâmicas e refine
            a navegação sem sair do fluxo principal.
          </p>
        </div>

        <div className="surface-panel rounded-[30px] p-4 sm:p-5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-textDim)]" />
            <input
              type="text"
              placeholder="Buscar mangás, HQs, autores ou títulos alternativos..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="field-input rounded-[24px] py-4 pl-12 pr-12 text-sm"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--color-textDim)] transition-colors hover:bg-white/5 hover:text-[var(--color-textMain)]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
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
              Atualizadas com sugestões da API
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {suggestions.map((search) => (
              <motion.button
                key={search}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setSearchQuery(search)}
                className="ui-btn-secondary px-4 py-2.5 text-sm font-medium"
              >
                {search}
              </motion.button>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="page-header">
            <div>
              <p className="section-kicker">Resultados</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
                {isQueryReady
                  ? `${filteredSeries.length} resultado(s) para "${searchQuery.trim()}"`
                  : `Buscando por "${searchQuery.trim()}"`}
              </h2>
            </div>
            {isQueryReady ? (
              <p className="text-sm text-[var(--color-textDim)]">
                O catálogo é consultado com atraso curto para evitar buscas em
                excesso enquanto você digita.
              </p>
            ) : null}
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
              title="Buscando no catálogo"
              description="Carregando capas e resultados correspondentes ao termo informado."
              tone="info"
            />
          ) : error ? (
            <FeedbackState
              icon={<WifiOff className="h-6 w-6" />}
              title="Erro ao carregar os resultados"
              description="Verifique a conexão e tente a consulta novamente."
              tone="danger"
              actionLabel="Tentar novamente"
              onAction={() => {
                void refetchSearch();
              }}
            />
          ) : filteredSeries.length === 0 ? (
            <FeedbackState
              icon={<SearchIcon className="h-6 w-6" />}
              title="Nenhum resultado encontrado"
              description={`Não encontramos títulos compatíveis com "${searchQuery.trim()}". Tente um nome alternativo ou um termo mais amplo.`}
              tone="default"
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {filteredSeries.map((series) => (
                <MangaCard
                  key={series.id}
                  id={series.id}
                  title={series.title}
                  coverUrl={series.coverUrl ?? ""}
                  rating={series.rating}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
