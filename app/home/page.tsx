"use client";

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

// ─── Skeletons ───────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="w-28 shrink-0 snap-start">
      <div className="aspect-2/3 rounded-2xl bg-surface/50 animate-pulse" />
      <div className="mt-2 h-3 w-3/4 rounded-full bg-surface/50 animate-pulse" />
    </div>
  );
}

function ContinueSkeleton() {
  return (
    <div className="mx-4 flex gap-3 p-3 bg-surface/40 rounded-2xl animate-pulse">
      <div className="w-14 h-20 rounded-xl bg-surface" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-2/3 rounded-full bg-surface" />
        <div className="h-3 w-1/3 rounded-full bg-surface" />
        <div className="h-1.5 w-1/2 rounded bg-surface mt-2" />
      </div>
    </div>
  );
}

// ─── Título de seção ─────────────────────────────────────────────────────────
interface RowTitleProps {
  label: string;
  href?: string;
  accentColor?: string;
}

function RowTitle({ label, href, accentColor = "#e50914" }: RowTitleProps) {
  return (
    <div className="flex items-center justify-between mb-3.5 px-4">
      <div className="flex items-center gap-2.5">
        <span
          className="w-0.5 h-5 rounded-full shrink-0"
          style={{ background: accentColor }}
        />
        <h2 className="text-[15px] font-bold text-textMain tracking-tight">
          {label}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-[11px] text-primary/70 hover:text-primary font-semibold transition-colors"
        >
          Ver tudo
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
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
    useContinueReading({ limit: 5 });

  const firstName = user?.name?.split(" ")[0] ?? "Leitor";
  const featured = discover?.mostViewed[0];

  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <div className="pt-5 space-y-8">
          <div className="mx-4 h-52 rounded-3xl bg-surface/60 animate-pulse" />
          <div className="space-y-2.5">
            <ContinueSkeleton />
            <ContinueSkeleton />
          </div>
          <section>
            <HorizontalScroll>
              {[1, 2, 3, 4, 5].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </HorizontalScroll>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28 bg-background">
      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-2xl border-b border-white/4">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-white font-black text-sm leading-none select-none">
                M
              </span>
            </div>
            <span className="text-[15px] font-bold text-textMain tracking-tight">
              ManHQ
            </span>
          </div>
          <Link
            href="/search"
            className="p-2 rounded-xl hover:bg-white/5 active:bg-white/8 transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-4.5 h-4.5 text-textDim" />
          </Link>
        </div>
      </div>

      <div className="pt-5 space-y-8">
        {/* ── Saudação ───────────────────────────────────────────────── */}
        <div className="px-5">
          <p className="text-sm text-textDim">
            Olá,{" "}
            <span className="text-textMain font-semibold capitalize">
              {firstName}
            </span>
          </p>
          <h1 className="text-2xl font-black text-textMain mt-0.5 leading-tight">
            O que vamos
            <br />
            ler hoje?
          </h1>
        </div>

        <div className="px-4">
          <SubscriptionAlertBanner subscription={subscription} />
        </div>

        {discoverError && (
          <div className="mx-4 rounded-2xl border border-white/8 bg-surface/70 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-textDim" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-textMain">
                  Não foi possível carregar a home
                </p>
                <p className="text-xs text-textDim mt-0.5">
                  Verifique sua conexão e tente novamente.
                </p>
                <button
                  onClick={() => {
                    void refetchDiscover();
                  }}
                  className="mt-3 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Hero — Em destaque ─────────────────────────────────────── */}
        {discoverLoading ? (
          <div className="mx-4 h-52 rounded-3xl bg-surface/60 animate-pulse" />
        ) : featured ? (
          <div className="px-4">
            <Link href={`/serie/${featured.id}`}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="relative h-52 rounded-3xl overflow-hidden group"
              >
                {/* Capa com scale no hover */}
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                  <AuthCover
                    coverUrl={featured.coverUrl!}
                    alt={featured.title}
                    className="w-full h-full"
                    loading="eager"
                  />
                </div>

                {/* Gradiente cinematográfico */}
                <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

                {/* Conteúdo */}
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div className="inline-flex items-center gap-1 bg-primary backdrop-blur-sm px-2 py-0.5 rounded-md self-start mb-2 shadow-lg shadow-primary/30">
                    <Flame className="w-3 h-3 text-white" />
                    <span className="text-[9px] font-black text-white tracking-widest uppercase">
                      Em alta
                    </span>
                  </div>

                  <h2 className="text-lg font-black text-white leading-tight line-clamp-2 drop-shadow-lg">
                    {featured.title}
                  </h2>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-xl shadow-md">
                      <Play className="w-3 h-3 text-black fill-black" />
                      <span className="text-[12px] font-bold text-black">
                        Ler agora
                      </span>
                    </div>
                    {featured.rating != null && featured.rating > 0 && (
                      <span className="text-[12px] text-white/50 font-medium">
                        ★ {featured.rating}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        ) : null}

        {/* ── Continuar lendo ────────────────────────────────────────── */}
        {(continueLoading ||
          (continueReading && continueReading.length > 0)) && (
          <section>
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
                      coverUrl={item.coverUrl}
                      chapterTitle={item.mediaTitle}
                      currentPage={item.page}
                      totalPages={item.pageCount}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ── Mais populares ─────────────────────────────────────────── */}
        <section>
          <RowTitle label="Mais populares" href="/category/popular" />
          {discoverLoading ? (
            <HorizontalScroll>
              {[1, 2, 3, 4, 5].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </HorizontalScroll>
          ) : (
            <HorizontalScroll>
              {discover?.mostViewed.slice(1, 13).map((series) => (
                <div key={series.id} className="w-28 shrink-0 snap-start">
                  <MangaCard
                    id={series.id}
                    title={series.title}
                    coverUrl={series.coverUrl!}
                    rating={series.rating}
                  />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </section>

        {/* ── Novidades ──────────────────────────────────────────────── */}
        <section>
          <RowTitle
            label="Novidades"
            href="/category/recent"
            accentColor="#facc15"
          />
          {discoverLoading ? (
            <HorizontalScroll>
              {[1, 2, 3, 4, 5].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </HorizontalScroll>
          ) : (
            <HorizontalScroll>
              {discover?.recentlyAdded.slice(0, 12).map((series) => (
                <div key={series.id} className="w-28 shrink-0 snap-start">
                  <MangaCard
                    id={series.id}
                    title={series.title}
                    coverUrl={series.coverUrl!}
                    isNew
                  />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </section>

        {/* ── Atualizados recentemente ───────────────────────────────── */}
        <section>
          <RowTitle
            label="Atualizados"
            href="/category/updated"
            accentColor="#60a5fa"
          />
          {discoverLoading ? (
            <HorizontalScroll>
              {[1, 2, 3, 4, 5].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </HorizontalScroll>
          ) : (
            <HorizontalScroll>
              {discover?.recentlyUpdated.slice(0, 12).map((series) => (
                <div key={series.id} className="w-28 shrink-0 snap-start">
                  <MangaCard
                    id={series.id}
                    title={series.title}
                    coverUrl={series.coverUrl!}
                    rating={series.rating}
                  />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </section>
      </div>
    </main>
  );
}
