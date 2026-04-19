"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type MouseEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  BookmarkPlus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  RefreshCcw,
  Columns,
  AlignVerticalSpaceAround,
  ScrollText,
} from "lucide-react";
import {
  useChapterInfo,
  useSeriesById,
  useMediaProgress,
} from "@/hooks/useApi";
import { useProgressSync } from "@/hooks/useProgressSync";
import { useReaderZoom } from "@/hooks/useReaderZoom";
import { useFavorites } from "@/hooks/useFavoritesApi";
import { AuthImage } from "@/components/AuthImage";
import { ProgressSlider } from "@/components/reader/ProgressSlider";
import { CommentSection } from "@/components/community/CommentSection";

// ─── Types ───────────────────────────────────────────────────────────

type ReadingMode = "vertical" | "webtoon" | "horizontal";

interface ChapterNavigationItem {
  id: string;
  number: number;
  title: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(totalPages, Math.max(1, Math.trunc(page)));
}

function getStoredMode(): ReadingMode {
  if (typeof window === "undefined") return "vertical";
  const stored = localStorage.getItem("manhq:reader:mode");
  if (stored === "horizontal" || stored === "webtoon") return stored;
  return "vertical";
}

const READING_MODES: { value: ReadingMode; label: string; icon: typeof Columns }[] = [
  { value: "vertical", label: "Vertical", icon: AlignVerticalSpaceAround },
  { value: "webtoon", label: "Contínuo", icon: ScrollText },
  { value: "horizontal", label: "Horizontal", icon: Columns },
];

// ─── Component ───────────────────────────────────────────────────────

export default function ReaderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.id as string;
  const chapterId = params.chapter as string;
  const rawPageParam = searchParams.get("page");
  const hasExplicitPageParam =
    rawPageParam !== null && rawPageParam.trim() !== "";
  const urlPage = hasExplicitPageParam ? Number(rawPageParam) : null;

  // ─── Data fetching ────────────────────────────────────────────
  const {
    data: chapterData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useChapterInfo(chapterId);
  const { data: seriesData } = useSeriesById(seriesId);
  const {
    data: savedProgress,
    isLoading: isProgressLoading,
    isFetching: isProgressFetching,
  } = useMediaProgress(chapterId);
  const {
    isFavorite,
    toggleFavorite,
    isUpdating: isFavUpdating,
  } = useFavorites(seriesId);

  // ─── UI state ─────────────────────────────────────────────────
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [readingMode, setReadingMode] = useState<ReadingMode>(getStoredMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const restoredForChapter = useRef<string | null>(null);
  const latestPageRef = useRef(1);

  // ─── Zoom ─────────────────────────────────────────────────────
  const zoomContainerRef = useRef<HTMLDivElement | null>(null);
  const cleanupZoomRef = useRef<(() => void) | null>(null);

  const { isZoomed, resetZoom, bindZoomRef, zoomStyle } = useReaderZoom({
    onZoomChange: (zoomed) => {
      // Disable snap while zoomed
      const container = containerRef.current;
      if (!container) return;
      if (zoomed) {
        container.style.scrollSnapType = "none";
      } else if (readingMode !== "webtoon") {
        container.style.scrollSnapType = "";
      }
    },
  });

  // Bind zoom listeners to the current page's zoom wrapper
  const setZoomRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (cleanupZoomRef.current) {
        cleanupZoomRef.current();
        cleanupZoomRef.current = null;
      }
      zoomContainerRef.current = el;
      if (el) {
        cleanupZoomRef.current = bindZoomRef(el) ?? null;
      }
    },
    [bindZoomRef],
  );

  // Reset zoom on page change
  useEffect(() => {
    resetZoom();
  }, [currentPage, resetZoom]);

  // ─── Derived data ─────────────────────────────────────────────
  const totalPages = chapterData?.pageCount ?? 1;
  const chapters = useMemo(
    () => seriesData?.medias ?? [],
    [seriesData?.medias],
  );
  const currentChapterIndex = useMemo(
    () => chapters.findIndex((chapter) => chapter.id === chapterId),
    [chapterId, chapters],
  );
  const isHorizontal = readingMode === "horizontal";
  const isWebtoon = readingMode === "webtoon";
  const chapterTitle =
    chapterData?.title || `Capítulo ${chapterData?.number ?? "-"}`;

  // ─── Progress sync ────────────────────────────────────────────
  useProgressSync(chapterId, currentPage, totalPages);

  useEffect(() => {
    latestPageRef.current = currentPage;
  }, [currentPage]);

  // ─── Scroll helpers ───────────────────────────────────────────
  const scrollToPage = useCallback(
    (page: number, behavior: ScrollBehavior = "smooth") => {
      const targetPage = clampPage(page, totalPages);
      const target = document.getElementById(`page-${targetPage}`);
      target?.scrollIntoView({
        behavior,
        block: "start",
        inline: "start",
      });
    },
    [totalPages],
  );

  // ─── Chapter navigation ───────────────────────────────────────
  const resolveAdjacentChapter = useCallback(
    (
      target: { id: string; number: number } | null | undefined,
      fallbackIndex: number,
    ): ChapterNavigationItem | null => {
      if (target) {
        const chapter = chapters.find((item) => item.id === target.id);
        return {
          id: target.id,
          number: target.number,
          title: chapter?.title || `Capítulo ${target.number}`,
        };
      }
      if (fallbackIndex >= 0 && fallbackIndex < chapters.length) {
        const chapter = chapters[fallbackIndex];
        return {
          id: chapter.id,
          number: chapter.number,
          title: chapter.title || `Capítulo ${chapter.number}`,
        };
      }
      return null;
    },
    [chapters],
  );

  const prevChapter = useMemo(
    () =>
      resolveAdjacentChapter(chapterData?.prevChapter, currentChapterIndex - 1),
    [chapterData?.prevChapter, currentChapterIndex, resolveAdjacentChapter],
  );
  const nextChapter = useMemo(
    () =>
      resolveAdjacentChapter(chapterData?.nextChapter, currentChapterIndex + 1),
    [chapterData?.nextChapter, currentChapterIndex, resolveAdjacentChapter],
  );

  // ─── Reset UI when chapter changes ──────────────────────────
  const [prevChapterId, setPrevChapterId] = useState(chapterId);
  if (prevChapterId !== chapterId) {
    setPrevChapterId(chapterId);
    setShowControls(true);
    setShowSettings(false);
  }

  useEffect(() => {
    restoredForChapter.current = null;
  }, [chapterId]);

  useEffect(() => {
    if (!chapterData || restoredForChapter.current === chapterId) return;

    if (!hasExplicitPageParam && (isProgressLoading || isProgressFetching)) {
      return;
    }

    const targetPage = clampPage(
      hasExplicitPageParam
        ? (urlPage ?? 1)
        : savedProgress && !savedProgress.finished
          ? savedProgress.page
          : 1,
      totalPages,
    );

    restoredForChapter.current = chapterId;
    latestPageRef.current = targetPage;
    const frame = requestAnimationFrame(() => {
      setCurrentPage(targetPage);
      scrollToPage(targetPage, "auto");
    });

    return () => cancelAnimationFrame(frame);
  }, [
    chapterData,
    chapterId,
    hasExplicitPageParam,
    isProgressFetching,
    isProgressLoading,
    savedProgress,
    scrollToPage,
    totalPages,
    urlPage,
  ]);

  // Re-scroll when mode changes
  useEffect(() => {
    if (!chapterData) return;
    const frame = requestAnimationFrame(() => {
      scrollToPage(latestPageRef.current, "auto");
    });
    return () => cancelAnimationFrame(frame);
  }, [chapterData, readingMode, scrollToPage]);

  // ─── Controls auto-hide ────────────────────────────────────────
  useEffect(() => {
    if (!showControls || showSettings) return;

    timeoutRef.current = setTimeout(() => setShowControls(false), 4000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showControls, showSettings]);

  // ─── IntersectionObserver for page tracking ────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || totalPages < 1) return;

    const observedPages = Array.from(
      container.querySelectorAll<HTMLElement>("[data-reader-page]"),
    );
    if (observedPages.length === 0) return;

    // For webtoon mode, use lower thresholds since pages can be taller
    const thresholds = isWebtoon
      ? [0.1, 0.3, 0.5]
      : [0.55, 0.7, 0.85];

    const observer = new IntersectionObserver(
      (entries) => {
        let bestMatch: { page: number; ratio: number } | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const rawPage = Number(
            (entry.target as HTMLElement).dataset.pageNumber,
          );
          if (!Number.isFinite(rawPage)) continue;
          if (!bestMatch || entry.intersectionRatio > bestMatch.ratio) {
            bestMatch = { page: rawPage, ratio: entry.intersectionRatio };
          }
        }

        if (bestMatch) {
          setCurrentPage((prev) =>
            prev === bestMatch?.page ? prev : bestMatch.page,
          );
        }
      },
      { root: container, threshold: thresholds },
    );

    for (const page of observedPages) {
      observer.observe(page);
    }

    return () => observer.disconnect();
  }, [chapterId, readingMode, totalPages, isWebtoon]);

  // ─── Persist reading mode ──────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("manhq:reader:mode", readingMode);
  }, [readingMode]);

  // ─── Keyboard navigation ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          if (latestPageRef.current < totalPages) {
            scrollToPage(latestPageRef.current + 1, "smooth");
          }
          break;
        case "ArrowLeft":
        case "ArrowUp":
          if (latestPageRef.current > 1) {
            scrollToPage(latestPageRef.current - 1, "smooth");
          }
          break;
        case "Escape":
          if (isZoomed) {
            resetZoom();
          } else {
            setShowSettings(false);
          }
          break;
        case "f":
          setShowControls((v) => !v);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalPages, scrollToPage, isZoomed, resetZoom]);

  // ─── Navigation handlers ───────────────────────────────────────
  const goToPage = useCallback(
    (page: number) => scrollToPage(page, "smooth"),
    [scrollToPage],
  );

  const goToNextPage = () => {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  const handleTap = (event: MouseEvent<HTMLDivElement>) => {
    if (isZoomed) return; // Don't navigate while zoomed

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.25) {
      if (currentPage > 1) goToPrevPage();
      return;
    }
    if (x > width * 0.75) {
      if (currentPage < totalPages) goToNextPage();
      return;
    }

    setShowControls((v) => !v);
  };

  // ─── Container CSS classes ─────────────────────────────────────
  const containerClasses = isHorizontal
    ? "flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
    : isWebtoon
      ? "h-full overflow-y-auto scrollbar-hide"
      : "h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide";

  const getPageClasses = () => {
    if (isHorizontal) {
      return "relative flex h-full w-full shrink-0 snap-start items-center justify-center bg-black";
    }
    if (isWebtoon) {
      return "relative flex w-full items-center justify-center bg-black";
    }
    return "relative flex h-screen w-full snap-start items-center justify-center bg-black";
  };

  const getImageClasses = () => {
    if (isWebtoon) {
      // Webtoon: images fill width, natural height, capped for readability
      return "w-full max-w-[900px] h-auto object-contain";
    }
    return "max-h-full max-w-full object-contain";
  };

  // ─── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────
  if (error || !chapterData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black px-4">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
            Leitura pública
          </p>
          <h1 className="mt-3 text-2xl font-bold text-white">
            Não foi possível carregar este capítulo
          </h1>
          <p className="mt-3 text-sm text-white/60">
            Tente atualizar o capítulo. Se o erro persistir, volte para a série
            e abra outro capítulo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => void refetch()}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <RefreshCcw className="h-4 w-4" />
              Tentar de novo
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`/serie/${seriesId}`)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 select-none bg-black"
      style={{ touchAction: "manipulation" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 right-0 top-0 z-50 bg-gradient-to-b from-black/95 via-black/70 to-transparent pb-6 backdrop-blur-md"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/serie/${seriesId}`)}
                aria-label="Voltar para a série"
                className="group flex items-center gap-2 rounded-xl px-3 py-2 transition-all hover:bg-white/10 active:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5 text-white transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span className="text-sm font-semibold text-white">
                  Voltar
                </span>
              </motion.button>

              <div className="mx-4 min-w-0 flex-1 text-center">
                <h1 className="truncate text-sm font-semibold text-white">
                  {chapterTitle}
                </h1>
                {seriesData?.title && (
                  <p className="truncate text-xs text-white/40">
                    {seriesData.title}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isFetching && (
                  <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                )}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings((v) => !v)}
                  aria-label="Abrir configurações"
                  className="rounded-full p-2.5 transition-colors hover:bg-white/10"
                >
                  <Settings className="h-5 w-5 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop side arrows ───────────────────────────────────── */}
      <AnimatePresence>
        {showControls && !isZoomed && (
          <>
            {currentPage > 1 && (
              <motion.button
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={goToPrevPage}
                className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 rounded-full bg-black/50 p-2.5 backdrop-blur-md transition-colors hover:bg-black/80 md:block"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </motion.button>
            )}

            {currentPage < totalPages && (
              <motion.button
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={goToNextPage}
                className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 rounded-full bg-black/50 p-2.5 backdrop-blur-md transition-colors hover:bg-black/80 md:block"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </motion.button>
            )}
          </>
        )}
      </AnimatePresence>

      {/* ── Content container ─────────────────────────────────────── */}
      <div
        ref={containerRef}
        className={containerClasses}
        onClick={handleTap}
      >
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
          (pageNumber) => {
            const isCurrentPage = pageNumber === currentPage;

            return (
              <div
                key={pageNumber}
                id={`page-${pageNumber}`}
                data-reader-page
                data-page-number={pageNumber}
                className={getPageClasses()}
              >
                {/* Zoom wrapper — only active on current page */}
                <div
                  ref={isCurrentPage ? setZoomRef : undefined}
                  className="flex h-full w-full items-center justify-center overflow-hidden"
                  style={
                    isCurrentPage && isZoomed
                      ? { ...zoomStyle, touchAction: "none" }
                      : undefined
                  }
                >
                  <AuthImage
                    chapterId={chapterId}
                    pageNumber={pageNumber}
                    alt={`Página ${pageNumber}`}
                    className={getImageClasses()}
                    loading={pageNumber <= 3 ? "eager" : "lazy"}
                    preloadMargin="800px"
                  />
                </div>
              </div>
            );
          },
        )}

        {/* ── End screen ───────────────────────────────────────── */}
        <div
          className={
            isHorizontal
              ? "flex h-full w-full shrink-0 snap-start flex-col items-center justify-center gap-6 bg-gradient-to-b from-black via-black/95 to-background px-8"
              : isWebtoon
                ? "flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-black via-black/95 to-background px-8"
                : "flex h-screen snap-start flex-col items-center justify-center gap-6 bg-gradient-to-b from-black via-black/95 to-background px-8"
          }
        >
          <div className="mb-4 text-center">
            <p className="mb-2 text-lg font-semibold text-white">
              Fim do Capítulo
            </p>
            <p className="text-sm text-white/60">{chapterTitle}</p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3">
            {nextChapter && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  router.push(`/reader/${seriesId}/${nextChapter.id}`)
                }
                className="group flex items-center justify-between gap-3 rounded-xl bg-primary px-6 py-5 font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                <div className="flex-1 text-left">
                  <p className="mb-1 text-xs text-white/70">Próximo</p>
                  <p className="truncate text-sm font-bold">
                    {nextChapter.title}
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
              </motion.button>
            )}

            {prevChapter && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  router.push(`/reader/${seriesId}/${prevChapter.id}`)
                }
                className="group flex items-center justify-between gap-3 rounded-xl border border-surface bg-surface/50 px-6 py-5 font-semibold text-white backdrop-blur-md transition-all hover:bg-surface/70"
              >
                <ChevronLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
                <div className="flex-1 text-right">
                  <p className="mb-1 text-xs text-white/70">Anterior</p>
                  <p className="truncate text-sm font-bold">
                    {prevChapter.title}
                  </p>
                </div>
              </motion.button>
            )}

            {(nextChapter || prevChapter) && (
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-black px-3 text-xs text-white/40">
                    ou
                  </span>
                </div>
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`/serie/${seriesId}`)}
              className="group flex items-center justify-center gap-2 rounded-xl border border-surface bg-surface/30 px-6 py-4 font-semibold text-white transition-all hover:bg-surface/50"
            >
              <BookOpen className="h-5 w-5 transition-transform group-hover:scale-110" />
              Ver Todos os Capítulos
            </motion.button>
          </div>
        </div>

        {/* ── Comments ─────────────────────────────────────────── */}
        <section
          className={
            isHorizontal
              ? "h-full w-full shrink-0 snap-start overflow-y-auto bg-background px-4 py-10"
              : isWebtoon
                ? "min-h-screen bg-background px-4 py-10"
                : "min-h-screen snap-start bg-background px-4 py-10"
          }
        >
          <div className="mx-auto max-w-2xl">
            <CommentSection
              scope={{ type: "media", id: chapterId }}
              title="Comentários do capítulo"
            />
          </div>
        </section>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-8 backdrop-blur-md"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="px-4 pb-4">
              {/* Progress slider */}
              <ProgressSlider
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />

              {/* Page counter + chapter nav */}
              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {prevChapter && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        router.push(`/reader/${seriesId}/${prevChapter.id}`)
                      }
                      className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                      aria-label="Capítulo anterior"
                    >
                      <ChevronLeft className="h-4 w-4 text-white/60" />
                    </motion.button>
                  )}
                </div>

                <span className="text-xs font-medium text-white/60">
                  {currentPage} / {totalPages}
                </span>

                <div className="flex items-center gap-2">
                  {nextChapter && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        router.push(`/reader/${seriesId}/${nextChapter.id}`)
                      }
                      className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                      aria-label="Próximo capítulo"
                    >
                      <ChevronRight className="h-4 w-4 text-white/60" />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mini page indicator (controls hidden) ─────────────────── */}
      {!showControls && !isZoomed && (
        <div
          className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <span className="text-xs font-medium text-white/60">
            {currentPage} / {totalPages}
          </span>
        </div>
      )}

      {/* ── Settings panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/90 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-surface p-6 shadow-2xl"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-textMain">
                  Configurações
                </h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings(false)}
                  aria-label="Fechar configurações"
                  className="rounded-full p-2 transition-colors hover:bg-background"
                >
                  <X className="h-6 w-6 text-textMain" />
                </motion.button>
              </div>

              <div className="space-y-5">
                {/* Reading mode selector */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-textMain">
                    Modo de Leitura
                  </label>
                  <div className="flex gap-2">
                    {READING_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const isActive = readingMode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          onClick={() => setReadingMode(mode.value)}
                          className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl px-3 py-3 font-medium transition-all ${
                            isActive
                              ? "bg-primary text-white shadow-lg shadow-primary/20"
                              : "bg-background text-textDim hover:bg-background/80 hover:text-textMain"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs">{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-textDim">
                    {readingMode === "vertical" &&
                      "Rolagem vertical com páginas fixas."}
                    {readingMode === "webtoon" &&
                      "Rolagem contínua ideal para manhwa e webcomics longos."}
                    {readingMode === "horizontal" &&
                      "Navegação lateral com snap por página."}
                  </p>
                </div>

                {/* Go to page */}
                <div>
                  <label
                    htmlFor="goto-page"
                    className="mb-2 block text-sm font-medium text-textMain"
                  >
                    Ir para página
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="goto-page"
                      type="number"
                      min={1}
                      max={totalPages}
                      defaultValue={currentPage}
                      className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-sm text-textMain outline-none focus:border-primary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = Number(
                            (e.target as HTMLInputElement).value,
                          );
                          if (val >= 1 && val <= totalPages) {
                            goToPage(val);
                            setShowSettings(false);
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          "goto-page",
                        ) as HTMLInputElement;
                        const val = Number(input?.value);
                        if (val >= 1 && val <= totalPages) {
                          goToPage(val);
                          setShowSettings(false);
                        }
                      }}
                      className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      Ir
                    </button>
                  </div>
                </div>

                {/* Favorite toggle */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleFavorite(seriesId)}
                  disabled={isFavUpdating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-surface bg-background py-4 font-medium text-textMain transition-colors hover:bg-background/80 disabled:opacity-50"
                >
                  <BookmarkPlus className="h-5 w-5" />
                  {isFavorite(seriesId)
                    ? "Remover dos Favoritos"
                    : "Adicionar aos Favoritos"}
                </motion.button>

                {/* Zoom hint */}
                <p className="text-center text-xs text-textDim">
                  Toque duas vezes para zoom. Ctrl+Scroll no desktop.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
