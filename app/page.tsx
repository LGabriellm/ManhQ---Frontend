"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Loader2,
  Heart,
  Clock,
  Flame,
  Sparkles,
  RefreshCw,
  ChevronRight,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { MangaCard } from "@/components/MangaCard";
import { ContinueReadingCard } from "@/components/ContinueReadingCard";
import { Section } from "@/components/Section";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { useContinueReading } from "@/hooks/useApi";
import { useDiscover } from "@/hooks/useDiscover";
import { useFavorites } from "@/hooks/useFavoritesApi";
import { useAuth } from "@/contexts/AuthContext";
import { AuthCover } from "@/components/AuthCover";
import { useMemo, useState, useEffect, useCallback } from "react";
import type { Series } from "@/types/api";

// ─── Saudação com base na hora ─────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <section className="relative h-[65vh] min-h-105 max-h-140 overflow-hidden">
      <div className="absolute inset-0 bg-surface/30 animate-pulse" />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-background/20" />
      <div className="relative h-full flex flex-col justify-end px-5 pb-6">
        <div className="flex gap-4 items-end">
          <div className="w-30 h-42.5 shrink-0 rounded-2xl bg-surface/50 animate-pulse" />
          <div className="flex-1 space-y-3 pb-0.5">
            <div className="flex gap-1.5">
              <div className="h-5 w-20 rounded-full bg-surface/50 animate-pulse" />
              <div className="h-5 w-14 rounded-full bg-surface/50 animate-pulse" />
            </div>
            <div className="h-7 w-3/4 rounded-lg bg-surface/50 animate-pulse" />
            <div className="h-4 w-full rounded-lg bg-surface/50 animate-pulse" />
            <div className="flex gap-2.5 mt-2">
              <div className="flex-1 h-11 rounded-xl bg-surface/50 animate-pulse" />
              <div className="w-11 h-11 rounded-xl bg-surface/50 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-4">
        <div className="w-5 h-5 rounded bg-surface/50 animate-pulse" />
        <div className="h-6 w-40 rounded-lg bg-surface/50 animate-pulse" />
      </div>
      <div className="flex gap-3 px-4 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-32.5 shrink-0">
            <div className="aspect-2/3 rounded-xl bg-surface/50 animate-pulse" />
            <div className="mt-2 h-4 w-3/4 rounded bg-surface/50 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ContinueReadingSkeleton() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-4">
        <div className="w-5 h-5 rounded bg-surface/50 animate-pulse" />
        <div className="h-6 w-40 rounded-lg bg-surface/50 animate-pulse" />
      </div>
      <div className="px-4 space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-3 p-3 bg-surface/50 rounded-2xl animate-pulse"
          >
            <div className="w-16 h-22 rounded-xl bg-surface animate-pulse" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-2/3 rounded bg-surface animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-surface animate-pulse" />
              <div className="h-1.5 w-full rounded-full bg-surface animate-pulse mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero Carousel ─────────────────────────────────────────────────────────────

function HeroCarousel({
  items,
  isFavorite,
  toggleFavorite,
  isUpdating,
}: {
  items: Series[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
  isUpdating: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const series = items[current];

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [items.length]);

  const goTo = useCallback((index: number) => setCurrent(index), []);

  if (!series) return null;

  const statusLabel =
    series.status === "ONGOING"
      ? "Em Andamento"
      : series.status === "COMPLETED"
        ? "Completo"
        : series.status === "HIATUS"
          ? "Hiato"
          : null;

  return (
    <section className="relative h-[65vh] min-h-105 max-h-140 overflow-hidden">
      {/* Background com crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={series.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <AuthCover
            coverUrl={series.coverUrl!}
            alt={series.title}
            className="object-cover scale-110 blur-xl opacity-50"
            loading="eager"
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradientes */}
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-background/20" />
      <div className="absolute inset-0 bg-linear-to-r from-background/70 via-transparent to-background/70" />

      {/* Conteúdo */}
      <div className="relative h-full flex flex-col justify-end px-5 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={series.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex gap-4 items-end"
          >
            {/* Capa */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="w-30 h-42.5 shrink-0 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            >
              <AuthCover
                coverUrl={series.coverUrl!}
                alt={series.title}
                className="object-cover"
                loading="eager"
              />
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0 pb-0.5">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {statusLabel && (
                  <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary font-semibold rounded-full border border-primary/30">
                    {statusLabel}
                  </span>
                )}
                {series.genres?.slice(0, 2).map((genre) => (
                  <span
                    key={genre}
                    className="text-[10px] px-2 py-0.5 bg-white/8 backdrop-blur-sm rounded-full text-textDim font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Título */}
              <h1 className="text-[22px] leading-tight font-extrabold text-white line-clamp-2 mb-1 tracking-tight">
                {series.title}
              </h1>

              {/* Descrição */}
              {series.description && (
                <p className="text-[11px] text-white/50 line-clamp-2 mb-3.5 leading-relaxed">
                  {series.description}
                </p>
              )}

              {/* Ações */}
              <div className="flex gap-2.5">
                <Link href={`/serie/${series.id}`} className="flex-1 min-w-0">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 text-sm"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Ver Detalhes
                  </motion.button>
                </Link>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => toggleFavorite(series.id)}
                  disabled={isUpdating}
                  className="w-11 h-11 bg-white/8 backdrop-blur-md hover:bg-white/15 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 ring-1 ring-white/10 shrink-0"
                >
                  <Heart
                    className={`w-5 h-5 transition-all duration-300 ${
                      isFavorite(series.id)
                        ? "fill-primary text-primary scale-110"
                        : "text-white/70"
                    }`}
                  />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots do carrossel */}
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-5">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index === current
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Quick Genre Pills ──────────────────────────────────────────────────────

function GenrePills({ genres }: { genres: string[] }) {
  if (genres.length === 0) return null;

  return (
    <div className="px-4 mt-3 mb-1">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {genres.map((genre) => (
          <Link key={genre} href={`/search?genre=${encodeURIComponent(genre)}`}>
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-1.5 bg-surface/80 border border-white/5 hover:border-primary/30 rounded-full text-xs font-medium text-textDim hover:text-primary whitespace-nowrap transition-all"
            >
              {genre}
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Ranking Card (para "Mais Populares") ────────────────────────────────────

function RankingCard({ series, rank }: { series: Series; rank: number }) {
  return (
    <Link href={`/serie/${series.id}`}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="relative flex gap-3 items-center p-3 rounded-2xl bg-surface/50 hover:bg-surface/80 transition-all group border border-transparent hover:border-white/5"
      >
        {/* Ranking número */}
        <div className="w-8 text-center shrink-0">
          <span
            className={`text-2xl font-black tabular-nums ${
              rank <= 3 ? "text-primary" : "text-white/20"
            }`}
          >
            {rank}
          </span>
        </div>

        {/* Capa */}
        <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 shadow-md ring-1 ring-white/5">
          <AuthCover
            coverUrl={series.coverUrl || `/series/${series.id}/cover`}
            alt={series.title}
            className="object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-textMain line-clamp-1 group-hover:text-white transition-colors">
            {series.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            {series.genres?.slice(0, 2).map((g) => (
              <span key={g} className="text-[10px] text-textDim">
                {g}
              </span>
            ))}
          </div>
          {series._count?.medias != null && (
            <p className="text-[10px] text-textDim mt-0.5">
              {series._count.medias} capítulos
            </p>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
      </motion.div>
    </Link>
  );
}

// ─── Wide Card (para "Atualizados Recentemente") ────────────────────────────

function UpdatedSeriesCard({ series }: { series: Series }) {
  const latestChapter = series.medias?.[0];

  return (
    <Link href={`/serie/${series.id}`}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="relative w-65 shrink-0 snap-start rounded-2xl overflow-hidden bg-surface/40 border border-white/5 hover:border-white/10 transition-all group"
      >
        {/* Capa com overlay */}
        <div className="relative h-36 overflow-hidden">
          <AuthCover
            coverUrl={series.coverUrl || `/series/${series.id}/cover`}
            alt={series.title}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/40 to-transparent" />

          {/* Badge de atualização */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
            <RefreshCw className="w-2.5 h-2.5" />
            Atualizado
          </div>
        </div>

        {/* Info */}
        <div className="p-3 -mt-4 relative">
          <h3 className="text-sm font-bold text-white line-clamp-1 mb-1">
            {series.title}
          </h3>
          {latestChapter && (
            <p className="text-[11px] text-textDim line-clamp-1">
              {latestChapter.title || `Capítulo ${latestChapter.number}`}
            </p>
          )}
          {!latestChapter && series.author && (
            <p className="text-[11px] text-textDim line-clamp-1">
              {series.author}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Stats rápidas da Home ──────────────────────────────────────────────────

function QuickNumbers({
  totalSeries,
  totalReading,
  totalFavorites,
}: {
  totalSeries: number;
  totalReading: number;
  totalFavorites: number;
}) {
  const stats = [
    {
      icon: BookOpen,
      value: totalSeries,
      label: "No catálogo",
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      icon: TrendingUp,
      value: totalReading,
      label: "Lendo agora",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      icon: Heart,
      value: totalFavorites,
      label: "Favoritos",
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 px-4 mt-2 mb-2">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-surface/60 border border-white/4 rounded-xl p-3 text-center"
        >
          <div
            className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-2`}
          >
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <p className="text-lg font-bold text-textMain tabular-nums">
            {stat.value}
          </p>
          <p className="text-[10px] text-textDim mt-0.5">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Home Page ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();
  const { data: discover, isLoading, error } = useDiscover();
  const { data: continueReading, isLoading: isLoadingReading } =
    useContinueReading({
      limit: 5,
      onlyInProgress: true,
    });
  const { isFavorite, toggleFavorite, isUpdating, favorites } = useFavorites();

  // Selecionar séries para o hero carousel (top 5 populares com capa)
  const heroItems = useMemo(() => {
    if (!discover?.mostViewed) return [];
    return discover.mostViewed.filter((s) => s.coverUrl).slice(0, 5);
  }, [discover]);

  // Extrair gêneros únicos das séries
  const topGenres = useMemo(() => {
    if (!discover) return [];
    const allSeries = [
      ...discover.mostViewed,
      ...discover.recentlyAdded,
      ...discover.recentlyUpdated,
    ];
    const genreCount = new Map<string, number>();
    allSeries.forEach((s) => {
      s.genres?.forEach((g) => {
        genreCount.set(g, (genreCount.get(g) || 0) + 1);
      });
    });
    return Array.from(genreCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre]) => genre);
  }, [discover]);

  // Loading State com skeletons
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <HeroSkeleton />
        <div className="mt-1 space-y-1 pb-24">
          <ContinueReadingSkeleton />
          <SectionSkeleton />
          <SectionSkeleton count={3} />
        </div>
      </main>
    );
  }

  if (error || !discover) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-textDim" />
          </div>
          <p className="text-textMain mb-2 text-lg font-semibold">
            Erro ao carregar
          </p>
          <p className="text-textDim text-sm mb-4">
            Verifique sua conexão e tente novamente
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const { recentlyAdded, recentlyUpdated, mostViewed } = discover;
  const readingCount = continueReading?.filter((i) => !i.finished).length ?? 0;
  const totalCatalog = new Set([
    ...recentlyAdded.map((s) => s.id),
    ...recentlyUpdated.map((s) => s.id),
    ...mostViewed.map((s) => s.id),
  ]).size;

  return (
    <main className="min-h-screen bg-background">
      {/* ===== GREETING HEADER ===== */}
      <div className="absolute top-0 left-0 right-0 z-10 px-5 pt-12 pb-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-sm text-white/60 font-medium">
              {getGreeting()},{" "}
              <span className="text-white/90">
                {user?.name?.split(" ")[0] || "Leitor"}
              </span>
            </p>
          </div>
          <Link href="/search">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center"
            >
              <BookOpen className="w-4 h-4 text-white/80" />
            </motion.div>
          </Link>
        </motion.div>
      </div>

      {/* ===== HERO CAROUSEL ===== */}
      {heroItems.length > 0 && (
        <HeroCarousel
          items={heroItems}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          isUpdating={isUpdating}
        />
      )}

      {/* ===== QUICK GENRE PILLS ===== */}
      {topGenres.length > 0 && <GenrePills genres={topGenres} />}

      <div className="mt-1 space-y-1 pb-24">
        {/* ===== NÚMEROS RÁPIDOS ===== */}
        <QuickNumbers
          totalSeries={totalCatalog}
          totalReading={readingCount}
          totalFavorites={favorites?.length ?? 0}
        />

        {/* ===== CONTINUAR LENDO ===== */}
        {!isLoadingReading && continueReading && continueReading.length > 0 && (
          <Section
            title="Continuar Lendo"
            icon={<Clock className="w-5 h-5 text-primary" />}
            href="/library"
          >
            <div className="px-4 space-y-2.5">
              {continueReading.slice(0, 3).map((item, index) => (
                <motion.div
                  key={item.mediaId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <ContinueReadingCard
                    seriesId={item.seriesId}
                    mediaId={item.mediaId}
                    title={item.seriesTitle || "Sem título"}
                    coverUrl={item.coverUrl || `/series/${item.seriesId}/cover`}
                    chapterTitle={item.mediaTitle}
                    currentPage={item.page}
                    totalPages={item.pageCount}
                  />
                </motion.div>
              ))}
            </div>
          </Section>
        )}

        {isLoadingReading && <ContinueReadingSkeleton />}

        {/* ===== ATUALIZADOS RECENTEMENTE (Wide cards) ===== */}
        {recentlyUpdated.length > 0 && (
          <Section
            title="Atualizados Recentemente"
            icon={<RefreshCw className="w-5 h-5 text-emerald-400" />}
          >
            <HorizontalScroll>
              {recentlyUpdated.map((series, index) => (
                <motion.div
                  key={series.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <UpdatedSeriesCard series={series} />
                </motion.div>
              ))}
            </HorizontalScroll>
          </Section>
        )}

        {/* ===== MAIS POPULARES (Ranking top 5 + ver tudo) ===== */}
        {mostViewed.length > 0 && (
          <Section
            title="Mais Populares"
            icon={<Flame className="w-5 h-5 text-orange-400" />}
          >
            <div className="px-4 space-y-2">
              {mostViewed.slice(0, 5).map((series, index) => (
                <motion.div
                  key={series.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <RankingCard series={series} rank={index + 1} />
                </motion.div>
              ))}
            </div>
            {mostViewed.length > 5 && (
              <div className="px-4 mt-3">
                <Link href="/search?sort=popular">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-2.5 rounded-xl border border-white/8 text-sm font-medium text-textDim hover:text-textMain hover:border-white/15 transition-all flex items-center justify-center gap-2"
                  >
                    Ver ranking completo
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
            )}
          </Section>
        )}

        {/* ===== ADICIONADOS RECENTEMENTE (Grid) ===== */}
        {recentlyAdded.length > 0 && (
          <Section
            title="Novos no Catálogo"
            icon={<Sparkles className="w-5 h-5 text-violet-400" />}
          >
            <HorizontalScroll>
              {recentlyAdded.map((series, index) => (
                <motion.div
                  key={series.id}
                  className="w-32.5 shrink-0 snap-start"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MangaCard
                    id={series.id}
                    title={series.title}
                    coverUrl={series.coverUrl || `/series/${series.id}/cover`}
                    rating={series.rating}
                    isNew
                  />
                </motion.div>
              ))}
            </HorizontalScroll>
          </Section>
        )}
      </div>
    </main>
  );
}
