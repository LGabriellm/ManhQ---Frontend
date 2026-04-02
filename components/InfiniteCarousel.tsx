"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useCarouselCovers } from "@/hooks/useCarouselCovers";

interface CarouselItem {
  id: string;
  title: string;
  image: string;
}

interface InfiniteCarouselProps {
  sort?: "recent" | "popular" | "random";
  limit?: number;
  speed?: number;
  className?: string;
  backgroundMode?: boolean;
}

const FALLBACK_COVER_DATA_URI =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='560' height='800' viewBox='0 0 560 800'%3E%3Crect width='560' height='800' fill='%2316171a'/%3E%3Ctext x='50%25' y='50%25' fill='%23ffffff' font-family='Arial' font-size='32' text-anchor='middle'%3ECapa indispon%C3%ADvel%3C/text%3E%3C/svg%3E";

function Card({
  item,
  backgroundMode,
  reduceMotion,
}: {
  item: CarouselItem;
  backgroundMode?: boolean;
  reduceMotion?: boolean;
}) {
  const cover = (
    <div
      className={`relative overflow-hidden rounded-[20px] border transition-[border-color,box-shadow,transform,opacity] duration-300 ${
        backgroundMode
          ? "h-64 w-44 border-white/6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
          : "h-80 w-56 border-white/10 shadow-2xl group-hover:border-primary/30 group-hover:shadow-[0_20px_60px_rgba(229,9,20,0.3)]"
      }`}
    >
      <Image
        src={item.image}
        alt={item.title}
        fill
        unoptimized
        sizes={backgroundMode ? "176px" : "224px"}
        loading="lazy"
        className={`h-full w-full object-cover transition-transform duration-500 ${
          backgroundMode ? "opacity-65" : "group-hover:scale-110"
        }`}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = FALLBACK_COVER_DATA_URI;
        }}
      />

      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
          backgroundMode ? "opacity-40" : "opacity-0 group-hover:opacity-100"
        }`}
      />
      <div
        className={`absolute inset-0 flex items-end justify-start p-4 transition-opacity duration-300 ${
          backgroundMode ? "opacity-0" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <p className="line-clamp-2 text-sm font-semibold text-white">
          {item.title}
        </p>
      </div>
      {!backgroundMode && (
        <div className="absolute right-3 top-3 rounded-full border border-primary/40 bg-primary/20 px-2 py-1 text-[10px] font-semibold text-primary opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
          Ver série
        </div>
      )}
    </div>
  );

  if (backgroundMode) {
    return (
      <div className="group relative shrink-0" aria-hidden="true">
        {cover}
      </div>
    );
  }

  return (
    <motion.div
      className="group relative shrink-0"
      whileHover={reduceMotion ? undefined : { y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Link href={`/serie/${item.id}`} className="block">
        {cover}
      </Link>
    </motion.div>
  );
}

function buildInfiniteItems(items: CarouselItem[], min = 10): CarouselItem[] {
  if (items.length === 0) return [];
  const buffer = [...items];
  while (buffer.length < min) {
    buffer.push(...items);
  }
  return buffer;
}

function splitByParity(items: CarouselItem[]): {
  left: CarouselItem[];
  right: CarouselItem[];
} {
  const left: CarouselItem[] = [];
  const right: CarouselItem[] = [];

  items.forEach((item, index) => {
    if (index % 2 === 0) {
      left.push(item);
      return;
    }

    right.push(item);
  });

  return { left, right };
}

export function InfiniteCarousel({
  sort = "recent",
  limit = 24,
  speed = 30,
  className = "",
  backgroundMode = false,
}: InfiniteCarouselProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const { covers, loading, error, refetch } = useCarouselCovers({
    sort,
    limit,
    cacheTTLHours: 24,
  });

  const items = useMemo<CarouselItem[]>(
    () =>
      covers.map((cover) => ({
        id: cover.id,
        title: cover.title,
        image: cover.coverUrl,
      })),
    [covers],
  );

  const { left: leftItems, right: rightItems } = useMemo(
    () => splitByParity(items),
    [items],
  );

  const leftBase = useMemo(() => buildInfiniteItems(leftItems), [leftItems]);
  const rightBase = useMemo(() => buildInfiniteItems(rightItems), [rightItems]);

  const leftExtended = useMemo(() => [...leftBase, ...leftBase], [leftBase]);
  const rightExtended = useMemo(
    () => [...rightBase, ...rightBase],
    [rightBase],
  );
  const leftVisibleItems = shouldReduceMotion ? leftBase : leftExtended;
  const rightVisibleItems = shouldReduceMotion ? rightBase : rightExtended;

  if (loading && items.length === 0) {
    if (backgroundMode) return null;
    return (
      <section className={`w-full overflow-hidden py-10 ${className}`}>
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mb-3 h-5 w-52 animate-pulse rounded bg-white/10" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-80 w-56 shrink-0 animate-pulse rounded-[20px] bg-white/10"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && items.length === 0) {
    if (backgroundMode) return null;
    return (
      <section className={`w-full overflow-hidden py-10 ${className}`}>
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                Não foi possível carregar as capas agora.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300/40 px-3 py-1.5 text-xs font-semibold hover:bg-red-400/15"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`w-full overflow-hidden py-12 ${className}`}>
      <div className="mb-8 space-y-2">
        {!backgroundMode && (
          <p className="px-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80 sm:px-8 lg:px-12">
            Catálogo em destaque
          </p>
        )}
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-32 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-32 bg-gradient-to-l from-background to-transparent" />

          <motion.div
            className="flex gap-4 px-5 sm:px-8 lg:px-12"
            animate={shouldReduceMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={
              shouldReduceMotion
                ? undefined
                : {
                    duration: speed,
                    repeat: Infinity,
                    ease: "linear",
                  }
            }
          >
            {leftVisibleItems.map((item, index) => (
              <Card
                key={`${item.id}-left-${index}`}
                item={item}
                backgroundMode={backgroundMode}
                reduceMotion={shouldReduceMotion}
              />
            ))}
          </motion.div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-5" />
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-32 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-32 bg-gradient-to-l from-background to-transparent" />

          <motion.div
            className="flex gap-4 px-5 sm:px-8 lg:px-12"
            animate={shouldReduceMotion ? undefined : { x: ["-50%", "0%"] }}
            transition={
              shouldReduceMotion
                ? undefined
                : {
                    duration: speed,
                    repeat: Infinity,
                    ease: "linear",
                  }
            }
          >
            {rightVisibleItems.map((item, index) => (
              <Card
                key={`${item.id}-right-${index}`}
                item={item}
                backgroundMode={backgroundMode}
                reduceMotion={shouldReduceMotion}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
