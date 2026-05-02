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
  ChevronRight,
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
import { cn } from "@/lib/utils";

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

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 mb-3">
      <div className="w-0.5 h-5 rounded-full bg-[var(--color-primary)]" />
      <h2 className="text-sm font-black text-textMain uppercase tracking-wide">
        {title}
      </h2>
      {count != null && (
        <span className="text-xs text-textDim/50 font-semibold ml-auto">
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function LibrarySkeleton() {
  return (
    <div className="space-y-px">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0"
        >
          <div className="w-12 h-16 rounded-lg bg-surface/60 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3.5 w-2/3 rounded bg-surface/60 animate-pulse" />
            <div className="h-2.5 w-1/3 rounded bg-surface/60 animate-pulse" />
            <div className="h-2 w-1/2 rounded bg-surface/40 animate-pulse mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="px-4 grid grid-cols-3 gap-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i}>
          <div className="aspect-[2/3] rounded-xl bg-surface/50 animate-pulse" />
          <div className="mt-2 h-2.5 w-3/4 rounded bg-surface/40 animate-pulse" />
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
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 transition-colors",
        "hover:bg-white/[0.02] active:bg-white/[0.03]",
      )}
    >
      {/* Cover */}
      <div className="relative w-12 h-16 shrink-0 rounded-lg overflow-hidden shadow-md ring-1 ring-white/5">
        {coverUrl ? (
          <AuthCover
            coverUrl={coverUrl}
            alt={item.seriesTitle || ""}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-surface flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-textDim" />
          </div>
        )}
        {/* Progress bar at bottom of cover */}
        {!item.finished && pageCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
            <div
              className="h-full bg-primary/80 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-textMain line-clamp-1">
          {item.seriesTitle || "Série desconhecida"}
        </h3>
        <p className="text-[11px] text-textDim mt-0.5 line-clamp-1">
          {chapterLabel}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {item.finished ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-400/8 px-1.5 py-0.5 rounded-md">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Concluído
            </span>
          ) : (
            <span className="text-[10px] text-textDim/60 tabular-nums">
              Pág. {item.page}
              {pageCount > 0 && ` / ${pageCount}`}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-textDim/50">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(item.lastReadAt)}
          </span>
        </div>
      </div>

      {/* Action icon */}
      <div className="shrink-0">
        {item.finished ? (
          <div className="w-7 h-7 rounded-lg bg-emerald-500/8 flex items-center justify-center ring-1 ring-emerald-400/15">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center ring-1 ring-primary/15">
            <Play className="w-3 h-3 text-primary fill-primary" />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (readLink === "#") {
    return cardContent;
  }

  return (
    <Link href={readLink} className="block">
      {cardContent}
    </Link>
  );
}

// ─── Series list item (used in favorites list view + reading list) ───────────
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
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
      >
        {/* Cover */}
        <div className="relative w-12 h-16 shrink-0 rounded-lg overflow-hidden shadow-md ring-1 ring-white/5">
          <AuthCover
            coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
            alt={series.title}
            className="object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-textMain line-clamp-1">
            {series.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {series.genres?.slice(0, 2).map((g) => (
              <span
                key={g}
                className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded-md text-textDim/70"
              >
                {g}
              </span>
            ))}
          </div>
          {series._count?.medias != null && (
            <p className="text-[10px] text-textDim/50 mt-0.5">
              {series._count.medias} capítulos
            </p>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {icon ?? <Heart className="w-4 h-4 fill-primary text-primary" />}
          <ChevronRight className="w-3.5 h-3.5 text-textDim/30" />
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
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
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-12 h-12 text-textDim/20 mb-4 flex items-center justify-center"
      >
        {icon}
      </motion.div>
      <h3 className="text-base font-bold text-textMain mb-1.5">{title}</h3>
      <p className="text-sm text-textDim max-w-xs leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-5 block">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm shadow-lg shadow-primary/20"
          >
            {actionLabel}
          </motion.div>
        </Link>
      )}
    </div>
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

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      items = items.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.genres?.some((g) => g.toLowerCase().includes(q)),
      );
    }

    switch (sortBy) {
      case "name":
        items.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
        break;
      case "rating":
        items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "recent":
      default:
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
      count: favorites?.length,
    },
    {
      id: "reading" as Tab,
      label: "Lendo",
      count: readingSeries?.length,
    },
    {
      id: "history" as Tab,
      label: "Histórico",
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
    (activeTab === "reading" && (errorReadingSeries || errorContinueReading)) ||
    (activeTab === "history" && errorHistory);

  const activeTabCount =
    activeTab === "favorites"
      ? (favorites?.length ?? 0)
      : activeTab === "reading"
        ? (readingSeries?.length ?? 0)
        : (historyData?.total ?? 0);
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
    <main className="min-h-screen pt-4 pb-24 safe-header">
      {/* Header */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-textMain tracking-tight">
              Minha Biblioteca
            </h1>
            <p className="text-xs text-textDim/60 mt-0.5 font-medium">
              {activeTabCount} {activeTabLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery("");
              }}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                showSearch
                  ? "bg-primary/10 text-primary"
                  : "bg-white/5 text-textDim hover:text-textMain",
              )}
            >
              <Search className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Search bar */}
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
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textDim/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar na biblioteca..."
                    autoFocus
                    className="w-full bg-white/6 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-textMain placeholder:text-textDim/50 focus:border-[var(--color-primary)]/40 focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textDim/50 hover:text-textMain text-xs font-medium"
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

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/[0.04] p-1 rounded-2xl mx-4 mb-5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
                setShowSort(false);
              }}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5",
                isActive
                  ? "bg-[var(--color-surface)] text-textMain shadow-sm"
                  : "text-textDim/60 hover:text-textDim",
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="text-[9px] font-black text-textDim/50 tabular-nums">
                  {tab.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Toolbar for favorites (sort + view mode) */}
      {activeTab === "favorites" && favorites && favorites.length > 0 && (
        <div className="flex items-center justify-between px-4 mb-4">
          <p className="text-xs text-textDim/50 font-medium">
            {filteredFavorites.length}{" "}
            {filteredFavorites.length === 1 ? "série" : "séries"}
          </p>
          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-lg text-xs text-textDim/60 hover:text-textMain transition-colors"
              >
                <ArrowUpDown className="w-3 h-3" />
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
                        className={cn(
                          "w-full text-left px-3.5 py-2.5 text-xs transition-colors",
                          sortBy === opt.id
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-textDim hover:bg-white/5 hover:text-textMain",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View mode */}
            <div className="flex bg-white/5 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-primary/20 text-primary"
                    : "text-textDim/50 hover:text-textMain",
                )}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-primary/20 text-primary"
                    : "text-textDim/50 hover:text-textMain",
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        {isLoading ? (
          activeTab === "favorites" ? (
            <GridSkeleton />
          ) : (
            <LibrarySkeleton />
          )
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <WifiOff className="w-12 h-12 text-textDim/20 mb-4" />
            <p className="text-base font-bold text-textMain mb-1.5">
              Erro ao carregar
            </p>
            <p className="text-sm text-textDim mb-5">
              Verifique sua conexão e tente novamente
            </p>
            <button
              onClick={() => {
                void handleRetry();
              }}
              className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm"
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
                    <div className="px-4">
                      <SectionHeader
                        title="Favoritos"
                        count={filteredFavorites.length}
                      />
                      <div className="grid grid-cols-3 gap-2">
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
                              coverUrl={getPublicCoverUrl(
                                series.id,
                                series.coverUrl,
                              )}
                              rating={series.rating}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <SectionHeader
                        title="Favoritos"
                        count={filteredFavorites.length}
                      />
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
                    icon={<Search className="w-12 h-12" />}
                    title="Sem resultados"
                    description={`Nenhum favorito encontrado para "${searchQuery}"`}
                  />
                ) : (
                  <EmptyState
                    icon={<Heart className="w-12 h-12" />}
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
                  <div className="space-y-6">
                    {readingProgressItems.length > 0 && (
                      <section>
                        <SectionHeader
                          title="Continuar Lendo"
                          count={readingProgressItems.length}
                        />
                        <div className="px-4 space-y-2.5">
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
                                coverUrl={getPublicCoverUrl(
                                  item.seriesId,
                                  item.coverUrl,
                                )}
                                chapterTitle={
                                  item.mediaTitle ||
                                  `Capítulo ${item.mediaNumber}`
                                }
                                currentPage={item.page}
                                totalPages={item.pageCount}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </section>
                    )}

                    {filteredReadingSeries.length > 0 && (
                      <section>
                        <SectionHeader
                          title="Lista de Leitura"
                          count={filteredReadingSeries.length}
                        />
                        {filteredReadingSeries.map((series, i) => (
                          <motion.div
                            key={series.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <LibrarySeriesListItem
                              series={series}
                              icon={
                                <BookOpen className="w-4 h-4 text-primary" />
                              }
                            />
                          </motion.div>
                        ))}
                      </section>
                    )}
                  </div>
                ) : searchQuery ? (
                  <EmptyState
                    icon={<Search className="w-12 h-12" />}
                    title="Sem resultados"
                    description={`Nada encontrado para "${searchQuery}"`}
                  />
                ) : (
                  <EmptyState
                    icon={<BookOpen className="w-12 h-12" />}
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
                  <div>
                    <SectionHeader
                      title="Histórico"
                      count={filteredHistory.length}
                    />
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
                    icon={<Search className="w-12 h-12" />}
                    title="Sem resultados"
                    description={`Nada encontrado para "${searchQuery}"`}
                  />
                ) : (
                  <EmptyState
                    icon={<History className="w-12 h-12" />}
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
