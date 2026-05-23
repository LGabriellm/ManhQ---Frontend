import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readerService } from "@/services/reader.service";
import { progressService } from "@/services/progress.service";
import { statsService } from "@/services/stats.service";

interface ProgressSyncOptions {
  progressPercent?: number;
  statsUnitKey?: string;
  isAlreadyFinished?: boolean;
}

function clampPercent(value: number | undefined, fallback: number): number {
  const source = Number.isFinite(value) ? value! : fallback;
  return Math.max(0, Math.min(100, Math.round(source)));
}

export function useProgressSync(
  chapterId: string,
  currentPage: number,
  totalPages: number,
  options: ProgressSyncOptions = {},
) {
  const queryClient = useQueryClient();

  const lastSentPage = useRef(0);
  const lastSentPercent = useRef(0);
  const pendingPage = useRef(0);
  const pendingPercent = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSending = useRef(false);
  const chapterIdRef = useRef(chapterId);

  const uniqueReadingUnitsVisited = useRef(new Set<string>());
  const lastStatsFlush = useRef(Date.now());
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chapterCompletedSent = useRef(false);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const invalidateProgressQueries = useCallback(
    (chapter: string) => {
      queryClient.removeQueries({ queryKey: ["progress", chapter] });
      queryClient.invalidateQueries({
        queryKey: ["progress", "continue-reading"],
      });
      queryClient.invalidateQueries({ queryKey: ["progress", "history"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "series-list"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
    [queryClient],
  );

  const sendProgress = async (
    page: number,
    chapter: string,
    progressPercent = pendingPercent.current,
  ) => {
    const normalizedPercent = clampPercent(progressPercent, 0);
    const percentMovedEnough =
      Math.abs(normalizedPercent - lastSentPercent.current) >= 2;

    if (
      isSending.current ||
      page < 1 ||
      (page === lastSentPage.current && !percentMovedEnough)
    ) {
      return;
    }

    isSending.current = true;
    try {
      await progressService.saveProgress(chapter, {
        page,
        progressPercent: normalizedPercent,
        suppressStats: true,
      });
      lastSentPage.current = page;
      lastSentPercent.current = normalizedPercent;
    } catch {
      // Retry on the next page/percent change.
    } finally {
      isSending.current = false;
    }
  };

  const flushProgressKeepalive = (chapter: string) => {
    const page = pendingPage.current;
    const progressPercent = clampPercent(pendingPercent.current, 0);
    const percentMovedEnough =
      Math.abs(progressPercent - lastSentPercent.current) >= 2;

    if (page < 1 || (page === lastSentPage.current && !percentMovedEnough)) {
      return;
    }

    readerService
      .updateProgressKeepalive(chapter, {
        page,
        progressPercent,
        suppressStats: true,
      })
      .catch(() => {});
    lastSentPage.current = page;
    lastSentPercent.current = progressPercent;
  };

  const flushStats = async (forceChapterCompleted = false) => {
    const now = Date.now();
    const elapsedSec = Math.round((now - lastStatsFlush.current) / 1000);
    const pages = uniqueReadingUnitsVisited.current.size;

    if (elapsedSec <= 0) return;
    if (pages <= 0 && !forceChapterCompleted) return;

    const chapterCompleted =
      forceChapterCompleted && !chapterCompletedSent.current;

    lastStatsFlush.current = now;
    uniqueReadingUnitsVisited.current = new Set<string>();

    if (chapterCompleted) {
      chapterCompletedSent.current = true;
    }

    try {
      await statsService.record({
        pages,
        timeSpent: elapsedSec,
        ...(chapterCompleted ? { chapterCompleted: true } : {}),
      });
    } catch {
      // Non-critical.
    }
  };

  const flushStatsKeepalive = (forceChapterCompleted = false) => {
    const elapsedSec = Math.round((Date.now() - lastStatsFlush.current) / 1000);
    const pages = uniqueReadingUnitsVisited.current.size;

    if (elapsedSec <= 0) return;
    if (pages <= 0 && !forceChapterCompleted) return;

    const chapterCompleted =
      forceChapterCompleted && !chapterCompletedSent.current;

    lastStatsFlush.current = Date.now();
    uniqueReadingUnitsVisited.current = new Set<string>();

    if (chapterCompleted) {
      chapterCompletedSent.current = true;
    }

    statsService
      .recordKeepalive({
        pages,
        timeSpent: elapsedSec,
        ...(chapterCompleted ? { chapterCompleted: true } : {}),
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (chapterIdRef.current === chapterId) return;

    const previousChapterId = chapterIdRef.current;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    flushProgressKeepalive(previousChapterId);
    flushStatsKeepalive();
    invalidateProgressQueries(previousChapterId);

    chapterIdRef.current = chapterId;
    lastSentPage.current = 0;
    lastSentPercent.current = 0;
    pendingPage.current = 0;
    pendingPercent.current = 0;
    uniqueReadingUnitsVisited.current = new Set<string>();
    lastStatsFlush.current = Date.now();
    chapterCompletedSent.current = false;
  }, [chapterId, invalidateProgressQueries]);

  useEffect(() => {
    if (options.isAlreadyFinished) {
      chapterCompletedSent.current = true;
    }
  }, [chapterId, options.isAlreadyFinished]);

  useEffect(() => {
    if (currentPage < 1) return;

    const fallbackPercent =
      totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
    const progressPercent = clampPercent(options.progressPercent, fallbackPercent);
    const statsUnit = options.statsUnitKey || `page:${currentPage}`;

    pendingPage.current = currentPage;
    pendingPercent.current = progressPercent;
    uniqueReadingUnitsVisited.current.add(statsUnit);

    const percentMovedEnough =
      Math.abs(progressPercent - lastSentPercent.current) >= 2;
    if (currentPage === lastSentPage.current && !percentMovedEnough) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const completed = progressPercent >= 90;

    if (completed) {
      sendProgress(currentPage, chapterId, progressPercent);
      flushStats(true);
    } else {
      debounceTimer.current = setTimeout(() => {
        sendProgress(pendingPage.current, chapterId, pendingPercent.current);
      }, 1000);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [
    currentPage,
    chapterId,
    totalPages,
    options.progressPercent,
    options.statsUnitKey,
  ]);

  useEffect(() => {
    statsTimer.current = setInterval(() => {
      flushStats();
    }, 30_000);

    return () => {
      if (statsTimer.current) {
        clearInterval(statsTimer.current);
        statsTimer.current = null;
      }
    };
  }, [chapterId]);

  useEffect(() => {
    progressTimer.current = setInterval(() => {
      const page = pendingPage.current;
      const progressPercent = pendingPercent.current;
      if (
        page > 0 &&
        (page !== lastSentPage.current ||
          Math.abs(progressPercent - lastSentPercent.current) >= 2)
      ) {
        sendProgress(page, chapterIdRef.current, progressPercent);
      }
    }, 15_000);

    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    };
  }, [chapterId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const chapter = chapterIdRef.current;
        flushProgressKeepalive(chapter);
        flushStatsKeepalive();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      progressService.flushProgressQueue().catch(() => {});
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (statsTimer.current) {
        clearInterval(statsTimer.current);
        statsTimer.current = null;
      }
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }

      const chapter = chapterIdRef.current;
      flushProgressKeepalive(chapter);
      flushStatsKeepalive();
      invalidateProgressQueries(chapter);
    };
  }, [invalidateProgressQueries]);
}
