"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Search, Flame, Play, ChevronRight, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
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

type DiscoverSectionKey = "mostViewed" | "recentlyAdded" | "recentlyUpdated";

const DISCOVER_SECTION_LABELS: Record<DiscoverSectionKey, string> = {
  mostViewed: "Mais populares",
  recentlyAdded: "Novidades",
  recentlyUpdated: "Atualizados",
};

const EMPTY_DISCOVER: DiscoverResponse = {
  recentlyAdded: [],
  recentlyUpdated: [],
  mostViewed: [],
  partial: false,
  unavailableSections: [],
};

function CardSkeleton() {
  return (
    <div className="w-28 shrink-0 snap-start">
      <div className="aspect-2/3 animate-pulse rounded-2xl bg-surface/50" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded-full bg-surface/50" />
    </div>
  );
}

function ContinueSkeleton() {
  return (
    <div className="mx-4 flex gap-3 rounded-2xl bg-surface/40 p-3 animate-pulse">
      <div className="h-20 w-14 rounded-xl bg-surface" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-2/3 rounded-full bg-surface" />
        <div className="h-3 w-1/3 rounded-full bg-surface" />
        <div className="mt-2 h-1.5 w-1/2 rounded bg-surface" />
      </div>
    </div>
  );
}

interface RowTitleProps {
  label: string;
  href?: string;
  accentColor?: string;
}

function RowTitle({ label, href, accentColor = "#e50914" }: RowTitleProps) {
  return (
    <div className="mb-3.5 flex items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <span
          className="h-5 w-0.5 shrink-0 rounded-full"
          style={{ background: accentColor }}
        />
        <h2 className="text-[15px] font-bold tracking-tight text-textMain">
          {label}
        </h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-[11px] font-semibold text-primary/70 transition-colors hover:text-primary"
        >
          Ver tudo
          <ChevronRight className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

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
  renderCard: (
    item: {
      id: string;
      title: string;
      coverUrl?: string | null;
      rating?: number | null;
    },
  ) => ReactNode;
}) {
  return loading ? (
    <HorizontalScroll>
      {[1, 2, 3, 4, 5].map((index) => (
        <CardSkeleton key={index} />
      ))}
    </HorizontalScroll>
  ) : (
    <HorizontalScroll>
      {items.map((item) => (
        <div key={item.id} className="w-28 shrink-0 snap-start">
          {renderCard(item)}
        </div>
      ))}
    </HorizontalScroll>
  );
}

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, subscription, user } =
    useAuth();
  const {
    data: discover,
    isLoading: discoverLoading,
    error: discoverError,
    refetch: refetchDiscover,
  } = useDiscover({ enabled: isAuthenticated, limit: 16 });
  const { data: continueReading, isLoading: continueLoading } =
    useContinueReading({ limit: 5 }, { enabled: isAuthenticated });

  const firstName = user?.name?.split(" ")[0] ?? "Leitor";
  const discoverData = discover ?? EMPTY_DISCOVER;
  const featuredSourceOrder: DiscoverSectionKey[] = [
    "mostViewed",
    "recentlyAdded",
    "recentlyUpdated",
  ];
  const featuredSource =
    featuredSourceOrder.find((section) => discoverData[section].length > 0) ??
    null;
  const featured = featuredSource ? discoverData[featuredSource][0] : null;
  const unavailableSections = (discover?.unavailableSections ?? [])
    .map(
      (section) =>
        DISCOVER_SECTION_LABELS[section as DiscoverSectionKey] ?? section,
    )
    .filter(Boolean);

  const sectionConfigs = [
    {
      key: "mostViewed" as const,
      label: "Mais populares",
      href: "/category/popular",
      accentColor: "#e50914",
      items:
        featuredSource === "mostViewed"
          ? discoverData.mostViewed.slice(1, 13)
          : discoverData.mostViewed.slice(0, 12),
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
      label: "Novidades",
      href: "/category/recent",
      accentColor: "#facc15",
      items:
        featuredSource === "recentlyAdded"
          ? discoverData.recentlyAdded.slice(1, 13)
          : discoverData.recentlyAdded.slice(0, 12),
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
      label: "Atualizados",
      href: "/category/updated",
      accentColor: "#60a5fa",
      items:
        featuredSource === "recentlyUpdated"
          ? discoverData.recentlyUpdated.slice(1, 13)
          : discoverData.recentlyUpdated.slice(0, 12),
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
    !!featured || sectionConfigs.some((section) => section.items.length > 0);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <div className="space-y-8 pt-5">
          <div className="mx-4 h-52 animate-pulse rounded-3xl bg-surface/60" />
          <div className="space-y-2.5">
            <ContinueSkeleton />
            <ContinueSkeleton />
          </div>
          <section>
            <HorizontalScroll>
              {[1, 2, 3, 4, 5].map((index) => (
                <CardSkeleton key={index} />
              ))}
            </HorizontalScroll>
          </section>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <div className="sticky top-0 z-40 border-b border-white/4 bg-background/85 backdrop-blur-2xl">
          <div className="flex h-14 items-center justify-between px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/25">
                <span className="select-none text-sm font-black leading-none text-white">
                  M
                </span>
              </div>
              <span className="text-[15px] font-bold tracking-tight text-textMain">
                ManHQ
              </span>
            </div>
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
          <div className="rounded-3xl border border-white/8 bg-surface/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <p className="text-sm font-semibold text-textMain">
              Entre para ver sua home personalizada
            </p>
            <p className="mt-2 text-sm leading-6 text-textDim">
              Descobertas, progresso de leitura e atualizações aparecem aqui em
              um painel pensado para continuar de onde você parou.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href="/auth/login"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
              >
                Fazer login
              </Link>
              <Link
                href="/search"
                className="rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm font-semibold text-textMain"
              >
                Explorar catálogo
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-40 border-b border-white/4 bg-background/85 backdrop-blur-2xl">
        <div className="flex h-14 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/25">
              <span className="select-none text-sm font-black leading-none text-white">
                M
              </span>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-textMain">
              ManHQ
            </span>
          </div>
          <Link
            href="/search"
            className="rounded-xl p-2 transition-colors hover:bg-white/5 active:bg-white/8"
            aria-label="Buscar"
          >
            <Search className="h-4.5 w-4.5 text-textDim" />
          </Link>
        </div>
      </div>

      <div className="space-y-8 pt-5">
        <div className="px-5">
          <p className="text-sm text-textDim">
            Olá,{" "}
            <span className="font-semibold capitalize text-textMain">
              {firstName}
            </span>
          </p>
          <h1 className="mt-0.5 text-2xl font-black leading-tight text-textMain">
            O que vamos
            <br />
            ler hoje?
          </h1>
        </div>

        <div className="px-4">
          <SubscriptionAlertBanner subscription={subscription} />
        </div>

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

        {discoverLoading ? (
          <div className="mx-4 h-52 animate-pulse rounded-3xl bg-surface/60" />
        ) : featured ? (
          <div className="px-4">
            <Link href={`/serie/${featured.id}`}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="group relative h-52 overflow-hidden rounded-3xl"
              >
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                  <AuthCover
                    coverUrl={getPublicCoverUrl(featured.id, featured.coverUrl)}
                    alt={featured.title}
                    className="h-full w-full"
                    loading="eager"
                  />
                </div>

                <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div className="mb-2 inline-flex self-start rounded-md bg-primary px-2 py-0.5 shadow-lg shadow-primary/30 backdrop-blur-sm">
                    <div className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-white" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-white">
                        Em alta
                      </span>
                    </div>
                  </div>

                  <h2 className="line-clamp-2 text-lg font-black leading-tight text-white drop-shadow-lg">
                    {featured.title}
                  </h2>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 shadow-md">
                      <Play className="h-3 w-3 fill-black text-black" />
                      <span className="text-[12px] font-bold text-black">
                        Ler agora
                      </span>
                    </div>
                    {featured.rating != null && featured.rating > 0 ? (
                      <span className="text-[12px] font-medium text-white/50">
                        ★ {featured.rating}
                      </span>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        ) : null}

        {(continueLoading ||
          (continueReading != null && continueReading.length > 0)) && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <RowTitle label="Continuar lendo" />
            <div className="space-y-2.5">
              {continueLoading ? (
                <>
                  <ContinueSkeleton />
                  <ContinueSkeleton />
                </>
              ) : (
                continueReading?.map((item) => (
                  <div key={item.progressId ?? item.mediaId} className="mx-4">
                    <ContinueReadingCard
                      seriesId={item.seriesId}
                      mediaId={item.mediaId}
                      title={item.seriesTitle}
                      coverUrl={getPublicCoverUrl(item.seriesId, item.coverUrl)}
                      chapterTitle={item.mediaTitle}
                      currentPage={item.page}
                      totalPages={item.pageCount}
                    />
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}

        {sectionConfigs.map((section, index) =>
          discoverLoading || section.items.length > 0 ? (
            <motion.section
              key={section.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.07 }}
            >
              <RowTitle
                label={section.label}
                href={section.href}
                accentColor={section.accentColor}
              />
              <SectionRow
                items={section.items}
                loading={discoverLoading}
                renderCard={section.renderCard}
              />
            </motion.section>
          ) : null,
        )}

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
      </div>
    </main>
  );
}
