"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Layers3, Library, Search, Sparkles, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { MangaCard } from "@/components/MangaCard";
import { ContinueReadingCard } from "@/components/ContinueReadingCard";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { AuthCover } from "@/components/AuthCover";
import { SubscriptionAlertBanner } from "@/components/subscription/SubscriptionAlertBanner";
import { useDiscover } from "@/hooks/useDiscover";
import { useContinueReading } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicCoverUrl } from "@/lib/coverUrl";
import type { DiscoverResponse } from "@/services/discover.service";
import type { Series } from "@/types/api";

type DiscoverSectionKey = "mostViewed" | "recentlyAdded" | "recentlyUpdated" | "trending";
type ContentShelfKey = "all" | "manga" | "manhwa" | "comic" | "novel" | "other";

const DISCOVER_SECTION_LABELS: Record<DiscoverSectionKey, string> = {
  mostViewed: "Mais populares",
  recentlyAdded: "Novidades",
  recentlyUpdated: "Atualizados",
  trending: "Em alta esta semana",
};

const EMPTY_DISCOVER: DiscoverResponse = {
  recentlyAdded: [],
  recentlyUpdated: [],
  mostViewed: [],
  trending: [],
  partial: false,
  unavailableSections: [],
};

const CONTENT_SHELVES: Array<{
  key: Exclude<ContentShelfKey, "all">;
  title: string;
  shortTitle: string;
  description: string;
  workTypes: string[];
  href: string;
  accentClass: string;
  icon: ReactNode;
}> = [
  {
    key: "manga",
    title: "Mangás",
    shortTitle: "Mangá",
    description: "Capítulos japoneses, leitura seriada e novidades do catálogo oriental.",
    workTypes: ["manga"],
    href: "/category/popular?workType=manga",
    accentClass: "bg-primary",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    key: "manhwa",
    title: "Manhwas e webtoons",
    shortTitle: "Manhwa",
    description: "Obras coreanas e leitura vertical, boas para sessões rápidas no celular.",
    workTypes: ["manhwa", "webtoon"],
    href: "/category/popular?workType=manhwa",
    accentClass: "bg-sky-400",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: "comic",
    title: "HQs e comics",
    shortTitle: "HQ",
    description: "Quadrinhos, encadernados e séries ocidentais separados do fluxo de mangá.",
    workTypes: ["comic"],
    href: "/category/popular?workType=comic",
    accentClass: "bg-amber-400",
    icon: <Layers3 className="h-4 w-4" />,
  },
  {
    key: "novel",
    title: "Novels",
    shortTitle: "Novel",
    description: "Light novels, novels e leituras longas em uma trilha própria.",
    workTypes: ["novel", "light_novel"],
    href: "/category/popular?workType=novel",
    accentClass: "bg-emerald-400",
    icon: <Library className="h-4 w-4" />,
  },
  {
    key: "other",
    title: "Outras obras",
    shortTitle: "Outros",
    description: "Itens que ainda precisam de classificação ou não entram nos formatos principais.",
    workTypes: ["other"],
    href: "/category/popular?workType=other",
    accentClass: "bg-white/30",
    icon: <Library className="h-4 w-4" />,
  },
];

function normalizeWorkType(workType: Series["workType"] | string | null | undefined): string {
  return String(workType ?? "other").toLowerCase();
}

function dedupeSeries(items: Series[]): Series[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function seriesMatchesShelf(
  series: Series,
  shelf: Pick<(typeof CONTENT_SHELVES)[number], "workTypes">,
): boolean {
  return shelf.workTypes.includes(normalizeWorkType(series.workType));
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="w-32 shrink-0 snap-start">
      <div className="aspect-2/3 animate-pulse rounded-2xl bg-surface/50" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded-full bg-surface/50" />
    </div>
  );
}

function ContinueSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl bg-surface/40 p-3 animate-pulse">
      <div className="h-20 w-14 rounded-xl bg-surface" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-2/3 rounded-full bg-surface" />
        <div className="h-3 w-1/3 rounded-full bg-surface" />
        <div className="mt-2 h-1.5 w-1/2 rounded bg-surface" />
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return <div className="h-72 w-full animate-pulse bg-surface/60" />;
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-4">
        <div className="h-6 w-1 rounded-full animate-pulse bg-surface/70" />
        <div className="h-4 w-32 rounded-full animate-pulse bg-surface/50" />
      </div>
      <HorizontalScroll>
        {[1, 2, 3, 4, 5].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </HorizontalScroll>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  title: string;
  badge?: ReactNode;
  link?: string;
  description?: string;
  variant?: "standard" | "hq";
}

function SectionHeader({
  title,
  badge,
  link,
  description,
  variant = "standard",
}: SectionHeaderProps) {
  return (
    <div className="mb-4 px-4">
      <div className="flex items-center gap-3">
        {variant === "standard" ? (
          <div className="w-1 h-6 rounded-full shrink-0 bg-[var(--color-primary)]" />
        ) : (
          <div className="border-l-2 border-white/20 pl-3 flex items-center">
            {/* hq variant: no red bar, uses subtle left border */}
          </div>
        )}
        <h2 className="text-base font-black text-textMain uppercase tracking-wide leading-none">
          {title}
        </h2>
        {badge}
        {link ? (
          <Link
            href={link}
            className="ml-auto text-[11px] font-semibold text-[var(--color-primary)] flex items-center gap-1 shrink-0"
          >
            Ver mais <ChevronRight className="w-3 h-3" />
          </Link>
        ) : null}
      </div>
      {description ? (
        <p className="mt-2 max-w-2xl text-xs leading-5 text-textDim">
          {description}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionRow
// ---------------------------------------------------------------------------

function SectionRow({
  items,
  loading,
  renderCard,
}: {
  items: Array<{
    id: string;
    title: string;
    coverUrl?: string | null;
    rating?: number | null;
  }>;
  loading: boolean;
  renderCard: (item: {
    id: string;
    title: string;
    coverUrl?: string | null;
    rating?: number | null;
  }) => ReactNode;
}) {
  if (loading) {
    return (
      <HorizontalScroll>
        {[1, 2, 3, 4, 5].map((index) => (
          <CardSkeleton key={index} />
        ))}
      </HorizontalScroll>
    );
  }
  return (
    <HorizontalScroll>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          className="w-32 shrink-0 snap-start"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.04 }}
        >
          {renderCard(item)}
        </motion.div>
      ))}
    </HorizontalScroll>
  );
}

// ---------------------------------------------------------------------------
// ContentShelfSelector
// ---------------------------------------------------------------------------

function ContentShelfSelector({
  activeKey,
  shelves,
  totalCount,
  onSelect,
}: {
  activeKey: ContentShelfKey;
  shelves: Array<(typeof CONTENT_SHELVES)[number] & { count: number }>;
  totalCount: number;
  onSelect: (key: ContentShelfKey) => void;
}) {
  const options = [
    {
      key: "all" as const,
      shortTitle: "Tudo",
      title: "Tudo",
      count: totalCount,
      icon: <Library className="h-4 w-4" />,
    },
    ...shelves.map((shelf) => ({
      key: shelf.key,
      shortTitle: shelf.shortTitle,
      title: shelf.title,
      count: shelf.count,
      icon: shelf.icon,
    })),
  ].filter((option) => option.key === "all" || option.count > 0);

  return (
    <section className="space-y-3">
      <div className="px-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary/80">
              Catálogo organizado
            </p>
            <h2 className="mt-1 text-lg font-black text-textMain">
              Escolha o tipo de leitura
            </h2>
          </div>
          <Link
            href="/search"
            className="rounded-full border border-white/8 px-3 py-2 text-[11px] font-semibold text-textDim transition-colors hover:bg-white/6 hover:text-textMain"
          >
            Catálogo
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1">
        {options.map((option) => {
          const isActive = option.key === activeKey;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              className={[
                "flex min-w-fit items-center gap-2 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                isActive
                  ? "border-primary/50 bg-primary/14 text-white"
                  : "border-white/8 bg-white/4 text-textDim hover:bg-white/7 hover:text-textMain",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  isActive ? "bg-primary text-white" : "bg-white/6 text-textDim",
                ].join(" ")}
              >
                {option.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black leading-none">
                  {option.shortTitle}
                </span>
                <span className="mt-1 block text-[10px] font-semibold text-current/60">
                  {option.count} obras
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FeaturedBanner
// ---------------------------------------------------------------------------

function FeaturedBanner({ featured }: { featured: Series }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Link href={`/serie/${featured.id}`} className="block">
        <div className="relative h-72 w-full overflow-hidden">
          {/* Cover image */}
          <div className="absolute inset-0">
            <AuthCover
              coverUrl={getPublicCoverUrl(featured.id, featured.coverUrl)}
              alt={featured.title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>

          {/* Gradient: top fade */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent" />
          {/* Gradient: bottom strong fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          {/* Gradient: left tint */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/30 to-transparent" />

          {/* Top-right badge */}
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white bg-[var(--color-primary)] px-2.5 py-1 rounded-full">
              ● Em Destaque
            </span>
          </div>

          {/* Bottom-left content */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
            <h2 className="text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-lg">
              {featured.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-3">
              {featured.rating != null && featured.rating > 0 ? (
                <span className="text-[12px] font-semibold text-white/60 flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  {featured.rating.toFixed(1)}
                </span>
              ) : null}
              {featured.genres && featured.genres.length > 0 ? (
                <span className="text-[11px] text-white/40 font-medium">
                  {featured.genres.slice(0, 2).join(" · ")}
                </span>
              ) : null}
            </div>

            {/* CTA buttons */}
            <div className="mt-3.5 flex items-center gap-2.5">
              <span className="bg-white text-black font-black text-sm px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors">
                Começar a ler
              </span>
              <span className="border border-white/30 text-white font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-white/5 transition-colors">
                + Biblioteca
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [activeShelfKey, setActiveShelfKey] = useState<ContentShelfKey>("all");
  const {
    isAuthenticated,
    isLoading: authLoading,
    subscription,
    user,
  } = useAuth();
  const {
    data: discover,
    isLoading: discoverLoading,
    error: discoverError,
    refetch: refetchDiscover,
  } = useDiscover({ enabled: isAuthenticated, limit: 40 });
  const { data: continueReading, isLoading: continueLoading } =
    useContinueReading(
      { limit: 12, onlyInProgress: true },
      { enabled: isAuthenticated },
    );

  const firstName = user?.name?.split(" ")[0] ?? "Leitor";
  const discoverData = discover ?? EMPTY_DISCOVER;
  const allSeriesPool = useMemo(
    () =>
      dedupeSeries([
        ...(discoverData.trending ?? []),
        ...discoverData.recentlyUpdated,
        ...discoverData.mostViewed,
        ...discoverData.recentlyAdded,
      ]),
    [discoverData],
  );
  const contentShelves = useMemo(
    () =>
      CONTENT_SHELVES.map((shelf) => {
        const matchingItems = allSeriesPool.filter((series) =>
          seriesMatchesShelf(series, shelf),
        );
        return {
          ...shelf,
          items: matchingItems.slice(0, 14),
          count: matchingItems.length,
        };
      }),
    [allSeriesPool],
  );
  const activeShelf =
    contentShelves.find((shelf) => shelf.key === activeShelfKey) ?? null;
  const activeShelfItems =
    activeShelfKey === "all" ? allSeriesPool : activeShelf?.items ?? [];
  const visibleShelves =
    activeShelfKey === "all"
      ? contentShelves.filter((shelf) => shelf.items.length > 0)
      : contentShelves.filter(
          (shelf) => shelf.key === activeShelfKey && shelf.items.length > 0,
        );
  const featuredSourceOrder: DiscoverSectionKey[] = [
    "mostViewed",
    "trending",
    "recentlyAdded",
    "recentlyUpdated",
  ];
  const featuredSource =
    featuredSourceOrder.find((section) => (discoverData[section]?.length ?? 0) > 0) ??
    null;
  const defaultFeatured = featuredSource
    ? (discoverData[featuredSource] ?? [])[0] ?? null
    : null;
  const featured =
    activeShelfKey === "all"
      ? defaultFeatured
      : activeShelfItems[0] ?? defaultFeatured;
  const unavailableSections = (discover?.unavailableSections ?? [])
    .map(
      (section) =>
        DISCOVER_SECTION_LABELS[section as DiscoverSectionKey] ?? section,
    )
    .filter(Boolean);

  const filterForActiveShelf = (items: Series[]) =>
    activeShelfKey === "all" || !activeShelf
      ? items
      : items.filter((series) => seriesMatchesShelf(series, activeShelf));
  const removeFeatured = (items: Series[]) =>
    featured ? items.filter((series) => series.id !== featured.id) : items;
  const sectionConfigs = [
    {
      key: "mostViewed" as const,
      label: "🔥 Mais Vistas",
      href: "/category/popular",
      items: removeFeatured(filterForActiveShelf(discoverData.mostViewed)).slice(
        0,
        12,
      ),
      renderCard: (series: {
        id: string;
        title: string;
        coverUrl?: string | null;
        rating?: number | null;
      }) => (
        <MangaCard
          id={series.id}
          title={series.title}
          coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
          rating={series.rating ?? undefined}
        />
      ),
    },
    {
      key: "trending" as const,
      label: "↑ Em Alta",
      href: "/category/trending",
      items: removeFeatured(
        filterForActiveShelf(discoverData.trending ?? []),
      ).slice(0, 12),
      renderCard: (series: {
        id: string;
        title: string;
        coverUrl?: string | null;
        rating?: number | null;
      }) => (
        <MangaCard
          id={series.id}
          title={series.title}
          coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
          rating={series.rating ?? undefined}
        />
      ),
    },
    {
      key: "recentlyAdded" as const,
      label: "Recém Adicionadas",
      href: "/category/recent",
      items: removeFeatured(
        filterForActiveShelf(discoverData.recentlyAdded),
      ).slice(0, 12),
      renderCard: (series: {
        id: string;
        title: string;
        coverUrl?: string | null;
      }) => (
        <MangaCard
          id={series.id}
          title={series.title}
          coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
          isNew
        />
      ),
    },
    {
      key: "recentlyUpdated" as const,
      label: "Recém Atualizadas",
      href: "/category/updated",
      items: removeFeatured(
        filterForActiveShelf(discoverData.recentlyUpdated),
      ).slice(0, 12),
      renderCard: (series: {
        id: string;
        title: string;
        coverUrl?: string | null;
        rating?: number | null;
      }) => (
        <MangaCard
          id={series.id}
          title={series.title}
          coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
          rating={series.rating ?? undefined}
        />
      ),
    },
  ];

  const hasAnyDiscoverContent =
    !!featured || allSeriesPool.length > 0;
  const continueReadingCurrent = (() => {
    const seenSeries = new Set<string>();
    return (continueReading ?? [])
      .filter((item) => {
        if (seenSeries.has(item.seriesId)) return false;
        seenSeries.add(item.seriesId);
        return true;
      })
      .slice(0, 5);
  })();

  // ---------------------------------------------------------------------------
  // Auth loading skeleton
  // ---------------------------------------------------------------------------
  if (authLoading) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <div className="sticky top-0 z-40 border-b border-white/4 bg-background/85 backdrop-blur-2xl safe-header">
          <div className="flex h-14 items-center justify-between px-5">
            <Logo size="sm" href="/home" />
          </div>
        </div>
        <div className="space-y-7 pt-5">
          {/* Greeting skeleton */}
          <div className="px-5 space-y-1.5">
            <div className="h-3 w-28 animate-pulse rounded-full bg-surface/50" />
            <div className="h-6 w-44 animate-pulse rounded-full bg-surface/50" />
          </div>
          {/* Featured skeleton */}
          <FeaturedSkeleton />
          {/* Continue reading skeleton */}
          <div className="space-y-3 px-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full animate-pulse bg-surface/70" />
              <div className="h-4 w-36 rounded-full animate-pulse bg-surface/50" />
            </div>
            <ContinueSkeleton />
            <ContinueSkeleton />
          </div>
          {/* Section skeletons */}
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Unauthenticated
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <div className="sticky top-0 z-40 border-b border-white/4 bg-background/85 backdrop-blur-2xl safe-header">
          <div className="flex h-14 items-center justify-between px-5">
            <Logo size="sm" href="/home" />
            <Link
              href="/search"
              className="rounded-xl p-2 transition-colors hover:bg-white/5 active:bg-white/8"
              aria-label="Buscar"
            >
              <Search className="h-4.5 w-4.5 text-textDim" />
            </Link>
          </div>
        </div>

        <div className="px-4 pt-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-surface/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/8 blur-[60px]" />
            <div className="w-1 h-6 rounded-full bg-[var(--color-primary)] mb-4" />
            <p className="text-base font-black text-textMain uppercase tracking-wide">
              Sua home personalizada
            </p>
            <p className="mt-2 text-sm leading-6 text-textDim">
              Descobertas, progresso de leitura e atualizações aparecem aqui em
              um painel pensado para continuar de onde você parou.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/auth/login"
                className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
              >
                Fazer login
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-white/8 bg-white/4 px-5 py-2.5 text-sm font-semibold text-textMain transition-colors hover:bg-white/8"
              >
                Explorar catálogo
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticated
  // ---------------------------------------------------------------------------
  const dayOfWeek = new Date().toLocaleDateString("pt-BR", { weekday: "long" });

  return (
    <main className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/4 bg-background/85 backdrop-blur-2xl safe-header">
        <div className="flex h-14 items-center justify-between px-5">
          <Logo size="sm" href="/home" />
          <Link
            href="/search"
            className="rounded-xl p-2 transition-colors hover:bg-white/5 active:bg-white/8"
            aria-label="Buscar"
          >
            <Search className="h-4.5 w-4.5 text-textDim" />
          </Link>
        </div>
      </div>

      <div className="space-y-7 pt-5">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="px-5"
        >
          <p className="text-[13px] text-textDim capitalize">{dayOfWeek}</p>
          <h1 className="mt-0.5 text-xl font-black text-textMain">
            Olá, {firstName}!
          </h1>
          <p className="mt-0.5 text-[13px] text-textDim">
            O que você vai ler hoje?
          </p>
        </motion.div>

        {/* Subscription alert */}
        <div className="px-4">
          <SubscriptionAlertBanner subscription={subscription} />
        </div>

        {/* Partial load warning */}
        {discover?.partial && unavailableSections.length > 0 ? (
          <div className="mx-4 rounded-2xl border border-white/8 bg-surface/70 p-4">
            <p className="text-sm font-semibold text-textMain">
              Home carregada parcialmente
            </p>
            <p className="mt-1 text-xs leading-5 text-textDim">
              As seções {unavailableSections.join(", ")} estão indisponíveis no
              momento, mas o restante da home continua utilizável.
            </p>
          </div>
        ) : null}

        {/* Discover error */}
        {discoverError ? (
          <div className="mx-4 rounded-2xl border border-white/8 bg-surface/70 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                <WifiOff className="h-4 w-4 text-textDim" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-textMain">
                  Algumas recomendações não puderam ser carregadas
                </p>
                <p className="mt-0.5 text-xs text-textDim">
                  Verifique sua conexão ou tente novamente para atualizar os
                  destaques e categorias.
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    void refetchDiscover();
                  }}
                  className="mt-3 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white"
                >
                  Tentar novamente
                </motion.button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Featured banner */}
        {discoverLoading ? (
          <FeaturedSkeleton />
        ) : featured ? (
          <FeaturedBanner featured={featured} />
        ) : null}

        {/* Continue reading */}
        {(continueLoading ||
          continueReadingCurrent.length > 0) && (
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <SectionHeader title="Continuar Lendo" />
            {continueLoading ? (
              <div className="space-y-2.5 px-4">
                <ContinueSkeleton />
                <ContinueSkeleton />
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
                {continueReadingCurrent.map((item) => (
                  <div key={item.progressId ?? item.mediaId} className="shrink-0 w-72">
                    <ContinueReadingCard
                      seriesId={item.seriesId}
                      mediaId={item.mediaId}
                      title={item.seriesTitle}
                      coverUrl={getPublicCoverUrl(item.seriesId, item.coverUrl)}
                      chapterTitle={item.mediaTitle}
                      currentPage={item.page}
                      totalPages={item.pageCount}
                      percent={item.percent}
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Content organization */}
        {discoverLoading ? (
          <SectionSkeleton />
        ) : hasAnyDiscoverContent ? (
          <ContentShelfSelector
            activeKey={activeShelfKey}
            shelves={contentShelves}
            totalCount={allSeriesPool.length}
            onSelect={setActiveShelfKey}
          />
        ) : null}

        {!discoverLoading &&
          visibleShelves.map((shelf) => (
            <motion.section
              key={shelf.key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px", amount: 0.1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <SectionHeader
                title={shelf.title}
                description={shelf.description}
                link={shelf.href}
                badge={
                  <span
                    className={`h-2 w-2 rounded-full ${shelf.accentClass}`}
                  />
                }
                variant={shelf.key === "comic" ? "hq" : "standard"}
              />
              <SectionRow
                items={removeFeatured(shelf.items).slice(0, 12)}
                loading={false}
                renderCard={(series) => (
                  <MangaCard
                    id={series.id}
                    title={series.title}
                    coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
                    rating={series.rating ?? undefined}
                  />
                )}
              />
            </motion.section>
          ))}

        {!discoverLoading &&
        activeShelfKey !== "all" &&
        visibleShelves.length === 0 &&
        hasAnyDiscoverContent ? (
          <div className="mx-4 rounded-2xl border border-white/8 bg-surface/70 p-4">
            <p className="text-sm font-semibold text-textMain">
              Ainda não há obras nesse formato
            </p>
            <p className="mt-1 text-xs leading-5 text-textDim">
              Troque o filtro ou explore todo o catálogo enquanto novas séries são classificadas.
            </p>
          </div>
        ) : null}

        {/* Discovery sections */}
        {sectionConfigs.map((section) =>
          discoverLoading || section.items.length > 0 ? (
            <motion.section
              key={section.key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px", amount: 0.1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <SectionHeader
                title={section.label}
                description={
                  activeShelf
                    ? `Filtrado para ${activeShelf.title.toLowerCase()}.`
                    : "Visão geral do catálogo, depois das prateleiras por formato."
                }
                link={
                  activeShelf
                    ? `${section.href}?workType=${activeShelf.workTypes[0]}`
                    : section.href
                }
              />
              <SectionRow
                items={section.items}
                loading={discoverLoading}
                renderCard={section.renderCard}
              />
            </motion.section>
          ) : null,
        )}

        {/* Empty state */}
        {!discoverLoading && !hasAnyDiscoverContent && !discoverError ? (
          <div className="mx-4 rounded-2xl border border-white/8 bg-surface/70 p-4">
            <p className="text-sm font-semibold text-textMain">
              Ainda não há destaques disponíveis
            </p>
            <p className="mt-1 text-xs leading-5 text-textDim">
              Assim que novas obras entrarem no catálogo, as recomendações vão
              aparecer aqui automaticamente.
            </p>
          </div>
        ) : null}

        {/* Explore CTA */}
        {!discoverLoading && hasAnyDiscoverContent && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mx-5 flex items-center justify-center pt-2 pb-4"
          >
            <Link
              href="/search"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-5 py-3.5 text-sm font-semibold text-textDim transition-colors hover:border-white/12 hover:bg-white/6 hover:text-textMain"
            >
              <Search className="h-4 w-4" />
              Explorar todo o catálogo
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
