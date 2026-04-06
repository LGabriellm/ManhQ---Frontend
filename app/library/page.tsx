"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  History,
  Heart,
  Clock,
  CheckCircle2,
  Play,
  Search,
  WifiOff,
  Grid3X3,
  List,
  ArrowUpDown,
} from "lucide-react";
import { MangaCard } from "@/components/MangaCard";
import { ContinueReadingCard } from "@/components/ContinueReadingCard";
import { AuthCover } from "@/components/AuthCover";
import { motion, AnimatePresence } from "framer-motion";
import {
  useFavorites as useApiFavorites,
  useContinueReading,
  useProgressHistory,
  useReading as useApiReading,
} from "@/hooks/useApi";
import type { ProgressHistoryItem, Series } from "@/types/api";
import { getPublicCoverUrl } from "@/lib/coverUrl";

type Tab = "favorites" | "reading" | "history";
type SortOption = "recent" | "name" | "rating";
type ViewMode = "grid" | "list";

// ─── Formata data relativa ──────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) {
    return "recentemente";
  }
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "agora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h atrás`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function LibrarySkeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex gap-3 p-3 bg-surface/50 rounded-2xl animate-pulse"
        >
          <div className="w-14 h-20 rounded-xl bg-surface animate-pulse" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 rounded bg-surface animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-surface animate-pulse" />
            <div className="h-1.5 w-1/2 rounded bg-surface animate-pulse mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="px-4 grid grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i}>
          <div className="aspect-2/3 rounded-xl bg-surface/50 animate-pulse" />
          <div className="mt-2 h-3 w-3/4 rounded bg-surface/50 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── Card de item do histórico ──────────────────────────────────────────────
function HistoryItemCard({ item }: { item: ProgressHistoryItem }) {
  const coverUrl = item.coverUrl || "";

  const readLink = item.mediaId
    ? item.finished
      ? `/serie/${item.seriesId}`
      : `/reader/${item.seriesId}/${item.mediaId}?page=${item.page}`
    : "#";

  const chapterLabel =
    item.mediaTitle ||
    (item.mediaNumber ? `Capítulo ${item.mediaNumber}` : "Capítulo");

  const pageCount = item.pageCount ?? 0;
  const progress = pageCount > 0 ? (item.page / pageCount) * 100 : 0;
  const cardContent = (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="relative flex gap-3 p-3 bg-surface/60 backdrop-blur-sm rounded-2xl overflow-hidden group border border-white/4 hover:border-white/8 transition-all"
    >
      <div className="relative w-13 h-18 shrink-0 rounded-xl overflow-hidden shadow-md ring-1 ring-white/5">
        {coverUrl ? (
          <AuthCover
            coverUrl={coverUrl}
            alt={item.seriesTitle || ""}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-surface flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-textDim" />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h3 className="text-sm font-semibold text-textMain line-clamp-1 group-hover:text-white transition-colors">
          {item.seriesTitle || "Série desconhecida"}
        </h3>
        <p className="text-[11px] text-textDim mt-0.5 line-clamp-1">
          {chapterLabel}
        </p>

        <div className="flex items-center gap-3 mt-1.5">
          {item.finished ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-400/8 px-1.5 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3" />
              Concluído
            </span>
          ) : (
            <span className="text-[10px] text-textDim tabular-nums">
              Pág. {item.page}
              {pageCount > 0 && ` / ${pageCount}`}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-textDim/70">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(item.lastReadAt)}
          </span>
        </div>

        {!item.finished && pageCount > 0 && (
          <div className="mt-2 h-0.75 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/80 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center shrink-0">
        {item.finished ? (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/8 flex items-center justify-center ring-1 ring-emerald-400/15">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors ring-1 ring-primary/15">
            <Play className="w-3 h-3 text-primary fill-primary" />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (readLink === "#") {
    return cardContent;
  }

  return <Link href={readLink} className="block">{cardContent}</Link>;
}

// ─── Favorite List Item (alternativa ao grid) ───────────────────────────────
function LibrarySeriesListItem({
  series,
  icon,
}: {
  series: Series;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={`/serie/${series.id}`} className="block">
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="flex gap-3 p-3 bg-surface/60 backdrop-blur-sm rounded-2xl group border border-white/4 hover:border-white/8 transition-all"
      >
        <div className="relative w-13 h-18 shrink-0 rounded-xl overflow-hidden shadow-md ring-1 ring-white/5">
          <AuthCover
            coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
            alt={series.title}
            className="object-cover"
          />
        </div>
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h3 className="text-sm font-semibold text-textMain line-clamp-1 group-hover:text-white transition-colors">
            {series.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            {series.genres?.slice(0, 2).map((g) => (
              <span
                key={g}
                className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded-md text-textDim"
              >
                {g}
              </span>
            ))}
          </div>
          {series._count?.medias != null && (
            <p className="text-[10px] text-textDim mt-1">
              {series._count.medias} capítulos
            </p>
          )}
        </div>
        <div className="flex items-center">
          {icon ?? <Heart className="w-4 h-4 fill-primary text-primary" />}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Página da Biblioteca ───────────────────────────────────────────────────

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("favorites");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSort, setShowSort] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isFavoritesTab = activeTab === "favorites";
  const isReadingTab = activeTab === "reading";
  const isHistoryTab = activeTab === "history";

  const {
    data: favorites,
    isLoading: isLoadingFavorites,
    error: errorFavorites,
    refetch: refetchFavorites,
  } = useApiFavorites({ enabled: isFavoritesTab });
  const {
    data: readingSeries,
    isLoading: isLoadingReadingSeries,
    error: errorReadingSeries,
    refetch: refetchReadingSeries,
  } = useApiReading({ enabled: isReadingTab });
  const {
    data: continueReading,
    isLoading: isLoadingContinueReading,
    error: errorContinueReading,
    refetch: refetchContinueReading,
  } = useContinueReading({ limit: 30 }, { enabled: isReadingTab });
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: errorHistory,
    refetch: refetchHistory,
  } = useProgressHistory({ limit: 50 }, { enabled: isHistoryTab });

  const handleRetry = async () => {
    if (activeTab === "favorites") {
      await refetchFavorites();
      return;
    }

    if (activeTab === "reading") {
      await Promise.all([refetchReadingSeries(), refetchContinueReading()]);
      return;
    }

    await refetchHistory();
  };

  // Filtrar favoritos com busca
  const filteredFavorites = useMemo(() => {
    if (!favorites) return [];
    let items = [...favorites];

    // Filtro de busca
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      items = items.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.genres?.some((g) => g.toLowerCase().includes(q)),
      );
    }

    // Ordenação
    switch (sortBy) {
      case "name":
        items.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
        break;
      case "rating":
        items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "recent":
      default:
        // Manter ordem original (mais recente)
        break;
    }

    return items;
  }, [favorites, deferredSearchQuery, sortBy]);

  const filteredReadingSeries = useMemo(() => {
    if (!readingSeries) return [];
    if (!deferredSearchQuery.trim()) return readingSeries;
    const q = deferredSearchQuery.toLowerCase();

    return readingSeries.filter(
      (series) =>
        series.title.toLowerCase().includes(q) ||
        series.genres?.some((genre) => genre.toLowerCase().includes(q)),
    );
  }, [deferredSearchQuery, readingSeries]);

  const readingProgressItems = useMemo(() => {
    const items = continueReading?.filter((item) => !item.finished) || [];
    if (!deferredSearchQuery.trim()) return items;
    const q = deferredSearchQuery.toLowerCase();

    return items.filter((item) =>
      (item.seriesTitle || "").toLowerCase().includes(q),
    );
  }, [continueReading, deferredSearchQuery]);

  // Filtrar histórico
  const filteredHistory = useMemo(() => {
    if (!historyData?.items) return [];
    if (!deferredSearchQuery.trim()) return historyData.items;
    const q = deferredSearchQuery.toLowerCase();
    return historyData.items.filter((i) =>
      (i.seriesTitle || "").toLowerCase().includes(q),
    );
  }, [deferredSearchQuery, historyData]);

  const tabs = [
    {
      id: "favorites" as Tab,
      label: "Favoritos",
      icon: Heart,
      count: favorites?.length,
    },
    {
      id: "reading" as Tab,
      label: "Lendo",
      icon: BookOpen,
      count: readingSeries?.length,
    },
    {
      id: "history" as Tab,
      label: "Histórico",
      icon: History,
      count: historyData?.total,
    },
  ];

  const isLoading =
    (activeTab === "favorites" && isLoadingFavorites) ||
    (activeTab === "reading" &&
      (isLoadingReadingSeries || isLoadingContinueReading)) ||
    (activeTab === "history" && isLoadingHistory);

  const hasError =
    (activeTab === "favorites" && errorFavorites) ||
    (activeTab === "reading" &&
      (errorReadingSeries || errorContinueReading)) ||
    (activeTab === "history" && errorHistory);

  const activeTabCount =
    activeTab === "favorites"
      ? favorites?.length ?? 0
      : activeTab === "reading"
        ? readingSeries?.length ?? 0
        : historyData?.total ?? 0;
  const activeTabLabel =
    activeTab === "history"
      ? activeTabCount === 1
        ? "registro"
        : "registros"
      : activeTabCount === 1
        ? "item"
        : "itens";

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: "recent", label: "Mais recente" },
    { id: "name", label: "Nome (A-Z)" },
    { id: "rating", label: "Melhor avaliado" },
  ];

  return (
    <main className="min-h-screen pt-4 pb-24">
      {/* Header */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-textMain tracking-tight">
              Minha Biblioteca
            </h1>
            <p className="text-xs text-textDim mt-0.5">
              {activeTabCount} {activeTabLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle busca */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery("");
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                showSearch
                  ? "bg-primary/10 text-primary"
                  : "bg-surface text-textDim"
              }`}
            >
              <Search className="w-4.5 h-4.5" />
            </motion.button>
          </div>
        </div>

        {/* Barra de busca animada */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textDim" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar na biblioteca..."
                    autoFocus
                    className="w-full bg-surface border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-textMain placeholder:text-textDim/50 outline-none focus:border-primary/30 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textDim hover:text-textMain text-xs"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
                setShowSort(false);
              }}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white/5 text-textDim hover:text-textMain hover:bg-white/8"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white/8 text-textDim"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Toolbar para Favoritos (sort + view mode) */}
      {activeTab === "favorites" && favorites && favorites.length > 0 && (
        <div className="flex items-center justify-between px-4 mb-3">
          <p className="text-xs text-textDim">
            {filteredFavorites.length}{" "}
            {filteredFavorites.length === 1 ? "série" : "séries"}
          </p>
          <div className="flex items-center gap-2">
            {/* Sort button */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface rounded-lg text-xs text-textDim hover:text-textMain transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortOptions.find((s) => s.id === sortBy)?.label}
              </motion.button>

              <AnimatePresence>
                {showSort && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-full mt-1 z-20 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-36"
                  >
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSortBy(opt.id);
                          setShowSort(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors ${
                          sortBy === opt.id
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-textDim hover:bg-white/5 hover:text-textMain"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View mode toggle */}
            <div className="flex bg-surface rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary/20 text-primary"
                    : "text-textDim hover:text-textMain"
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-primary/20 text-primary"
                    : "text-textDim hover:text-textMain"
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="px-4">
        {isLoading ? (
          activeTab === "favorites" ? (
            <GridSkeleton />
          ) : (
            <LibrarySkeleton />
          )
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <WifiOff className="w-12 h-12 text-textDim mb-4" />
            <p className="text-textMain font-semibold mb-2">Erro ao carregar</p>
            <p className="text-textDim text-sm mb-4">
              Verifique sua conexão e tente novamente
            </p>
            <button
              onClick={() => {
                void handleRetry();
              }}
              className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ===== FAVORITOS ===== */}
            {activeTab === "favorites" && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {filteredFavorites.length > 0 ? (
                  viewMode === "grid" ? (
                    <div className="grid grid-cols-3 gap-3">
                      {filteredFavorites.map((series, i) => (
                        <motion.div
                          key={series.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <MangaCard
                            id={series.id}
                            title={series.title}
                            coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
                            rating={series.rating}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFavorites.map((series, i) => (
                        <motion.div
                          key={series.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <LibrarySeriesListItem series={series} />
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : searchQuery ? (
                  <EmptyState
                    icon={<Search className="w-10 h-10 text-textDim" />}
                    title="Sem resultados"
                    description={`Nenhum favorito encontrado para "${searchQuery}"`}
                  />
                ) : (
                  <EmptyState
                    icon={<Heart className="w-10 h-10 text-textDim" />}
                    title="Nenhum favorito"
                    description="Toque no coração nas páginas de mangás para adicioná-los aos favoritos"
                    actionLabel="Explorar catálogo"
                    actionHref="/search"
                  />
                )}
              </motion.div>
            )}

            {/* ===== LENDO ===== */}
            {activeTab === "reading" && (
              <motion.div
                key="reading"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {filteredReadingSeries.length > 0 ||
                readingProgressItems.length > 0 ? (
                  <div className="space-y-4">
                    {readingProgressItems.length > 0 && (
                      <section className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textDim/75">
                            Continuar lendo
                          </p>
                          <span className="text-[11px] text-textDim tabular-nums">
                            {readingProgressItems.length}
                          </span>
                        </div>

                        {readingProgressItems.map((item, i) => (
                          <motion.div
                            key={item.mediaId}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                          >
                            <ContinueReadingCard
                              seriesId={item.seriesId}
                              mediaId={item.mediaId}
                              title={item.seriesTitle || "Sem título"}
                              coverUrl={getPublicCoverUrl(item.seriesId, item.coverUrl)}
                              chapterTitle={
                                item.mediaTitle || `Capítulo ${item.mediaNumber}`
                              }
                              currentPage={item.page}
                              totalPages={item.pageCount}
                            />
                          </motion.div>
                        ))}
                      </section>
                    )}

                    {filteredReadingSeries.length > 0 && (
                      <section className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textDim/75">
                            Lista de leitura
                          </p>
                          <span className="text-[11px] text-textDim tabular-nums">
                            {filteredReadingSeries.length}
                          </span>
                        </div>

                        {filteredReadingSeries.map((series, i) => (
                          <motion.div
                            key={series.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <LibrarySeriesListItem
                              series={series}
                              icon={<BookOpen className="w-4 h-4 text-primary" />}
                            />
                          </motion.div>
                        ))}
                      </section>
                    )}
                  </div>
                ) : searchQuery ? (
                  <EmptyState
                    icon={<Search className="w-10 h-10 text-textDim" />}
                    title="Sem resultados"
                    description={`Nada encontrado para "${searchQuery}"`}
                  />
                ) : (
                  <EmptyState
                    icon={<BookOpen className="w-10 h-10 text-textDim" />}
                    title="Nada sendo lido"
                    description="Comece a ler um mangá e ele aparecerá aqui para continuar de onde parou"
                    actionLabel="Descobrir séries"
                    actionHref="/search"
                  />
                )}
              </motion.div>
            )}

            {/* ===== HISTÓRICO ===== */}
            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {filteredHistory.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredHistory.map((item, i) => (
                      <motion.div
                        key={`${item.mediaId}-${item.lastReadAt}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <HistoryItemCard item={item} />
                      </motion.div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <EmptyState
                    icon={<Search className="w-10 h-10 text-textDim" />}
                    title="Sem resultados"
                    description={`Nada encontrado para "${searchQuery}"`}
                  />
                ) : (
                  <EmptyState
                    icon={<History className="w-10 h-10 text-textDim" />}
                    title="Histórico vazio"
                    description="Seu histórico de leitura aparecerá aqui conforme você lê"
                    actionLabel="Começar a ler"
                    actionHref="/search"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}

// ─── Empty state reutilizável ───────────────────────────────────────────────
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4"
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-semibold text-textMain mb-2">{title}</h3>
      <p className="text-textDim text-sm max-w-xs mb-4">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="block">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm shadow-lg shadow-primary/20"
          >
            {actionLabel}
          </motion.div>
        </Link>
      )}
    </div>
  );
}
