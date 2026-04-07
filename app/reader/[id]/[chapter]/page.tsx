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
} from "lucide-react";
import {
  useChapterInfo,
  useSeriesById,
  useMediaProgress,
} from "@/hooks/useApi";
import { useProgressSync } from "@/hooks/useProgressSync";
import { useFavorites } from "@/hooks/useFavoritesApi";
import { AuthImage } from "@/components/AuthImage";
import { CommentSection } from "@/components/community/CommentSection";

interface ChapterNavigationItem {
  id: string;
  number: number;
  title: string;
}

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(totalPages, Math.max(1, Math.trunc(page)));
}

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

  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [readingMode, setReadingMode] = useState<"vertical" | "horizontal">(
    () => {
      if (typeof window === "undefined") return "vertical";
      const stored = localStorage.getItem("manhq:reader:mode");
      return stored === "horizontal" ? "horizontal" : "vertical";
    },
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const restoredForChapter = useRef<string | null>(null);
  const latestPageRef = useRef(1);

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
  const chapterTitle =
    chapterData?.title || `Capítulo ${chapterData?.number ?? "-"}`;

  useProgressSync(chapterId, currentPage, totalPages);

  useEffect(() => {
    latestPageRef.current = currentPage;
  }, [currentPage]);

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

  useEffect(() => {
    restoredForChapter.current = null;
    setShowControls(true);
    setShowSettings(false);
  }, [chapterId]);

  useEffect(() => {
    if (!chapterData || restoredForChapter.current === chapterId) {
      return;
    }

    // When there's no explicit ?page= param, wait for fresh progress data.
    // Check both isLoading (initial fetch) and isFetching (background refetch
    // after stale cache) to avoid restoring with outdated cached progress.
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

    return () => {
      cancelAnimationFrame(frame);
    };
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

  useEffect(() => {
    if (!chapterData) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      scrollToPage(latestPageRef.current, "auto");
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [chapterData, readingMode, scrollToPage]);

  useEffect(() => {
    if (!showControls || showSettings) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showControls, showSettings]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || totalPages < 1) {
      return;
    }

    const observedPages = Array.from(
      container.querySelectorAll<HTMLElement>("[data-reader-page]"),
    );
    if (observedPages.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let bestMatch: { page: number; ratio: number } | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const rawPage = Number(
            (entry.target as HTMLElement).dataset.pageNumber,
          );
          if (!Number.isFinite(rawPage)) {
            continue;
          }

          if (!bestMatch || entry.intersectionRatio > bestMatch.ratio) {
            bestMatch = { page: rawPage, ratio: entry.intersectionRatio };
          }
        }

        if (bestMatch) {
          setCurrentPage((previousPage) =>
            previousPage === bestMatch?.page ? previousPage : bestMatch.page,
          );
        }
      },
      {
        root: container,
        threshold: [0.55, 0.7, 0.85],
      },
    );

    for (const page of observedPages) {
      observer.observe(page);
    }

    return () => {
      observer.disconnect();
    };
  }, [chapterId, readingMode, totalPages]);

  useEffect(() => {
    localStorage.setItem("manhq:reader:mode", readingMode);
  }, [readingMode]);

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
          setShowSettings(false);
          break;
        case "f":
          setShowControls((value) => !value);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [totalPages, scrollToPage]);

  const goToPage = useCallback(
    (page: number) => {
      scrollToPage(page, "smooth");
    },
    [scrollToPage],
  );

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleTap = (event: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.25) {
      if (currentPage > 1) {
        goToPrevPage();
      }
      return;
    }

    if (x > width * 0.75) {
      if (currentPage < totalPages) {
        goToNextPage();
      }
      return;
    }

    setShowControls((value) => !value);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  return (
    <div className="fixed inset-0 select-none bg-black">
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 right-0 top-0 z-50 bg-linear-to-b from-black/95 via-black/70 to-transparent backdrop-blur-md"
          >
            <div className="flex items-center justify-between p-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/serie/${seriesId}`)}
                aria-label="Voltar para a série"
                className="group flex items-center gap-2 rounded-xl px-3 py-2 transition-all hover:bg-white/10 active:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5 text-white transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span className="text-sm font-semibold text-white">Voltar</span>
              </motion.button>

              <div className="mx-4 min-w-0 flex-1">
                <h1 className="truncate text-sm font-semibold text-white">
                  {chapterTitle}
                </h1>
                <p className="truncate text-xs text-white/60">
                  Página {currentPage} de {totalPages}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isFetching && (
                  <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                )}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings((value) => !value)}
                  aria-label="Abrir configurações"
                  className="rounded-full p-2.5 transition-colors hover:bg-white/10"
                >
                  <Settings className="h-6 w-6 text-white" />
                </motion.button>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="relative">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentPage / totalPages) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-xs text-white/40">1</span>
                  <span className="text-xs font-medium text-white/60">
                    {currentPage}
                  </span>
                  <span className="text-xs text-white/40">{totalPages}</span>
                </div>
              </div>

              {(prevChapter || nextChapter) && (
                <div className="mt-4 flex gap-2">
                  {prevChapter && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        router.push(`/reader/${seriesId}/${prevChapter.id}`)
                      }
                      className="group flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/20"
                    >
                      <ChevronLeft className="h-4 w-4 text-white transition-transform group-hover:-translate-x-0.5" />
                      <span className="truncate text-xs font-medium text-white">
                        {prevChapter.title}
                      </span>
                    </motion.button>
                  )}
                  {nextChapter && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        router.push(`/reader/${seriesId}/${nextChapter.id}`)
                      }
                      className="group flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary/80 px-4 py-2.5 backdrop-blur-sm transition-colors hover:bg-primary"
                    >
                      <span className="truncate text-xs font-medium text-white">
                        {nextChapter.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5" />
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <>
            {currentPage > 1 && (
              <motion.button
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={goToPrevPage}
                className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 rounded-full bg-black/60 p-3 backdrop-blur-md transition-colors hover:bg-black/80 md:block"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </motion.button>
            )}

            {currentPage < totalPages && (
              <motion.button
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={goToNextPage}
                className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 rounded-full bg-black/60 p-3 backdrop-blur-md transition-colors hover:bg-black/80 md:block"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </motion.button>
            )}
          </>
        )}
      </AnimatePresence>

      <div
        ref={containerRef}
        className={
          isHorizontal
            ? "flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
            : "h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        }
        onClick={handleTap}
      >
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
          (pageNumber) => (
            <div
              key={pageNumber}
              id={`page-${pageNumber}`}
              data-reader-page
              data-page-number={pageNumber}
              className={
                isHorizontal
                  ? "relative flex h-full w-full shrink-0 snap-start items-center justify-center bg-black"
                  : "relative flex h-screen w-full snap-start items-center justify-center bg-black"
              }
            >
              <AuthImage
                chapterId={chapterId}
                pageNumber={pageNumber}
                alt={`Página ${pageNumber}`}
                className="max-h-full max-w-full object-contain"
                loading={pageNumber <= 3 ? "eager" : "lazy"}
              />

              {!showControls && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-xs font-medium text-white/60">
                    {pageNumber} / {totalPages}
                  </span>
                </div>
              )}
            </div>
          ),
        )}

        <div
          className={
            isHorizontal
              ? "flex h-full w-full shrink-0 snap-start flex-col items-center justify-center gap-6 bg-linear-to-b from-black via-black/95 to-background px-8"
              : "flex h-screen snap-start flex-col items-center justify-center gap-6 bg-linear-to-b from-black via-black/95 to-background px-8"
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

        <section
          className={
            isHorizontal
              ? "h-full w-full shrink-0 snap-start overflow-y-auto bg-background px-4 py-10"
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

              <div className="space-y-4">
                <div>
                  <label className="mb-3 block text-sm font-medium text-textMain">
                    Modo de Leitura
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReadingMode("vertical")}
                      className={`flex-1 rounded-xl px-4 py-3 font-medium transition-all ${
                        readingMode === "vertical"
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-background text-textDim hover:bg-background/80 hover:text-textMain"
                      }`}
                    >
                      Vertical
                    </button>
                    <button
                      onClick={() => setReadingMode("horizontal")}
                      className={`flex-1 rounded-xl px-4 py-3 font-medium transition-all ${
                        readingMode === "horizontal"
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-background text-textDim hover:bg-background/80 hover:text-textMain"
                      }`}
                    >
                      Horizontal
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-textDim">
                    Vertical usa rolagem contínua. Horizontal transforma cada
                    página em um painel com snap lateral.
                  </p>
                </div>

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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
