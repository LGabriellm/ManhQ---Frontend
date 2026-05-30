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
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { WifiOff } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type ReadingMode = "vertical" | "webtoon" | "horizontal";

interface ChapterNavigationItem {
  id: string;
  number: number;
  title: string;
}

interface PageImageMetrics {
  naturalWidth: number;
  naturalHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  aspectRatio: number;
  isLongPage: boolean;
}

interface ReaderPosition {
  page: number;
  pageProgress: number;
  chapterProgressPercent: number;
  statsUnitKey: string;
}

interface StoredReaderPosition {
  page: number;
  scrollTop: number;
  pageProgress: number;
  progressPercent: number;
  mode: ReadingMode;
  updatedAt: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(totalPages, Math.max(1, Math.trunc(page)));
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function getReaderPositionKey(chapterId: string): string {
  return `manhq:reader:position:${chapterId}`;
}

function getStoredModeRaw(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("manhq:reader:mode");
}

function getStoredMode(): ReadingMode {
  const stored = getStoredModeRaw();
  if (stored === "horizontal" || stored === "webtoon") return stored;
  return "vertical";
}

const READING_MODES: {
  value: ReadingMode;
  label: string;
  icon: typeof Columns;
}[] = [
  { value: "vertical", label: "Vertical", icon: AlignVerticalSpaceAround },
  { value: "webtoon", label: "Contínuo", icon: ScrollText },
  { value: "horizontal", label: "Horizontal", icon: Columns },
];

// ─── Page rendering helpers (memoized, not re-created each render) ───

function getPageClasses(isHorizontal: boolean, isWebtoon: boolean): string {
  if (isHorizontal) {
    return "relative flex h-full w-full shrink-0 snap-start items-center justify-center bg-black";
  }
  if (isWebtoon) {
    return "relative flex w-full items-center justify-center bg-black";
  }
  return "relative flex h-full w-full snap-start items-center justify-center bg-black";
}

function getImageClasses(isWebtoon: boolean): string {
  if (isWebtoon) {
    return "w-full max-w-[900px] h-auto object-contain";
  }
  return "max-h-full max-w-full object-contain";
}

function getZoomWrapperClasses(isWebtoon: boolean): string {
  if (isWebtoon) {
    return "flex w-full items-start justify-center overflow-visible";
  }
  return "flex h-full w-full items-center justify-center overflow-hidden";
}

function getAuthImageContainerClasses(isWebtoon: boolean): string {
  if (isWebtoon) {
    return "flex w-full items-start justify-center";
  }
  return "flex h-full w-full items-center justify-center";
}

function getEndScreenClasses(isHorizontal: boolean, isWebtoon: boolean): string {
  if (isHorizontal) {
    return "flex h-full w-full shrink-0 snap-start flex-col items-center justify-center bg-gradient-to-b from-black to-background px-8";
  }
  return "flex min-h-screen w-full snap-start flex-col items-center justify-center bg-gradient-to-b from-black to-background px-8 py-12";
}

function getCommentsClasses(isHorizontal: boolean, isWebtoon: boolean): string {
  if (isHorizontal) {
    return "h-full w-full shrink-0 snap-start overflow-y-auto bg-background px-4 py-10";
  }
  return "min-h-screen w-full snap-start bg-background px-4 py-10";
}

// ─── Component ───────────────────────────────────────────────────────

export default function ReaderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.id as string;
  const chapterId = params.chapter as string;
  const rawPageParam = searchParams.get("page");
  const hasExplicitPageParam = rawPageParam !== null && rawPageParam.trim() !== "";
  const urlPage = hasExplicitPageParam ? Number(rawPageParam) : null;

  // ─── Data fetching ────────────────────────────────────────────
  const { isChapterDownloaded } = useOfflineDownloads();
  const isOfflineAvailable = isChapterDownloaded(seriesId, chapterId);

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
  const [readerPosition, setReaderPosition] = useState<ReaderPosition>({
    page: 1,
    pageProgress: 0,
    chapterProgressPercent: 0,
    statsUnitKey: "page:1",
  });
  const [hasLongPages, setHasLongPages] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoredForChapter = useRef<string | null>(null);
  const latestPageRef = useRef(1);
  const isScrollingRef = useRef(false);
  const imageMetricsRef = useRef(new Map<number, PageImageMetrics>());
  const hasStoredModePreference = useRef(getStoredModeRaw() !== null);
  const autoModeApplied = useRef(false);

  // ─── Zoom ─────────────────────────────────────────────────────
  const zoomContainerRef = useRef<HTMLDivElement | null>(null);
  const cleanupZoomRef = useRef<(() => void) | null>(null);

  const { isZoomed, resetZoom, bindZoomRef, zoomStyle } = useReaderZoom({
    onZoomChange: (zoomed) => {
      const container = containerRef.current;
      if (!container) return;
      if (zoomed) {
        container.style.scrollSnapType = "none";
      } else if (readingMode !== "webtoon") {
        container.style.scrollSnapType = "";
      }
    },
  });

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

  // Reset zoom on page and mode change
  useEffect(() => {
    resetZoom();
  }, [currentPage, readingMode, resetZoom]);

  // ─── Derived data ─────────────────────────────────────────────
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
  const [offlineMeta, setOfflineMeta] = useState<{
    title: string;
    number: number;
    pageCount: number;
  } | null>(null);
  const [isCheckingOffline, setIsCheckingOffline] = useState(true);

  useEffect(() => {
    import("@/services/offline-storage.service").then((m) =>
      m.getChapterMeta(seriesId, chapterId).then((meta) => {
        if (meta) {
          setOfflineMeta({
            title: meta.chapterTitle,
            number: meta.chapterNumber,
            pageCount: meta.pageCount,
          });
        }
        setIsCheckingOffline(false);
      }),
    );
  }, [seriesId, chapterId]);

  const resolvedChapterData = chapterData || offlineMeta;
  const totalPages = resolvedChapterData?.pageCount ?? 1;

  const chapterTitle =
    chapterData?.title ||
    offlineMeta?.title ||
    `Capítulo ${resolvedChapterData?.number ?? "-"}`;

  const isUsingOfflineData = !chapterData && !!offlineMeta;

  // ─── Progress sync ────────────────────────────────────────────
  useProgressSync(chapterId, currentPage, totalPages, {
    progressPercent: readerPosition.chapterProgressPercent,
    statsUnitKey: readerPosition.statsUnitKey,
    isAlreadyFinished: savedProgress?.finished ?? false,
  });

  useEffect(() => {
    latestPageRef.current = currentPage;
  }, [currentPage]);

  // ─── Scroll helpers ───────────────────────────────────────────
  const scrollToPage = useCallback(
    (page: number, behavior: ScrollBehavior = "auto") => {
      const targetPage = clampPage(page, totalPages);
      const target = document.getElementById(`page-${targetPage}`);
      if (!target) return;
      // Use scrollIntoView only when the element isn't already visible
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const isVisible =
        targetRect.top >= containerRect.top - 50 &&
        targetRect.bottom <= containerRect.bottom + 50;

      if (!isVisible) {
        target.scrollIntoView({
          behavior,
          block: "start",
          inline: "start",
        });
      }
    },
    [totalPages],
  );

  const restoreStoredPosition = useCallback(
    (page: number) => {
      if (typeof window === "undefined") return false;
      const container = containerRef.current;
      if (!container) return false;

      try {
        const raw = localStorage.getItem(getReaderPositionKey(chapterId));
        if (!raw) return false;
        const stored = JSON.parse(raw) as Partial<StoredReaderPosition>;
        if (
          stored.page !== page ||
          typeof stored.updatedAt !== "number" ||
          Date.now() - stored.updatedAt > 1000 * 60 * 60 * 24 * 30
        ) {
          return false;
        }

        const target = document.getElementById(`page-${page}`);
        if (!target) return false;

        const targetTop =
          isHorizontal
            ? 0
            : target.offsetTop +
              clampRatio(Number(stored.pageProgress) || 0) * target.offsetHeight -
              container.clientHeight * 0.45;

        if (isHorizontal) {
          target.scrollIntoView({ behavior: "auto", block: "start", inline: "start" });
        } else {
          container.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "auto",
          });
        }
        return true;
      } catch {
        return false;
      }
    },
    [chapterId, isHorizontal],
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

  // ─── Reset UI when chapter changes (useEffect, not during render) ───
  useEffect(() => {
    setShowControls(true);
    setShowSettings(false);
    restoredForChapter.current = null;
    imageMetricsRef.current = new Map<number, PageImageMetrics>();
    setHasLongPages(false);
    setReaderPosition({
      page: 1,
      pageProgress: 0,
      chapterProgressPercent: 0,
      statsUnitKey: "page:1",
    });
    autoModeApplied.current = false;
  }, [chapterId]);

  // ─── Restore progress / scroll to saved page ───────────────────
  useEffect(() => {
    if (!chapterData || restoredForChapter.current === chapterId) return;
    if (!hasExplicitPageParam && isProgressLoading) return;

    const targetPage = clampPage(
      hasExplicitPageParam
        ? (urlPage ?? 1)
        : savedProgress && !savedProgress.finished
          ? savedProgress.page
          : 1,
      totalPages,
    );

    restoredForChapter.current = chapterId;
    setCurrentPage(targetPage);
    latestPageRef.current = targetPage;
    setReaderPosition({
      page: targetPage,
      pageProgress: 0,
      chapterProgressPercent: hasExplicitPageParam
        ? Math.round((targetPage / Math.max(1, totalPages)) * 100)
        : savedProgress?.progressPercent ??
          Math.round((targetPage / Math.max(1, totalPages)) * 100),
      statsUnitKey: `page:${targetPage}`,
    });

    const frame = requestAnimationFrame(() => {
      scrollToPage(targetPage, "auto");
      restoreStoredPosition(targetPage);
    });
    const retry = window.setTimeout(() => {
      restoreStoredPosition(targetPage);
    }, 450);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  }, [
    chapterData,
    chapterId,
    hasExplicitPageParam,
    isProgressLoading,
    savedProgress,
    restoreStoredPosition,
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

    const calculatePosition = (): ReaderPosition | null => {
      const pageElements = Array.from(
        container.querySelectorAll<HTMLElement>("[data-reader-page]"),
      );
      if (pageElements.length === 0) return null;

      const containerRect = container.getBoundingClientRect();

      if (isHorizontal) {
        const anchorX = containerRect.left + containerRect.width * 0.5;
        let best: { page: number; distance: number } | null = null;

        for (const element of pageElements) {
          const page = Number(element.dataset.pageNumber);
          if (!Number.isFinite(page)) continue;
          const rect = element.getBoundingClientRect();
          const distance = Math.abs(rect.left + rect.width * 0.5 - anchorX);
          if (!best || distance < best.distance) {
            best = { page, distance };
          }
        }

        const page = clampPage(best?.page ?? 1, totalPages);
        const chapterProgressPercent =
          totalPages > 1 ? ((page - 1) / (totalPages - 1)) * 100 : 100;
        return {
          page,
          pageProgress: page >= totalPages ? 1 : 0,
          chapterProgressPercent: Math.round(chapterProgressPercent),
          statsUnitKey: `page:${page}`,
        };
      }

      const anchorY = containerRect.top + containerRect.height * 0.45;
      let active:
        | { page: number; rect: DOMRect; distance: number }
        | null = null;

      for (const element of pageElements) {
        const page = Number(element.dataset.pageNumber);
        if (!Number.isFinite(page)) continue;
        const rect = element.getBoundingClientRect();
        const containsAnchor = rect.top <= anchorY && rect.bottom >= anchorY;
        const distance = containsAnchor
          ? 0
          : Math.min(
              Math.abs(rect.top - anchorY),
              Math.abs(rect.bottom - anchorY),
            );
        if (!active || distance < active.distance) {
          active = { page, rect, distance };
        }
      }

      const page = clampPage(active?.page ?? 1, totalPages);
      const rect = active?.rect;
      const pageProgress = rect
        ? clampRatio((anchorY - rect.top) / Math.max(rect.height, 1))
        : 0;
      const metrics = imageMetricsRef.current.get(page);
      const isLongPage =
        isWebtoon ||
        hasLongPages ||
        !!metrics?.isLongPage ||
        (rect ? rect.height > container.clientHeight * 1.5 : false);
      const chapterProgressPercent =
        totalPages === 1 && !isLongPage
          ? 100
          : clampRatio((page - 1 + pageProgress) / totalPages) * 100;
      const segmentCount = isLongPage
        ? Math.max(
            1,
            Math.ceil(
              (rect?.height || container.clientHeight) /
                Math.max(1, container.clientHeight * 0.75),
            ),
          )
        : 1;
      const segment = Math.min(
        segmentCount - 1,
        Math.max(0, Math.floor(pageProgress * segmentCount)),
      );

      return {
        page,
        pageProgress,
        chapterProgressPercent: Math.round(chapterProgressPercent),
        statsUnitKey: isLongPage
          ? `page:${page}:segment:${segment}`
          : `page:${page}`,
      };
    };

    const persistPosition = (position: ReaderPosition) => {
      try {
        const payload: StoredReaderPosition = {
          page: position.page,
          scrollTop: container.scrollTop,
          pageProgress: position.pageProgress,
          progressPercent: position.chapterProgressPercent,
          mode: readingMode,
          updatedAt: Date.now(),
        };
        localStorage.setItem(
          getReaderPositionKey(chapterId),
          JSON.stringify(payload),
        );
      } catch {
        // Storage can be unavailable in private contexts.
      }
    };

    const syncPosition = () => {
      const position = calculatePosition();
      if (!position) return;

      setReaderPosition((current) => {
        if (
          current.page === position.page &&
          current.statsUnitKey === position.statsUnitKey &&
          Math.abs(
            current.chapterProgressPercent - position.chapterProgressPercent,
          ) < 1
        ) {
          return current;
        }
        return position;
      });

      if (position.page !== latestPageRef.current) {
        setCurrentPage(position.page);
      }
      persistPosition(position);
    };

    let rafId: number | null = null;
    const requestSync = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncPosition();
      });
    };

    const initTimer = window.setTimeout(requestSync, 120);
    container.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    return () => {
      window.clearTimeout(initTimer);
      container.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [chapterId, readingMode, totalPages, isWebtoon, isHorizontal, hasLongPages]);

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

  const goToNextPage = useCallback(() => {
    if (latestPageRef.current < totalPages) {
      goToPage(latestPageRef.current + 1);
    }
  }, [totalPages, goToPage]);

  const goToPrevPage = useCallback(() => {
    if (latestPageRef.current > 1) {
      goToPage(latestPageRef.current - 1);
    }
  }, [goToPage]);

  // ─── Tap handling — ignore taps during/after scroll ─────────────
  const handleTap = (event: MouseEvent<HTMLDivElement>) => {
    if (isZoomed) return;
    if (isScrollingRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.2) {
      goToPrevPage();
      return;
    }
    if (x > width * 0.8) {
      goToNextPage();
      return;
    }

    setShowControls((v) => !v);
  };

  // ─── Track scroll state to differentiate scroll from tap ────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      isScrollingRef.current = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  // ─── Container CSS class ────────────────────────────────────────
  const containerClasses = useMemo(() => {
    if (isHorizontal) {
      return "flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide";
    }
    if (isWebtoon) {
      return "h-full overflow-y-auto scrollbar-hide";
    }
    return "h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide";
  }, [isHorizontal, isWebtoon]);

  // ─── Memoized page helpers ──────────────────────────────────────
  const pageClass = useMemo(
    () => getPageClasses(isHorizontal, isWebtoon),
    [isHorizontal, isWebtoon],
  );
  const imgClass = useMemo(
    () => getImageClasses(isWebtoon),
    [isWebtoon],
  );
  const zoomWrapperClass = useMemo(
    () => getZoomWrapperClasses(isWebtoon),
    [isWebtoon],
  );
  const authImageContainerClass = useMemo(
    () => getAuthImageContainerClasses(isWebtoon),
    [isWebtoon],
  );
  const endClass = useMemo(
    () => getEndScreenClasses(isHorizontal, isWebtoon),
    [isHorizontal, isWebtoon],
  );
  const commentsClass = useMemo(
    () => getCommentsClasses(isHorizontal, isWebtoon),
    [isHorizontal, isWebtoon],
  );

  // ─── Memoized pages array ───────────────────────────────────────
  const pages = useMemo(() => {
    if (totalPages < 1) return [];
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  const handleImageLoad = useCallback(
    (metrics: {
      pageNumber: number;
      naturalWidth: number;
      naturalHeight: number;
      renderedWidth: number;
      renderedHeight: number;
    }) => {
      const aspectRatio =
        metrics.naturalWidth > 0
          ? metrics.naturalHeight / metrics.naturalWidth
          : 0;
      const isLongPage =
        aspectRatio >= 2.6 ||
        metrics.renderedHeight > window.innerHeight * 1.5;

      imageMetricsRef.current.set(metrics.pageNumber, {
        naturalWidth: metrics.naturalWidth,
        naturalHeight: metrics.naturalHeight,
        renderedWidth: metrics.renderedWidth,
        renderedHeight: metrics.renderedHeight,
        aspectRatio,
        isLongPage,
      });

      if (isLongPage) {
        setHasLongPages(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (
      !hasLongPages ||
      hasStoredModePreference.current ||
      autoModeApplied.current ||
      readingMode !== "vertical"
    ) {
      return;
    }

    autoModeApplied.current = true;
    setReadingMode("webtoon");
  }, [hasLongPages, readingMode]);

  const setReaderMode = useCallback((mode: ReadingMode) => {
    hasStoredModePreference.current = true;
    setReadingMode(mode);
  }, []);

  const progressLabel =
    isWebtoon || hasLongPages
      ? `${currentPage} / ${totalPages} · ${Math.max(
          0,
          Math.min(100, readerPosition.chapterProgressPercent),
        )}%`
      : `${currentPage} / ${totalPages}`;

  // ─── Loading state ─────────────────────────────────────────────
  if ((isLoading || isCheckingOffline) && !offlineMeta && !chapterData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────
  if (!resolvedChapterData) {
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
                <span className="text-sm font-semibold text-white">Voltar</span>
              </motion.button>

              <div className="mx-4 min-w-0 flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="truncate text-sm font-semibold text-white">
                    {chapterTitle}
                  </h1>
                  {isUsingOfflineData && (
                    <WifiOff className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                  )}
                </div>
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
      <div ref={containerRef} className={containerClasses} onClick={handleTap}>
        {/* Page containers — all rendered, AuthImage handles lazy loading */}
        {pages.map((pageNumber) => {
          const isCurrentPage = pageNumber === currentPage;

          return (
            <div
              key={pageNumber}
              id={`page-${pageNumber}`}
              data-reader-page
              data-page-number={pageNumber}
              className={pageClass}
            >
              {/* Zoom wrapper — only active on current page */}
              <div
                ref={isCurrentPage ? setZoomRef : undefined}
                className={zoomWrapperClass}
                style={
                  isCurrentPage
                    ? {
                        ...zoomStyle,
                        touchAction: isZoomed
                          ? "none"
                          : isHorizontal
                            ? "pan-x"
                            : "pan-y",
                      }
                    : undefined
                }
              >
                <AuthImage
                  chapterId={chapterId}
                  pageNumber={pageNumber}
                  alt={`Página ${pageNumber}`}
                  className={imgClass}
                  containerClassName={authImageContainerClass}
                  loading={pageNumber <= 3 ? "eager" : "lazy"}
                  seriesId={seriesId}
                  useOffline={isOfflineAvailable}
                  preloadMargin="800px"
                  onImageLoad={handleImageLoad}
                />
              </div>
            </div>
          );
        })}

        {/* ── End screen ───────────────────────────────────────── */}
        <div className={endClass}>
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
                  <span className="bg-black px-3 text-xs text-white/40">ou</span>
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
        <section className={commentsClass}>
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
                progressPercent={readerPosition.chapterProgressPercent}
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
                  {progressLabel}
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
            {progressLabel}
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
              style={{
                paddingBottom:
                  "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
              }}
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
                          onClick={() => setReaderMode(mode.value)}
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
