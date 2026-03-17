"use client";

import { useState, useDeferredValue } from "react";
import {
  Search as SearchIcon,
  X,
  TrendingUp,
  Loader2,
  WifiOff,
} from "lucide-react";
import { MangaCard } from "@/components/MangaCard";
import { motion } from "framer-motion";
import { useSeriesSearch, useSearchSuggestions } from "@/hooks/useApi";

// Buscas sugeridas
const trendingSearches = [
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
  const {
    data: searchResult,
    isLoading,
    error,
    refetch: refetchSearch,
  } = useSeriesSearch(deferredQuery, 1, 24);
  const { data: suggestionData } = useSearchSuggestions(deferredQuery, 6);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const isSearching = searchQuery.trim().length > 0;
  const normalizedQuery = deferredQuery.trim();
  const isQueryReady = normalizedQuery.length >= 2;
  const filteredSeries = searchResult?.items ?? [];
  const dynamicSuggestions = suggestionData?.filter(Boolean) ?? [];
  const suggestions =
    dynamicSuggestions.length > 0 ? dynamicSuggestions : trendingSearches;

  return (
    <main className="min-h-screen pt-4 pb-20">
      {/* Barra de busca */}
      <div className="px-4 mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textDim" />
          <input
            type="text"
            placeholder="Buscar mangás e HQs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-12 py-4 bg-surface text-textMain rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-textDim" />
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {!isSearching ? (
        // Buscas em alta
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-textMain">Sugestões</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((search) => (
              <motion.button
                key={search}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSearch(search)}
                className="px-4 py-2 bg-surface hover:bg-surface/80 text-textMain rounded-full text-sm font-medium transition-colors"
              >
                {search}
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        // Resultados da busca
        <div className="px-4">
          <h2 className="text-lg font-bold text-textMain mb-4">
            Resultados para &quot;{searchQuery}&quot;
          </h2>

          {!isQueryReady ? (
            <div className="text-center py-12">
              <p className="text-textDim">Digite ao menos 2 caracteres</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <WifiOff className="w-12 h-12 text-textDim mb-4" />
              <p className="text-textMain font-semibold mb-2">
                Erro ao carregar
              </p>
              <p className="text-textDim text-sm mb-4">
                Verifique sua conexão e tente novamente
              </p>
              <button
                onClick={() => {
                  void refetchSearch();
                }}
                className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {filteredSeries.map((series) => (
                  <MangaCard
                    key={series.id}
                    id={series.id}
                    title={series.title}
                    coverUrl={series.coverUrl!}
                    rating={series.rating}
                  />
                ))}
              </div>

              {filteredSeries.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-textDim">Nenhum resultado encontrado</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
